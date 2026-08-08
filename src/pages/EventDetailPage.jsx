import { useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Modal from '../components/Modal';
import { IconSearch, IconPlus, IconDelete, IconClose, IconCheck, IconCart, IconPrint, IconBarChart, IconMoreVertical } from '../components/icons';
import { initialAreas, SUB_AREAS } from '../data/areas';
import { inventoryData, categories } from '../data/inventory';
import { initialWarehouses } from '../data/warehouses';

const AREAS = initialAreas.map(a => a.name);
const WAREHOUSES = [...new Set(initialWarehouses.map(w => w.name))];
const STATUSES = ['Preparation','During Event','After Event'];

const AREA_BADGE_CLASS = {
  CEREMONY: 'ceremony', PHOTOBOOTH: 'photobooth', RECEPTION: 'reception',
  ENTRANCE: 'entrance', 'GUEST TABLE': 'guest',
};
const BADGE_CLASS_CYCLE = ['ceremony', 'photobooth', 'reception', 'entrance', 'guest'];
function areaBadgeClass(area) {
  if (AREA_BADGE_CLASS[area]) return AREA_BADGE_CLASS[area];
  const idx = AREAS.indexOf(area);
  return BADGE_CLASS_CYCLE[idx >= 0 ? idx % BADGE_CLASS_CYCLE.length : 0];
}

function stockBadge(s) {
  if (s === 'Available')    return <span className="badge badge-green">{s}</span>;
  if (s === 'Low Stock')    return <span className="badge badge-orange">{s}</span>;
  if (s === 'Out of Stock') return <span className="badge badge-red">{s}</span>;
  return <span className="badge badge-gray">{s}</span>;
}

const initialItems = [
  { id:1, name:'Chiffon White 4-6×1,2m', area:'CEREMONY',    subArea:'',  status:'Preparation',  qty:2,  pic:'Anto',    checking:true,  warehouseItem:false, scanIn:'May 26, 2025 10:42 PM', scanOut:'May 26, 2025 9:33 PM',  note:"Please take care this item, it's luxury item" },
  { id:2, name:'hanging rotan 1',         area:'PHOTOBOOTH',  subArea:'',  status:'Preparation',  qty:2,  pic:'',        checking:false, warehouseItem:false, scanIn:null,                    scanOut:null,                    note:"Please take care this item, it's luxury item" },
  { id:3, name:'hanging rotan 2',         area:'RECEPTION',   subArea:'',  status:'Preparation',  qty:10, pic:'',        checking:false, warehouseItem:false, scanIn:null,                    scanOut:null,                    note:"Please take care this item, it's luxury item" },
  { id:4, name:'hanging rotan 3',         area:'RECEPTION',   subArea:'',  status:'Preparation',  qty:10, pic:'',        checking:false, warehouseItem:false, scanIn:null,                    scanOut:null,                    note:"Please take care this item, it's luxury item" },
  { id:5, name:'Kain Putih 3m',           area:'ENTRANCE',    subArea:'',  status:'Preparation',  qty:5,  pic:'Novi',    checking:false, warehouseItem:false, scanIn:null,                    scanOut:null,                    note:'' },
  { id:6, name:'Bunga Mawar Merah',       area:'RECEPTION',   subArea:'',  status:'During Event', qty:30, pic:'Darmian', checking:true,  warehouseItem:false, scanIn:'Apr 9, 2026 08:00 AM',  scanOut:null,                    note:'' },
  { id:7, name:'Standing Flower Tall',    area:'ENTRANCE',    subArea:'',  status:'Preparation',  qty:4,  pic:'',        checking:false, warehouseItem:false, scanIn:null,                    scanOut:null,                    note:'' },
  { id:8, name:'Tealight Holder 15cm',    area:'GUEST TABLE', subArea:'',  status:'During Event', qty:50, pic:'Anto',    checking:false, warehouseItem:true,  scanIn:null,                    scanOut:null,                    note:'' },
  { id:9, name:'Pita Emas 5m',            area:'CEREMONY',    subArea:'',  status:'Preparation',  qty:20, pic:'',        checking:false, warehouseItem:false, scanIn:null,                    scanOut:null,                    note:'' },
  { id:10,name:'Lilin Putih 30cm',        area:'GUEST TABLE', subArea:'',  status:'Preparation',  qty:100,pic:'Novi',    checking:true,  warehouseItem:true,  scanIn:'Apr 9, 2026 07:30 AM',  scanOut:'Apr 9, 2026 09:00 AM', note:'' },
  { id:11,name:'Backdrop Floral 3×2m',    area:'PHOTOBOOTH',  subArea:'',  status:'Preparation',  qty:1,  pic:'',        checking:false, warehouseItem:false, scanIn:null,                    scanOut:null,                    note:'' },
  { id:12,name:'Kursi Tiffany',           area:'RECEPTION',   subArea:'',  status:'During Event', qty:60, pic:'Darmian', checking:false, warehouseItem:true,  scanIn:null,                    scanOut:null,                    note:'' },
];

function CheckIcon() {
  return <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="2 6 5 9 10 3"/></svg>;
}
function XIcon() {
  return <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="9" y1="3" x2="3" y2="9"/><line x1="3" y1="3" x2="9" y2="9"/></svg>;
}
function ImagePlaceholder() {
  return (
    <div className="item-img-placeholder">
      <svg viewBox="0 0 24 24" fill="none" stroke="#b0b5cc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 36, height: 36 }}>
        <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
      </svg>
    </div>
  );
}

function InvThumb() {
  return (
    <div className="inv-pick-thumb">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
      </svg>
    </div>
  );
}

function ItemCard({ item, onScan, onDelete }) {
  return (
    <div className="item-card">
      <ImagePlaceholder />
      <div className="item-body">
        <span className={`area-badge ${areaBadgeClass(item.area)}`}>{item.area}</span>
        <div className="item-name-row">
          <span className="item-name">{item.name}</span>
          <span className="item-qty">Qty: {item.qty}</span>
        </div>
        {item.subArea && <div className="item-subarea">{item.subArea}</div>}
        <div className="item-pic">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12 }}>
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
          </svg>
          {item.pic || '-'}
        </div>
        <div className="item-indicators">
          <div className="indicator-row">
            <span className={`indicator-box${item.checking ? ' checked' : ''}`}>
              {item.checking && <CheckIcon />}
            </span>
            Checking
          </div>
          <div className="indicator-row">
            <span className={`indicator-box${item.warehouseItem ? ' checked' : ''}`}>
              {item.warehouseItem && <CheckIcon />}
            </span>
            Warehouse Item
          </div>
        </div>
        <div className="scan-rows">
          <div className="scan-row">
            <span className={`scan-badge ${item.scanIn ? 'ok' : 'fail'}`}>
              {item.scanIn ? <CheckIcon /> : <XIcon />}
            </span>
            <span className="scan-label-text" style={!item.scanIn ? { color: '#9aa0b8' } : {}}>
              {item.scanIn ? `Scanned In at ${item.scanIn}` : 'Scan In'}
            </span>
          </div>
          <div className="scan-row">
            <span className={`scan-badge ${item.scanOut ? 'ok' : 'fail'}`}>
              {item.scanOut ? <CheckIcon /> : <XIcon />}
            </span>
            <span className="scan-label-text" style={!item.scanOut ? { color: '#9aa0b8' } : {}}>
              {item.scanOut ? `Scanned Out at ${item.scanOut}` : 'Scan Out'}
            </span>
          </div>
        </div>
        {item.note && <div className="item-note">{item.note}</div>}
        <div className="item-actions">
          <div className="item-actions-row">
            <button className="btn-ia-pkg" title="Packaging">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
            </button>
            <button className="btn-ia-scan" onClick={() => onScan(item.id)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h.01M14 17h3v3M17 14h3"/></svg>
              Scan
            </button>
          </div>
          <div className="item-actions-row">
            <button className="btn-ia-del" title="Hapus" onClick={() => onDelete(item.id)}>
              <IconDelete />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EventDetailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const eventName = searchParams.get('name') || '03/06/2023 | GUNTUR + CLARISSA';

  const [items, setItems] = useState(initialItems);
  const [nextId, setNextId] = useState(13);

  const [selectedArea, setSelectedArea] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [areaDropOpen, setAreaDropOpen] = useState(false);
  const [kwSearch, setKwSearch] = useState('');

  // Cart — "add from inventory" e-commerce style flow
  const [cart, setCart] = useState([]);
  const [nextCartId, setNextCartId] = useState(1);
  const [selectedCartIds, setSelectedCartIds] = useState([]);
  const [bulkPanelOpen, setBulkPanelOpen] = useState(false);
  const [bulkArea, setBulkArea] = useState('');
  const [bulkSubArea, setBulkSubArea] = useState('');

  // Inventory picker
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState('');
  const [pickerCategory, setPickerCategory] = useState('');
  const [pickerQty, setPickerQty] = useState({});
  const [pickerWarehouse, setPickerWarehouse] = useState({});

  const filtered = useMemo(() => items.filter(it => {
    if (selectedArea   && it.area   !== selectedArea)   return false;
    if (selectedStatus && it.status !== selectedStatus) return false;
    if (kwSearch && !it.name.toLowerCase().includes(kwSearch.toLowerCase()) && !it.area.toLowerCase().includes(kwSearch.toLowerCase())) return false;
    return true;
  }), [items, selectedArea, selectedStatus, kwSearch]);

  const pickerFiltered = useMemo(() => {
    const q = pickerQuery.trim().toLowerCase();
    return inventoryData.filter(inv =>
      (!q || inv.name.toLowerCase().includes(q) || inv.sku.toLowerCase().includes(q)) &&
      (!pickerCategory || inv.category === pickerCategory)
    );
  }, [pickerQuery, pickerCategory]);

  const areaLabel  = selectedArea   || 'All Place';
  const statusLabel = selectedStatus || 'All Status';
  const hasMissingArea = cart.some(c => !c.area);

  function doScan(id) {
    const now = new Date().toLocaleString('en-US', { month:'short', day:'numeric', year:'numeric', hour:'numeric', minute:'2-digit', hour12:true });
    setItems(is => is.map(it => {
      if (it.id !== id) return it;
      if (!it.scanIn)       return { ...it, scanIn: now };
      if (!it.scanOut)      return { ...it, scanOut: now };
      return it;
    }));
  }

  function deleteItem(id) {
    if (!window.confirm('Hapus item ini dari event?')) return;
    setItems(is => is.filter(i => i.id !== id));
  }

  // --- Inventory picker → Cart ---
  function addToCart(inv, qty, warehouse) {
    const existing = cart.find(x => x.inventoryId === inv.id && x.warehouse === warehouse);
    if (existing) {
      const newQty = Math.min(inv.totalStock, existing.qty + qty);
      setCart(c => c.map(x => x.cartId === existing.cartId ? { ...x, qty: newQty } : x));
    } else {
      setCart(c => [...c, {
        cartId: nextCartId, inventoryId: inv.id, name: inv.name, sku: inv.sku,
        category: inv.category, unit: inv.unit, totalStock: inv.totalStock,
        warehouse, qty: Math.min(inv.totalStock, qty), area: '', subArea: '',
      }]);
      setNextCartId(n => n + 1);
    }
    setPickerQty(q => ({ ...q, [inv.id]: 1 }));
  }

  function updateCartQty(cartId, qty) {
    setCart(c => c.map(x => x.cartId === cartId ? { ...x, qty: Math.max(1, Math.min(x.totalStock, qty)) } : x));
  }

  function removeCartItem(cartId) {
    setCart(c => c.filter(x => x.cartId !== cartId));
    setSelectedCartIds(s => s.filter(id => id !== cartId));
  }

  function toggleCartSelect(cartId) {
    setSelectedCartIds(s => s.includes(cartId) ? s.filter(id => id !== cartId) : [...s, cartId]);
  }

  function toggleSelectAllCart() {
    setSelectedCartIds(s => s.length === cart.length ? [] : cart.map(c => c.cartId));
  }

  function applyBulkAssign() {
    if (!bulkArea) return;
    setCart(c => c.map(x => selectedCartIds.includes(x.cartId) ? { ...x, area: bulkArea, subArea: bulkSubArea } : x));
    setBulkPanelOpen(false);
    setBulkArea('');
    setBulkSubArea('');
    setSelectedCartIds([]);
  }

  function handleCheckoutClick() {
    if (cart.length === 0) return;
    if (hasMissingArea) {
      setSelectedCartIds(cart.filter(c => !c.area).map(c => c.cartId));
      setBulkPanelOpen(true);
      return;
    }
    checkout();
  }

  function checkout() {
    if (cart.length === 0 || hasMissingArea) return;
    setItems(is => [
      ...is,
      ...cart.map((c, i) => ({
        id: nextId + i, name: c.name, area: c.area, subArea: c.subArea,
        status: 'Preparation', qty: c.qty, pic: '', checking: false,
        warehouseItem: true, scanIn: null, scanOut: null, note: '',
      })),
    ]);
    setNextId(n => n + cart.length);
    setCart([]);
    setSelectedCartIds([]);
  }

  return (
    <>
      <h1 className="page-title">Event Detail</h1>
      <div className="card">
        <div style={{ marginBottom: 14 }}>
          <button onClick={() => navigate('/event')} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '12.5px', color: 'var(--brand)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}><polyline points="15 18 9 12 15 6"/></svg>
            Kembali ke Event
          </button>
        </div>

        <div className="event-header-row">
          <div className="event-heading">{eventName}</div>

          <div className="event-actions-bar">
            <button className="action-icon-btn btn-pkg" title="Packaging">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
            </button>
            <button className="action-icon-btn btn-cart" title="Cart" onClick={() => setPickerOpen(true)}>
              <IconCart />
              {cart.length > 0 && <span className="action-icon-badge">{cart.length}</span>}
            </button>
            <button className="btn-new" onClick={() => { setPickerQuery(''); setPickerCategory(''); setPickerOpen(true); }}>
              <IconPlus /> Tambah Barang
            </button>
            <button className="action-icon-btn more-btn" title="Menu lainnya">
              <IconMoreVertical />
            </button>
          </div>
        </div>

        <div className="filter-row">
          <div className="custom-select" style={{ flex: 1 }}>
            <select value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)}>
              <option value="">All Status</option>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
            <span className="chevron">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            </span>
          </div>

          <div className="dropdown-wrap" style={{ flex: 1, position: 'relative', minWidth: 190 }}>
            <div className={`dropdown-trigger${areaDropOpen ? ' open' : ''}`} onClick={() => setAreaDropOpen(o => !o)}>
              <span>{areaLabel}</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
            {areaDropOpen && (
              <div className="dropdown-menu open">
                <div className={`dropdown-item${!selectedArea ? ' selected' : ''}`} onClick={() => { setSelectedArea(''); setAreaDropOpen(false); }}>All Area</div>
                {AREAS.map(a => (
                  <div key={a} className={`dropdown-item${selectedArea === a ? ' selected' : ''}`} onClick={() => { setSelectedArea(a); setAreaDropOpen(false); }}>{a}</div>
                ))}
              </div>
            )}
          </div>

          <div className="filter-row-right">
            <button className="btn btn-check" onClick={() => {}}>
              <IconSearch /> Check
            </button>
            <button
              className="btn"
              style={{ background: 'var(--purple)', color: '#fff' }}
              title="Summary"
              aria-label="Summary"
              onClick={() => navigate(`/event-summary?name=${encodeURIComponent(eventName)}`)}
            >
              <IconBarChart />
            </button>
            <button className="btn btn-print" title="Print" aria-label="Print" onClick={() => window.print()}><IconPrint /></button>
          </div>
        </div>

        <div className="search-row">
          <div className="search-wrap">
            <IconSearch />
            <input className="search-input" type="text" placeholder="Keyword Search" value={kwSearch} onChange={e => setKwSearch(e.target.value)} />
          </div>
        </div>

        <p className="summary-text">
          <strong>{filtered.length}</strong> pcs item untuk state <strong>&ldquo;{statusLabel}&rdquo;</strong> di Area <strong>&ldquo;{areaLabel}&rdquo;</strong>
        </p>

        {filtered.length === 0
          ? <div className="no-data">No Data</div>
          : (
            <div className="items-grid">
              {filtered.map(it => (
                <ItemCard key={it.id} item={it} onScan={doScan} onDelete={deleteItem} />
              ))}
            </div>
          )
        }
      </div>

      {/* Inventory Picker + Cart Modal — two panels, no popping in/out */}
      <Modal
        open={pickerOpen}
        title="Tambah Barang dari Inventory"
        onClose={() => setPickerOpen(false)}
        size="4xl"
        className="inv-pick-modal"
        bodyClassName="inv-pick-modal-body"
        footer={
          <>
            <button className="btn-cancel-m" onClick={() => setPickerOpen(false)}><IconClose /> Tutup</button>
            <button className="btn-checkout" onClick={handleCheckoutClick} disabled={cart.length === 0}>
              <IconCheck /> {hasMissingArea ? 'Lengkapi Lokasi' : 'Simpan ke Event'}
            </button>
          </>
        }
      >
        <div className="inv-pick-split">
          {/* Left panel — browse & add from inventory */}
          <div className="inv-pick-left">
            <div className="search-row" style={{ marginBottom: 4 }}>
              <div className="search-wrap">
                <IconSearch />
                <input className="search-input" type="text" placeholder="Cari nama atau SKU…" value={pickerQuery} onChange={e => setPickerQuery(e.target.value)} />
              </div>
              <div className="wi-select-wrap">
                <select value={pickerCategory} onChange={e => setPickerCategory(e.target.value)}>
                  <option value="">Semua Kategori</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="inv-pick-list">
              {pickerFiltered.length === 0
                ? <div className="no-data">Tidak ada barang ditemukan.</div>
                : pickerFiltered.map(inv => {
                  const qty = pickerQty[inv.id] ?? 1;
                  const warehouse = pickerWarehouse[inv.id] ?? inv.warehouse;
                  const outOfStock = inv.stockStatus === 'Out of Stock';
                  return (
                    <div className="inv-pick-row" key={inv.id}>
                      <InvThumb />
                      <div className="inv-pick-info">
                        <div className="inv-pick-name-row">
                          <span className="inv-pick-name">{inv.name}</span>
                          {stockBadge(inv.stockStatus)}
                        </div>
                        <div className="inv-pick-meta">
                          <span style={{ fontFamily: 'monospace' }}>{inv.sku}</span> · {inv.category} · {inv.unit}
                        </div>
                        <div className="inv-pick-stock">Stok tersedia: <strong>{inv.totalStock} {inv.unit}</strong></div>
                        <div className="inv-pick-warehouse-row">
                          <label>Ambil dari gudang</label>
                          <div className="wi-select-wrap">
                            <select
                              value={warehouse}
                              onChange={e => setPickerWarehouse(w => ({ ...w, [inv.id]: e.target.value }))}
                            >
                              {WAREHOUSES.map(w => <option key={w} value={w}>{w}</option>)}
                            </select>
                          </div>
                        </div>
                      </div>
                      <div className="inv-pick-actions">
                        <input
                          className="inv-pick-qty" type="number" min={1} max={inv.totalStock}
                          value={qty} disabled={outOfStock}
                          onChange={e => setPickerQty(q => ({ ...q, [inv.id]: Math.max(1, Math.min(inv.totalStock, parseInt(e.target.value) || 1)) }))}
                        />
                        <button
                          className="btn-add-cart" disabled={outOfStock}
                          onClick={() => addToCart(inv, qty, warehouse)}
                        >
                          <IconCart /> {outOfStock ? 'Stok Habis' : 'Tambah'}
                        </button>
                      </div>
                    </div>
                  );
                })
              }
            </div>
          </div>

          {/* Right panel — cart / keranjang, always visible alongside the list */}
          <div className="inv-pick-right">
            <div className="inv-cart-header">
              <IconCart /> Keranjang <span className="inv-cart-count">{cart.length}</span>
            </div>

            {cart.length === 0
              ? <div className="cart-empty">Keranjang masih kosong</div>
              : (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10, flexShrink: 0 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-2)', cursor: 'pointer' }}>
                      <input type="checkbox" checked={selectedCartIds.length === cart.length} onChange={toggleSelectAllCart} />
                      Pilih Semua ({selectedCartIds.length}/{cart.length})
                    </label>
                    <button
                      className="btn btn-ghost" disabled={selectedCartIds.length === 0}
                      onClick={() => setBulkPanelOpen(o => !o)}
                      style={{ fontSize: 12, padding: '6px 10px', alignSelf: 'flex-start' }}
                    >
                      Assign Lokasi ({selectedCartIds.length})
                    </button>
                  </div>

                  {bulkPanelOpen && (
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, padding: '10px 12px', marginBottom: 12, background: 'var(--brand-bg)', borderRadius: 'var(--r-lg)', flexWrap: 'wrap', flexShrink: 0 }}>
                      <div className="wi-select-wrap">
                        <select value={bulkArea} onChange={e => { setBulkArea(e.target.value); setBulkSubArea(''); }}>
                          <option value="">Pilih Area</option>
                          {initialAreas.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
                        </select>
                      </div>
                      <div className="wi-select-wrap">
                        <select value={bulkSubArea} onChange={e => setBulkSubArea(e.target.value)} disabled={!bulkArea}>
                          <option value="">{(SUB_AREAS[bulkArea] || []).length ? 'Pilih Sub Area' : '(Tidak ada Sub Area)'}</option>
                          {(SUB_AREAS[bulkArea] || []).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <button className="btn-save-modal" disabled={!bulkArea} onClick={applyBulkAssign}>
                        <IconCheck /> Terapkan ke {selectedCartIds.length} item
                      </button>
                      <button className="btn-cancel-m" onClick={() => setBulkPanelOpen(false)}>Batal</button>
                    </div>
                  )}

                  <div className="cart-list">
                    {cart.map(c => (
                      <div key={c.cartId} className="cart-item">
                        <input
                          type="checkbox"
                          checked={selectedCartIds.includes(c.cartId)}
                          onChange={() => toggleCartSelect(c.cartId)}
                        />
                        <div className="cart-item-img">
                          <svg viewBox="0 0 24 24" fill="none" stroke="#b0b5cc" strokeWidth="1.5" style={{ width: 28, height: 28 }}>
                            <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                          </svg>
                        </div>
                        <div className="cart-item-info">
                          <div className="cart-item-name">{c.name}</div>
                          <div className="cart-item-meta">{c.category} · {c.unit} · {c.warehouse}</div>
                          {c.area && (
                            <div className="cart-item-location">{c.area}{c.subArea ? ` · ${c.subArea}` : ''}</div>
                          )}
                        </div>
                        <input
                          className="inv-pick-qty" type="number" min={1} max={c.totalStock}
                          value={c.qty} onChange={e => updateCartQty(c.cartId, parseInt(e.target.value) || 1)}
                        />
                        <button className="cart-item-remove" onClick={() => removeCartItem(c.cartId)}>
                          <IconDelete />
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )
            }
          </div>
        </div>
      </Modal>
    </>
  );
}
