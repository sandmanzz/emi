import { useState, useMemo } from 'react';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import SearchableSelect from '../components/SearchableSelect';
import { IconSearch, IconPlus, IconEdit, IconDelete, IconClose, IconCheck } from '../components/icons';
import { getVendors, addVendor, updateVendor, deleteVendor, VENDOR_ORIGINS } from '../lib/vendorStore';
import { addActivityLog } from '../lib/activityLogStore';
import { getCurrentTenantUser } from '../lib/tenantAuth';

const PAGE_SIZE = 10;
const EMPTY_FORM = { name: '', contact: '', type: '', origin: 'External' };

// Vendor CMS — manage the vendors used by Item Loan and by Request Production.
// Data lives in lib/vendorStore.js (localStorage), so changes show up everywhere.
export default function VendorPage() {
  const currentUser = getCurrentTenantUser();
  const [vendors, setVendors] = useState(() => getVendors());
  const [query, setQuery] = useState('');
  const [originFilter, setOriginFilter] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return vendors.filter(v =>
      (!originFilter || v.origin === originFilter) &&
      (!q || v.name.toLowerCase().includes(q) || (v.type || '').toLowerCase().includes(q) || (v.contact || '').toLowerCase().includes(q))
    );
  }, [vendors, query, originFilter]);

  const safePage = Math.min(page, Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)));
  const pageData = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const internalCount = vendors.filter(v => v.origin === 'Internal').length;

  function log(action, description) {
    addActivityLog({ userName: currentUser?.name || 'Admin', action, module: 'Vendor', description });
  }

  function openNew() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(v) {
    setEditingId(v.id);
    setForm({ name: v.name, contact: v.contact || '', type: v.type || '', origin: v.origin });
    setModalOpen(true);
  }

  function save() {
    if (!form.name.trim()) return;
    const data = { name: form.name.trim(), contact: form.contact.trim(), type: form.type.trim(), origin: form.origin };
    if (editingId) {
      updateVendor(editingId, data);
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
        Vendors are used in Item Loan and when requesting production for an event.
        Mark each one <strong>Internal</strong> (our own team or workshop) or <strong>External</strong>.
        Production requests list vendors by that choice.
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
              <input className="search-input" type="text" placeholder="Search vendor…" value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} />
            </div>
            <div style={{ width: 160 }}>
              <SearchableSelect
                value={originFilter}
                onChange={v => { setOriginFilter(v); setPage(1); }}
                placeholder="All Origins"
                options={[{ value: '', label: 'All Origins' }, ...VENDOR_ORIGINS.map(o => ({ value: o, label: o }))]}
              />
            </div>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th style={{ width: 120 }}>Origin</th>
                <th>Category</th>
                <th>Contact</th>
                <th style={{ width: 100, textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {pageData.length === 0
                ? <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No vendors found.</td></tr>
                : pageData.map(v => (
                  <tr key={v.id}>
                    <td className="name-cell">{v.name}</td>
                    <td><span className={`badge ${v.origin === 'Internal' ? 'badge-green' : 'badge-orange'}`} style={{ fontSize: 11 }}>{v.origin}</span></td>
                    <td style={{ color: 'var(--text-2)' }}>{v.type || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                    <td style={{ color: 'var(--text-2)', fontSize: '12.5px' }}>{v.contact || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                    <td>
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

      <Modal
        open={modalOpen}
        title={editingId ? 'Edit Vendor' : 'New Vendor'}
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <button className="btn-cancel-modal" onClick={() => setModalOpen(false)}><IconClose /> Cancel</button>
            <button className="btn-save-modal" onClick={save} disabled={!form.name.trim()}><IconCheck /> Save</button>
          </>
        }
      >
        <div className="form-group">
          <label>Vendor Name <span style={{ color: 'var(--red)' }}>*</span></label>
          <input type="text" placeholder="e.g. Bengkel Kayu Jaya" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        </div>
        <div className="form-group">
          <label>Origin <span style={{ color: 'var(--red)' }}>*</span></label>
          <SearchableSelect
            value={form.origin}
            onChange={v => setForm(f => ({ ...f, origin: v }))}
            options={VENDOR_ORIGINS.map(o => ({ value: o, label: o }))}
          />
          <p style={{ fontSize: 11.5, color: 'var(--text-muted)', margin: '5px 0 0' }}>Internal = our own team or workshop. External = outside company or freelancer.</p>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Category</label>
            <input type="text" placeholder="e.g. Carpentry" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Contact</label>
            <input type="text" placeholder="Phone or email" value={form.contact} onChange={e => setForm(f => ({ ...f, contact: e.target.value }))} />
          </div>
        </div>
      </Modal>

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
          Delete <strong>&ldquo;{deleteTarget?.name}&rdquo;</strong>? Existing loans and production requests keep the vendor name they were saved with.
        </p>
      </Modal>
    </>
  );
}
