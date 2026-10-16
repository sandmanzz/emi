import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import SearchableSelect from '../components/SearchableSelect';
import VendorFormModal from '../components/VendorFormModal';
import { IconSearch, IconPlus, IconEdit, IconDelete } from '../components/icons';
import { getVendors, addVendor, updateVendor, deleteVendor, VENDOR_ORIGINS } from '../lib/vendorStore';
import { getAllProductions } from '../lib/productionRequests';
import { addActivityLog } from '../lib/activityLogStore';
import { getCurrentTenantUser } from '../lib/tenantAuth';

const PAGE_SIZE = 10;

// Vendor CMS — manage the vendors used by Item Loan and by production
// (Event Detail → Request Production, Warehouse Inventory → Production).
// Clicking a row opens /vendor-detail with everything produced by that vendor.
// Data lives in lib/vendorStore.js (localStorage), so changes show up everywhere.
export default function VendorPage() {
  const navigate = useNavigate();
  const currentUser = getCurrentTenantUser();
  const [vendors, setVendors] = useState(() => getVendors());
  const [query, setQuery] = useState('');
  const [originFilter, setOriginFilter] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Production count per vendor id, for the list column.
  const productionCount = useMemo(() => {
    const counts = new Map();
    getAllProductions().forEach(p => { if (p.vendorId) counts.set(p.vendorId, (counts.get(p.vendorId) || 0) + 1); });
    return counts;
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return vendors.filter(v =>
      (!originFilter || v.origin === originFilter) &&
      (!q || [v.name, v.description, v.phone, v.address].some(f => (f || '').toLowerCase().includes(q)))
    );
  }, [vendors, query, originFilter]);

  const safePage = Math.min(page, Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)));
  const pageData = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const internalCount = vendors.filter(v => v.origin === 'Internal').length;

  function log(action, description) {
    addActivityLog({ userName: currentUser?.name || 'Admin', action, module: 'Vendor', description });
  }

  function openNew() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(v) {
    setEditing(v);
    setModalOpen(true);
  }

  function save(data) {
    if (editing) {
      updateVendor(editing.id, data);
      log('Update', `Updated vendor "${data.name}"`);
    } else {
      addVendor(data);
      log('Create', `Added vendor "${data.name}" (${data.origin})`);
    }
    setVendors(getVendors());
    setModalOpen(false);
  }

  function confirmDelete() {
    deleteVendor(deleteTarget.id);
    log('Delete', `Deleted vendor "${deleteTarget.name}"`);
    setVendors(getVendors());
    setDeleteTarget(null);
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
        <h1 className="page-title" style={{ margin: 0 }}>Vendor</h1>
        <button className="btn-new" onClick={openNew}><IconPlus /> New Vendor</button>
      </div>

      <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: -14, marginBottom: 18 }}>
        Vendors are used in Item Loan and for production. Mark each one <strong>Internal</strong> (our own team or workshop)
        or <strong>External</strong>. Click a vendor to see what they have produced for us, and for which event.
      </p>

      <div className="stats-bar" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        {[
          { label: 'Total Vendors', value: vendors.length, color: 'var(--brand)', bg: 'var(--brand-bg)' },
          { label: 'Internal', value: internalCount, color: 'var(--green)', bg: 'var(--green-bg)' },
          { label: 'External', value: vendors.length - internalCount, color: 'var(--orange)', bg: 'var(--orange-bg)' },
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
              <input className="search-input" type="text" placeholder="Search name, description, phone, address…" value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} />
            </div>
            <SearchableSelect
              inline
              value={originFilter}
              onChange={v => { setOriginFilter(v); setPage(1); }}
              placeholder="Internal & External"
              options={[{ value: '', label: 'Internal & External' }, ...VENDOR_ORIGINS.map(o => ({ value: o, label: o }))]}
            />
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th style={{ width: 100 }}>Type</th>
                <th>Description</th>
                <th style={{ width: 140 }}>Phone</th>
                <th>Address</th>
                <th style={{ width: 100, textAlign: 'right' }}>Productions</th>
                <th style={{ width: 90, textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {pageData.length === 0
                ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No vendors found.</td></tr>
                : pageData.map(v => (
                  <tr key={v.id} className="row-clickable" onClick={() => navigate(`/vendor-detail?id=${v.id}`)} title="View vendor detail">
                    <td className="name-cell">{v.name}</td>
                    <td><span className={`badge ${v.origin === 'Internal' ? 'badge-green' : 'badge-orange'}`} style={{ fontSize: 11 }}>{v.origin}</span></td>
                    <td className="cell-clamp">{v.description || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                    <td style={{ color: 'var(--text-2)', fontSize: '12.5px', whiteSpace: 'nowrap' }}>{v.phone || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                    <td className="cell-clamp" style={{ fontSize: '12.5px' }}>{v.address || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{productionCount.get(v.id) || 0}</td>
                    <td onClick={e => e.stopPropagation()}>
                      <div className="action-btns" style={{ justifyContent: 'center' }}>
                        <button className="btn-icon edit" title="Edit" onClick={() => openEdit(v)}><IconEdit /></button>
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

      {modalOpen && <VendorFormModal vendor={editing} onClose={() => setModalOpen(false)} onSave={save} />}

      <Modal
        open={!!deleteTarget}
        title="Delete Vendor"
        onClose={() => setDeleteTarget(null)}
        footer={
          <>
            <button className="btn-cancel-modal" onClick={() => setDeleteTarget(null)}>Cancel</button>
            <button className="btn-del-ok" onClick={confirmDelete}>Delete</button>
          </>
        }
      >
        <p className="confirm-msg">
          Delete <strong>&ldquo;{deleteTarget?.name}&rdquo;</strong>? Existing loans and production records keep the vendor name they were saved with.
        </p>
      </Modal>
    </>
  );
}
