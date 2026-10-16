import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from './Modal';
import Pagination from './Pagination';
import SearchableSelect from './SearchableSelect';
import { IconSearch, IconPlus, IconClose, IconCheck } from './icons';
import {
  getAllProductions, getManualProductions, saveManualProductions,
  PRODUCTION_STATUSES, PRODUCTION_BADGE,
} from '../lib/productionRequests';
import { getVendorsOfKind, VENDOR_ORIGINS } from '../lib/vendorStore';
import { getCatalog, addProducedItem } from '../lib/producedItems';
import { getInventoryRows, addInventoryRow, applyStockMovement } from '../lib/stockOpnameStore';
import { addActivityLog } from '../lib/activityLogStore';
import { getCurrentTenantUser } from '../lib/tenantAuth';

const PAGE_SIZE = 10;
const EMPTY_FORM = { itemMode: 'existing', name: '', newName: '', qty: 1, warehouse: '', vendorOrigin: 'Internal', vendorId: '', note: '' };

// Warehouse Inventory → Production: one list of every item that was produced (or is
// being produced), from two sources:
//  - event  — requests made in Event Detail → Request Production. Read-only here;
//             their status moves on Event Detail, because "Done" also adds the item
//             to that event.
//  - manual — recorded on this tab ("Record Production"), e.g. restocking with no
//             event. Moving one to Done adds its qty to the chosen warehouse
//             (logged in Stock History). An item not in the catalog yet becomes a
//             "Needs setup" draft, same as an event production.
export default function ProductionLogTab({ warehouseNames, onStockChanged }) {
  const navigate = useNavigate();
  const currentUser = getCurrentTenantUser();
  const [list, setList] = useState(() => getAllProductions());
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const vendors = useMemo(() => getVendorsOfKind('production'), [modalOpen]); // eslint-disable-line react-hooks/exhaustive-deps -- re-read when the form opens
  const catalog = useMemo(() => getCatalog(), [modalOpen]); // eslint-disable-line react-hooks/exhaustive-deps -- re-read when the form opens
  const deployWarehouses = warehouseNames.filter(w => w !== 'Buy'); // "Buy" is a placeholder, not a real place

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return list.filter(p =>
      (!statusFilter || p.status === statusFilter) &&
      (!sourceFilter || p.source === sourceFilter) &&
      (!warehouseFilter || p.warehouse === warehouseFilter) &&
      (!q || [p.name, p.vendorName, p.eventName, p.warehouse].some(v => (v || '').toLowerCase().includes(q)))
    );
  }, [list, query, statusFilter, sourceFilter, warehouseFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageData = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const inProgress = list.filter(p => p.status !== 'Done').length;
  const done = list.filter(p => p.status === 'Done');
  const qtyProduced = done.reduce((s, p) => s + Number(p.qty || 0), 0);

  function log(action, description) {
    addActivityLog({ userName: currentUser?.name || 'Admin', action, module: 'Warehouse Inventory', description });
  }

  function writeManual(updater) {
    saveManualProductions(updater(getManualProductions()));
    setList(getAllProductions());
  }

  // --- Record Production form
  const itemName = form.itemMode === 'existing' ? form.name : form.newName.trim();
  const vendorOptions = vendors.filter(v => v.origin === form.vendorOrigin);
  const formValid = itemName && Number(form.qty) >= 1 && form.warehouse && form.vendorId;

  function openNew() {
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function submit() {
    if (!formValid) return;
    const vendor = vendors.find(v => String(v.id) === String(form.vendorId));
    const record = {
      id: Math.max(0, ...getManualProductions().map(r => r.id)) + 1,
      name: itemName, qty: Math.floor(Number(form.qty)), warehouse: form.warehouse,
      vendorOrigin: form.vendorOrigin, vendorId: vendor?.id ?? null, vendorName: vendor?.name || '',
      status: 'Requested', note: form.note.trim(),
      requestedBy: currentUser?.name || 'Admin', requestedAt: new Date().toLocaleDateString('en-CA'),
    };
    writeManual(rs => [record, ...rs]);
    log('Create', `Recorded production of "${record.name}" (${record.qty}) by ${record.vendorName} (${record.vendorOrigin}), deploy to ${record.warehouse}`);
    setModalOpen(false);
    setPage(1);
  }

  // Adds a finished manual production to warehouse stock.
  function stockIn(rec) {
    const by = currentUser?.name || 'Admin';
    const info = { reason: 'Production', eventName: '—', note: `Made by ${rec.vendorName || 'unknown vendor'}`, by };
    const existingRow = getInventoryRows().find(r => r.name === rec.name && r.warehouseName === rec.warehouse);
    if (existingRow) {
      applyStockMovement(existingRow.id, rec.qty, info);
      return;
    }
    const catalogItem = getCatalog().find(i => i.name === rec.name);
    let row;
    if (catalogItem) {
      // Known item, but no stock row in this warehouse yet: open one at 0, then stock in.
      const value = catalogItem.itemValue || 0;
      row = {
        id: Math.max(0, ...getInventoryRows().map(r => r.id)) + 1, name: rec.name, warehouseStock: 0, warehouseName: rec.warehouse,
        itemStock: 0, stokMin: 0, stokUsed: 0, valuation: value, totalValuation: 0, minStatus: 'Not Set',
        flag1: '', flag2: '', asile: '', rack: '', level: '', lantai: '', lorong: '', updatedAt: '-',
      };
    } else {
      // Brand-new item: becomes a "Needs setup" draft in Inventory + Warehouse Inventory.
      const draft = addProducedItem({ name: rec.name, qty: rec.qty, warehouseName: rec.warehouse, vendorName: rec.vendorName, producedFor: '' }).row;
      row = { ...draft, id: Math.max(0, ...getInventoryRows().map(r => r.id)) + 1, itemStock: 0, warehouseStock: 0 };
    }
    addInventoryRow(row);
    applyStockMovement(row.id, rec.qty, info);
  }

  function advance(rec) {
    const nextStatus = PRODUCTION_STATUSES[PRODUCTION_STATUSES.indexOf(rec.status) + 1];
    if (!nextStatus) return;
    if (nextStatus === 'Done') {
      if (!window.confirm(`Mark "${rec.name}" as done? ${rec.qty} will be added to ${rec.warehouse}.`)) return;
      stockIn(rec);
      onStockChanged?.();
    }
    writeManual(rs => rs.map(r => r.id !== rec.id ? r : {
      ...r, status: nextStatus, ...(nextStatus === 'Done' ? { finishedAt: new Date().toLocaleDateString('en-CA') } : {}),
    }));
    log('Update', `Production "${rec.name}" → ${nextStatus}`);
  }

  function cancel(rec) {
    if (!window.confirm(`Cancel the production record for "${rec.name}"?`)) return;
    writeManual(rs => rs.filter(r => r.id !== rec.id));
    log('Delete', `Cancelled production record "${rec.name}"`);
  }

  return (
    <>
      <div className="stats-bar" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 18 }}>
        {[
          { label: 'Production Records', value: list.length, color: 'var(--brand)', bg: 'var(--brand-bg)' },
          { label: 'In Progress', value: inProgress, color: 'var(--orange)', bg: 'var(--orange-bg)' },
          { label: 'Done', value: done.length, color: 'var(--green)', bg: 'var(--green-bg)' },
          { label: 'Qty Produced', value: qtyProduced, color: 'var(--purple)', bg: 'var(--purple-bg)' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon" style={{ background: s.bg }}>
              <span className="stat-value" style={{ color: s.color }}>{s.value}</span>
            </div>
            <span className="stat-label">{s.label}</span>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="toolbar">
          <div className="toolbar-left">
            <div className="search-wrap">
              <IconSearch />
              <input className="search-input" type="text" placeholder="Search item, vendor or event…" value={query}
                onChange={e => { setQuery(e.target.value); setPage(1); }} />
            </div>
            <SearchableSelect inline value={statusFilter} onChange={v => { setStatusFilter(v); setPage(1); }} placeholder="All Status"
              options={[{ value: '', label: 'All Status' }, ...PRODUCTION_STATUSES.map(s => ({ value: s, label: s }))]} />
            <SearchableSelect inline value={sourceFilter} onChange={v => { setSourceFilter(v); setPage(1); }} placeholder="All Sources"
              options={[{ value: '', label: 'All Sources' }, { value: 'event', label: 'For an event' }, { value: 'manual', label: 'Restock (no event)' }]} />
            <SearchableSelect inline value={warehouseFilter} onChange={v => { setWarehouseFilter(v); setPage(1); }} placeholder="All Warehouses"
              options={[{ value: '', label: 'All Warehouses' }, ...deployWarehouses.map(w => ({ value: w, label: w }))]} />
          </div>
          <div className="toolbar-right">
            <button className="btn-new" onClick={openNew}><IconPlus /> Record Production</button>
          </div>
        </div>

        <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: '0 0 14px' }}>
          Every item produced by an internal or external vendor. Event productions are requested and moved forward in
          Event Detail &rarr; Request Production. Use &ldquo;Record Production&rdquo; for production that isn&rsquo;t for an event.
          When a record is marked Done, its quantity is added to the warehouse (see Stock History).
        </p>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ width: 100 }}>Requested</th>
                <th>Item</th>
                <th style={{ width: 60, textAlign: 'right' }}>Qty</th>
                <th>Vendor</th>
                <th>Event</th>
                <th>Deploy to</th>
                <th style={{ width: 110 }}>Status</th>
                <th style={{ width: 100 }}>Finished</th>
                <th style={{ width: 170, textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {pageData.length === 0
                ? <tr><td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>No production records found.</td></tr>
                : pageData.map(p => {
                  const nextStatus = PRODUCTION_STATUSES[PRODUCTION_STATUSES.indexOf(p.status) + 1];
                  return (
                    <tr key={p.uid}>
                      <td style={{ color: 'var(--text-muted)', fontSize: '12.5px', whiteSpace: 'nowrap' }}>{p.requestedAt}</td>
                      <td className="name-cell">
                        {p.name}
                        {p.reason === 'broken' && <span className="badge badge-red" style={{ fontSize: 10.5, marginLeft: 6 }}>Replaces broken</span>}
                        {p.note && <div style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 400, marginTop: 2 }}>{p.note}</div>}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{p.qty}</td>
                      <td>
                        {p.vendorId
                          ? <button type="button" className="link-btn" onClick={() => navigate(`/vendor-detail?id=${p.vendorId}`)}>{p.vendorName}</button>
                          : (p.vendorName || '—')}
                        {p.vendorOrigin && <div><span className={`badge ${p.vendorOrigin === 'Internal' ? 'badge-green' : 'badge-orange'}`} style={{ fontSize: 10.5 }}>{p.vendorOrigin}</span></div>}
                      </td>
                      <td>
                        {p.eventKey
                          ? <button type="button" className="link-btn" onClick={() => navigate(`/event-detail?name=${encodeURIComponent(p.eventKey)}`)}>{p.eventName}</button>
                          : <span style={{ color: 'var(--text-muted)', fontSize: 12.5 }}>Restock (no event)</span>}
                        {p.area && <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{p.area}</div>}
                      </td>
                      <td>{p.warehouse || '—'}</td>
                      <td><span className={`badge ${PRODUCTION_BADGE[p.status] || 'badge-gray'}`} style={{ fontSize: 11 }}>{p.status}</span></td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '12.5px', whiteSpace: 'nowrap' }}>{p.finishedAt || '—'}</td>
                      <td>
                        <div className="action-btns" style={{ justifyContent: 'center', gap: 6 }}>
                          {p.source === 'event' && (
                            <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{p.status === 'Done' ? 'Done' : 'Update in Event Detail'}</span>
                          )}
                          {p.source === 'manual' && p.status === 'Requested' && (
                            <button type="button" className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => cancel(p)}>Cancel</button>
                          )}
                          {p.source === 'manual' && nextStatus && (
                            <button type="button" className="btn-save-modal" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => advance(p)}>
                              {nextStatus === 'In Production' ? 'Start' : 'Mark Done'}
                            </button>
                          )}
                          {p.source === 'manual' && !nextStatus && <span style={{ fontSize: 11.5, color: 'var(--green)' }}>Added to stock</span>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
        <Pagination currentPage={safePage} total={filtered.length} pageSize={PAGE_SIZE} onPage={setPage} label="records" />
      </div>

      <Modal
        open={modalOpen}
        title="Record Production"
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <button className="btn-cancel-modal" onClick={() => setModalOpen(false)}><IconClose /> Cancel</button>
            <button className="btn-save-modal" onClick={submit} disabled={!formValid}><IconCheck /> Save</button>
          </>
        }
      >
        <div className="form-group">
          <label>Item <span style={{ color: 'var(--red)' }}>*</span></label>
          <div className="seg-choice" role="radiogroup" aria-label="Item type" style={{ marginBottom: 8 }}>
            {[['existing', 'Existing item'], ['new', 'New item']].map(([v, l]) => (
              <button key={v} type="button" role="radio" aria-checked={form.itemMode === v} className={form.itemMode === v ? 'active' : ''}
                onClick={() => setForm(f => ({ ...f, itemMode: v }))}>{l}</button>
            ))}
          </div>
          {form.itemMode === 'existing'
            ? <SearchableSelect value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="Search the inventory catalog"
                options={catalog.map(i => ({ value: i.name, label: i.name, meta: i.category || '' }))} />
            : <input type="text" placeholder="Name of the new item" value={form.newName} onChange={e => setForm(f => ({ ...f, newName: e.target.value }))} />}
          {form.itemMode === 'new' && (
            <p style={{ fontSize: 11.5, color: 'var(--text-muted)', margin: '5px 0 0' }}>When done, a draft item is created in Inventory marked &ldquo;Needs setup&rdquo;.</p>
          )}
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Quantity <span style={{ color: 'var(--red)' }}>*</span></label>
            <input type="number" min="1" value={form.qty} onChange={e => setForm(f => ({ ...f, qty: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Deploy to Warehouse <span style={{ color: 'var(--red)' }}>*</span></label>
            <SearchableSelect value={form.warehouse} onChange={v => setForm(f => ({ ...f, warehouse: v }))} placeholder="Select warehouse"
              options={deployWarehouses.map(w => ({ value: w, label: w }))} />
          </div>
        </div>
        <div className="form-group">
          <label>Made by <span style={{ color: 'var(--red)' }}>*</span></label>
          <div className="seg-choice" role="radiogroup" aria-label="Vendor origin" style={{ marginBottom: 8 }}>
            {VENDOR_ORIGINS.map(o => (
              <button key={o} type="button" role="radio" aria-checked={form.vendorOrigin === o} className={form.vendorOrigin === o ? 'active' : ''}
                onClick={() => setForm(f => ({ ...f, vendorOrigin: o, vendorId: '' }))}>
                {o === 'Internal' ? 'Internal vendor' : 'External vendor'}
              </button>
            ))}
          </div>
          <SearchableSelect value={form.vendorId} onChange={v => setForm(f => ({ ...f, vendorId: v }))}
            placeholder={`Select ${form.vendorOrigin.toLowerCase()} vendor`}
            options={vendorOptions.map(v => ({ value: String(v.id), label: v.name, meta: v.phone || '' }))} />
        </div>
        <div className="form-group">
          <label>Note</label>
          <textarea rows={2} placeholder="Optional" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
        </div>
      </Modal>
    </>
  );
}
