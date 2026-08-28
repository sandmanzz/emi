import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import SortTh from '../components/SortTh';
import SearchableSelect from '../components/SearchableSelect';
import { IconSearch, IconPlus, IconDelete, IconClose, IconCheck, IconEdit } from '../components/icons';
import { wiData } from '../data/warehouseInventory';
import { initialWarehouses } from '../data/warehouses';
import { getInventoryRows, setInventoryRows as saveInventoryRows, getOpnameHistory, hasPendingOpname, resolveOpname } from '../lib/stockOpnameStore';
import { isTenantAdmin, getCurrentTenantUser } from '../lib/tenantAuth';

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

function opnameStatusBadge(status) {
  if (status === 'Approved') return <span className="badge badge-green">Approved</span>;
  if (status === 'Rejected') return <span className="badge badge-red">Rejected</span>;
  return <span className="badge badge-orange">Pending</span>;
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
  const navigate = useNavigate();
  const isAdmin = isTenantAdmin();
  const currentUser = getCurrentTenantUser();

  const [inventoryRows,    setInventoryRows]    = useState(() => getInventoryRows());
  const [nextId,           setNextId]           = useState(() => getInventoryRows().length + 1);
  const [tab,              setTab]              = useState('inventory');
  const [query,            setQuery]            = useState('');
  const [warehouseFilter,  setWarehouseFilter]  = useState('');
  const [statusFilter,     setStatusFilter]     = useState('');
  const [page,             setPage]             = useState(1);
  const [sortCol,          setSortCol]          = useState(0);
  const [sortAsc,          setSortAsc]          = useState(true);
  const [imgPopup,         setImgPopup]         = useState({ open:false, name:'', src:null });
  const [modalOpen,        setModalOpen]        = useState(false);
  const [editingRowId,     setEditingRowId]     = useState(null);
  const [editingItemName,  setEditingItemName]  = useState('');
  const [itemSearchDraft,  setItemSearchDraft]  = useState('');
  const [itemSearch,       setItemSearch]       = useState('');
  const [selectedItemId,   setSelectedItemId]   = useState(itemCatalog[0]?.id ?? null);
  const [form,             setForm]             = useState({ stock:'', stokMin:'', kode:'', rack:'', lantai:'', lorong:'', flag1:'', flag2:'', valuation:'', warehouseName:'' });
  const [detailRow,        setDetailRow]        = useState(null);
  const [deleteTarget,     setDeleteTarget]     = useState(null);

  // Moving Order
  const [movingOrders,      setMovingOrders]      = useState([]);
  const [nextMovingOrderId, setNextMovingOrderId] = useState(1);
  const [moModalOpen,       setMoModalOpen]       = useState(false);
  const [moSourceWarehouse, setMoSourceWarehouse] = useState('');
  const [moDestWarehouse,   setMoDestWarehouse]   = useState('');
  const [moItemQuery,       setMoItemQuery]       = useState('');
  const [moSelection,       setMoSelection]       = useState({}); // { [rowId]: qtyString }

  // Stock Opname History (the active counting process now lives on its own page)
  const [opnameHistory,    setOpnameHistory]    = useState(() => getOpnameHistory());
  const [historyWarehouse, setHistoryWarehouse] = useState('');
  const [historyDetail,    setHistoryDetail]    = useState(null);
  const pendingOpname = opnameHistory.some(h => h.status === 'Pending');

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
    setEditingRowId(null);
    setEditingItemName('');
    setItemSearchDraft('');
    setItemSearch('');
  }

  function openModal() {
    setEditingRowId(null);
    setEditingItemName('');
    setSelectedItemId(itemCatalog[0]?.id ?? null);
    setForm({ stock:'', stokMin:'', kode:'', rack:'', lantai:'', lorong:'', flag1:'', flag2:'', valuation:'', warehouseName:'' });
    setItemSearchDraft('');
    setItemSearch('');
    setModalOpen(true);
  }

  function openEditItem(row) {
    setEditingRowId(row.id);
    setEditingItemName(row.name);
    setForm({
      stock: String(row.itemStock),
      stokMin: String(row.stokMin),
      kode: row.asile || '',
      rack: row.rack || '',
      lantai: row.lantai || '',
      lorong: row.lorong || '',
      flag1: row.flag1 != null ? String(row.flag1) : '',
      flag2: row.flag2 != null ? String(row.flag2) : '',
      valuation: String(row.valuation),
      warehouseName: row.warehouseName,
    });
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
    if ((!editingRowId && !selectedItem) || !form.stock.trim() || !form.stokMin.trim() || !form.warehouseName.trim()) return;

    const stock = Number(form.stock) || 0;
    const minimum = Number(form.stokMin) || 0;
    const valuation = Number(form.valuation) || 0;

    let newRows;
    if (editingRowId) {
      newRows = inventoryRows.map(r => r.id !== editingRowId ? r : {
        ...r,
        warehouseStock: stock,
        warehouseName: form.warehouseName,
        itemStock: stock,
        stokMin: minimum,
        valuation,
        totalValuation: valuation * stock,
        minStatus: deriveStatus(stock, minimum),
        flag1: form.flag1.trim(),
        flag2: form.flag2.trim(),
        asile: form.kode.trim(),
        rack: form.rack.trim(),
        lantai: form.lantai.trim(),
        lorong: form.lorong.trim(),
        updatedAt: formatUpdatedAt(),
      });
    } else {
      newRows = [{
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
      }, ...inventoryRows];
      setNextId(id => id + 1);
    }
    setInventoryRows(newRows);
    saveInventoryRows(newRows);
    setPage(1);
    closeModal();
  }

  function confirmDeleteRow() {
    if (!deleteTarget) return;
    const newRows = inventoryRows.filter(r => r.id !== deleteTarget.id);
    setInventoryRows(newRows);
    saveInventoryRows(newRows);
    setDeleteTarget(null);
  }

  const safeCount     = inventoryRows.filter(r => r.minStatus === 'Safe').length;
  const warningCount  = inventoryRows.filter(r => r.minStatus === 'Warning').length;
  const criticalCount = inventoryRows.filter(r => r.minStatus === 'Critical').length;

  // --- Stock Opname History ---
  const filteredHistory = useMemo(
    () => opnameHistory.filter(h => !historyWarehouse || h.warehouse === historyWarehouse),
    [opnameHistory, historyWarehouse]
  );
  const totalItemsAdjusted = useMemo(
    () => opnameHistory.reduce((sum, h) => sum + h.items.length, 0),
    [opnameHistory]
  );
  const pendingCount = useMemo(() => opnameHistory.filter(h => h.status === 'Pending').length, [opnameHistory]);

  function goToStockOpname() {
    if (pendingOpname) return;
    navigate('/stock-opname');
  }

  function decideOpname(entry, status) {
    const verb = status === 'Approved' ? 'approve' : 'reject';
    const consequence = status === 'Approved'
      ? `Stock will be updated for ${entry.items.length} item(s).`
      : 'No stock changes will be made.';
    if (!window.confirm(`Are you sure you want to ${verb} this stock opname? ${consequence}`)) return;

    resolveOpname(entry.id, status, currentUser?.name || 'Admin');
    setOpnameHistory(getOpnameHistory());
    setInventoryRows(getInventoryRows());
    setHistoryDetail(null);
  }

  // --- Moving Order ---
  const moSourceItems = useMemo(
    () => inventoryRows.filter(r => r.warehouseName === moSourceWarehouse && r.itemStock > 0),
    [inventoryRows, moSourceWarehouse]
  );
  const moFilteredItems = useMemo(() => {
    const q = moItemQuery.trim().toLowerCase();
    return !q ? moSourceItems : moSourceItems.filter(r => r.name.toLowerCase().includes(q));
  }, [moSourceItems, moItemQuery]);
  const moDestOptions = warehouseNames.filter(n => n !== moSourceWarehouse);
  const moSelectedRows = Object.keys(moSelection)
    .map(id => moSourceItems.find(r => r.id === Number(id)))
    .filter(Boolean);
  const moValid = !!moSourceWarehouse && !!moDestWarehouse && moSelectedRows.length > 0 &&
    moSelectedRows.every(r => {
      const qty = Number(moSelection[r.id]) || 0;
      return qty > 0 && qty <= r.itemStock;
    });

  function openMovingOrderModal() {
    setMoSourceWarehouse('');
    setMoDestWarehouse('');
    setMoItemQuery('');
    setMoSelection({});
    setMoModalOpen(true);
  }

  function toggleMoItem(row) {
    setMoSelection(sel => {
      const next = { ...sel };
      if (next[row.id] !== undefined) delete next[row.id];
      else next[row.id] = String(Math.min(1, row.itemStock) || 1);
      return next;
    });
  }

  function setMoItemQty(rowId, value, max) {
    setMoSelection(sel => ({
      ...sel,
      [rowId]: value === '' ? '' : String(Math.max(1, Math.min(max, Number(value) || 1))),
    }));
  }

  function submitMovingOrder() {
    if (!moValid) return;
    const now = formatUpdatedAt();

    let newRows = inventoryRows;
    let idCounter = nextId;
    let orderIdCounter = nextMovingOrderId;
    const newHistoryEntries = [];

    moSelectedRows.forEach(sourceRow => {
      const qty = Number(moSelection[sourceRow.id]) || 0;

      newRows = newRows.map(r => {
        if (r.id !== sourceRow.id) return r;
        const newStock = r.itemStock - qty;
        return { ...r, itemStock: newStock, warehouseStock: newStock, totalValuation: r.valuation * newStock, minStatus: deriveStatus(newStock, r.stokMin), updatedAt: now };
      });

      const destRow = newRows.find(r => r.name === sourceRow.name && r.warehouseName === moDestWarehouse);
      if (destRow) {
        newRows = newRows.map(r => {
          if (r.id !== destRow.id) return r;
          const newStock = r.itemStock + qty;
          return { ...r, itemStock: newStock, warehouseStock: newStock, totalValuation: r.valuation * newStock, minStatus: deriveStatus(newStock, r.stokMin), updatedAt: now };
        });
      } else {
        newRows = [{
          id: idCounter,
          name: sourceRow.name,
          warehouseStock: qty,
          warehouseName: moDestWarehouse,
          itemStock: qty,
          stokMin: sourceRow.stokMin,
          stokUsed: 0,
          valuation: sourceRow.valuation,
          totalValuation: sourceRow.valuation * qty,
          minStatus: deriveStatus(qty, sourceRow.stokMin),
          flag1: '', flag2: '', asile: '', rack: '', level: '', lantai: '', lorong: '',
          updatedAt: now,
        }, ...newRows];
        idCounter += 1;
      }

      newHistoryEntries.push({
        id: orderIdCounter,
        itemName: sourceRow.name,
        fromWarehouse: sourceRow.warehouseName,
        toWarehouse: moDestWarehouse,
        qty,
        movedBy: currentUser?.name || 'Admin',
        movedAt: now,
      });
      orderIdCounter += 1;
    });

    setInventoryRows(newRows);
    saveInventoryRows(newRows);
    setNextId(idCounter);
    setMovingOrders(mo => [...newHistoryEntries, ...mo]);
    setNextMovingOrderId(orderIdCounter);
    setMoModalOpen(false);
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
          { id:'inventory',      label:'Inventory' },
          { id:'movingorder',    label:'Moving Order' },
          { id:'opnamehistory',  label:'Opname History' },
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
              <SearchableSelect
                inline
                value={warehouseFilter}
                onChange={v => { setWarehouseFilter(v); setPage(1); }}
                placeholder="All Warehouses"
                searchPlaceholder="Search warehouse…"
                options={[{ value:'', label:'All Warehouses' }, ...warehouseNames.map(n => ({ value:n, label:n }))]}
              />
              <SearchableSelect
                inline
                value={statusFilter}
                onChange={v => { setStatusFilter(v); setPage(1); }}
                placeholder="All Status"
                options={[
                  { value:'', label:'All Status' },
                  { value:'Safe', label:'Safe' },
                  { value:'Warning', label:'Warning' },
                  { value:'Critical', label:'Critical' },
                ]}
              />
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
                  <SortTh label="Aisle"          colIndex={11} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} style={{ width:50, textAlign:'center' }} />
                  <SortTh label="Rack"           colIndex={12} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} style={{ width:50, textAlign:'center' }} />
                  <SortTh label="Level"          colIndex={13} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} style={{ width:50, textAlign:'center' }} />
                  <SortTh label="Floor"          colIndex={14} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} style={{ width:55, textAlign:'center' }} />
                  <SortTh label="Lane"           colIndex={15} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} style={{ width:55, textAlign:'center' }} />
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
                          <button className="btn-icon" title="Detail" style={{ color:'var(--green)' }} onClick={() => setDetailRow(r)}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width:15, height:15 }}><polygon points="5 3 19 12 5 21 5 3"/></svg>
                          </button>
                          <button className="btn-icon edit" title="Edit" onClick={() => openEditItem(r)}><IconEdit /></button>
                          <button className="btn-icon delete" title="Delete" onClick={() => setDeleteTarget(r)}><IconDelete /></button>
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
        title={editingRowId ? 'Edit Warehouse Item' : 'Add Warehouse Item'}
        onClose={closeModal}
        size="xl"
        footer={
          <>
            <button className="btn-cancel-modal" onClick={closeModal}><IconClose /> Cancel</button>
            <button className="btn-save-modal" onClick={saveNewItem}><IconCheck /> {editingRowId ? 'Save Changes' : 'Save Item'}</button>
          </>
        }
      >
        {editingRowId ? (
          <div className="inventory-selected-item" style={{ marginBottom: 16 }}>
            <span>Item Name</span>
            <strong>{editingItemName}</strong>
          </div>
        ) : (
          <>
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
                      <span className="inventory-item-stock">Stock: {item.stock}</span>
                    </span>
                  </button>
                ))
              )}
            </div>

            <div className="inventory-selected-item">
              <span>Selected Item</span>
              <strong>{selectedItem?.name || 'No item selected'}</strong>
            </div>
          </>
        )}

        <div className="inventory-form-grid">
          <div className="form-group">
            <label>Stock <span style={{ color:'var(--red)' }}>*</span></label>
            <input type="number" min="0" value={form.stock} onChange={e => setForm(current => ({ ...current, stock: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Minimum Stock <span style={{ color:'var(--red)' }}>*</span></label>
            <input type="number" min="0" value={form.stokMin} onChange={e => setForm(current => ({ ...current, stokMin: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Code</label>
            <input type="text" value={form.kode} onChange={e => setForm(current => ({ ...current, kode: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Rack</label>
            <input type="text" value={form.rack} onChange={e => setForm(current => ({ ...current, rack: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Floor</label>
            <input type="text" value={form.lantai} onChange={e => setForm(current => ({ ...current, lantai: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Lane</label>
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
            <SearchableSelect
              value={form.warehouseName}
              onChange={v => setForm(current => ({ ...current, warehouseName: v }))}
              placeholder="Select warehouse"
              searchPlaceholder="Search warehouse…"
              options={warehouseNames.map(name => ({ value:name, label:name }))}
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={!!detailRow}
        title="Warehouse Item Detail"
        onClose={() => setDetailRow(null)}
        footer={<button className="btn-cancel-modal" onClick={() => setDetailRow(null)}><IconClose /> Close</button>}
      >
        {detailRow && (
          <div className="item-detail-grid">
            <div className="item-detail-row"><span>Name</span><strong>{detailRow.name}</strong></div>
            <div className="item-detail-row"><span>Warehouse</span><strong>{detailRow.warehouseName}</strong></div>
            <div className="item-detail-row"><span>Warehouse Stock</span><strong>{detailRow.warehouseStock}</strong></div>
            <div className="item-detail-row"><span>Item Stock</span><strong>{detailRow.itemStock}</strong></div>
            <div className="item-detail-row"><span>Minimum Stock</span><strong>{detailRow.stokMin}</strong></div>
            <div className="item-detail-row"><span>Used</span><strong>{detailRow.stokUsed}</strong></div>
            <div className="item-detail-row"><span>Valuation</span><strong>{detailRow.valuation}</strong></div>
            <div className="item-detail-row"><span>Total Valuation</span><strong>{detailRow.totalValuation}</strong></div>
            <div className="item-detail-row"><span>Status</span><span>{statusBadge(detailRow.minStatus)}</span></div>
            <div className="item-detail-row"><span>Flag 1 / Flag 2</span><strong>{detailRow.flag1 || '—'} / {detailRow.flag2 || '—'}</strong></div>
            <div className="item-detail-row"><span>Aisle / Rack / Level</span><strong>{detailRow.asile || '—'} / {detailRow.rack || '—'} / {detailRow.level || '—'}</strong></div>
            <div className="item-detail-row"><span>Floor / Lane</span><strong>{detailRow.lantai || '—'} / {detailRow.lorong || '—'}</strong></div>
            <div className="item-detail-row"><span>Updated At</span><strong>{detailRow.updatedAt}</strong></div>
          </div>
        )}
      </Modal>

      <Modal
        open={!!deleteTarget}
        title="Delete Warehouse Item"
        onClose={() => setDeleteTarget(null)}
        footer={
          <>
            <button className="btn-cancel-modal" onClick={() => setDeleteTarget(null)}>Cancel</button>
            <button className="btn-del-ok" onClick={confirmDeleteRow}>Delete</button>
          </>
        }
      >
        <p className="confirm-msg">
          Are you sure you want to delete <strong>&ldquo;{deleteTarget?.name}&rdquo;</strong> at <strong>{deleteTarget?.warehouseName}</strong>? This action cannot be undone.
        </p>
      </Modal>

      {tab === 'movingorder' && (
        <div className="card">
          <div className="toolbar">
            <div className="toolbar-left">
              <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: 0 }}>
                Move stock of an item from one warehouse to another.
              </p>
            </div>
            <div className="toolbar-right">
              <button className="btn-new" onClick={openMovingOrderModal}><IconPlus /> Create Moving Order</button>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Item</th>
                  <th>From</th>
                  <th>To</th>
                  <th style={{ width: 90, textAlign: 'right' }}>Qty</th>
                  <th>Moved By</th>
                </tr>
              </thead>
              <tbody>
                {movingOrders.length === 0
                  ? <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>No moving orders yet.</td></tr>
                  : movingOrders.map(mo => (
                    <tr key={mo.id}>
                      <td style={{ color: 'var(--text-muted)', fontSize: '12.5px' }}>{mo.movedAt}</td>
                      <td className="name-cell">{mo.itemName}</td>
                      <td>{mo.fromWarehouse}</td>
                      <td>{mo.toWarehouse}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{mo.qty}</td>
                      <td>{mo.movedBy}</td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        open={moModalOpen}
        title="Create Moving Order"
        onClose={() => setMoModalOpen(false)}
        size="lg"
        footer={
          <>
            <button className="btn-cancel-modal" onClick={() => setMoModalOpen(false)}><IconClose /> Cancel</button>
            <button className="btn-save-modal" disabled={!moValid} onClick={submitMovingOrder}>
              <IconCheck /> Create Order{moSelectedRows.length > 1 ? ` (${moSelectedRows.length} items)` : ''}
            </button>
          </>
        }
      >
        <div className="form-group">
          <label>Source Warehouse <span style={{ color:'var(--red)' }}>*</span></label>
          <SearchableSelect
            value={moSourceWarehouse}
            onChange={v => { setMoSourceWarehouse(v); setMoDestWarehouse(''); setMoItemQuery(''); setMoSelection({}); }}
            placeholder="Choose warehouse…"
            searchPlaceholder="Search warehouse…"
            options={warehouseNames.map(n => ({ value:n, label:n }))}
          />
        </div>

        {moSourceWarehouse && (
          <div className="form-group">
            <label>
              Items to Move <span style={{ color:'var(--red)' }}>*</span>
              {moSelectedRows.length > 0 && (
                <span style={{ color:'var(--text-muted)', textTransform:'none', fontWeight:500, letterSpacing:0, marginLeft:6 }}>
                  ({moSelectedRows.length} selected)
                </span>
              )}
            </label>
            <div className="mo-item-search">
              <IconSearch />
              <input type="text" placeholder="Search item…" value={moItemQuery} onChange={e => setMoItemQuery(e.target.value)} />
            </div>
            <div className="mo-item-list">
              {moFilteredItems.length === 0
                ? <div className="mo-item-empty">No items with stock at this warehouse.</div>
                : moFilteredItems.map(r => {
                  const checked = moSelection[r.id] !== undefined;
                  return (
                    <div key={r.id} className={`mo-item-row${checked ? ' checked' : ''}`}>
                      <label className="mo-item-check">
                        <input type="checkbox" checked={checked} onChange={() => toggleMoItem(r)} />
                        <span className="mo-item-name">{r.name}</span>
                        <span className="mo-item-stock">stock: {r.itemStock}</span>
                      </label>
                      {checked && (
                        <input
                          type="number" min="1" max={r.itemStock}
                          className="mo-item-qty"
                          value={moSelection[r.id]}
                          onChange={e => setMoItemQty(r.id, e.target.value, r.itemStock)}
                        />
                      )}
                    </div>
                  );
                })
              }
            </div>
          </div>
        )}

        <div className="form-group">
          <label>Destination Warehouse <span style={{ color:'var(--red)' }}>*</span></label>
          <SearchableSelect
            value={moDestWarehouse}
            onChange={setMoDestWarehouse}
            placeholder="Choose warehouse…"
            searchPlaceholder="Search warehouse…"
            disabled={!moSourceWarehouse}
            options={moDestOptions.map(n => ({ value:n, label:n }))}
          />
        </div>

        {moValid && (
          <div className="mo-flow" style={{ marginTop: 4, padding: '10px 12px', background: 'var(--bg)', borderRadius: 'var(--r-lg)', fontSize: 12.5 }}>
            <strong>{moSelectedRows.length} item{moSelectedRows.length === 1 ? '' : 's'}</strong>
            <span className="mo-flow-arrow">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </span>
            <span>{moSourceWarehouse} → {moDestWarehouse}</span>
          </div>
        )}
      </Modal>

      {tab === 'opnamehistory' && (
        <div className="card">
          <div className="stats-bar" style={{ gridTemplateColumns:'repeat(4,1fr)', marginBottom:18 }}>
            <div className="stat-card">
              <div className="stat-icon" style={{ background:'var(--brand-bg)' }}>
                <span className="stat-value" style={{ color:'var(--brand)' }}>{opnameHistory.length}</span>
              </div>
              <span className="stat-label">Total Sessions</span>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background:'var(--orange-bg)' }}>
                <span className="stat-value" style={{ color:'var(--orange)' }}>{pendingCount}</span>
              </div>
              <span className="stat-label">Pending Approval</span>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background:'var(--green-bg)' }}>
                <span className="stat-value" style={{ color:'var(--green)' }}>{totalItemsAdjusted}</span>
              </div>
              <span className="stat-label">Items Adjusted</span>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background:'var(--bg)' }}>
                <span className="stat-value" style={{ color:'var(--text-2)', fontSize:15 }}>{opnameHistory[0]?.appliedAt || '-'}</span>
              </div>
              <span className="stat-label">Last Submitted</span>
            </div>
          </div>

          <div className="toolbar">
            <div className="toolbar-left">
              <SearchableSelect
                inline
                value={historyWarehouse}
                onChange={setHistoryWarehouse}
                placeholder="All Warehouses"
                searchPlaceholder="Search warehouse…"
                options={[{ value:'', label:'All Warehouses' }, ...warehouseNames.map(n => ({ value:n, label:n }))]}
              />
            </div>
            <div className="toolbar-right">
              <button
                className="btn-save-modal"
                disabled={pendingOpname}
                title={pendingOpname ? 'Resolve the pending opname below before starting a new one' : 'Start a new stock opname'}
                onClick={goToStockOpname}
              >
                <IconPlus /> Start Stock Opname
              </button>
            </div>
          </div>

          {pendingOpname && (
            <p style={{ fontSize: 12.5, color: 'var(--orange)', background: 'var(--orange-bg)', padding: '9px 14px', borderRadius: 'var(--r-lg)', marginBottom: 16 }}>
              A stock opname is awaiting approval below — a new one can&rsquo;t be started until it&rsquo;s resolved.
            </p>
          )}

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date Submitted</th>
                  <th>Warehouse</th>
                  <th>Submitted By</th>
                  <th style={{ width:110, textAlign:'right' }}>Items Changed</th>
                  <th style={{ width:110, textAlign:'right' }}>Net Variance</th>
                  <th style={{ width:100 }}>Status</th>
                  <th style={{ width:140, textAlign:'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.length === 0
                  ? <tr><td colSpan={7} style={{ textAlign:'center', color:'var(--text-muted)', padding:32 }}>No opname history yet.</td></tr>
                  : filteredHistory.map(h => {
                    const net = h.items.reduce((sum, it) => sum + it.diff, 0);
                    return (
                      <tr key={h.id}>
                        <td>{h.appliedAt}</td>
                        <td>{h.warehouse}</td>
                        <td>{h.appliedBy}</td>
                        <td style={{ textAlign:'right', fontVariantNumeric:'tabular-nums' }}>{h.items.length}</td>
                        <td style={{ textAlign:'right', fontWeight:700, color: net === 0 ? 'var(--text-muted)' : net > 0 ? 'var(--brand)' : 'var(--red)' }}>
                          {net > 0 ? `+${net}` : net}
                        </td>
                        <td>{opnameStatusBadge(h.status)}</td>
                        <td style={{ textAlign:'center' }}>
                          <div className="action-btns" style={{ justifyContent:'center' }}>
                            <button className="btn-icon" title="View Detail" style={{ color:'var(--brand)' }} onClick={() => setHistoryDetail(h)}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width:15, height:15 }}>
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                              </svg>
                            </button>
                            {isAdmin && h.status === 'Pending' && (
                              <>
                                <button className="btn-icon" title="Approve" style={{ color:'var(--green)' }} onClick={() => decideOpname(h, 'Approved')}>
                                  <IconCheck />
                                </button>
                                <button className="btn-icon delete" title="Reject" onClick={() => decideOpname(h, 'Rejected')}>
                                  <IconClose />
                                </button>
                              </>
                            )}
                          </div>
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
        open={!!historyDetail}
        title={historyDetail ? `Opname Detail — ${historyDetail.appliedAt}` : ''}
        onClose={() => setHistoryDetail(null)}
      >
        {historyDetail && (
          <>
            <p className="confirm-msg" style={{ marginBottom:6 }}>
              <strong>{historyDetail.items.length}</strong> item{historyDetail.items.length === 1 ? '' : 's'} counted at <strong>{historyDetail.warehouse}</strong> by <strong>{historyDetail.appliedBy}</strong>.
            </p>
            <p style={{ marginBottom:12 }}>{opnameStatusBadge(historyDetail.status)}
              {historyDetail.status !== 'Pending' && (
                <span style={{ fontSize:12, color:'var(--text-muted)', marginLeft:8 }}>
                  by {historyDetail.resolvedBy} on {historyDetail.resolvedAt}
                </span>
              )}
            </p>
            <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:320, overflowY:'auto', marginBottom: historyDetail.status === 'Pending' && isAdmin ? 16 : 0 }}>
              {historyDetail.items.map((it, idx) => (
                <div key={idx} style={{ display:'flex', justifyContent:'space-between', gap:10, fontSize:12.5, padding:'6px 0', borderBottom:'1px solid var(--border-2)' }}>
                  <span>
                    {it.name}
                    {it.condition === 'Poor' && <span className="badge badge-red" style={{ marginLeft:6, fontSize:10 }}>Poor</span>}
                    {it.note && <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>{it.note}</div>}
                  </span>
                  <span style={{ fontWeight:700, color: it.diff > 0 ? 'var(--brand)' : it.diff < 0 ? 'var(--red)' : 'var(--text-muted)', whiteSpace:'nowrap' }}>
                    {it.before} → {it.after} ({it.diff > 0 ? '+' : ''}{it.diff})
                  </span>
                </div>
              ))}
            </div>
            {historyDetail.status === 'Pending' && isAdmin && (
              <div style={{ display:'flex', gap:10 }}>
                <button className="btn-save-modal" onClick={() => decideOpname(historyDetail, 'Approved')}><IconCheck /> Approve</button>
                <button className="btn-cancel-modal" onClick={() => decideOpname(historyDetail, 'Rejected')}><IconClose /> Reject</button>
              </div>
            )}
          </>
        )}
      </Modal>
    </>
  );
}
