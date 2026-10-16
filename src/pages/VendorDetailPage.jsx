import { useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import SearchableSelect from '../components/SearchableSelect';
import VendorFormModal from '../components/VendorFormModal';
import { IconEdit } from '../components/icons';
import { getVendor, updateVendor } from '../lib/vendorStore';
import { getAllProductions, PRODUCTION_STATUSES, PRODUCTION_BADGE } from '../lib/productionRequests';
import { getCatalog } from '../lib/producedItems';
import { formatIDR } from '../lib/superAdminUtils';
import { addActivityLog } from '../lib/activityLogStore';
import { getCurrentTenantUser } from '../lib/tenantAuth';
import { fmtNum } from '../lib/format';

function InfoRow({ label, children }) {
  return (
    <div className="vendor-info-row">
      <span>{label}</span>
      <div>{children || <span style={{ color: 'var(--text-muted)' }}>—</span>}</div>
    </div>
  );
}

// Vendor detail (/vendor-detail?id=): the vendor's profile plus everything they
// produced for us — which item, how many, for which event, and where it went.
// Productions come from every event's Request Production list and from Warehouse
// Inventory → Production (see getAllProductions in lib/productionRequests.js).
export default function VendorDetailPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const currentUser = getCurrentTenantUser();
  const id = Number(params.get('id'));
  const [vendor, setVendor] = useState(() => getVendor(id));
  const [editOpen, setEditOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');

  const productions = useMemo(() => getAllProductions().filter(p => p.vendorId === id), [id]);
  const valueByName = useMemo(() => new Map(getCatalog().map(i => [i.name, i.itemValue || 0])), []);

  if (!vendor) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Vendor not found.</p>
        <button className="btn-new" style={{ marginTop: 12 }} onClick={() => navigate('/vendor')}>Back to Vendor</button>
      </div>
    );
  }

  const shown = productions.filter(p => !statusFilter || p.status === statusFilter);
  const done = productions.filter(p => p.status === 'Done');
  const qtyProduced = done.reduce((s, p) => s + Number(p.qty || 0), 0);
  // Value of finished production, at today's catalog Item Value (items without a value count as 0).
  const valueProduced = done.reduce((s, p) => s + Number(p.qty || 0) * (valueByName.get(p.name) || 0), 0);
  const events = new Set(productions.filter(p => p.eventKey).map(p => p.eventKey));

  // Per item: how many were made in total, and for which events.
  const byItem = [...productions.reduce((m, p) => {
    const row = m.get(p.name) || { name: p.name, qty: 0, done: 0, events: new Set(), restock: 0 };
    row.qty += Number(p.qty || 0);
    if (p.status === 'Done') row.done += Number(p.qty || 0);
    if (p.eventKey) row.events.add(p.eventName); else row.restock += 1;
    m.set(p.name, row);
    return m;
  }, new Map()).values()].sort((a, b) => b.qty - a.qty);

  function save(data) {
    updateVendor(vendor.id, data);
    addActivityLog({ userName: currentUser?.name || 'Admin', action: 'Update', module: 'Vendor', description: `Updated vendor "${data.name}"` });
    setVendor(getVendor(vendor.id));
    setEditOpen(false);
  }

  return (
    <>
      <div className="detail-header">
        <button
          onClick={() => navigate('/vendor')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}><polyline points="15 18 9 12 15 6" /></svg>
          Back
        </button>
        <h1 className="page-title" style={{ margin: 0, flex: 1, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {vendor.name}
          <span className={`badge ${vendor.origin === 'Internal' ? 'badge-green' : 'badge-orange'}`} style={{ fontSize: 11 }}>{vendor.origin}</span>
        </h1>
        <button className="btn btn-ghost" onClick={() => setEditOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <IconEdit /> Edit
        </button>
      </div>

      <div className="stats-bar" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
        {[
          { label: 'Productions', value: productions.length, color: 'var(--brand)', bg: 'var(--brand-bg)' },
          { label: 'Events Served', value: events.size, color: 'var(--purple)', bg: 'var(--purple-bg)' },
          { label: 'Qty Produced', value: qtyProduced, color: 'var(--green)', bg: 'var(--green-bg)' },
          { label: 'In Progress', value: productions.length - done.length, color: 'var(--orange)', bg: 'var(--orange-bg)' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon" style={{ background: s.bg }}>
              <span className="stat-value" style={{ color: s.color }}>{s.value}</span>
            </div>
            <span className="stat-label">{s.label}</span>
          </div>
        ))}
      </div>

      <div className="grid-2col" style={{ gap: 16, marginBottom: 16 }}>
        <div className="card" style={{ padding: 22 }}>
          <div className="section-dot-label"><span style={{ background: 'var(--brand)' }} />Vendor Info</div>
          <InfoRow label="Type">{vendor.origin === 'Internal' ? 'Internal (our own team)' : 'External (outside vendor)'}</InfoRow>
          <InfoRow label="Phone">{vendor.phone}</InfoRow>
          <InfoRow label="Address">{vendor.address}</InfoRow>
          <InfoRow label="Description">{vendor.description}</InfoRow>
        </div>
        <div className="card" style={{ padding: 22 }}>
          <div className="section-dot-label"><span style={{ background: 'var(--green)' }} />Items Produced</div>
          {byItem.length === 0
            ? <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>Nothing produced by this vendor yet.</p>
            : (
              <ul className="vendor-item-list">
                {byItem.map(r => (
                  <li key={r.name}>
                    <div>
                      <strong>{r.name}</strong>
                      <div className="vendor-item-sub">
                        {[...r.events].join(', ')}{r.events.size && r.restock ? ' · ' : ''}{r.restock ? `${r.restock}× restock` : ''}
                      </div>
                    </div>
                    <span className="vendor-item-qty">{r.done}{r.done !== r.qty && <em> / {fmtNum(r.qty)}</em>}</span>
                  </li>
                ))}
              </ul>
            )}
          {valueProduced > 0 && (
            <div className="vendor-value-note">Value of finished production: <strong>{formatIDR(valueProduced)}</strong> <span>(qty &times; current Item Value)</span></div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="toolbar">
          <div className="toolbar-left">
            <div className="section-dot-label" style={{ margin: 0 }}><span style={{ background: 'var(--orange)' }} />Production History</div>
          </div>
          <div className="toolbar-right">
            <SearchableSelect inline value={statusFilter} onChange={setStatusFilter} placeholder="All Status"
              options={[{ value: '', label: 'All Status' }, ...PRODUCTION_STATUSES.map(s => ({ value: s, label: s }))]} />
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ width: 100 }}>Requested</th>
                <th>Item</th>
                <th style={{ width: 60, textAlign: 'right' }}>Qty</th>
                <th>Event</th>
                <th>Deploy to</th>
                <th style={{ width: 110 }}>Status</th>
                <th style={{ width: 100 }}>Finished</th>
              </tr>
            </thead>
            <tbody>
              {shown.length === 0
                ? <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>No production records.</td></tr>
                : shown.map(p => (
                  <tr key={p.uid}>
                    <td style={{ color: 'var(--text-muted)', fontSize: '12.5px', whiteSpace: 'nowrap' }}>{p.requestedAt}</td>
                    <td className="name-cell">
                      {p.name}
                      {p.reason === 'broken' && <span className="badge badge-red" style={{ fontSize: 10.5, marginLeft: 6 }}>Replaces broken</span>}
                      {p.note && <div style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 400, marginTop: 2 }}>{p.note}</div>}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{fmtNum(p.qty)}</td>
                    <td>
                      {p.eventKey
                        ? <button type="button" className="link-btn" onClick={() => navigate(`/event-detail?name=${encodeURIComponent(p.eventKey)}`)}>{p.eventName}</button>
                        : <span style={{ color: 'var(--text-muted)', fontSize: 12.5 }}>Restock (no event)</span>}
                      {p.area && <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{p.area}</div>}
                    </td>
                    <td>{p.warehouse || '—'}</td>
                    <td><span className={`badge ${PRODUCTION_BADGE[p.status] || 'badge-gray'}`} style={{ fontSize: 11 }}>{p.status}</span></td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '12.5px', whiteSpace: 'nowrap' }}>{p.finishedAt || '—'}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>


      {editOpen && <VendorFormModal vendor={vendor} onClose={() => setEditOpen(false)} onSave={save} />}
    </>
  );
}
