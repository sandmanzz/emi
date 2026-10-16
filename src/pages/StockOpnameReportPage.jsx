import { useState, useMemo, Fragment } from 'react';
import { flushSync } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import SearchableSelect from '../components/SearchableSelect';
import { IconSearch, IconPrint } from '../components/icons';
import { getOpnameHistory } from '../lib/stockOpnameStore';
import { getCatalog } from '../lib/producedItems';
import { formatIDR } from '../lib/superAdminUtils';
import { TODAY } from '../data/events';

// Stock Opname Report (/stock-opname-report): how accurate our stock records are, per warehouse,
// per month and per item, from the stock opname history (lib/stockOpnameStore.js).
// Definitions (also in the PRD):
//  - counted lines  = rows counted in that opname (`countedCount`; old records: the changed rows only)
//  - variance lines = lines whose physical count differed from the system (diff ≠ 0)
//  - accuracy       = 1 − variance lines / counted lines
//  - shrinkage      = Σ |diff| × unit value over negative diffs (stock lost); gain = positive diffs
//  - unit value     = the value saved on the line, else today's catalog Item Value
// Rejected opnames never changed stock, so by default only Approved ones are measured.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const STATUS_BADGE = { Approved: 'badge-green', Rejected: 'badge-red', Pending: 'badge-orange' };
const STALE_DAYS = 60;

function parseDate(s) {
  if (!s) return null;
  const m = /^(\d{1,2}) (\w{3}) (\d{4})/.exec(s);
  if (m) return new Date(Number(m[3]), MONTHS.indexOf(m[2]), Number(m[1]));
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}
function iso(d) {
  return d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : '';
}
function pct(n, d) { return d ? Math.round((n / d) * 1000) / 10 : 0; }

function Acc({ value }) {
  const color = value >= 95 ? 'var(--green)' : value >= 85 ? 'var(--orange)' : 'var(--red)';
  return (
    <div className="rep-bar" title={`${value}% accurate`}>
      <div className="rep-bar-track"><div className="rep-bar-fill" style={{ width: `${value}%`, background: color }} /></div>
      <span style={{ color }}>{value}%</span>
    </div>
  );
}

export default function StockOpnameReportPage() {
  const navigate = useNavigate();
  const [warehouses, setWarehouses] = useState([]);
  const [status, setStatus] = useState('Approved');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(null); // expanded opname id
  const [printing, setPrinting] = useState(false);

  // Enrich once: dates, line values, per-opname totals.
  const all = useMemo(() => {
    const valueByName = new Map(getCatalog().map(i => [i.name, i.itemValue || 0]));
    return getOpnameHistory().map(h => {
      const date = parseDate(h.appliedAt);
      const lines = h.items.map(it => {
        const unit = Number(it.valuation) || valueByName.get(it.name) || 0;
        return { ...it, unit, value: it.diff * unit };
      });
      const variance = lines.filter(l => l.diff !== 0);
      const counted = Math.max(h.countedCount || 0, h.items.length);
      return {
        ...h, date, day: iso(date), lines, counted, varianceLines: variance.length,
        accuracy: pct(counted - variance.length, counted),
        net: lines.reduce((s, l) => s + l.diff, 0),
        shrink: lines.filter(l => l.diff < 0).reduce((s, l) => s - l.value, 0),
        gain: lines.filter(l => l.diff > 0).reduce((s, l) => s + l.value, 0),
        poor: lines.filter(l => l.condition === 'Poor').length,
      };
    }).sort((a, b) => (b.day || '').localeCompare(a.day || ''));
  }, []);

  const warehouseOptions = useMemo(() => [...new Set(all.map(h => h.warehouse))].sort()
    .map(w => ({ value: w, label: w, meta: String(all.filter(h => h.warehouse === w).length) })), [all]);

  const q = query.trim().toLowerCase();
  const shown = useMemo(() => all.filter(h =>
    (warehouses.length === 0 || warehouses.includes(h.warehouse)) &&
    (!status || h.status === status) &&
    (!from || h.day >= from) && (!to || h.day <= to) &&
    (!q || h.lines.some(l => l.name.toLowerCase().includes(q)) || h.appliedBy.toLowerCase().includes(q))
  ), [all, warehouses, status, from, to, q]);

  const totals = useMemo(() => {
    const t = { counted: 0, variance: 0, net: 0, shrink: 0, gain: 0, poor: 0 };
    shown.forEach(h => { t.counted += h.counted; t.variance += h.varianceLines; t.net += h.net; t.shrink += h.shrink; t.gain += h.gain; t.poor += h.poor; });
    return t;
  }, [shown]);

  // Per warehouse (over the filtered opnames) + days since its last approved opname (any date).
  const byWarehouse = useMemo(() => {
    const m = new Map();
    shown.forEach(h => {
      const w = m.get(h.warehouse) || { warehouse: h.warehouse, opnames: 0, counted: 0, variance: 0, net: 0, shrink: 0, last: null };
      w.opnames += 1; w.counted += h.counted; w.variance += h.varianceLines; w.net += h.net; w.shrink += h.shrink;
      if (!w.last || h.day > w.last) w.last = h.day;
      m.set(h.warehouse, w);
    });
    return [...m.values()].map(w => {
      const lastApproved = all.filter(h => h.warehouse === w.warehouse && h.status === 'Approved').map(h => h.date).sort((a, b) => b - a)[0];
      const days = lastApproved ? Math.round((TODAY - lastApproved) / 86400000) : null;
      return { ...w, accuracy: pct(w.counted - w.variance, w.counted), days };
    }).sort((a, b) => a.accuracy - b.accuracy);
  }, [shown, all]);

  // Per month trend.
  const byMonth = useMemo(() => {
    const m = new Map();
    shown.forEach(h => {
      const key = h.day.slice(0, 7);
      const x = m.get(key) || { key, opnames: 0, counted: 0, variance: 0, shrink: 0 };
      x.opnames += 1; x.counted += h.counted; x.variance += h.varianceLines; x.shrink += h.shrink;
      m.set(key, x);
    });
    return [...m.values()].sort((a, b) => a.key.localeCompare(b.key));
  }, [shown]);
  const maxShrink = Math.max(1, ...byMonth.map(x => x.shrink));

  // Items most often off.
  const byItem = useMemo(() => {
    const m = new Map();
    shown.forEach(h => h.lines.forEach(l => {
      if (l.diff === 0 && l.condition !== 'Poor') return;
      if (q && !l.name.toLowerCase().includes(q)) return;
      const k = `${l.name}|${h.warehouse}`;
      const x = m.get(k) || { name: l.name, warehouse: h.warehouse, times: 0, net: 0, value: 0, poor: 0, note: '', last: '' };
      x.times += 1; x.net += l.diff; x.value += l.value; if (l.condition === 'Poor') x.poor += 1;
      if (h.day >= x.last) { x.last = h.day; x.note = l.note || x.note; }
      m.set(k, x);
    }));
    return [...m.values()].sort((a, b) => a.value - b.value || b.times - a.times).slice(0, printing ? 999 : 15);
  }, [shown, q, printing]);

  function exportCsv() {
    const head = ['Opname', 'Date', 'Warehouse', 'Counted by', 'Status', 'Item', 'System', 'Counted', 'Difference', 'Condition', 'Unit value', 'Difference value', 'Note'];
    const esc = v => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const rows = shown.flatMap(h => h.lines.map(l => [h.id, h.day, h.warehouse, h.appliedBy, h.status, l.name, l.before, l.after, l.diff, l.condition, l.unit, l.value, l.note]));
    const blob = new Blob([[head, ...rows].map(r => r.map(esc).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `stock-opname-report-${iso(TODAY)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  function print() {
    flushSync(() => setPrinting(true));
    window.print();
    setPrinting(false);
  }
  const anyFilter = warehouses.length || status !== 'Approved' || from || to || q;

  return (
    <div className="event-report">
      <div className="rep-head">
        <h1 className="page-title" style={{ margin: 0 }}>Stock Opname Report</h1>
        <div className="rep-head-actions no-print">
          <button className="btn btn-ghost" onClick={() => navigate('/stock-opname')}>New Opname</button>
          <button className="btn btn-ghost" onClick={exportCsv} disabled={shown.length === 0}>Export CSV</button>
          <button className="btn-print" onClick={print}><IconPrint /> Print</button>
        </div>
      </div>
      <p className="cal-intro">
        How accurate our stock records are. <strong>Accuracy</strong> = counted lines whose physical count matched the system.
        <strong> Shrinkage</strong> = value of stock found missing (count lower than the system), at each item&rsquo;s unit value.
        Only <strong>Approved</strong> opnames changed stock, so they are measured by default.
      </p>

      <div className="rep-toolbar no-print">
        <SearchableSelect inline multiple value={warehouses} onChange={setWarehouses} placeholder="All warehouses" options={warehouseOptions} />
        <SearchableSelect inline value={status} onChange={setStatus} placeholder="All statuses"
          options={[{ value: '', label: 'All statuses' }, { value: 'Approved', label: 'Approved' }, { value: 'Rejected', label: 'Rejected' }, { value: 'Pending', label: 'Pending' }]} />
        <label className="event-filter-date">From <input type="date" value={from} max={to || undefined} onChange={e => setFrom(e.target.value)} /></label>
        <label className="event-filter-date">To <input type="date" value={to} min={from || undefined} onChange={e => setTo(e.target.value)} /></label>
        <div className="search-wrap rep-search">
          <IconSearch />
          <input className="search-input" type="text" placeholder="Search item or counter…" value={query} onChange={e => setQuery(e.target.value)} />
        </div>
        {anyFilter ? <button type="button" className="link-btn" onClick={() => { setWarehouses([]); setStatus('Approved'); setFrom(''); setTo(''); setQuery(''); }}>Reset</button> : null}
      </div>

      <div className="kpi-grid rep-kpis">
        {[
          { label: 'Opnames', value: shown.length, sub: `${byWarehouse.length} warehouse${byWarehouse.length === 1 ? '' : 's'}`, accent: 'brand' },
          { label: 'Accuracy', value: `${pct(totals.counted - totals.variance, totals.counted)}%`, sub: `${totals.variance} of ${totals.counted} lines off`, accent: pct(totals.counted - totals.variance, totals.counted) >= 95 ? 'green' : 'orange' },
          { label: 'Net Difference', value: `${totals.net > 0 ? '+' : ''}${totals.net}`, sub: 'pcs, counted vs system', accent: totals.net < 0 ? 'red' : 'green' },
          { label: 'Shrinkage', value: formatIDR(totals.shrink), sub: 'value of stock found missing', accent: 'red' },
          { label: 'Found Extra', value: formatIDR(totals.gain), sub: 'value of stock found extra', accent: 'green' },
          { label: 'Poor Condition', value: totals.poor, sub: 'lines marked Poor', accent: totals.poor ? 'orange' : 'green' },
        ].map(k => (
          <div key={k.label} className={`kpi-card ${k.accent}-accent`}>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value" style={{ fontSize: String(k.value).length > 10 ? 18 : undefined }}>{k.value}</div>
            <div className="kpi-sub">{k.sub}</div>
          </div>
        ))}
      </div>

      <div className="rep-grid">
        <div className="card">
          <div className="rep-section-title">By Warehouse <span className="rep-muted">least accurate first · last approved opname over {STALE_DAYS} days ago is flagged</span></div>
          <div className="table-wrap">
            <table className="rep-area-table">
              <thead><tr><th>Warehouse</th><th className="num">Opnames</th><th className="num">Counted</th><th>Accuracy</th><th className="num">Net</th><th className="num">Shrinkage</th><th>Last approved</th></tr></thead>
              <tbody>
                {byWarehouse.length === 0 && <tr><td colSpan={7} className="rep-empty">No opnames match.</td></tr>}
                {byWarehouse.map(w => (
                  <tr key={w.warehouse}>
                    <td className="name-cell">{w.warehouse}</td>
                    <td className="num">{w.opnames}</td>
                    <td className="num">{w.counted}</td>
                    <td><Acc value={w.accuracy} /></td>
                    <td className="num" style={{ color: w.net < 0 ? 'var(--red)' : 'var(--green)', fontWeight: 700 }}>{w.net > 0 ? '+' : ''}{w.net}</td>
                    <td className="num rep-nowrap">{formatIDR(w.shrink)}</td>
                    <td className="rep-small rep-nowrap">
                      {w.days == null ? '—' : `${w.days} days ago`}
                      {w.days != null && w.days > STALE_DAYS && <span className="badge badge-orange" style={{ fontSize: 10, marginLeft: 6 }}>Due</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card rep-breakdown">
          <div className="rep-section-title">Monthly Trend</div>
          {byMonth.length === 0 && <div className="rep-muted">—</div>}
          {byMonth.map(mo => {
            const [y, m] = mo.key.split('-');
            const acc = pct(mo.counted - mo.variance, mo.counted);
            return (
              <div key={mo.key} className="opr-month">
                <div className="opr-month-head"><strong>{MONTHS[Number(m) - 1]} {y}</strong><span>{mo.opnames} opname{mo.opnames === 1 ? '' : 's'} · {acc}% accurate</span></div>
                <div className="rep-bar-track" title={`Shrinkage ${formatIDR(mo.shrink)}`}><div className="rep-bar-fill" style={{ width: `${(mo.shrink / maxShrink) * 100}%`, background: 'var(--red)' }} /></div>
                <div className="rep-muted">Shrinkage {formatIDR(mo.shrink)}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="rep-section-title">Items Most Often Off <span className="rep-muted">by value lost, then how often · {printing ? 'all' : 'top 15'}</span></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Item</th><th>Warehouse</th><th className="num">Times off</th><th className="num">Net</th><th className="num">Value</th><th className="num">Poor</th><th>Latest note</th></tr></thead>
            <tbody>
              {byItem.length === 0 && <tr><td colSpan={7} className="rep-empty">No differences.</td></tr>}
              {byItem.map(x => (
                <tr key={`${x.name}|${x.warehouse}`}>
                  <td className="name-cell">{x.name}</td>
                  <td className="rep-small">{x.warehouse}</td>
                  <td className="num">{x.times}</td>
                  <td className="num" style={{ color: x.net < 0 ? 'var(--red)' : 'var(--green)', fontWeight: 700 }}>{x.net > 0 ? '+' : ''}{x.net}</td>
                  <td className="num rep-nowrap" style={{ color: x.value < 0 ? 'var(--red)' : 'var(--green)' }}>{formatIDR(Math.abs(x.value))}{x.value < 0 ? ' lost' : x.value > 0 ? ' extra' : ''}</td>
                  <td className="num">{x.poor || '—'}</td>
                  <td className="rep-small rep-muted">{x.note || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="rep-section-title">Opname Log <span className="rep-muted">{shown.length} opname{shown.length === 1 ? '' : 's'} · click a row for its lines</span></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Date</th><th>Warehouse</th><th>Counted by</th><th>Status</th><th className="num">Counted</th><th className="num">Off</th><th>Accuracy</th><th className="num">Net</th><th className="num">Shrinkage</th></tr></thead>
            <tbody>
              {shown.length === 0 && <tr><td colSpan={9} className="rep-empty">No opnames match these filters.</td></tr>}
              {shown.map(h => (
                <Fragment key={h.id}>
                  <tr className="row-clickable" onClick={() => setOpen(o => o === h.id ? null : h.id)}>
                    <td className="rep-nowrap">{h.appliedAt}</td>
                    <td>{h.warehouse}</td>
                    <td>{h.appliedBy}{h.resolvedBy && <div className="rep-muted">{h.status === 'Pending' ? 'waiting' : `${h.status.toLowerCase()} by ${h.resolvedBy}`}</div>}</td>
                    <td><span className={`badge ${STATUS_BADGE[h.status] || 'badge-gray'}`} style={{ fontSize: 11 }}>{h.status}</span></td>
                    <td className="num">{h.counted}</td>
                    <td className="num">{h.varianceLines}</td>
                    <td><Acc value={h.accuracy} /></td>
                    <td className="num" style={{ color: h.net < 0 ? 'var(--red)' : 'var(--green)', fontWeight: 700 }}>{h.net > 0 ? '+' : ''}{h.net}</td>
                    <td className="num rep-nowrap">{formatIDR(h.shrink)}</td>
                  </tr>
                  {(open === h.id || printing) && (
                    <tr className="opr-lines-row">
                      <td colSpan={9}>
                        {h.rejectReason && <div className="opr-reject">Rejected: {h.rejectReason}</div>}
                        <table className="opr-lines">
                          <thead><tr><th>Item</th><th className="num">System</th><th className="num">Counted</th><th className="num">Diff</th><th>Condition</th><th className="num">Value</th><th>Note</th></tr></thead>
                          <tbody>
                            {h.lines.map(l => (
                              <tr key={`${h.id}-${l.rowId}`}>
                                <td>{l.name}</td>
                                <td className="num">{l.before}</td>
                                <td className="num">{l.after}</td>
                                <td className="num" style={{ color: l.diff < 0 ? 'var(--red)' : 'var(--green)', fontWeight: 700 }}>{l.diff > 0 ? '+' : ''}{l.diff}</td>
                                <td><span className={`badge ${l.condition === 'Poor' ? 'badge-orange' : 'badge-gray'}`} style={{ fontSize: 10.5 }}>{l.condition}</span></td>
                                <td className="num rep-nowrap">{l.value ? formatIDR(Math.abs(l.value)) : '—'}</td>
                                <td className="rep-muted">{l.note || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
