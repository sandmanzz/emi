import { useSearchParams, useNavigate } from 'react-router-dom';
import { IconEdit, IconDelete, IconClose } from '../components/icons';
import { useState } from 'react';
import Modal from '../components/Modal';

const inventoryData = [
  { id:1,  name:'Artificial Flower Chrysant Giant White', sku:'AFG-001', category:'Floral',     unit:'pcs',   warehouse:'Warehouse Bali 66',   totalStock:342, stockStatus:'Available',    updatedAt:'12 Mar 2025', desc:'Premium artificial chrysanthemum flowers for event decoration. Large size, white color.' },
  { id:2,  name:'Artificial Flower Lunaria White',        sku:'AFL-002', category:'Floral',     unit:'pcs',   warehouse:'Warehouse Bali 66',   totalStock:327, stockStatus:'Available',    updatedAt:'10 Mar 2025', desc:'' },
  { id:3,  name:'Artificial Rose Pink',                   sku:'ARP-003', category:'Floral',     unit:'pcs',   warehouse:'Warehouse Bali 66',   totalStock:182, stockStatus:'Available',    updatedAt:'08 Mar 2025', desc:'' },
  { id:4,  name:'Backdrop Stand 2m',                      sku:'BSD-004', category:'Equipment',  unit:'unit',  warehouse:'Warehouse C9',        totalStock:8,   stockStatus:'Low Stock',    updatedAt:'07 Mar 2025', desc:'' },
  { id:5,  name:'White Latex Balloon',                    sku:'BLP-005', category:'Decoration', unit:'pcs',   warehouse:'Warehouse Surabaya',  totalStock:500, stockStatus:'Available',    updatedAt:'-', desc:'' },
  { id:6,  name:'Large Round Candle Holder',               sku:'CHB-006', category:'Decoration', unit:'pcs',   warehouse:'Warehouse Bali 70',   totalStock:60,  stockStatus:'Available',    updatedAt:'-', desc:'' },
  { id:7,  name:'Cylinder-Shaped Crystal',                sku:'CBT-007', category:'Decoration', unit:'pcs',   warehouse:'Warehouse Bali 66',   totalStock:100, stockStatus:'Available',    updatedAt:'-', desc:'' },
  { id:8,  name:'Plain White Fabric 3m',                  sku:'FPP-008', category:'Fabric',     unit:'meter', warehouse:'Warehouse Cililitan', totalStock:20,  stockStatus:'Low Stock',    updatedAt:'05 Mar 2025', desc:'' },
  { id:9,  name:'Iron Flower Arch 60cm',                  sku:'FAB-009', category:'Decoration', unit:'unit',  warehouse:'Warehouse Bali 70',   totalStock:12,  stockStatus:'Available',    updatedAt:'-', desc:'' },
  { id:10, name:'Carved Teak Gebyok',                     sku:'GJU-010', category:'Furniture',  unit:'unit',  warehouse:'Warehouse Cililitan', totalStock:2,   stockStatus:'Low Stock',    updatedAt:'01 Mar 2025', desc:'' },
  { id:11, name:'Yellow Palm Leaf',                       sku:'JKN-011', category:'Decoration', unit:'pcs',   warehouse:'Warehouse Bali 66',   totalStock:50,  stockStatus:'Available',    updatedAt:'-', desc:'' },
  { id:12, name:'Wahyu Tumurun Batik Cloth',              sku:'KBW-012', category:'Fabric',     unit:'meter', warehouse:'Warehouse Cililitan', totalStock:80,  stockStatus:'Available',    updatedAt:'28 Feb 2025', desc:'' },
  { id:13, name:'White Tiffany Chair',                    sku:'KTP-013', category:'Furniture',  unit:'unit',  warehouse:'Warehouse Bali 66',   totalStock:80,  stockStatus:'Available',    updatedAt:'20 Feb 2025', desc:'' },
  { id:14, name:'Large Red Candle',                       sku:'LMB-014', category:'Decoration', unit:'pcs',   warehouse:'Warehouse Bali 66',   totalStock:50,  stockStatus:'Available',    updatedAt:'15 Feb 2025', desc:'' },
  { id:15, name:'White Buffet Table',                     sku:'MBP-015', category:'Furniture',  unit:'unit',  warehouse:'Warehouse Surabaya',  totalStock:8,   stockStatus:'Low Stock',    updatedAt:'-', desc:'' },
  { id:16, name:'Gold Ribbon Roll',                       sku:'PER-016', category:'Decoration', unit:'roll',  warehouse:'Warehouse Bali 66',   totalStock:100, stockStatus:'Available',    updatedAt:'-', desc:'' },
  { id:17, name:'White Tablecloth 2x1m',                  sku:'TMP-017', category:'Fabric',     unit:'pcs',   warehouse:'Warehouse Bali 66',   totalStock:30,  stockStatus:'Available',    updatedAt:'10 Feb 2025', desc:'' },
  { id:18, name:'Tall Tealight Holder 15cm',              sku:'THL-018', category:'Decoration', unit:'pcs',   warehouse:'Warehouse Bali 70',   totalStock:27,  stockStatus:'Available',    updatedAt:'-', desc:'' },
  { id:19, name:'Mini Camera Tripod',                     sku:'TKM-019', category:'Equipment',  unit:'unit',  warehouse:'Warehouse Cililitan', totalStock:5,   stockStatus:'Low Stock',    updatedAt:'-', desc:'' },
  { id:20, name:'Tall White Ceramic Vase',                sku:'VKP-020', category:'Decoration', unit:'pcs',   warehouse:'Warehouse Bali 66',   totalStock:15,  stockStatus:'Available',    updatedAt:'-', desc:'' },
  { id:21, name:'Acrylic Ball Silver 20cm',               sku:'ABS-021', category:'Decoration', unit:'pcs',   warehouse:'Warehouse Bali 70',   totalStock:189, stockStatus:'Available',    updatedAt:'-', desc:'' },
  { id:22, name:'Plain White Fabric 6m',                  sku:'KPP-022', category:'Fabric',     unit:'meter', warehouse:'Warehouse Bali 70',   totalStock:1,   stockStatus:'Out of Stock', updatedAt:'-', desc:'' },
];

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
  const item = inventoryData.find(r => r.id === id);

  const [deleteOpen, setDeleteOpen] = useState(false);

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
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
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
        <button className="btn-icon edit" title="Edit" style={{ padding:'8px 14px', display:'flex', alignItems:'center', gap:6, border:'1px solid var(--border)', borderRadius:8, fontSize:13, fontWeight:500 }}>
          <IconEdit /> Edit
        </button>
        <button className="btn-icon delete" title="Delete" onClick={() => setDeleteOpen(true)} style={{ padding:'8px 14px', display:'flex', alignItems:'center', gap:6, border:'1px solid var(--red-bg)', borderRadius:8, fontSize:13, fontWeight:500 }}>
          <IconDelete /> Delete
        </button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
        {/* Main info */}
        <div className="card" style={{ padding:24 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:20 }}>
            <span style={{ width:8, height:8, borderRadius:'50%', background:'var(--brand)' }} />
            <span style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'.07em' }}>Item Info</span>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18 }}>
            <Field label="SKU" value={item.sku} />
            <Field label="Category" value={item.category} />
            <Field label="Unit" value={item.unit} />
            <Field label="Warehouse" value={item.warehouse} />
            <Field label="Updated At" value={item.updatedAt === '-' ? null : item.updatedAt} />
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
              {[
                { label:'Total Stock', value: item.totalStock, color:'var(--text)', big: true },
                { label:'Available',   value: Math.floor(item.totalStock * 0.85), color:'var(--green)' },
                { label:'Reserved',    value: Math.floor(item.totalStock * 0.1),  color:'var(--orange)' },
                { label:'On Event',    value: Math.floor(item.totalStock * 0.05), color:'var(--brand)' },
              ].map(s => (
                <div key={s.label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', paddingBottom:8, borderBottom:'1px solid var(--bg)' }}>
                  <span style={{ fontSize:13, color:'var(--text-muted)', fontWeight:500 }}>{s.label}</span>
                  <span style={{ fontSize: s.big ? 20 : 15, fontWeight:700, color:s.color, fontVariantNumeric:'tabular-nums' }}>{s.value}</span>
                </div>
              ))}
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

      <Modal open={deleteOpen} title="Delete Item" onClose={() => setDeleteOpen(false)}
        footer={<>
          <button className="btn-cancel-modal" onClick={() => setDeleteOpen(false)}>Cancel</button>
          <button className="btn-del-ok" onClick={() => { setDeleteOpen(false); navigate('/inventory'); }}>Delete</button>
        </>}
      >
        <p className="confirm-msg">Are you sure you want to delete <strong>"{item.name}"</strong>? This action cannot be undone.</p>
      </Modal>
    </>
  );
}
