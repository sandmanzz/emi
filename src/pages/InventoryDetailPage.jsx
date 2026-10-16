import { useSearchParams, useNavigate } from 'react-router-dom';
import { IconEdit, IconDelete } from '../components/icons';
import { useState } from 'react';
import Modal from '../components/Modal';
import ItemFormModal from '../components/ItemFormModal';
import { getCatalog } from '../lib/producedItems';
import { deleteCatalogItem } from '../lib/catalogStore';
import { getStockMovements } from '../lib/stockOpnameStore';
import { addActivityLog } from '../lib/activityLogStore';
import { getCurrentTenantUser } from '../lib/tenantAuth';
import { getAllProductions, PRODUCTION_BADGE } from '../lib/productionRequests';
import { formatIDR } from '../lib/superAdminUtils';


function statusBadge(s) {
  if (s === 'Available')    return <span className="badge badge-green">{s}</span>;
  if (s === 'Low Stock')    return <span className="badge badge-orange">{s}</span>;
  if (s === 'Out of Stock') return <span className="badge badge-red">{s}</span>;
  return <span className="badge badge-gray">{s}</span>;
}

function Field({ label, value }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
      <span style={{ fontSize:11.5, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.05em' }}>{label}</span>
      <span style={{ fontSize:14, color:'var(--text)', fontWeight:500 }}>{value || <span style={{ color:'var(--border)' }}>—</span>}</span>
    </div>
  );
}

export default function InventoryDetailPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const id = parseInt(params.get('id'));
  const currentUser = getCurrentTenantUser();
  const [version, setVersion] = useState(0); // bump to re-read the catalog after an edit
  // Same catalog as the Inventory listing; stock fields are derived from Warehouse Inventory rows.
  const item = version >= 0 ? getCatalog().find(r => r.id === id) : null;
  const productions = item ? getAllProductions().filter(p => p.name === item.name) : [];
  const movements = item ? getStockMovements().filter(m => m.itemName === item.name).slice(0, 12) : [];

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  function confirmDelete() {
    if (deleteCatalogItem(item.id)) {
      addActivityLog({ userName: currentUser?.name || 'Admin', action: 'Delete', module: 'Inventory', description: `Deleted item "${item.name}"` });
      navigate('/inventory');
    }
    setDeleteOpen(false);
  }

  if (!item) {
    return (
      <div style={{ padding:40, textAlign:'center' }}>
        <p style={{ color:'var(--text-muted)', fontSize:14 }}>Item not found.</p>
        <button className="btn-new" style={{ marginTop:12 }} onClick={() => navigate('/inventory')}>Back to Inventory</button>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="detail-header">
        <button
          onClick={() => navigate('/inventory')}
          style={{ display:'flex', alignItems:'center', gap:6, background:'none', border:'1px solid var(--border)', borderRadius:8, padding:'6px 12px', cursor:'pointer', fontSize:13, color:'var(--text-muted)', fontWeight:500 }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width:14, height:14 }}>
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Back
        </button>
        <h1 className="page-title" style={{ margin:0, flex:1 }}>{item.name}</h1>
        <button className="btn-icon edit" title="Edit" onClick={() => setEditOpen(true)} style={{ padding:'8px 14px', display:'flex', alignItems:'center', gap:6, border:'1px solid var(--border)', borderRadius:8, fontSize:13, fontWeight:500 }}>
          <IconEdit /> Edit
        </button>
        <button className="btn-icon delete" title="Delete" onClick={() => setDeleteOpen(true)} style={{ padding:'8px 14px', display:'flex', alignItems:'center', gap:6, border:'1px solid var(--red-bg)', borderRadius:8, fontSize:13, fontWeight:500 }}>
          <IconDelete /> Delete
        </button>
      </div>

      <div className="grid-2col" style={{ gap:16 }}>
        {/* Main info */}
        <div className="card" style={{ padding:24 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:20 }}>
            <span style={{ width:8, height:8, borderRadius:'50%', background:'var(--brand)' }} />
            <span style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.07em' }}>Item Info</span>
          </div>
          <div className="grid-2col" style={{ gap:18 }}>
            <Field label="SKU" value={item.sku} />
            <Field label="Category" value={item.category} />
            <Field label="Unit" value={item.unit} />
            <Field label="Warehouse" value={item.warehouse} />
            <Field label="Updated At" value={item.updatedAt === '-' ? null : item.updatedAt} />
            <Field label="Item Value" value={item.itemValue ? formatIDR(item.itemValue) : null} />
            <Field label="Total Value" value={item.itemValue ? `${formatIDR(item.itemValue * item.totalStock)} (${item.totalStock} × ${formatIDR(item.itemValue)})` : null} />
            <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
              <span style={{ fontSize:11.5, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.05em' }}>Status</span>
              {statusBadge(item.stockStatus)}
            </div>
          </div>
          {item.desc && (
            <div style={{ marginTop:18 }}>
              <span style={{ fontSize:11.5, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.05em' }}>Description</span>
              <p style={{ fontSize:13.5, color:'var(--text)', marginTop:6, lineHeight:1.6 }}>{item.desc}</p>
            </div>
          )}
        </div>

        {/* Stock */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div className="card" style={{ padding:24 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
              <span style={{ width:8, height:8, borderRadius:'50%', background:'var(--green)' }} />
              <span style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.07em' }}>Stock Summary</span>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', paddingBottom:8, borderBottom:'1px solid var(--bg)' }}>
                <span style={{ fontSize:13, color:'var(--text-muted)', fontWeight:500 }}>Total Stock</span>
                <span style={{ fontSize:20, fontWeight:700, color:'var(--text)', fontVariantNumeric:'tabular-nums' }}>{item.totalStock} <span style={{ fontSize:12, color:'var(--text-muted)', fontWeight:500 }}>{item.unit}</span></span>
              </div>
              {item.warehouses.length === 0
                ? <p style={{ fontSize:12.5, color:'var(--text-muted)', margin:0 }}>No stock in any warehouse.</p>
                : item.warehouses.map(w => (
                  <div key={w.name} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', paddingBottom:8, borderBottom:'1px solid var(--bg)' }}>
                    <span style={{ fontSize:13, color:'var(--text-muted)', fontWeight:500 }}>{w.name}</span>
                    <span style={{ fontSize:15, fontWeight:700, color:'var(--brand)', fontVariantNumeric:'tabular-nums' }}>{w.stock}</span>
                  </div>
                ))}
              <p style={{ fontSize:11.5, color:'var(--text-muted)', margin:0 }}>From Warehouse Inventory, the single source of stock.</p>
            </div>
          </div>

          {/* Image */}
          <div className="card" style={{ padding:24 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
              <span style={{ width:8, height:8, borderRadius:'50%', background:'var(--purple)' }} />
              <span style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.07em' }}>Image</span>
            </div>
            {item.image
              ? <img src={item.image} alt={item.name} style={{ width:'100%', borderRadius:8, objectFit:'cover', maxHeight:180 }} />
              : (
                <div style={{ background:'var(--bg)', borderRadius:8, height:140, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8, color:'var(--border)' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" style={{ width:40, height:40 }}>
                    <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                  </svg>
                  <span style={{ fontSize:12.5, fontWeight:500, color:'var(--text-muted)' }}>No image uploaded</span>
                </div>
              )
            }
          </div>
        </div>
      </div>

      <div className="card" style={{ padding:24, marginTop:16 }}>
        <div className="section-dot-label"><span style={{ background:'var(--green)' }} />Stock History <em style={{ fontStyle:'normal', textTransform:'none', letterSpacing:0, fontWeight:400 }}>(latest {movements.length})</em></div>
        {movements.length === 0
          ? <p style={{ fontSize:13, color:'var(--text-muted)', margin:0 }}>No stock changes recorded for this item yet.</p>
          : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Date</th><th>Warehouse</th><th style={{ textAlign:'right' }}>Change</th><th style={{ textAlign:'right' }}>Stock</th><th>Reason</th><th>By</th></tr></thead>
                <tbody>
                  {movements.map(m => (
                    <tr key={m.id}>
                      <td style={{ whiteSpace:'nowrap', color:'var(--text-muted)', fontSize:12.5 }}>{m.at}</td>
                      <td>{m.warehouse}</td>
                      <td style={{ textAlign:'right', fontWeight:700, color: m.change < 0 ? 'var(--red)' : 'var(--green)' }}>{m.change > 0 ? '+' : ''}{m.change}</td>
                      <td style={{ textAlign:'right', color:'var(--text-muted)' }}>{m.before} → {m.after}</td>
                      <td><span className="badge badge-orange" style={{ fontSize:11 }}>{m.reason}</span>{m.note && <div style={{ fontSize:11.5, color:'var(--text-muted)' }}>{m.note}</div>}</td>
                      <td style={{ fontSize:12.5 }}>{m.by || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>

      <div className="card" style={{ padding:24, marginTop:16 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
          <span style={{ width:8, height:8, borderRadius:'50%', background:'var(--orange)' }} />
          <span style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.07em' }}>Production History</span>
          <span style={{ fontSize:12, color:'var(--text-muted)' }}>({productions.length})</span>
        </div>
        {productions.length === 0
          ? <p style={{ fontSize:13, color:'var(--text-muted)', margin:0 }}>This item has never been produced.</p>
          : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Requested</th><th style={{ textAlign:'right' }}>Qty</th><th>Vendor</th><th>Event</th><th>Deploy to</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {productions.map(p => (
                    <tr key={p.uid}>
                      <td style={{ whiteSpace:'nowrap', color:'var(--text-muted)', fontSize:12.5 }}>{p.requestedAt}</td>
                      <td style={{ textAlign:'right', fontWeight:600 }}>{p.qty}</td>
                      <td>{p.vendorId ? <button type="button" className="link-btn" onClick={() => navigate(`/vendor-detail?id=${p.vendorId}`)}>{p.vendorName}</button> : (p.vendorName || '—')}</td>
                      <td>{p.eventKey ? <button type="button" className="link-btn" onClick={() => navigate(`/event-detail?name=${encodeURIComponent(p.eventKey)}`)}>{p.eventName}</button> : <span style={{ color:'var(--text-muted)' }}>Restock (no event)</span>}</td>
                      <td>{p.warehouse || '—'}</td>
                      <td><span className={`badge ${PRODUCTION_BADGE[p.status] || 'badge-gray'}`} style={{ fontSize:11 }}>{p.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>

      {editOpen && (
        <ItemFormModal item={item} by={currentUser?.name || 'Admin'} onClose={() => setEditOpen(false)}
          onSaved={saved => {
            addActivityLog({ userName: currentUser?.name || 'Admin', action: 'Update', module: 'Inventory', description: `Updated item "${saved.name}" (${saved.sku})` });
            setEditOpen(false);
            setVersion(v => v + 1);
          }} />
      )}

      <Modal open={deleteOpen} title="Delete Item" onClose={() => setDeleteOpen(false)}
        footer={<>
          <button className="btn-cancel-modal" onClick={() => setDeleteOpen(false)}>{item.totalStock > 0 ? 'Close' : 'Cancel'}</button>
          {item.totalStock === 0 && <button className="btn-del-ok" onClick={confirmDelete}>Delete</button>}
        </>}
      >
        {item.totalStock > 0
          ? <p className="confirm-msg"><strong>&ldquo;{item.name}&rdquo;</strong> still has <strong>{item.totalStock}</strong> in stock. Move or write off the stock in Warehouse Inventory first.</p>
          : <p className="confirm-msg">Delete <strong>&ldquo;{item.name}&rdquo;</strong>? It has no stock. This can&rsquo;t be undone.</p>}
      </Modal>
    </>
  );
}
