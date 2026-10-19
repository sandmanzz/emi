import { useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import VendorFormModal from '../components/VendorFormModal';
import LoanLogTab from '../components/LoanLogTab';
import { IconEdit } from '../components/icons';
import { getVendor, updateVendor } from '../lib/vendorStore';
import { getAllEventLoans, loanTotalCost } from '../lib/eventLoans';
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

// Rent vendor detail (/rent-vendor-detail?id=; "Loan" renamed "Rent" 2026-10-19): the vendor's
// profile (no Internal / External for rent vendors) plus everything we rented from them — which item, how many, for which event, when, and what it cost.
// Records = every rental from this vendor: event rentals (Rent Item) and warehouse rentals.
export default function LoanVendorDetailPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const currentUser = getCurrentTenantUser();
  const id = Number(params.get('id'));
  const [vendor, setVendor] = useState(() => getVendor(id));
  const [editOpen, setEditOpen] = useState(false);

  const loans = useMemo(() => getAllEventLoans().filter(l => l.vendorId === id), [id]);

  if (!vendor) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Vendor not found.</p>
        <button className="btn-new" style={{ marginTop: 12 }} onClick={() => navigate('/rent')}>Back to Rent</button>
      </div>
    );
  }

  const events = new Set(loans.filter(l => l.eventKey).map(l => l.eventKey));
  const totalCost = loans.reduce((s, l) => s + loanTotalCost(l), 0);

  // Per item: total rented, how much is out right now, and for which events.
  const byItem = [...loans.reduce((m, l) => {
    const row = m.get(l.itemName) || { name: l.itemName, unit: l.unit, qty: 0, out: 0, events: new Set() };
    row.qty += Number(l.qty || 0);
    if (l.status === 'Borrowed') row.out += Number(l.qty || 0);
    row.events.add(l.eventName || `${l.warehouse} (warehouse)`);
    m.set(l.itemName, row);
    return m;
  }, new Map()).values()].sort((a, b) => b.qty - a.qty);

  function save(data) {
    updateVendor(vendor.id, data);
    addActivityLog({ userName: currentUser?.name || 'Admin', action: 'Update', module: 'Rent', description: `Updated vendor "${data.name}"` });
    setVendor(getVendor(vendor.id));
    setEditOpen(false);
  }

  return (
    <>
      <div className="detail-header">
        <button
          onClick={() => navigate('/rent')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}><polyline points="15 18 9 12 15 6" /></svg>
          Back
        </button>
        <h1 className="page-title" style={{ margin: 0, flex: 1, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {vendor.name}
          <span className="badge badge-blue" style={{ fontSize: 11 }}>Rent vendor</span>
        </h1>
        <button className="btn btn-ghost" onClick={() => setEditOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <IconEdit /> Edit
        </button>
      </div>

      <div className="grid-2col" style={{ gap: 16, marginBottom: 16 }}>
        <div className="card" style={{ padding: 22 }}>
          <div className="section-dot-label"><span style={{ background: 'var(--brand)' }} />Vendor Info</div>
          <InfoRow label="Phone">{vendor.phone}</InfoRow>
          <InfoRow label="Address">{vendor.address}</InfoRow>
          <InfoRow label="Description">{vendor.description}</InfoRow>
          <InfoRow label="Events served">{events.size ? `${events.size} event${events.size === 1 ? '' : 's'}` : null}</InfoRow>
          <InfoRow label="Rental cost">{totalCost ? formatIDR(totalCost) : null}</InfoRow>
        </div>
        <div className="card" style={{ padding: 22 }}>
          <div className="section-dot-label"><span style={{ background: 'var(--green)' }} />Items Rented</div>
          {byItem.length === 0
            ? <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>Nothing rented from this vendor yet.</p>
            : (
              <ul className="vendor-item-list">
                {byItem.map(r => (
                  <li key={r.name}>
                    <div>
                      <strong>{r.name}</strong>
                      <div className="vendor-item-sub">{[...r.events].join(', ')}</div>
                    </div>
                    <span className="vendor-item-qty">
                      {fmtNum(r.qty)} {r.unit}
                      {r.out > 0 && <em> · {r.out} out now</em>}
                    </span>
                  </li>
                ))}
              </ul>
            )}
        </div>
      </div>

      <div className="section-dot-label"><span style={{ background: 'var(--orange)' }} />Rent History</div>
      <LoanLogTab vendorId={id} />


      {editOpen && <VendorFormModal vendor={vendor} defaultKind="loan" onClose={() => setEditOpen(false)} onSave={save} />}
    </>
  );
}
