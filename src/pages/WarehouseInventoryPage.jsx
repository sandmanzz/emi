import { useState, useMemo } from 'react';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import SortTh from '../components/SortTh';
import { IconSearch, IconPlus, IconDelete, IconClose, IconCheck } from '../components/icons';
import { wiData } from '../data/warehouseInventory';
import { initialWarehouses } from '../data/warehouses';

const PAGE_SIZE = 10;
const sortKeys = ['name','warehouseStock','warehouseName','itemStock','stokMin','stokUsed','valuation','totalValuation','minStatus','flag1','flag2','asile','rack','level','lantai','lorong','updatedAt'];
const itemCatalog = Array.from(
  wiData.reduce((map, item) => {
    if (!map.has(item.name)) {
      map.set(item.name, {
        id: item.id,
        name: item.name,
        stock: item.itemStock,
      });
    }
    return map;
  }, new Map()).values(),
);

function tokenizeKeyword(value) {
  return value
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function formatUpdatedAt() {
  const date = new Date();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${String(date.getDate()).padStart(2, '0')} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function deriveStatus(stock, minimum) {
  if (!minimum) return 'Not Set';
  if (stock <= minimum) return 'Critical';
  if (stock <= minimum * 1.5) return 'Warning';
  return 'Safe';
}

function ItemThumb({ name }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('') || 'IT';
  const hue = name.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) % 360;

  return (
    <div
      className="inventory-item-thumb"
      style={{ background:`linear-gradient(135deg, hsl(${hue} 55% 90%), hsl(${(hue + 36) % 360} 55% 76%))` }}
      aria-hidden="true"
    >
      <span>{initials}</span>
    </div>
  );
}

function statusBadge(s) {
  if (s === 'Safe')     return <span className="badge badge-green">Safe</span>;
  if (s === 'Warning')  return <span className="badge badge-orange">Warning</span>;
  if (s === 'Critical') return <span className="badge badge-red">Critical</span>;
  return <span className="badge" style={{ background:'transparent', border:'1px solid var(--border)', color:'var(--text-muted)', fontWeight:400 }}>Not Set</span>;
}

function ImagePlaceholder({ onClick }) {
  return (
    <div
      onClick={onClick}
      title="View image"
      style={{ width:42, height:42, background:'var(--bg)', borderRadius:'var(--r)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--border)', margin:'auto', cursor:'pointer', transition:'background .15s' }}
      onMouseEnter={e => e.currentTarget.style.background='#e2e8f0'}
      onMouseLeave={e => e.currentTarget.style.background='var(--bg)'}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width:18, height:18 }}>
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <circle cx="8.5" cy="8.5" r="1.5"/>
        <polyline points="21 15 16 10 5 21"/>
      </svg>
    </div>
  );
}

function ImageViewerModal({ open, name, src, onClose }) {
  if (!open) return null;
  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.65)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}
    >
      <div style={{ background:'#fff', borderRadius:14, maxWidth:480, width:'100%', overflow:'hidden', boxShadow:'0 20px 60px rgba(0,0,0,.3)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 18px', borderBottom:'1px solid var(--border)' }}>
          <span style={{ fontWeight:700, fontSize:14, color:'var(--text)' }}>{name}</span>
          <button className="modal-close" onClick={onClose}><IconClose /></button>
        </div>
        <div style={{ padding:24, display:'flex', alignItems:'center', justifyContent:'center', minHeight:220, background:'var(--bg)' }}>
          {src
            ? <img src={src} alt={name} style={{ maxWidth:'100%', maxHeight:320, borderRadius:8, objectFit:'contain' }} />
            : (
              <div style={{ textAlign:'center', color:'var(--text-muted)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" style={{ width:56, height:56, marginBottom:12, color:'var(--border)' }}>
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
                <p style={{ fontSize:13, fontWeight:500 }}>No image uploaded</p>
              </div>
            )
          }
        </div>
      </div>
    </div>
  );
}

export default function WarehouseInventoryPage() {
  const [inventoryRows,    setInventoryRows]    = useState(wiData);
  const [nextId,           setNextId]           = useState(wiData.length + 1);
  const [tab,              setTab]              = useState('inventory');
  const [query,            setQuery]            = useState('');
  const [warehouseFilter,  setWarehouseFilter]  = useState('');
  const [statusFilter,     setStatusFilter]     = useState('');
  const [page,             setPage]             = useState(1);
  const [sortCol,          setSortCol]          = useState(0);
  const [sortAsc,          setSortAsc]          = useState(true);
  const [imgPopup,         setImgPopup]         = useState({ open:false, name:'', src:null });
  const [modalOpen,        setModalOpen]        = useState(false);
  const [itemSearchDraft,  setItemSearchDraft]  = useState('');
  const [itemSearch,       setItemSearch]       = useState('');
  const [selectedItemId,   setSelectedItemId]   = useState(itemCatalog[0]?.id ?? null);
  const [form,             setForm]             = useState({ stock:'', stokMin:'', kode:'', rack:'', lantai:'', lorong:'', flag1:'', flag2:'', valuation:'', warehouseName:'' });

  // Stock Opname
  const [opnameWarehouse,  setOpnameWarehouse]  = useState('');
  const [opnameQuery,      setOpnameQuery]      = useState('');
  const [actualStock,      setActualStock]      = useState({});
  const [opnameNote,       setOpnameNote]       = useState({});
  const [opnameConfirmOpen,setOpnameConfirmOpen]= useState(false);

  const warehouseNames = useMemo(() => {
    const names = new Set([...inventoryRows.map(r => r.warehouseName), ...initialWarehouses.map(r => r.name)]);
    return [...names].filter(Boolean).sort();
  }, [inventoryRows]);
  const selectedItem = itemCatalog.find(item => item.id === selectedItemId) || itemCatalog[0] || null;
  const itemSearchTokens = useMemo(() => tokenizeKeyword(itemSearch), [itemSearch]);
  const draftKeyword = itemSearchDraft.trim();
  const hasPendingItemSearch = draftKeyword !== itemSearch;
  const filteredCatalog = useMemo(() => {
    if (!itemSearchTokens.length) return itemCatalog;

    return [...itemCatalog]
      .map(item => {
        const haystack = item.name.toLowerCase();
        const matchesAllTokens = itemSearchTokens.every(token => haystack.includes(token));
        if (!matchesAllTokens) return null;

        const startsWithMatch = haystack.startsWith(itemSearchTokens[0]);
        const firstIndex = haystack.indexOf(itemSearchTokens[0]);
        return {
          item,
          rank: startsWithMatch ? 0 : firstIndex,
        };
      })
      .filter(Boolean)
      .sort((left, right) => left.rank - right.rank || left.item.name.localeCompare(right.item.name))
      .map(entry => entry.item);
  }, [itemSearchTokens]);
  const hasActiveItemSearch = itemSearchTokens.length > 0;

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    const key = sortKeys[sortCol] || 'name';
    return inventoryRows
      .filter(r => {
        const mQ = !q || r.name.toLowerCase().includes(q) || r.warehouseName.toLowerCase().includes(q);
        const mW = !warehouseFilter || r.warehouseName === warehouseFilter;
        const mS = !statusFilter    || r.minStatus     === statusFilter;
        return mQ && mW && mS;
      })
      .sort((a, b) => {
        const va = String(a[key] ?? ''), vb = String(b[key] ?? '');
        return sortAsc ? va.localeCompare(vb, undefined, { numeric:true }) : vb.localeCompare(va, undefined, { numeric:true });
      });
  }, [inventoryRows, query, warehouseFilter, statusFilter, sortCol, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const pageData   = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function handleSort(col) {
    if (sortCol === col) setSortAsc(a => !a);
    else { setSortCol(col); setSortAsc(true); }
    setPage(1);
  }

  function closeModal() {
    setModalOpen(false);
    setItemSearchDraft('');
    setItemSearch('');
  }

  function openModal() {
    setSelectedItemId(itemCatalog[0]?.id ?? null);
    setForm({ stock:'', stokMin:'', kode:'', rack:'', lantai:'', lorong:'', flag1:'', flag2:'', valuation:'', warehouseName:'' });
    setItemSearchDraft('');
    setItemSearch('');
    setModalOpen(true);
  }

  function applyItemSearch(nextValue = itemSearchDraft) {
    const normalizedValue = nextValue.trim();
    setItemSearch(normalizedValue);

    const searchTokens = tokenizeKeyword(normalizedValue);
    if (!searchTokens.length) {
      setSelectedItemId(itemCatalog[0]?.id ?? null);
      return;
    }

    const firstMatch = itemCatalog.find(item => searchTokens.every(token => item.name.toLowerCase().includes(token)));
    if (firstMatch) setSelectedItemId(firstMatch.id);
  }

  function clearItemSearch() {
    setItemSearchDraft('');
    setItemSearch('');
    setSelectedItemId(itemCatalog[0]?.id ?? null);
  }

  function saveNewItem() {
    if (!selectedItem || !form.stock.trim() || !form.stokMin.trim() || !form.warehouseName.trim()) return;

    const stock = Number(form.stock) || 0;
    const minimum = Number(form.stokMin) || 0;
    const valuation = Number(form.valuation) || 0;

    setInventoryRows(rows => [{
      id: nextId,
      name: selectedItem.name,
      warehouseStock: stock,
      warehouseName: form.warehouseName,
      itemStock: stock,
      stokMin: minimum,
      stokUsed: 0,
      valuation,
      totalValuation: valuation * stock,
      minStatus: deriveStatus(stock, minimum),
      flag1: form.flag1.trim(),
      flag2: form.flag2.trim(),
      asile: form.kode.trim(),
      rack: form.rack.trim(),
      level: '',
      lantai: form.lantai.trim(),
      lorong: form.lorong.trim(),
      updatedAt: formatUpdatedAt(),
    }, ...rows]);
    setNextId(id => id + 1);
    setPage(1);
    closeModal();
  }

  const safeCount     = inventoryRows.filter(r => r.minStatus === 'Safe').length;
  const warningCount  = inventoryRows.filter(r => r.minStatus === 'Warning').length;
  const criticalCount = inventoryRows.filter(r => r.minStatus === 'Critical').length;

  // --- Stock Opname ---
  const opnameRows = useMemo(() => {
    const q = opnameQuery.toLowerCase();
    return inventoryRows.filter(r =>
      (!opnameWarehouse || r.warehouseName === opnameWarehouse) &&
      (!q || r.name.toLowerCase().includes(q))
    );
  }, [inventoryRows, opnameWarehouse, opnameQuery]);

  function getActual(row) {
    const v = actualStock[row.id];
    return v === undefined || v === '' ? row.itemStock : v;
  }
  function variance(row) {
    return getActual(row) - row.itemStock;
  }
  function setActual(rowId, value) {
    setActualStock(s => ({ ...s, [rowId]: value === '' ? '' : Number(value) }));
  }
  function setNote(rowId, value) {
    setOpnameNote(s => ({ ...s, [rowId]: value }));
  }

  const opnameChanged = opnameRows.filter(r => variance(r) !== 0);
  const opnameMatched = opnameRows.length - opnameChanged.length;

  function openOpnameConfirm() {
    if (opnameChanged.length === 0) return;
    setOpnameConfirmOpen(true);
  }

  function applyOpname() {
    const now = formatUpdatedAt();
    setInventoryRows(rows => rows.map(r => {
      const v = actualStock[r.id];
      if (v === undefined || v === '' || v === r.itemStock) return r;
      const newStock = Number(v);
      return {
        ...r,
        itemStock: newStock,
        warehouseStock: newStock,
        minStatus: deriveStatus(newStock, r.stokMin),
        totalValuation: r.valuation * newStock,
        updatedAt: now,
      };
    }));
    setActualStock({});
    setOpnameNote({});
    setOpnameConfirmOpen(false);
  }

  return (
    <>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:22 }}>
        <h1 className="page-title" style={{ margin:0 }}>Warehouse Inventory</h1>
      </div>

      {/* Stats */}
      <div className="stats-bar" style={{ gridTemplateColumns:'repeat(4,1fr)' }}>
        {[
          { label:'Total Items', value:inventoryRows.length, color:'var(--brand)',  bg:'var(--brand-bg)' },
          { label:'Safe',        value:safeCount,     color:'var(--green)',  bg:'var(--green-bg)' },
          { label:'Warning',     value:warningCount,  color:'var(--orange)', bg:'var(--orange-bg)' },
          { label:'Critical',    value:criticalCount, color:'var(--red)',    bg:'var(--red-bg)' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon" style={{ background:s.bg }}>
              <span className="stat-value" style={{ color:s.color }}>{s.value}</span>
            </div>
            <span className="stat-label">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Pill tabs */}
      <div className="wi-tabs">
        {[
          { id:'inventory',   label:'Inventory' },
          { id:'stockopname', label:'Stock Opname' },
        ].map(t => (
          <button key={t.id} className={`wi-tab-btn${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'inventory' && (
        <div className="card">
          <div className="toolbar">
            <div className="toolbar-left">
              <div className="search-wrap">
                <IconSearch />
                <input
                  className="search-input" type="text" placeholder="Search item or warehouse…"
                  value={query} onChange={e => { setQuery(e.target.value); setPage(1); }}
                />
              </div>
              <div className="wi-select-wrap">
                <select value={warehouseFilter} onChange={e => { setWarehouseFilter(e.target.value); setPage(1); }}>
                  <option value="">All Warehouses</option>
                  {warehouseNames.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div className="wi-select-wrap">
                <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
                  <option value="">All Status</option>
                  <option>Safe</option>
                  <option>Warning</option>
                  <option>Critical</option>
                </select>
              </div>
              <button className="btn-search">Search</button>
            </div>
            <div className="toolbar-right">
              <button className="btn-new" onClick={openModal}><IconPlus /> New</button>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <SortTh label="Name"           colIndex={0}  sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} style={{ minWidth:180 }} />
                  <SortTh label="Wh. Stock"      colIndex={1}  sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} style={{ width:80, textAlign:'right' }} />
                  <SortTh label="Warehouse"      colIndex={2}  sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} style={{ minWidth:130 }} />
                  <SortTh label="Item Stock"     colIndex={3}  sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} style={{ width:80, textAlign:'right' }} />
                  <SortTh label="Min"            colIndex={4}  sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} style={{ width:60, textAlign:'right' }} />
                  <SortTh label="Used"           colIndex={5}  sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} style={{ width:60, textAlign:'right' }} />
                  <SortTh label="Valuation"      colIndex={6}  sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} style={{ width:80, textAlign:'right' }} />
                  <SortTh label="Total Val."     colIndex={7}  sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} style={{ width:90, textAlign:'right' }} />
                  <SortTh label="Status"         colIndex={8}  sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} style={{ width:100 }} />
                  <SortTh label="F1"             colIndex={9}  sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} style={{ width:45, textAlign:'center' }} />
                  <SortTh label="F2"             colIndex={10} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} style={{ width:45, textAlign:'center' }} />
                  <SortTh label="Asile"          colIndex={11} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} style={{ width:50, textAlign:'center' }} />
                  <SortTh label="Rack"           colIndex={12} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} style={{ width:50, textAlign:'center' }} />
                  <SortTh label="Level"          colIndex={13} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} style={{ width:50, textAlign:'center' }} />
                  <SortTh label="Lantai"         colIndex={14} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} style={{ width:55, textAlign:'center' }} />
                  <SortTh label="Lorong"         colIndex={15} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} style={{ width:55, textAlign:'center' }} />
                  <th style={{ width:58, textAlign:'center' }}>Img</th>
                  <SortTh label="Updated"        colIndex={16} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} style={{ width:95 }} />
                  <th style={{ width:80, textAlign:'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {pageData.length === 0
                  ? <tr><td colSpan={19} style={{ textAlign:'center', color:'var(--text-muted)', padding:32 }}>No results found.</td></tr>
                  : pageData.map(r => (
                    <tr key={r.id}>
                      <td className="name-cell">{r.name}</td>
                      <td style={{ textAlign:'right', fontVariantNumeric:'tabular-nums' }}>{r.warehouseStock}</td>
                      <td>{r.warehouseName}</td>
                      <td style={{ textAlign:'right', fontVariantNumeric:'tabular-nums' }}>{r.itemStock}</td>
                      <td style={{ textAlign:'right', fontVariantNumeric:'tabular-nums' }}>{r.stokMin}</td>
                      <td style={{ textAlign:'right', fontVariantNumeric:'tabular-nums' }}>{r.stokUsed}</td>
                      <td style={{ textAlign:'right', fontVariantNumeric:'tabular-nums' }}>{r.valuation}</td>
                      <td style={{ textAlign:'right', fontVariantNumeric:'tabular-nums' }}>{r.totalValuation}</td>
                      <td>{statusBadge(r.minStatus)}</td>
                      <td style={{ textAlign:'center', color:'var(--text-muted)', fontSize:'12px' }}>{r.flag1}</td>
                      <td style={{ textAlign:'center', color:'var(--text-muted)', fontSize:'12px' }}>{r.flag2}</td>
                      <td style={{ textAlign:'center', color:'var(--text-muted)', fontSize:'12px' }}>{r.asile}</td>
                      <td style={{ textAlign:'center', color:'var(--text-muted)', fontSize:'12px' }}>{r.rack}</td>
                      <td style={{ textAlign:'center', color:'var(--text-muted)', fontSize:'12px' }}>{r.level}</td>
                      <td style={{ textAlign:'center', color:'var(--text-muted)', fontSize:'12px' }}>{r.lantai}</td>
                      <td style={{ textAlign:'center', color:'var(--text-muted)', fontSize:'12px' }}>{r.lorong}</td>
                      <td style={{ textAlign:'center' }}><ImagePlaceholder onClick={() => setImgPopup({ open:true, name:r.name, src:r.image || null })} /></td>
                      <td style={{ color:'var(--text-muted)', fontSize:'12.5px' }}>{r.updatedAt}</td>
                      <td>
                        <div className="action-btns" style={{ justifyContent:'center' }}>
                          <button className="btn-icon" title="Detail" style={{ color:'var(--green)' }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width:15, height:15 }}><polygon points="5 3 19 12 5 21 5 3"/></svg>
                          </button>
                          <button className="btn-icon delete" title="Delete"><IconDelete /></button>
                        </div>
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
          <Pagination currentPage={safePage} total={filtered.length} pageSize={PAGE_SIZE} onPage={p => setPage(p)} label="items" />
        </div>
      )}

      <ImageViewerModal
        open={imgPopup.open}
        name={imgPopup.name}
        src={imgPopup.src}
        onClose={() => setImgPopup(p => ({ ...p, open:false }))}
      />

      <Modal
        open={modalOpen}
        title="Add Warehouse Item"
        onClose={closeModal}
        size="xl"
        footer={
          <>
            <button className="btn-cancel-modal" onClick={closeModal}><IconClose /> Cancel</button>
            <button className="btn-save-modal" onClick={saveNewItem}><IconCheck /> Save Item</button>
          </>
        }
      >
        <div className="inventory-modal-search-row">
          <div className="form-group" style={{ marginBottom:0 }}>
            <label>Keywords</label>
            <input
              type="text"
              value={itemSearchDraft}
              placeholder="Search by item name, e.g. acrylic ball"
              onChange={e => setItemSearchDraft(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  applyItemSearch();
                }
              }}
            />
          </div>
          <button className="btn-search inventory-modal-search-btn" onClick={() => applyItemSearch()}><IconSearch /> Search</button>
        </div>

        <div className="inventory-search-feedback">
          {hasPendingItemSearch ? (
            <>
              <span className="inventory-search-count">Search not applied yet</span>
              {draftKeyword && <span className="inventory-search-chip">"{draftKeyword}"</span>}
              <button type="button" className="inventory-search-clear" onClick={clearItemSearch}>Reset</button>
            </>
          ) : (
            <>
              <span className="inventory-search-count">
                {filteredCatalog.length} item{filteredCatalog.length === 1 ? '' : 's'} found
              </span>
              {hasActiveItemSearch && <span className="inventory-search-chip">"{itemSearch}"</span>}
              {(hasActiveItemSearch || itemSearchDraft) && (
                <button type="button" className="inventory-search-clear" onClick={clearItemSearch}>Clear</button>
              )}
            </>
          )}
        </div>

        <div className="inventory-item-grid" role="list" aria-label="Inventory item list">
          {filteredCatalog.length === 0 ? (
            <div className="inventory-search-empty">
              <strong>No matching items</strong>
              <span>Try a shorter keyword or clear the search to browse all items.</span>
            </div>
          ) : (
            filteredCatalog.map(item => (
              <button
                key={item.id}
                type="button"
                className={`inventory-item-card${item.id === selectedItemId ? ' selected' : ''}`}
                onClick={() => setSelectedItemId(item.id)}
              >
                <ItemThumb name={item.name} />
                <span className="inventory-item-meta">
                  <span className="inventory-item-name">{item.name}</span>
                  <span className="inventory-item-stock">Stok: {item.stock}</span>
                </span>
              </button>
            ))
          )}
        </div>

        <div className="inventory-selected-item">
          <span>Selected Item</span>
          <strong>{selectedItem?.name || 'No item selected'}</strong>
        </div>

        <div className="inventory-form-grid">
          <div className="form-group">
            <label>Stok <span style={{ color:'var(--red)' }}>*</span></label>
            <input type="number" min="0" value={form.stock} onChange={e => setForm(current => ({ ...current, stock: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Stok Minimum <span style={{ color:'var(--red)' }}>*</span></label>
            <input type="number" min="0" value={form.stokMin} onChange={e => setForm(current => ({ ...current, stokMin: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Kode</label>
            <input type="text" value={form.kode} onChange={e => setForm(current => ({ ...current, kode: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Rack</label>
            <input type="text" value={form.rack} onChange={e => setForm(current => ({ ...current, rack: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Lantai</label>
            <input type="text" value={form.lantai} onChange={e => setForm(current => ({ ...current, lantai: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Lorong</label>
            <input type="text" value={form.lorong} onChange={e => setForm(current => ({ ...current, lorong: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Flag 1</label>
            <input type="text" value={form.flag1} onChange={e => setForm(current => ({ ...current, flag1: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Flag 2</label>
            <input type="text" value={form.flag2} onChange={e => setForm(current => ({ ...current, flag2: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Valuation</label>
            <input type="number" min="0" value={form.valuation} onChange={e => setForm(current => ({ ...current, valuation: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Warehouse <span style={{ color:'var(--red)' }}>*</span></label>
            <select value={form.warehouseName} onChange={e => setForm(current => ({ ...current, warehouseName: e.target.value }))}>
              <option value="">Select warehouse</option>
              {warehouseNames.map(name => <option key={name} value={name}>{name}</option>)}
            </select>
          </div>
        </div>
      </Modal>

      {tab === 'stockopname' && (
        <div className="card">
          <div className="stats-bar" style={{ gridTemplateColumns:'repeat(3,1fr)', marginBottom:18 }}>
            <div className="stat-card">
              <div className="stat-icon" style={{ background:'var(--brand-bg)' }}>
                <span className="stat-value" style={{ color:'var(--brand)' }}>{opnameRows.length}</span>
              </div>
              <span className="stat-label">Item Diperiksa</span>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background:'var(--green-bg)' }}>
                <span className="stat-value" style={{ color:'var(--green)' }}>{opnameMatched}</span>
              </div>
              <span className="stat-label">Sesuai</span>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background:'var(--orange-bg)' }}>
                <span className="stat-value" style={{ color:'var(--orange)' }}>{opnameChanged.length}</span>
              </div>
              <span className="stat-label">Ada Selisih</span>
            </div>
          </div>

          <div className="toolbar">
            <div className="toolbar-left">
              <div className="search-wrap">
                <IconSearch />
                <input
                  className="search-input" type="text" placeholder="Cari nama barang…"
                  value={opnameQuery} onChange={e => setOpnameQuery(e.target.value)}
                />
              </div>
              <div className="wi-select-wrap">
                <select value={opnameWarehouse} onChange={e => setOpnameWarehouse(e.target.value)}>
                  <option value="">Semua Warehouse</option>
                  {warehouseNames.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>
            <div className="toolbar-right">
              <button className="btn-save-modal" disabled={opnameChanged.length === 0} onClick={openOpnameConfirm}>
                <IconCheck /> Terapkan Hasil Opname ({opnameChanged.length})
              </button>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nama Barang</th>
                  <th>Warehouse</th>
                  <th style={{ width:100, textAlign:'right' }}>Stok Sistem</th>
                  <th style={{ width:110, textAlign:'right' }}>Stok Aktual</th>
                  <th style={{ width:80, textAlign:'right' }}>Selisih</th>
                  <th style={{ width:100 }}>Status</th>
                  <th>Catatan</th>
                </tr>
              </thead>
              <tbody>
                {opnameRows.length === 0
                  ? <tr><td colSpan={7} style={{ textAlign:'center', color:'var(--text-muted)', padding:32 }}>Tidak ada item ditemukan.</td></tr>
                  : opnameRows.map(r => {
                    const actual = getActual(r);
                    const diff = variance(r);
                    return (
                      <tr key={r.id}>
                        <td className="name-cell">{r.name}</td>
                        <td>{r.warehouseName}</td>
                        <td style={{ textAlign:'right', fontVariantNumeric:'tabular-nums' }}>{r.itemStock}</td>
                        <td style={{ textAlign:'right' }}>
                          <input
                            type="number" min="0" className="inv-pick-qty" style={{ width:76 }}
                            value={actual} onChange={e => setActual(r.id, e.target.value)}
                          />
                        </td>
                        <td style={{ textAlign:'right', fontWeight:700, color: diff === 0 ? 'var(--text-muted)' : diff > 0 ? 'var(--brand)' : 'var(--red)' }}>
                          {diff > 0 ? `+${diff}` : diff}
                        </td>
                        <td>
                          {diff === 0
                            ? <span className="badge badge-green">Sesuai</span>
                            : diff > 0
                              ? <span className="badge badge-blue">Lebih</span>
                              : <span className="badge badge-red">Kurang</span>
                          }
                        </td>
                        <td>
                          <input
                            type="text" placeholder="Opsional"
                            style={{ width:'100%', padding:'5px 8px', border:'1px solid var(--border)', borderRadius:'var(--r)', fontSize:12.5, fontFamily:'inherit', color:'var(--text)' }}
                            value={opnameNote[r.id] || ''} onChange={e => setNote(r.id, e.target.value)}
                          />
                        </td>
                      </tr>
                    );
                  })
                }
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        open={opnameConfirmOpen}
        title="Terapkan Hasil Stock Opname"
        onClose={() => setOpnameConfirmOpen(false)}
        footer={
          <>
            <button className="btn-cancel-modal" onClick={() => setOpnameConfirmOpen(false)}>Batal</button>
            <button className="btn-save-modal" onClick={applyOpname}><IconCheck /> Terapkan</button>
          </>
        }
      >
        <p className="confirm-msg" style={{ marginBottom:12 }}>
          <strong>{opnameChanged.length}</strong> item akan diperbarui stoknya sesuai hasil hitung fisik:
        </p>
        <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:240, overflowY:'auto' }}>
          {opnameChanged.map(r => {
            const diff = variance(r);
            return (
              <div key={r.id} style={{ display:'flex', justifyContent:'space-between', fontSize:12.5, padding:'6px 0', borderBottom:'1px solid var(--border-2)' }}>
                <span>{r.name}</span>
                <span style={{ fontWeight:700, color: diff > 0 ? 'var(--brand)' : 'var(--red)' }}>
                  {r.itemStock} → {getActual(r)} ({diff > 0 ? '+' : ''}{diff})
                </span>
              </div>
            );
          })}
        </div>
      </Modal>
    </>
  );
}
