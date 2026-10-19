import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import SearchableSelect from '../components/SearchableSelect';
import VendorFormModal from '../components/VendorFormModal';
import ProductionLogTab from '../components/ProductionLogTab';
import LoanLogTab from '../components/LoanLogTab';
import { IconSearch, IconPlus, IconEdit, IconDelete } from '../components/icons';
import { getVendorsOfKind, addVendor, updateVendor, deleteVendor, VENDOR_ORIGINS } from '../lib/vendorStore';
import { getAllProductions } from '../lib/productionRequests';
import { getAllEventLoans } from '../lib/eventLoans';
import { initialWarehouses } from '../data/warehouses';
import { addActivityLog } from '../lib/activityLogStore';
import { getCurrentTenantUser } from '../lib/tenantAuth';
import { fmtNum } from '../lib/format';

const PAGE_SIZE = 10;

// One CMS page, two menus:
//  kind="production" — Master Data → Production (/vendor): vendors who make items for us.
//                      Tabs: Vendors | Produced Items (every production request).
//  kind="loan"       — Master Data → Rent (/rent): vendors we rent items from. ("Loan" was
//                      renamed "Rent" on 2026-10-19; the code value stays 'loan'.)
//                      Tabs: Vendors | Rented Items (every event + warehouse rental).
// A vendor can be in both (its `kinds`). Rows open /vendor-detail or /rent-vendor-detail.
// Rent vendors show no Internal / External (we always rent from outside).
// A vendor with ACTIVE records cannot be deleted (or removed from this list):
//  rent = a rental still Requested or Rented; production = a production not Done yet.
// Data lives in lib/vendorStore.js (localStorage), so changes show up everywhere.
const CONFIG = {
  production: {
    title: 'Production', newLabel: 'New Production Vendor', itemsTab: 'Produced Items', countLabel: 'Productions', detail: '/vendor-detail',
    activeNoun: 'production', activeStates: 'Requested or In Production',
    intro: <>Vendors who <strong>produce</strong> items for us (Event Detail &rarr; Request Production, or Produced Items &rarr; new production). Mark each one <strong>Internal</strong> (our own team or workshop) or <strong>External</strong>. Click a vendor to see what they made and for which event.</>,
  },
  loan: {
    title: 'Rent', newLabel: 'New Rent Vendor', itemsTab: 'Rented Items', countLabel: 'Rentals', detail: '/rent-vendor-detail',
    activeNoun: 'rental', activeStates: 'Requested or Rented',
    intro: <>Vendors we <strong>rent</strong> items from (Event Detail &rarr; Rent Item). Click a vendor to see what we rented from them and for which event. Rentals not tied to an event are made in Rented Items &rarr; New Rental.</>,
  },
};

export default function VendorPage({ kind = 'production' }) {
  const cfg = CONFIG[kind];
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'items' ? 'items' : 'vendors';
  const currentUser = getCurrentTenantUser();
  const [vendors, setVendors] = useState(() => getVendorsOfKind(kind));
  const [query, setQuery] = useState('');
  const [originFilter, setOriginFilter] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const isRent = kind === 'loan';
  // Productions / rentals per vendor id (list column), and how many are still active (delete guard).
  const { recordCount, activeCount } = useMemo(() => {
    const counts = new Map();
    const active = new Map();
    const isActive = isRent ? r => r.status === 'Requested' || r.status === 'Borrowed' : r => r.status !== 'Done';
    (isRent ? getAllEventLoans() : getAllProductions()).forEach(r => {
      if (!r.vendorId) return;
      counts.set(r.vendorId, (counts.get(r.vendorId) || 0) + 1);
      if (isActive(r)) active.set(r.vendorId, (active.get(r.vendorId) || 0) + 1);
    });
    return { recordCount: counts, activeCount: active };
  }, [isRent]);
  const deleteBlocked = deleteTarget ? activeCount.get(deleteTarget.id) || 0 : 0;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return vendors.filter(v =>
      (isRent || !originFilter || v.origin === originFilter) &&
      (!q || [v.name, v.description, v.phone, v.address].some(f => (f || '').toLowerCase().includes(q)))
    );
  }, [vendors, query, originFilter, isRent]);

  const safePage = Math.min(page, Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)));
  const pageData = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const internalCount = vendors.filter(v => v.origin === 'Internal').length;
  const warehouseNames = useMemo(() => [...new Set(initialWarehouses.map(w => w.name))].sort(), []);

  function setTab(next) {
    setParams(next === 'items' ? { tab: 'items' } : {}, { replace: true });
  }

  function log(action, description) {
    addActivityLog({ userName: currentUser?.name || 'Admin', action, module: cfg.title, description });
  }

  function save(data) {
    if (editing) {
      updateVendor(editing.id, data);
      log('Update', `Updated vendor "${data.name}"`);
    } else {
      addVendor(data);
      log('Create', isRent ? `Added rent vendor "${data.name}"` : `Added vendor "${data.name}" (${data.origin})`);
    }
    setVendors(getVendorsOfKind(kind));
    setModalOpen(false);
  }

  // A vendor in both CMSs is only removed from this one; otherwise it is deleted.
  function confirmDelete() {
    const v = deleteTarget;
    if (activeCount.get(v.id)) return;
    if (v.kinds.length > 1) {
      updateVendor(v.id, { kinds: v.kinds.filter(k => k !== kind) });
      log('Update', `Removed vendor "${v.name}" from the ${cfg.title} list`);
    } else {
      deleteVendor(v.id);
      log('Delete', `Deleted vendor "${v.name}"`);
    }
    setVendors(getVendorsOfKind(kind));
    setDeleteTarget(null);
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
        <h1 className="page-title" style={{ margin: 0 }}>{cfg.title}</h1>
        {tab === 'vendors' && <button className="btn-new" onClick={() => { setEditing(null); setModalOpen(true); }}><IconPlus /> {cfg.newLabel}</button>}
      </div>

      <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: -14, marginBottom: 18 }}>{cfg.intro}</p>

      <div className="wi-tabs">
        {[{ id: 'vendors', label: 'Vendors' }, { id: 'items', label: cfg.itemsTab }].map(t => (
          <button key={t.id} className={`wi-tab-btn${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {tab === 'items' && (kind === 'loan'
        ? <LoanLogTab allowCreate />
        : <ProductionLogTab warehouseNames={warehouseNames} />)}

      {tab === 'vendors' && (
        <>
          <div className="stats-bar" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
            {(isRent ? [
              { label: 'Total Vendors', value: vendors.length, color: 'var(--brand)', bg: 'var(--brand-bg)' },
              { label: 'Rentals', value: [...recordCount.values()].reduce((a, b) => a + b, 0), color: 'var(--purple)', bg: 'var(--purple-bg)' },
              { label: 'Active Rentals', value: [...activeCount.values()].reduce((a, b) => a + b, 0), color: 'var(--orange)', bg: 'var(--orange-bg)' },
            ] : [
              { label: 'Total Vendors', value: vendors.length, color: 'var(--brand)', bg: 'var(--brand-bg)' },
              { label: 'Internal', value: internalCount, color: 'var(--green)', bg: 'var(--green-bg)' },
              { label: 'External', value: vendors.length - internalCount, color: 'var(--orange)', bg: 'var(--orange-bg)' },
            ]).map(s => (
              <div key={s.label} className="stat-card">
                <div className="stat-icon" style={{ background: s.bg }}>
                  <span className="stat-value" style={{ color: s.color }}>{fmtNum(s.value)}</span>
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
                  <input className="search-input" type="text" placeholder="Search name, description, phone, address…" value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} />
                </div>
                {!isRent && <SearchableSelect
                  inline
                  value={originFilter}
                  onChange={v => { setOriginFilter(v); setPage(1); }}
                  placeholder="Internal & External"
                  options={[{ value: '', label: 'Internal & External' }, ...VENDOR_ORIGINS.map(o => ({ value: o, label: o }))]}
                />}
              </div>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    {!isRent && <th style={{ width: 100 }}>Type</th>}
                    <th>Description</th>
                    <th style={{ width: 140 }}>Phone</th>
                    <th>Address</th>
                    <th style={{ width: 100, textAlign: 'right' }}>{cfg.countLabel}</th>
                    <th style={{ width: 90, textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pageData.length === 0
                    ? <tr><td colSpan={isRent ? 6 : 7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No vendors found.</td></tr>
                    : pageData.map(v => (
                      <tr key={v.id} className="row-clickable" onClick={() => navigate(`${cfg.detail}?id=${v.id}`)} title="View vendor detail">
                        <td className="name-cell">
                          {v.name}
                          {v.kinds.length > 1 && <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>Production &amp; Rent vendor</div>}
                        </td>
                        {!isRent && <td><span className={`badge ${v.origin === 'Internal' ? 'badge-green' : 'badge-orange'}`} style={{ fontSize: 11 }}>{v.origin}</span></td>}
                        <td className="cell-clamp">{v.description || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                        <td style={{ color: 'var(--text-2)', fontSize: '12.5px', whiteSpace: 'nowrap' }}>{v.phone || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                        <td className="cell-clamp" style={{ fontSize: '12.5px' }}>{v.address || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                          {fmtNum(recordCount.get(v.id) || 0)}
                          {activeCount.get(v.id) > 0 && <div style={{ fontSize: 11, color: 'var(--orange)', fontWeight: 500 }}>{fmtNum(activeCount.get(v.id))} active</div>}
                        </td>
                        <td onClick={e => e.stopPropagation()}>
                          <div className="action-btns" style={{ justifyContent: 'center' }}>
                            <button className="btn-icon edit" title="Edit" onClick={() => { setEditing(v); setModalOpen(true); }}><IconEdit /></button>
                            <button className="btn-icon delete" title="Delete" onClick={() => setDeleteTarget(v)}><IconDelete /></button>
                          </div>
                        </td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
            <Pagination currentPage={safePage} total={filtered.length} pageSize={PAGE_SIZE} onPage={setPage} label="vendors" />
          </div>
        </>
      )}

      {modalOpen && <VendorFormModal vendor={editing} defaultKind={kind} onClose={() => setModalOpen(false)} onSave={save} />}

      <Modal
        open={!!deleteTarget}
        title={deleteBlocked ? 'Vendor can’t be deleted' : 'Delete Vendor'}
        onClose={() => setDeleteTarget(null)}
        footer={
          <>
            <button className="btn-cancel-modal" onClick={() => setDeleteTarget(null)}>{deleteBlocked ? 'Close' : 'Cancel'}</button>
            {!deleteBlocked && <button className="btn-del-ok" onClick={confirmDelete}>{deleteTarget?.kinds.length > 1 ? 'Remove' : 'Delete'}</button>}
          </>
        }
      >
        <p className="confirm-msg">
          {deleteBlocked
            ? <><strong>&ldquo;{deleteTarget?.name}&rdquo;</strong> still has {fmtNum(deleteBlocked)} active {cfg.activeNoun}{deleteBlocked === 1 ? '' : 's'} ({cfg.activeStates}). Finish or cancel {deleteBlocked === 1 ? 'it' : 'them'} first ({cfg.itemsTab} tab), then delete the vendor.</>
            : deleteTarget?.kinds.length > 1
            ? <>Remove <strong>&ldquo;{deleteTarget?.name}&rdquo;</strong> from the {cfg.title} list? It stays a vendor in the other list.</>
            : <>Delete <strong>&ldquo;{deleteTarget?.name}&rdquo;</strong>? Past rentals and production records keep the vendor name they were saved with.</>}
        </p>
      </Modal>
    </>
  );
}
