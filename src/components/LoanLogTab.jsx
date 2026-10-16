import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Pagination from './Pagination';
import SearchableSelect from './SearchableSelect';
import { IconSearch, IconPlus } from './icons';
import { getAllEventLoans, getGeneralRentals, saveGeneralRentals, loanDisplayStatus, loanTotalCost, LOAN_BADGE, LOAN_STATUSES } from '../lib/eventLoans';
import { getVendorsOfKind } from '../lib/vendorStore';
import { getCatalog } from '../lib/producedItems';
import { initialWarehouses } from '../data/warehouses';
import { addActivityLog } from '../lib/activityLogStore';
import { getCurrentTenantUser } from '../lib/tenantAuth';
import { BorrowItemModal } from './EventLoans';
import { formatIDR } from '../lib/superAdminUtils';
import { TODAY } from '../data/events';
import { fmtNum } from '../lib/format';

const PAGE_SIZE = 15;
const STATUSES = ['Requested', 'Borrowed', 'Overdue', 'Returned'];

function fmt(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Loan → "Borrowed Items": every item WE rent from a loan vendor — for events (moved on Event
// Detail, where receiving adds the item to the event) and general rentals kept in a warehouse
// (created and moved here with "New Rental"; `allowCreate`). Rented items never change our stock.
// Pass `vendorId` to show one vendor's rentals only (loan vendor detail page).
export default function LoanLogTab({ vendorId = null, allowCreate = false }) {
  const currentUser = getCurrentTenantUser();
  const [version, setVersion] = useState(0);
  const [newOpen, setNewOpen] = useState(false);
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [vendorFilter, setVendorFilter] = useState('');
  const [page, setPage] = useState(1);

  const all = useMemo(() => getAllEventLoans()
    .filter(l => vendorId == null || l.vendorId === vendorId)
    .map(l => ({ ...l, displayStatus: loanDisplayStatus(l, TODAY), total: loanTotalCost(l) })), [vendorId, version]); // eslint-disable-line react-hooks/exhaustive-deps -- version re-reads the store after a change
  const warehouses = useMemo(() => [...new Set(initialWarehouses.map(w => w.name))].filter(w => w !== 'Buy').sort(), []);

  function writeGeneral(updater) {
    saveGeneralRentals(updater(getGeneralRentals()));
    setVersion(v => v + 1);
  }
  function log(description) {
    addActivityLog({ userName: currentUser?.name || 'Admin', action: 'Update', module: 'Loan', description });
  }
  function createRental(data) {
    const id = Math.max(0, ...getGeneralRentals().map(r => r.id)) + 1;
    writeGeneral(list => [{ ...data, id, status: 'Requested', requestedBy: currentUser?.name || 'Admin',
      requestedAt: new Date().toLocaleDateString('en-CA'), borrowedAt: null, returnedAt: null }, ...list]);
    log(`New rental: ${data.qty} ${data.unit} "${data.itemName}" from ${data.vendorName}, kept in ${data.warehouse}`);
    setNewOpen(false);
  }
  function advance(l) {
    const next = LOAN_STATUSES[LOAN_STATUSES.indexOf(l.status) + 1];
    if (!next || !window.confirm(`Mark "${l.itemName}" as ${next === 'Borrowed' ? 'received' : 'returned to ' + l.vendorName}?`)) return;
    const today = new Date().toLocaleDateString('en-CA');
    writeGeneral(list => list.map(r => r.id !== l.id ? r : { ...r, status: next, ...(next === 'Borrowed' ? { borrowedAt: today } : { returnedAt: today }) }));
    log(`Rental "${l.itemName}" → ${next}`);
  }
  function cancel(l) {
    if (!window.confirm(`Cancel the rental of "${l.itemName}"?`)) return;
    writeGeneral(list => list.filter(r => r.id !== l.id));
    log(`Cancelled rental "${l.itemName}"`);
  }
  const vendorOptions = useMemo(() => [...new Map(all.map(l => [l.vendorId, l.vendorName])).entries()]
    .sort((a, b) => a[1].localeCompare(b[1])).map(([id, name]) => ({ value: String(id), label: name })), [all]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter(l =>
      (!statusFilter || l.displayStatus === statusFilter) &&
      (!vendorFilter || String(l.vendorId) === vendorFilter) &&
      (!q || [l.itemName, l.vendorName, l.eventName, l.area, l.warehouse, l.purpose].some(v => (v || '').toLowerCase().includes(q)))
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
          <div className="toolbar-right" style={{ fontSize: 12.5, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span>Total rental cost <strong style={{ color: 'var(--text)', marginLeft: 4 }}>{formatIDR(totalCost)}</strong></span>
            {allowCreate && <button className="btn-new" onClick={() => setNewOpen(true)}><IconPlus /> New Rental</button>}
          </div>
        </div>
        <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: '0 0 14px' }}>
          Items we borrow (rent) from loan vendors. Rentals <strong>for an event</strong> are requested and moved forward on
          Event Detail &rarr; Borrow Item. Rentals <strong>kept in a warehouse</strong> (not for one event) are managed here.
          Rented items are not our assets: they never change our stock or asset value.
        </p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th style={{ width: 70, textAlign: 'right' }}>Qty</th>
                {vendorId == null && <th>Vendor</th>}
                <th>For</th>
                <th style={{ width: 190 }}>Period</th>
                <th style={{ width: 130, textAlign: 'right' }}>Rental Cost</th>
                <th style={{ width: 100 }}>Status</th>
                <th style={{ width: 190, textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {pageData.length === 0
                ? <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>No borrowed items found.</td></tr>
                : pageData.map(l => (
                  <tr key={l.uid}>
                    <td className="name-cell">
                      {l.itemName}
                      {l.note && <div style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 400, marginTop: 2 }}>{l.note}</div>}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, whiteSpace: 'nowrap' }}>{fmtNum(l.qty)} <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: 12 }}>{l.unit}</span></td>
                    {vendorId == null && (
                      <td><button type="button" className="link-btn" onClick={() => navigate(`/loan-vendor-detail?id=${l.vendorId}`)}>{l.vendorName}</button></td>
                    )}
                    <td>
                      {l.eventKey ? (
                        <>
                          <button type="button" className="link-btn" onClick={() => navigate(`/event-detail?name=${encodeURIComponent(l.eventKey)}`)}>{l.eventName}</button>
                          <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{l.area}{l.subArea ? ` · ${l.subArea}` : ''}</div>
                        </>
                      ) : (
                        <>
                          <span className="badge badge-gray" style={{ fontSize: 10.5 }}>Warehouse</span> {l.warehouse}
                          {l.purpose && <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{l.purpose}</div>}
                        </>
                      )}
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
                    <td>
                      <div className="action-btns" style={{ justifyContent: 'center', gap: 6 }}>
                        {l.source === 'event' && <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{l.status === 'Returned' ? 'Done' : 'Update in Event Detail'}</span>}
                        {l.source === 'general' && l.status === 'Requested' && (
                          <button type="button" className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => cancel(l)}>Cancel</button>
                        )}
                        {l.source === 'general' && l.status !== 'Returned' && (
                          <button type="button" className="btn-save-modal" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => advance(l)}>
                            {l.status === 'Requested' ? 'Mark Received' : 'Mark Returned'}
                          </button>
                        )}
                        {l.source === 'general' && l.status === 'Returned' && <span style={{ fontSize: 11.5, color: 'var(--green)' }}>Returned</span>}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <Pagination currentPage={safePage} total={filtered.length} pageSize={PAGE_SIZE} onPage={setPage} label="items" />
      </div>

      {newOpen && (
        <BorrowItemModal
          target="warehouse"
          vendors={getVendorsOfKind('loan')}
          warehouses={warehouses}
          catalogNames={getCatalog().map(i => i.name)}
          defaultDate={TODAY.toISOString().slice(0, 10)}
          onClose={() => setNewOpen(false)}
          onSubmit={createRental}
        />
      )}
    </>
  );
}
