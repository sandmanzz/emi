import { useState, useMemo, useDeferredValue } from 'react';
import { flushSync } from 'react-dom';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import SearchableSelect from '../components/SearchableSelect';
import { IconSearch, IconPrint } from '../components/icons';
import { initialEvents } from '../data/events';
import { getEventSeedItems, eventKeyOf } from '../lib/eventItems';
import { getCatalog } from '../lib/producedItems';
import { getEventStageNames } from '../lib/eventStatuses';
import { resolveEventStage } from '../lib/eventProgress';
import { getEventClosing } from '../lib/eventClosing';
import { CLOSING_LABELS } from '../lib/eventClosingLabels';
import { formatIDR } from '../lib/superAdminUtils';
import { getEventLoans, loanDisplayStatus, loanTotalCost, LOAN_BADGE } from '../lib/eventLoans';
import { getProductionRequests, PRODUCTION_BADGE } from '../lib/productionRequests';
import { clashesForEvent } from '../lib/eventClashes';
import { TODAY } from '../data/events';
import { fmtNum } from '../lib/format';

// Event Report (/event-summary?name=<event key>): everything about one event's items on one
// page, built for the real case of HUNDREDS of item lines per event.
// - Data: the same item list Event Detail starts with (lib/eventItems.js), enriched once
//   with catalog data (SKU, category, unit, Item Value) in a single memoised pass.
// - Aggregates (KPIs, per-area table, breakdowns) are computed in one loop over the items.
// - The item table only renders the current page (25/50/100 rows, or All); search is
//   deferred (useDeferredValue) so typing stays smooth; sorting/filtering are memoised.
// - Print renders every filtered row (not just the page) and hides the app chrome.
// - Export CSV downloads the filtered rows.

const PROGRESS = {
  broken:    { label: 'Broken',      badge: 'badge-red' },
  'scan-out': { label: 'Scanned out', badge: 'badge-green' },
  'scan-in':  { label: 'Scanned in',  badge: 'badge-blue' },
  checked:   { label: 'Checked',     badge: 'badge-purple' },
  pending:   { label: 'Not checked', badge: 'badge-gray' },
};
const PAGE_SIZES = [25, 50, 100, 'all'];
const COLUMNS = [
  { key: 'name', label: 'Item' },
  { key: 'area', label: 'Area' },
  { key: 'qty', label: 'Qty', num: true },
  { key: 'value', label: 'Value', num: true },
  { key: 'ownership', label: 'Owner' },
  { key: 'stageIdx', label: 'Added at' },
  { key: 'progressRank', label: 'Progress' },
  { key: 'pic', label: 'PIC' },
];

function pct(n, total) { return total ? Math.round((n / total) * 100) : 0; }
// Short Rupiah for KPI tiles: Rp7,54 M (miliar) / Rp865 jt (juta). Full value goes in the sub line.
function shortIDR(n) {
  if (n >= 1e9) return `Rp${(n / 1e9).toLocaleString('id-ID', { maximumFractionDigits: 2 })} M`;
  if (n >= 1e6) return `Rp${Math.round(n / 1e6).toLocaleString('id-ID')} jt`;
  return formatIDR(n);
}
function progressOf(it) {
  if (it.brokenQty > 0) return 'broken';
  if (it.scanOut) return 'scan-out';
  if (it.scanIn || it.scanned) return 'scan-in';
  if (it.checking) return 'checked';
  return 'pending';
}
const PROGRESS_RANK = { pending: 0, checked: 1, 'scan-in': 2, 'scan-out': 3, broken: 4 };

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function Bar({ value, total, color }) {
  const p = pct(value, total);
  return (
    <div className="rep-bar" title={`${value} / ${total} (${p}%)`}>
      <div className="rep-bar-track"><div className="rep-bar-fill" style={{ width: `${p}%`, background: color }} /></div>
      <span>{p}%</span>
    </div>
  );
}

function BreakdownCard({ title, rows, total, color, unit = 'lines' }) {
  return (
    <div className="card rep-breakdown">
      <div className="rep-section-title">{title}</div>
      {rows.length === 0 && <div className="rep-muted">—</div>}
      {rows.map(r => (
        <div key={r.label} className="rep-breakdown-row">
          <span className="rep-breakdown-label">{r.label}</span>
          <div className="rep-bar-track"><div className="rep-bar-fill" style={{ width: `${pct(r.value, total)}%`, background: color }} /></div>
          <span className="rep-breakdown-val">{r.value} <em>{unit}</em></span>
        </div>
      ))}
    </div>
  );
}

function toCsv(rows) {
  const head = ['No', 'Item', 'SKU', 'Category', 'Area', 'Sub Area', 'Qty', 'Unit', 'Unit Value', 'Total Value', 'Ownership', 'Added at stage', 'Progress', 'Checking', 'Scan In', 'Scan Out', 'Cross-checked', 'Broken qty', 'PIC', 'Note'];
  const esc = v => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = rows.map((r, i) => [i + 1, r.name, r.sku, r.category, r.area, r.subArea, r.qty, r.unit, r.unitValue, r.value, r.ownership, r.stage,
    PROGRESS[r.progress].label, r.checking ? 'Yes' : 'No', r.scanIn || '', r.scanOut || '', r.checked ? 'Yes' : 'No', r.brokenQty || 0, r.pic, r.note].map(esc).join(','));
  return [head.join(','), ...lines].join('\n');
}

export default function EventSummaryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const stages = useMemo(() => getEventStageNames(), []);

  // All events, newest first. ?name= may be an event key ("<date> | NAME") or just the name.
  const events = useMemo(() => initialEvents
    .map(e => ({ ...e, key: eventKeyOf(e) }))
    .sort((a, b) => (b.date || '').localeCompare(a.date || '')), []);
  const requested = searchParams.get('name') || '';
  const event = events.find(e => e.key === requested)
    || events.find(e => e.name.toUpperCase() === requested.toUpperCase())
    || [...events].sort((a, b) => (b.itemCount || 0) - (a.itemCount || 0))[0];

  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [areas, setAreas] = useState([]);
  const [progress, setProgress] = useState('');
  const [ownership, setOwnership] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState({ key: 'area', asc: true });
  const [pageSize, setPageSize] = useState(50);
  const [page, setPage] = useState(1);
  const [groupByArea, setGroupByArea] = useState(true);
  const [printing, setPrinting] = useState(false);

  function resetFilters() {
    setQuery(''); setAreas([]); setProgress(''); setOwnership(''); setCategory(''); setPage(1);
  }
  function selectEvent(key) {
    setSearchParams({ name: key });
    resetFilters();
    setTab('overview');
  }
  const [tab, setTab] = useState('overview'); // overview | items | supply | issues

  const stage = resolveEventStage(event.key);
  const stageIdx = stages.indexOf(stage);
  const closing = getEventClosing(event.key);
  const closingLabel = event.type === 'past' ? CLOSING_LABELS['returned-completed'] : CLOSING_LABELS[closing];
  const finished = event.type === 'past' || closing === 'returned-completed' || closing === 'transferred';

  // One pass: enrich items with catalog data + progress.
  const items = useMemo(() => {
    const catalog = new Map(getCatalog().map(c => [c.name, c]));
    return getEventSeedItems(event.key).map(it => {
      const c = catalog.get(it.name);
      const unitValue = c?.itemValue || 0;
      const p = progressOf(it);
      return {
        ...it, sku: c?.sku || '', category: c?.category || 'Uncategorised', unit: c?.unit || '',
        unitValue, value: unitValue * Number(it.qty || 0), progress: p, progressRank: PROGRESS_RANK[p],
        stageIdx: stages.indexOf(it.stage), pic: it.pic || '', subArea: it.subArea || '',
      };
    });
  }, [event.key, stages]);

  // One pass: KPIs + per-area + breakdowns.
  const stats = useMemo(() => {
    const s = { lines: items.length, qty: 0, value: 0, checked: 0, scanIn: 0, scanOut: 0, crossChecked: 0, broken: 0, brokenQty: 0,
      areas: new Map(), owners: new Map(), categories: new Map(), stagesCount: new Map() };
    for (const it of items) {
      s.qty += Number(it.qty || 0);
      s.value += it.value;
      const a = s.areas.get(it.area) || { area: it.area, lines: 0, qty: 0, value: 0, checked: 0, scanIn: 0, scanOut: 0, broken: 0 };
      a.lines += 1; a.qty += Number(it.qty || 0); a.value += it.value;
      if (it.checking) { s.checked += 1; a.checked += 1; }
      if (it.scanIn || it.scanned) { s.scanIn += 1; a.scanIn += 1; }
      if (it.scanOut) { s.scanOut += 1; a.scanOut += 1; }
      if (it.checked) s.crossChecked += 1;
      if (it.brokenQty > 0) { s.broken += 1; s.brokenQty += it.brokenQty; a.broken += 1; }
      s.areas.set(it.area, a);
      s.owners.set(it.ownership || '—', (s.owners.get(it.ownership || '—') || 0) + 1);
      s.categories.set(it.category, (s.categories.get(it.category) || 0) + 1);
      s.stagesCount.set(it.stage, (s.stagesCount.get(it.stage) || 0) + 1);
    }
    return s;
  }, [items]);

  const [areaSort, setAreaSort] = useState({ key: 'lines', asc: false });
  const areaRows = useMemo(() => {
    const rows = [...stats.areas.values()];
    const k = areaSort.key;
    rows.sort((a, b) => {
      const va = k === 'area' ? a.area : k.endsWith('Pct') ? pct(a[k.replace('Pct', '')], a.lines) : a[k];
      const vb = k === 'area' ? b.area : k.endsWith('Pct') ? pct(b[k.replace('Pct', '')], b.lines) : b[k];
      const c = typeof va === 'string' ? va.localeCompare(vb) : va - vb;
      return areaSort.asc ? c : -c;
    });
    return rows;
  }, [stats, areaSort]);

  const filtered = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    const rows = items.filter(it =>
      (areas.length === 0 || areas.includes(it.area)) &&
      (!progress || it.progress === progress) &&
      (!ownership || it.ownership === ownership) &&
      (!category || it.category === category) &&
      (!q || it.name.toLowerCase().includes(q) || it.sku.toLowerCase().includes(q) || it.pic.toLowerCase().includes(q)
        || it.area.toLowerCase().includes(q) || it.subArea.toLowerCase().includes(q))
    );
    const { key, asc } = sort;
    rows.sort((a, b) => {
      // Grouped view always keeps areas together, then applies the chosen sort inside each area.
      if (groupByArea && key !== 'area') {
        const g = a.area.localeCompare(b.area);
        if (g) return g;
      }
      const va = a[key], vb = b[key];
      const c = typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb), undefined, { numeric: true });
      return (asc ? c : -c) || a.name.localeCompare(b.name);
    });
    return rows;
  }, [items, deferredQuery, areas, progress, ownership, category, sort, groupByArea]);

  const size = printing || pageSize === 'all' ? filtered.length || 1 : pageSize;
  const pages = Math.max(1, Math.ceil(filtered.length / size));
  const safePage = Math.min(page, pages);
  const pageRows = printing ? filtered : filtered.slice((safePage - 1) * size, safePage * size);
  const filteredQty = useMemo(() => filtered.reduce((s, it) => s + Number(it.qty || 0), 0), [filtered]);
  const filteredValue = useMemo(() => filtered.reduce((s, it) => s + it.value, 0), [filtered]);
  const isFiltered = filtered.length !== items.length;

  // Subtotals per area for the group header rows (over the filtered set, not just the page).
  const groupTotals = useMemo(() => {
    const m = new Map();
    for (const it of filtered) {
      const g = m.get(it.area) || { lines: 0, qty: 0, value: 0 };
      g.lines += 1; g.qty += Number(it.qty || 0); g.value += it.value;
      m.set(it.area, g);
    }
    return m;
  }, [filtered]);

  function sortBy(key) {
    setSort(s => ({ key, asc: s.key === key ? !s.asc : key !== 'qty' && key !== 'value' }));
    setPage(1);
  }
  function toggleArea(area) {
    setAreas(a => a.includes(area) ? a.filter(x => x !== area) : [...a, area]);
    setPage(1);
  }
  function exportCsv() {
    const blob = new Blob([toCsv(filtered)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `event-report-${event.code || event.id}-${event.date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
  function print() {
    flushSync(() => setPrinting(true));
    window.print();
    setPrinting(false);
  }

  const kpis = [
    { label: 'Item Lines', value: stats.lines, sub: `${stats.qty.toLocaleString('id-ID')} pcs in total`, accent: 'brand' },
    { label: 'Value in Use', value: shortIDR(stats.value), sub: `${formatIDR(stats.value)} · qty × Item Value`, accent: 'brand' },
    { label: 'Checked', value: `${pct(stats.checked, stats.lines)}%`, sub: `${stats.checked} of ${stats.lines} lines`, accent: 'green' },
    { label: 'Scanned In', value: `${pct(stats.scanIn, stats.lines)}%`, sub: `${stats.scanIn} of ${stats.lines} lines`, accent: 'brand' },
    { label: 'Scanned Out', value: `${pct(stats.scanOut, stats.lines)}%`, sub: `${stats.scanOut} of ${stats.lines} lines`, accent: 'green' },
    { label: 'Broken', value: stats.broken, sub: stats.broken ? `${stats.brokenQty} pcs reported` : 'No reports', accent: stats.broken ? 'red' : 'green' },
  ];

  // Rentals, production and clashes for this event (Rentals & Production / Issues tabs).
  const loans = useMemo(() => getEventLoans(event.key).map(l => ({ ...l, display: loanDisplayStatus(l, TODAY), total: loanTotalCost(l) })), [event.key]);
  const productions = useMemo(() => getProductionRequests(event.key).filter(p => p.type !== 'convert'), [event.key]);
  const converts = useMemo(() => getProductionRequests(event.key).filter(p => p.type === 'convert'), [event.key]);
  const clashes = useMemo(() => clashesForEvent(event.key), [event.key]);
  const rentalCost = loans.reduce((s, l) => s + l.total, 0);
  const scanInIdx = stages.findIndex(s => /scan in/i.test(s));
  const pastScanIn = finished || closing === 'checking-inventory' || (scanInIdx >= 0 && stageIdx > scanInIdx);
  const crossCheckPhase = finished || closing === 'checking-inventory';
  const issues = {
    broken: items.filter(it => it.brokenQty > 0),
    notScanned: pastScanIn ? items.filter(it => !it.scanIn && !it.scanned) : [],
    notChecked: crossCheckPhase ? items.filter(it => !it.checked) : [],
    overdue: loans.filter(l => l.display === 'Overdue'),
    shortages: clashes.filter(c => c.shortage),
  };
  const issueCount = issues.broken.length + issues.notScanned.length + issues.notChecked.length + issues.overdue.length + issues.shortages.length;
  const showTab = t => printing ? t !== 'supply' && t !== 'issues' ? true : false : tab === t;

  const progressCounts = useMemo(() => {
    const m = {};
    items.forEach(it => { m[it.progress] = (m[it.progress] || 0) + 1; });
    return m;
  }, [items]);

  const colCount = 9;

  return (
    <div className={`event-report${printing ? ' is-printing' : ''}`}>
      <div className="breadcrumb no-print">
        <Link to="/event">Event</Link>
        <span className="breadcrumb-sep">/</span>
        <Link to={`/event-detail?name=${encodeURIComponent(event.key)}`}>{event.name}</Link>
        <span className="breadcrumb-sep">/</span>
        <span className="breadcrumb-current">Report</span>
      </div>

      <div className="rep-head">
        <h1 className="page-title" style={{ margin: 0 }}>Event Report</h1>
        <div className="rep-head-actions no-print">
          <SearchableSelect
            inline
            style={{ minWidth: 260 }}
            value={event.key}
            onChange={selectEvent}
            options={events.map(e => ({ value: e.key, label: `${e.name}`, meta: `${e.date} · ${e.itemCount || 0}` }))}
            placeholder="Select event…"
            searchPlaceholder="Search events…"
          />
          <button className="btn btn-ghost" onClick={exportCsv} disabled={filtered.length === 0}>Export CSV</button>
          <button className="btn-print" onClick={print}><IconPrint /> Print</button>
        </div>
      </div>

      <div className="rep-event card">
        <div>
          <div className="rep-event-name">{event.name}</div>
          <div className="rep-event-meta">
            <span>{event.code}</span>
            <span>{fmtDate(event.start)}{event.finish && event.finish !== event.start ? ` – ${fmtDate(event.finish)}` : ''}</span>
            <span>{event.location}</span>
            {finished
              ? <span><strong>Event finished</strong></span>
              : <span>Stage {stageIdx + 1}/{stages.length}: <strong>{stage}</strong></span>}
          </div>
        </div>
        <div className="rep-event-right">
          {closingLabel && <span className={`badge ${closingLabel.badgeClass}`}>{closingLabel.label}</span>}
          <button className="btn btn-ghost no-print" onClick={() => navigate(`/event-detail?name=${encodeURIComponent(event.key)}`)}>Open Event Detail</button>
        </div>
      </div>

      <div className="kpi-grid rep-kpis">
        {kpis.map(k => (
          <div key={k.label} className={`kpi-card ${k.accent}-accent`}>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value">{k.value}</div>
            <div className="kpi-sub">{k.sub}</div>
          </div>
        ))}
      </div>

      <div className="rep-cost-strip">
        <div><span>Rental cost</span><strong>{formatIDR(rentalCost)}</strong><em>{loans.length} rental{loans.length === 1 ? '' : 's'} · {loans.filter(l => l.status === 'Borrowed').length} out now</em></div>
        <div><span>Production</span><strong>{productions.length}</strong><em>{productions.filter(p => p.status === 'Done').length} done · {converts.length} convert{converts.length === 1 ? '' : 's'}</em></div>
        <div><span>Clashes with other events</span><strong>{clashes.length}</strong><em>{issues.shortages.length} short of stock</em></div>
        <div className={issueCount ? 'warn' : ''}><span>Open issues</span><strong>{issueCount}</strong><em>{issueCount ? 'see the Issues tab' : 'nothing to follow up'}</em></div>
      </div>

      <div className="wi-tabs no-print rep-tabs">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'items', label: `Items (${items.length})` },
          { id: 'supply', label: `Rentals & Production (${loans.length + productions.length + converts.length})` },
          { id: 'issues', label: `Issues (${issueCount})` },
        ].map(t => (
          <button key={t.id} type="button" className={`wi-tab-btn${tab === t.id ? ' active' : ''}${t.id === 'issues' && issueCount ? ' rep-tab-warn' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {showTab('overview') && (
      <div className="rep-grid">
        <div className="card rep-area-card">
          <div className="rep-section-title">
            Progress by Area <span className="rep-muted">{areaRows.length} areas · click a row to filter the item list</span>
          </div>
          <div className="table-wrap">
            <table className="rep-area-table">
              <thead>
                <tr>
                  {[['area', 'Area'], ['lines', 'Lines'], ['qty', 'Qty'], ['value', 'Value'], ['checkedPct', 'Checked'], ['scanInPct', 'Scan In'], ['scanOutPct', 'Scan Out'], ['broken', 'Broken']].map(([k, l]) => (
                    <th key={k} className={`rep-sortable${k !== 'area' ? ' num' : ''}`} onClick={() => setAreaSort(s => ({ key: k, asc: s.key === k ? !s.asc : k === 'area' }))}>
                      {l}{areaSort.key === k ? (areaSort.asc ? ' ↑' : ' ↓') : ''}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {areaRows.map(a => (
                  <tr key={a.area} className={`row-clickable${areas.includes(a.area) ? ' rep-row-active' : ''}`} onClick={() => toggleArea(a.area)}>
                    <td className="name-cell">{a.area}</td>
                    <td className="num">{a.lines}</td>
                    <td className="num">{fmtNum(a.qty)}</td>
                    <td className="num rep-nowrap">{formatIDR(a.value)}</td>
                    <td><Bar value={a.checked} total={a.lines} color="var(--purple)" /></td>
                    <td><Bar value={a.scanIn} total={a.lines} color="var(--brand)" /></td>
                    <td><Bar value={a.scanOut} total={a.lines} color="var(--green)" /></td>
                    <td className="num" style={{ color: a.broken ? 'var(--red)' : 'var(--text-muted)', fontWeight: a.broken ? 700 : 400 }}>{a.broken}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="rep-side">
          <BreakdownCard title="Progress" total={stats.lines} color="var(--brand)"
            rows={Object.keys(PROGRESS).map(k => ({ label: PROGRESS[k].label, value: progressCounts[k] || 0 }))} />
          <BreakdownCard title="Ownership" total={stats.lines} color="var(--purple)"
            rows={[...stats.owners.entries()].sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value }))} />
          <BreakdownCard title="Category" total={stats.lines} color="var(--green)"
            rows={[...stats.categories.entries()].sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value }))} />
          <BreakdownCard title="Added at stage" total={stats.lines} color="var(--orange)"
            rows={stages.filter(s => stats.stagesCount.get(s)).map(s => ({ label: s, value: stats.stagesCount.get(s) }))} />
        </div>
      </div>

      )}

      {showTab('items') && (
      <div className="card rep-items">
        <div className="rep-section-title">
          Items <span className="rep-muted">{isFiltered ? `${filtered.length} of ${items.length} lines match` : `${items.length} lines`} · {filteredQty.toLocaleString('id-ID')} pcs · {formatIDR(filteredValue)}</span>
        </div>
        <div className="rep-toolbar no-print">
          <div className="search-wrap rep-search">
            <IconSearch />
            <input className="search-input" type="text" placeholder="Search item, SKU, area, PIC…" value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} />
          </div>
          <SearchableSelect inline multiple value={areas} onChange={v => { setAreas(v); setPage(1); }} placeholder="All areas" searchPlaceholder="Search area…"
            options={[...stats.areas.keys()].sort().map(a => ({ value: a, label: a, meta: String(stats.areas.get(a).lines) }))} />
          <SearchableSelect inline value={progress} onChange={v => { setProgress(v); setPage(1); }} placeholder="All progress"
            options={[{ value: '', label: 'All progress' }, ...Object.keys(PROGRESS).map(k => ({ value: k, label: PROGRESS[k].label, meta: String(progressCounts[k] || 0) }))]} />
          <SearchableSelect inline value={ownership} onChange={v => { setOwnership(v); setPage(1); }} placeholder="All owners"
            options={[{ value: '', label: 'All owners' }, ...[...stats.owners.keys()].map(o => ({ value: o, label: o }))]} />
          <SearchableSelect inline value={category} onChange={v => { setCategory(v); setPage(1); }} placeholder="All categories"
            options={[{ value: '', label: 'All categories' }, ...[...stats.categories.keys()].sort().map(c => ({ value: c, label: c }))]} />
          {isFiltered && <button type="button" className="link-btn" onClick={resetFilters}>Clear filters</button>}
          <label className="pp-check rep-group-toggle"><input type="checkbox" checked={groupByArea} onChange={() => setGroupByArea(g => !g)} /> Group by area</label>
        </div>

        <div className={`table-wrap rep-table-wrap${printing ? ' printing' : ''}`}>
          <table className="rep-table">
            <thead>
              <tr>
                <th style={{ width: 44 }}>#</th>
                {COLUMNS.map(c => (
                  <th key={c.key} className={`rep-sortable${c.num ? ' num' : ''}`} onClick={() => sortBy(c.key)}>
                    {c.label}{sort.key === c.key ? (sort.asc ? ' ↑' : ' ↓') : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 && <tr><td colSpan={colCount} className="rep-empty">No items match these filters.</td></tr>}
              {pageRows.map((it, i) => {
                const rowNo = (printing ? 0 : (safePage - 1) * size) + i + 1;
                const header = groupByArea && (i === 0 || pageRows[i - 1].area !== it.area);
                const g = groupTotals.get(it.area);
                return [
                  header && (
                    <tr key={`g-${it.area}-${i}`} className="rep-group-row">
                      <td colSpan={colCount}>
                        <strong>{it.area}</strong>
                        <span>{g.lines} lines · {fmtNum(g.qty)} pcs · {formatIDR(g.value)}</span>
                      </td>
                    </tr>
                  ),
                  <tr key={`${it.id}-${i}`}>
                    <td className="rep-muted">{rowNo}</td>
                    <td className="rep-item">
                      <strong>{it.name}</strong>
                      <span>{[it.sku, it.category].filter(Boolean).join(' · ')}</span>
                    </td>
                    <td className="rep-area">{it.area}{it.subArea && <span>{it.subArea}</span>}</td>
                    <td className="num rep-nowrap"><strong>{fmtNum(it.qty)}</strong> <span className="rep-muted">{it.unit}</span></td>
                    <td className="num rep-nowrap">{it.value ? formatIDR(it.value) : '—'}</td>
                    <td>{it.ownership}</td>
                    <td className="rep-muted rep-small">{it.stage}</td>
                    <td>
                      <span className={`badge ${PROGRESS[it.progress].badge}`} style={{ fontSize: 10.5 }}>
                        {PROGRESS[it.progress].label}{it.progress === 'broken' ? ` · ${it.brokenQty}` : ''}
                      </span>
                      {it.checked && <span className="rep-cross" title="Cross-checked">✓</span>}
                    </td>
                    <td className="rep-small">{it.pic || '—'}</td>
                  </tr>,
                ];
              })}
            </tbody>
          </table>
        </div>

        {!printing && (
          <div className="rep-pager no-print">
            <div className="rep-pager-size">
              Rows per page
              {PAGE_SIZES.map(s => (
                <button key={s} type="button" className={pageSize === s ? 'active' : ''} onClick={() => { setPageSize(s); setPage(1); }}>{s === 'all' ? 'All' : s}</button>
              ))}
            </div>
            <div className="rep-pager-nav">
              <span>{filtered.length === 0 ? 0 : (safePage - 1) * size + 1}–{Math.min(safePage * size, filtered.length)} of {filtered.length}</span>
              <button type="button" disabled={safePage <= 1} onClick={() => setPage(1)} aria-label="First page">«</button>
              <button type="button" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)} aria-label="Previous page">‹</button>
              <span className="rep-page-no">{safePage} / {pages}</span>
              <button type="button" disabled={safePage >= pages} onClick={() => setPage(safePage + 1)} aria-label="Next page">›</button>
              <button type="button" disabled={safePage >= pages} onClick={() => setPage(pages)} aria-label="Last page">»</button>
            </div>
          </div>
        )}
      </div>
      )}

      {showTab('supply') && (
        <div className="rep-stack">
          <div className="card">
            <div className="rep-section-title">Rentals <span className="rep-muted">items borrowed from loan vendors for this event · {formatIDR(rentalCost)}</span></div>
            {loans.length === 0 ? <p className="rep-muted" style={{ margin: 0 }}>Nothing rented for this event.</p> : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Item</th><th className="num">Qty</th><th>Vendor</th><th>Area</th><th>Period</th><th className="num">Cost</th><th>Status</th></tr></thead>
                  <tbody>
                    {loans.map(l => (
                      <tr key={l.id}>
                        <td className="name-cell">{l.itemName}</td>
                        <td className="num">{fmtNum(l.qty)} <span className="rep-muted">{l.unit}</span></td>
                        <td><button type="button" className="link-btn" onClick={() => navigate(`/loan-vendor-detail?id=${l.vendorId}`)}>{l.vendorName}</button></td>
                        <td className="rep-small">{l.area}{l.subArea ? ` · ${l.subArea}` : ''}</td>
                        <td className="rep-small rep-nowrap">{fmtDate(l.startDate)} → {fmtDate(l.dueDate)}</td>
                        <td className="num rep-nowrap">{l.total ? formatIDR(l.total) : '—'}</td>
                        <td><span className={`badge ${LOAN_BADGE[l.display]}`} style={{ fontSize: 11 }}>{l.display}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div className="card">
            <div className="rep-section-title">Production <span className="rep-muted">new items made for this event, and converts</span></div>
            {productions.length + converts.length === 0 ? <p className="rep-muted" style={{ margin: 0 }}>No production or convert requests.</p> : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Type</th><th>Item</th><th className="num">Qty</th><th>Vendor / from</th><th>Deploy to</th><th>Requested</th><th>Status</th></tr></thead>
                  <tbody>
                    {productions.map(p => (
                      <tr key={`p${p.id}`}>
                        <td><span className="badge badge-purple" style={{ fontSize: 10.5 }}>Production</span></td>
                        <td className="name-cell">{p.name}{p.reason === 'broken' && <span className="badge badge-red" style={{ fontSize: 10, marginLeft: 6 }}>Replaces broken</span>}</td>
                        <td className="num">{fmtNum(p.qty)}</td>
                        <td>{p.vendorId ? <button type="button" className="link-btn" onClick={() => navigate(`/vendor-detail?id=${p.vendorId}`)}>{p.vendorName}</button> : (p.vendorName || '—')}</td>
                        <td className="rep-small">{p.warehouse || '—'}</td>
                        <td className="rep-small rep-nowrap">{p.requestedAt}</td>
                        <td><span className={`badge ${PRODUCTION_BADGE[p.status] || 'badge-gray'}`} style={{ fontSize: 11 }}>{p.status}</span></td>
                      </tr>
                    ))}
                    {converts.map(c => (
                      <tr key={`c${c.id}`}>
                        <td><span className="badge badge-blue" style={{ fontSize: 10.5 }}>Convert</span></td>
                        <td className="name-cell">{fmtNum(c.fromQty)} × {c.fromName} → {fmtNum(c.toQty)} × {c.toName}</td>
                        <td className="num">{fmtNum(c.toQty)}</td>
                        <td className="rep-small">{c.fromWarehouse}</td>
                        <td className="rep-small">—</td>
                        <td className="rep-small rep-nowrap">{c.requestedAt}</td>
                        <td><span className={`badge ${c.status === 'Converted' ? 'badge-green' : 'badge-orange'}`} style={{ fontSize: 11 }}>{c.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {showTab('issues') && (
        <div className="rep-stack">
          {issueCount === 0 && <div className="card rep-ok">No open issues for this event.</div>}
          {issues.shortages.length > 0 && (
            <div className="card rep-issue">
              <div className="rep-section-title">Short of stock because of other events <span className="rep-muted">{issues.shortages.length} items · <button type="button" className="link-btn" onClick={() => navigate('/event-calendar')}>open Event Calendar</button></span></div>
              <div className="table-wrap"><table>
                <thead><tr><th>Item</th><th>Dates</th><th>Booked by</th><th className="num">Needed</th><th className="num">In stock</th></tr></thead>
                <tbody>{issues.shortages.map(c => (
                  <tr key={`${c.item}-${c.from}`}>
                    <td className="name-cell">{c.item}</td>
                    <td className="rep-small rep-nowrap">{fmtDate(c.from)}{c.to !== c.from ? ` – ${fmtDate(c.to)}` : ''}</td>
                    <td className="rep-small">{c.entries.map(x => `${x.name} (${x.qty})`).join(' · ')}</td>
                    <td className="num" style={{ color: 'var(--red)', fontWeight: 700 }}>{fmtNum(c.demand)}</td>
                    <td className="num">{fmtNum(c.stock)}</td>
                  </tr>
                ))}</tbody>
              </table></div>
            </div>
          )}
          {issues.overdue.length > 0 && (
            <div className="card rep-issue">
              <div className="rep-section-title">Overdue rentals <span className="rep-muted">return to the vendor</span></div>
              <ul className="rep-issue-list">{issues.overdue.map(l => <li key={l.id}><strong>{l.itemName}</strong> · {fmtNum(l.qty)} {l.unit} from {l.vendorName} · due {fmtDate(l.dueDate)}</li>)}</ul>
            </div>
          )}
          {issues.broken.length > 0 && (
            <div className="card rep-issue">
              <div className="rep-section-title">Broken items <span className="rep-muted">{issues.broken.reduce((s, it) => s + it.brokenQty, 0)} pcs reported</span></div>
              <ul className="rep-issue-list">{issues.broken.map(it => <li key={it.id}><strong>{it.name}</strong> · {it.area} · {fmtNum(it.brokenQty)} of {fmtNum(it.qty)} broken{it.brokenNote ? ` — ${it.brokenNote}` : ''}</li>)}</ul>
            </div>
          )}
          {issues.notScanned.length > 0 && (
            <div className="card rep-issue">
              <div className="rep-section-title">Not scanned in <span className="rep-muted">{issues.notScanned.length} lines, although the event is past the scan-in stage</span></div>
              <ul className="rep-issue-list rep-issue-cols">{issues.notScanned.map(it => <li key={it.id}><strong>{it.name}</strong> · {it.area} · {fmtNum(it.qty)}</li>)}</ul>
            </div>
          )}
          {issues.notChecked.length > 0 && (
            <div className="card rep-issue">
              <div className="rep-section-title">Not cross-checked <span className="rep-muted">{issues.notChecked.length} lines still to check during closing</span></div>
              <ul className="rep-issue-list rep-issue-cols">{issues.notChecked.map(it => <li key={it.id}><strong>{it.name}</strong> · {it.area} · {fmtNum(it.qty)}</li>)}</ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
