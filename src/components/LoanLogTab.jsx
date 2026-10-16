import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Pagination from './Pagination';
import SearchableSelect from './SearchableSelect';
import { IconSearch } from './icons';
import { getAllEventLoans, loanDisplayStatus, loanTotalCost, LOAN_BADGE } from '../lib/eventLoans';
import { formatIDR } from '../lib/superAdminUtils';
import { TODAY } from '../data/events';

const PAGE_SIZE = 15;
const STATUSES = ['Requested', 'Borrowed', 'Overdue', 'Returned'];

function fmt(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Loan → "Borrowed Items": every item borrowed from a loan vendor, across all events.
// Read-only; status moves on Event Detail (receiving adds the item to that event).
// Pass `vendorId` to show one vendor's loans only (used on the loan vendor detail page).
export default function LoanLogTab({ vendorId = null }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [vendorFilter, setVendorFilter] = useState('');
  const [page, setPage] = useState(1);

  const all = useMemo(() => getAllEventLoans()
    .filter(l => vendorId == null || l.vendorId === vendorId)
    .map(l => ({ ...l, displayStatus: loanDisplayStatus(l, TODAY), total: loanTotalCost(l) })), [vendorId]);
  const vendorOptions = useMemo(() => [...new Map(all.map(l => [l.vendorId, l.vendorName])).entries()]
    .sort((a, b) => a[1].localeCompare(b[1])).map(([id, name]) => ({ value: String(id), label: name })), [all]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter(l =>
      (!statusFilter || l.displayStatus === statusFilter) &&
      (!vendorFilter || String(l.vendorId) === vendorFilter) &&
      (!q || [l.itemName, l.vendorName, l.eventName, l.area].some(v => (v || '').toLowerCase().includes(q)))
    );
  }, [all, query, statusFilter, vendorFilter]);

  const safePage = Math.min(page, Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)));
  const pageData = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const out = all.filter(l => l.status === 'Borrowed');
  const overdue = all.filter(l => l.displayStatus === 'Overdue').length;
  const totalCost = all.reduce((s, l) => s + l.total, 0);

  return (
    <>
      <div className="stats-bar" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 18 }}>
        {[
          { label: 'Loan Records', value: all.length, color: 'var(--brand)', bg: 'var(--brand-bg)' },
          { label: 'Currently Borrowed', value: out.length, color: 'var(--purple)', bg: 'var(--purple-bg)' },
          { label: 'Overdue', value: overdue, color: 'var(--red)', bg: 'var(--red-bg)' },
          { label: 'Waiting to Arrive', value: all.filter(l => l.status === 'Requested').length, color: 'var(--orange)', bg: 'var(--orange-bg)' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon" style={{ background: s.bg }}><span className="stat-value" style={{ color: s.color }}>{s.value}</span></div>
            <span className="stat-label">{s.label}</span>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="toolbar">
          <div className="toolbar-left">
            <div className="search-wrap">
              <IconSearch />
              <input className="search-input" type="text" placeholder="Search item, vendor, event or area…" value={query}
                onChange={e => { setQuery(e.target.value); setPage(1); }} />
            </div>
            <SearchableSelect inline value={statusFilter} onChange={v => { setStatusFilter(v); setPage(1); }} placeholder="All Status"
              options={[{ value: '', label: 'All Status' }, ...STATUSES.map(s => ({ value: s, label: s }))]} />
            {vendorId == null && (
              <SearchableSelect inline value={vendorFilter} onChange={v => { setVendorFilter(v); setPage(1); }} placeholder="All Vendors"
                options={[{ value: '', label: 'All Vendors' }, ...vendorOptions]} />
            )}
          </div>
          <div className="toolbar-right" style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
            Total rental cost <strong style={{ color: 'var(--text)', marginLeft: 4 }}>{formatIDR(totalCost)}</strong>
          </div>
        </div>
        <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: '0 0 14px' }}>
          Items borrowed (rented) from loan vendors for events. They are requested and moved forward on Event Detail &rarr; Borrow Item.
        </p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th style={{ width: 70, textAlign: 'right' }}>Qty</th>
                {vendorId == null && <th>Vendor</th>}
                <th>Event</th>
                <th style={{ width: 190 }}>Period</th>
                <th style={{ width: 130, textAlign: 'right' }}>Rental Cost</th>
                <th style={{ width: 100 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {pageData.length === 0
                ? <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>No borrowed items found.</td></tr>
                : pageData.map(l => (
                  <tr key={l.uid}>
                    <td className="name-cell">
                      {l.itemName}
                      {l.note && <div style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 400, marginTop: 2 }}>{l.note}</div>}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, whiteSpace: 'nowrap' }}>{l.qty} <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: 12 }}>{l.unit}</span></td>
                    {vendorId == null && (
                      <td><button type="button" className="link-btn" onClick={() => navigate(`/loan-vendor-detail?id=${l.vendorId}`)}>{l.vendorName}</button></td>
                    )}
                    <td>
                      <button type="button" className="link-btn" onClick={() => navigate(`/event-detail?name=${encodeURIComponent(l.eventKey)}`)}>{l.eventName}</button>
                      <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{l.area}{l.subArea ? ` · ${l.subArea}` : ''}</div>
                    </td>
                    <td style={{ fontSize: 12.5, whiteSpace: 'nowrap' }}>
                      {fmt(l.startDate)} → {fmt(l.dueDate)}
                      {l.returnedAt && <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Returned {fmt(l.returnedAt)}</div>}
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                      {l.total ? formatIDR(l.total) : '—'}
                      {l.rentalCost > 0 && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatIDR(l.rentalCost)} / {l.unit}</div>}
                    </td>
                    <td><span className={`badge ${LOAN_BADGE[l.displayStatus]}`} style={{ fontSize: 11 }}>{l.displayStatus}</span></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <Pagination currentPage={safePage} total={filtered.length} pageSize={PAGE_SIZE} onPage={setPage} label="items" />
      </div>
    </>
  );
}
