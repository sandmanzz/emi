import { useState, useMemo, useRef, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Modal from '../components/Modal';
import Stepper from '../components/Stepper';
import SearchableSelect from '../components/SearchableSelect';
import { IconSearch, IconPlus, IconDelete, IconClose, IconCheck, IconCart, IconPrint, IconBarChart, IconMoreVertical } from '../components/icons';
import { initialAreas, SUB_AREAS } from '../data/areas';
import { inventoryData, categories } from '../data/inventory';
import { initialWarehouses } from '../data/warehouses';
import { wiData } from '../data/warehouseInventory';
import { eiData } from '../data/eventInventory';
import { getEventStageNames, isScanStage } from '../lib/eventStatuses';
import { getEventProgress, saveEventProgress } from '../lib/eventProgress';

const AREAS = initialAreas.map(a => a.name);
const WAREHOUSES = [...new Set(initialWarehouses.map(w => w.name))];

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

// Real stock at a specific warehouse (from Warehouse Inventory), not the catalog's
// single fixed totalStock — used so the picker's stock figure reflects whichever
// warehouse the user picked, not always the item's original home warehouse.
function stockAtWarehouse(inv, warehouseName) {
  const row = wiData.find(r => r.name === inv.name && r.warehouseName === warehouseName);
  return row ? row.itemStock : 0;
}

const initialItems = [
  { id:1, name:'Chiffon White 4-6×1,2m',        area:'CEREMONY',        subArea:'', stage:'On preparing items',  scanned:false, groupId:null, qty:2,   pic:'Anto',    checking:true,  warehouseItem:false, scanIn:'May 26, 2025 10:42 PM', scanOut:'May 26, 2025 9:33 PM',  note:"Please take care this item, it's luxury item" },
  { id:2, name:'Hanging Rattan 1',               area:'PHOTOBOOTH',      subArea:'', stage:'On preparing items',  scanned:false, groupId:null, qty:2,   pic:'',        checking:false, warehouseItem:false, scanIn:null,                    scanOut:null,                    note:"Please take care this item, it's luxury item" },
  { id:3, name:'Hanging Rattan 2',               area:'RECEPTION',       subArea:'', stage:'On preparing items',  scanned:false, groupId:null, qty:10,  pic:'',        checking:false, warehouseItem:false, scanIn:null,                    scanOut:null,                    note:"Please take care this item, it's luxury item" },
  { id:4, name:'Hanging Rattan 3',               area:'RECEPTION',       subArea:'', stage:'On preparing items',  scanned:false, groupId:null, qty:10,  pic:'',        checking:false, warehouseItem:false, scanIn:null,                    scanOut:null,                    note:"Please take care this item, it's luxury item" },
  { id:5, name:'White Fabric 3m',                area:'ENTRANCE',        subArea:'', stage:'On preparing items',  scanned:false, groupId:null, qty:5,   pic:'Novi',    checking:false, warehouseItem:false, scanIn:null,                    scanOut:null,                    note:'' },
  { id:6, name:'Red Rose Flower',                area:'RECEPTION',       subArea:'', stage:'On preparing items',  scanned:false, groupId:null, qty:30,  pic:'Darmian', checking:true,  warehouseItem:false, scanIn:'Apr 9, 2026 08:00 AM',  scanOut:null,                    note:'' },
  { id:7, name:'Standing Flower Tall',           area:'ENTRANCE',        subArea:'', stage:'On preparing items',  scanned:false, groupId:null, qty:4,   pic:'',        checking:false, warehouseItem:false, scanIn:null,                    scanOut:null,                    note:'' },
  { id:8, name:'Tealight Holder 15cm',           area:'GUEST TABLE',     subArea:'', stage:'On preparing items',  scanned:false, groupId:null, qty:50,  pic:'Anto',    checking:false, warehouseItem:true,  scanIn:null,                    scanOut:null,                    note:'' },
  { id:9, name:'Gold Ribbon 5m',                 area:'CEREMONY',        subArea:'', stage:'On preparing items',  scanned:false, groupId:null, qty:20,  pic:'',        checking:false, warehouseItem:false, scanIn:null,                    scanOut:null,                    note:'' },
  { id:10,name:'White Candle 30cm',              area:'GUEST TABLE',     subArea:'', stage:'On preparing items',  scanned:false, groupId:null, qty:100, pic:'Novi',    checking:true,  warehouseItem:true,  scanIn:'Apr 9, 2026 07:30 AM',  scanOut:'Apr 9, 2026 09:00 AM', note:'' },
  { id:11,name:'Backdrop Floral 3×2m',           area:'PHOTOBOOTH',      subArea:'', stage:'On preparing items',  scanned:false, groupId:null, qty:1,   pic:'',        checking:false, warehouseItem:false, scanIn:null,                    scanOut:null,                    note:'' },
  { id:12,name:'Tiffany Chair',                  area:'RECEPTION',       subArea:'', stage:'On preparing items',  scanned:false, groupId:null, qty:60,  pic:'Darmian', checking:false, warehouseItem:true,  scanIn:null,                    scanOut:null,                    note:'' },
  { id:13,name:'Fairy Light Curtain 3x3m',       area:'CHAMPAGNE WALL',  subArea:'', stage:'Created by admin up',  scanned:false, groupId:null, qty:2,   pic:'',        checking:false, warehouseItem:false, scanIn:null,                    scanOut:null,                    note:'' },
  { id:14,name:'Champagne Tower Glass Set',      area:'CHAMPAGNE WALL',  subArea:'', stage:'Finish setup',   scanned:false, groupId:null, qty:150, pic:'Novi',    checking:false, warehouseItem:false, scanIn:null,                    scanOut:null,                    note:'' },
  { id:15,name:'Cocktail High Table',            area:'COCKTAIL',        subArea:'', stage:'Waiting scan in',scanned:false, groupId:null, qty:8,   pic:'Anto',    checking:true,  warehouseItem:true,  scanIn:null,                    scanOut:null,                    note:'' },
  { id:16,name:'Gold Bar Stool',                 area:'COCKTAIL',        subArea:'', stage:'Waiting scan in',scanned:false, groupId:null, qty:16,  pic:'Anto',    checking:true,  warehouseItem:true,  scanIn:null,                    scanOut:null,                    note:'' },
  { id:17,name:'Display Table Riser Set',        area:'DISPLAY TABLE',   subArea:'', stage:'Created by admin up',  scanned:false, groupId:null, qty:6,   pic:'',        checking:false, warehouseItem:false, scanIn:null,                    scanOut:null,                    note:'' },
  { id:18,name:'Fresh Flower Centerpiece',       area:'FLORIST',         subArea:'', stage:'Finish setup',   scanned:false, groupId:null, qty:12,  pic:'Dewi',    checking:false, warehouseItem:false, scanIn:null,                    scanOut:null,                    note:'' },
  { id:19,name:'Greenery Wall Panel',            area:'FLORIST',         subArea:'', stage:'Created by admin up',  scanned:false, groupId:null, qty:4,   pic:'',        checking:false, warehouseItem:false, scanIn:null,                    scanOut:null,                    note:'' },
  { id:20,name:'Labour Toolkit Bag',             area:'LABOUR',          subArea:'', stage:'On preparing items',  scanned:false, groupId:null, qty:3,   pic:'Hendra',  checking:true,  warehouseItem:true,  scanIn:null,                    scanOut:null,                    note:'' },
  { id:21,name:'Lounge Sofa Set',                area:'LOUNGE',          subArea:'', stage:'Waiting scan in',scanned:false, groupId:null, qty:2,   pic:'Agus',    checking:true,  warehouseItem:true,  scanIn:null,                    scanOut:null,                    note:'' },
  { id:22,name:'Round Coffee Table',             area:'LOUNGE',          subArea:'', stage:'Waiting scan in',scanned:false, groupId:null, qty:2,   pic:'Agus',    checking:true,  warehouseItem:true,  scanIn:null,                    scanOut:null,                    note:'' },
  { id:23,name:'Bridal Backdrop Floral Wall',    area:'BRIDAL BACKDROP', subArea:'', stage:'Event running', scanned:false, groupId:null, qty:1,   pic:'Lina',    checking:true,  warehouseItem:false, scanIn:'Apr 9, 2026 09:10 AM',  scanOut:null,                    note:'' },
  { id:24,name:'Bridal Room Mirror Stand',       area:'BRIDAL ROOM',     subArea:'', stage:'On preparing items',  scanned:false, groupId:null, qty:1,   pic:'Siti',    checking:false, warehouseItem:true,  scanIn:null,                    scanOut:null,                    note:'' },
  { id:25,name:'Bridal Table Linen Set',         area:'BRIDAL TABLE',    subArea:'', stage:'Finish setup',   scanned:false, groupId:null, qty:3,   pic:'',        checking:false, warehouseItem:false, scanIn:null,                    scanOut:null,                    note:'' },
  { id:26,name:'Car Decoration Ribbon Kit',      area:'CAR DECOR',       subArea:'', stage:'Created by admin up',  scanned:false, groupId:null, qty:2,   pic:'',        checking:false, warehouseItem:false, scanIn:null,                    scanOut:null,                    note:'' },
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

function ItemCard({ item, group, showScanButton, onScanClick, onDelete }) {
  return (
    <div className="item-card">
      <button className="item-card-delete" title="Delete" onClick={() => onDelete(item.id)}>
        <IconDelete />
      </button>
      <ImagePlaceholder />
      <div className="item-body">
        <span className={`area-badge ${areaBadgeClass(item.area)}`}>{item.area}</span>
        <div className="item-name-row">
          <span className="item-name">
            {item.name}
            {group && (
              <span className="item-group-badge" title={`Grouped with ${group.itemIds.length} items — scans together`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
                {group.name}
              </span>
            )}
            {item.scanned && (
              <span className="item-scanned-badge"><CheckIcon /> Scanned</span>
            )}
          </span>
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
        {showScanButton && (
          <div className="item-actions">
            <button className={`btn-ia-scan${item.scanned ? ' scanned' : ''}`} onClick={() => onScanClick(item)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h.01M14 17h3v3M17 14h3"/></svg>
              {item.scanned ? 'Re-scan' : 'Scan'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function EventDetailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const eventName = searchParams.get('name') || '03/06/2023 | GUNTUR + CLARISSA';

  const [items, setItems] = useState(initialItems);
  const [nextId, setNextId] = useState(27);
  const [stages] = useState(() => getEventStageNames());
  const [eventStatus, setEventStatus] = useState(() => {
    const saved = getEventProgress(eventName);
    if (saved && stages.includes(saved)) return saved;
    // No saved progress yet (first-ever visit) — fall back to this event's mock
    // status from Event Inventory instead of always starting at the first stage.
    const mockRow = eiData.find(r => r.event === eventName);
    if (mockRow && stages.includes(mockRow.status)) return mockRow.status;
    return stages[0] || 'Preparation';
  });
  const stageScanEnabled = isScanStage(eventStatus);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef(null);

  useEffect(() => {
    if (!moreMenuOpen) return;
    function onDocMouseDown(e) {
      if (!moreMenuRef.current?.contains(e.target)) setMoreMenuOpen(false);
    }
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [moreMenuOpen]);
  const [scanningItem, setScanningItem] = useState(null);
  const [scanPhase, setScanPhase] = useState('ready'); // ready | scanning | done
  const [stepperError, setStepperError] = useState('');

  // Packaging (grouping first-stage items so they scan together)
  const [packages, setPackages] = useState([]);
  const [nextPackageId, setNextPackageId] = useState(1);
  const [packagingOpen, setPackagingOpen] = useState(false);
  const [packagingSelection, setPackagingSelection] = useState([]);
  const [packagingName, setPackagingName] = useState('');

  const [selectedArea, setSelectedArea] = useState('');
  const [kwSearch, setKwSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('all'); // 'all' | 'previous' | 'current'

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
    if (selectedArea && it.area !== selectedArea) return false;
    if (kwSearch && !it.name.toLowerCase().includes(kwSearch.toLowerCase()) && !it.area.toLowerCase().includes(kwSearch.toLowerCase())) return false;
    return true;
  }), [items, selectedArea, kwSearch]);

  const stageIndex = stages.indexOf(eventStatus);
  // "All" only counts items added up through the current stage — not items whose
  // stage is still ahead of where the event is now (only reachable if the stepper
  // was moved backward, since an item's `stage` is stamped once, at add-time).
  const scopedItems = useMemo(() => filtered.filter(it => stages.indexOf(it.stage) <= stageIndex), [filtered, stageIndex]);
  const currentStageItems = useMemo(() => filtered.filter(it => stages.indexOf(it.stage) === stageIndex), [filtered, stageIndex]); // "Added New"
  const waitingScanItems = useMemo(() => scopedItems.filter(it => !it.scanned), [scopedItems]);
  const effectiveStageFilter = (stageFilter === 'waiting' && !stageScanEnabled) ? 'all' : stageFilter;
  const stageFiltered = effectiveStageFilter === 'added' ? currentStageItems : effectiveStageFilter === 'waiting' ? waitingScanItems : scopedItems;

  const areaCounts = useMemo(() => {
    const map = {};
    items.forEach(it => { map[it.area] = (map[it.area] || 0) + 1; });
    return map;
  }, [items]);


  const unscannedCount = useMemo(() => items.filter(it => !it.scanned).length, [items]);
  const hasNextStage = stageIndex < stages.length - 1;

  function changeEventStatus(step) {
    const targetIndex = stages.indexOf(step);
    if (stageScanEnabled && targetIndex > stageIndex && unscannedCount > 0) {
      setStepperError(`${unscannedCount} item${unscannedCount === 1 ? '' : 's'} still need${unscannedCount === 1 ? 's' : ''} to be scanned before moving to the next stage.`);
      return;
    }
    setStepperError('');
    setEventStatus(step);
    saveEventProgress(eventName, step);
    setStageFilter('all');
  }

  function handleNextClick() {
    if (!hasNextStage || unscannedCount > 0) return;
    changeEventStatus(stages[stageIndex + 1]);
  }

  // --- Packaging (group items so they scan together) — usable at any stage ---
  const packableItems = useMemo(
    () => items.filter(it => !it.groupId),
    [items]
  );

  function openPackagingModal() {
    setPackagingSelection([]);
    setPackagingName('');
    setPackagingOpen(true);
  }

  function togglePackagingSelection(id) {
    setPackagingSelection(sel => sel.includes(id) ? sel.filter(x => x !== id) : [...sel, id]);
  }

  function createPackage() {
    if (!packagingName.trim() || packagingSelection.length === 0) return;
    const groupId = nextPackageId;
    setPackages(pkgs => [...pkgs, { id: groupId, name: packagingName.trim(), itemIds: packagingSelection }]);
    setItems(is => is.map(it => packagingSelection.includes(it.id) ? { ...it, groupId } : it));
    setNextPackageId(n => n + 1);
    setPackagingOpen(false);
  }

  const pickerFiltered = useMemo(() => {
    const q = pickerQuery.trim().toLowerCase();
    return inventoryData.filter(inv =>
      (!q || inv.name.toLowerCase().includes(q) || inv.sku.toLowerCase().includes(q)) &&
      (!pickerCategory || inv.category === pickerCategory)
    );
  }, [pickerQuery, pickerCategory]);

  const areaLabel = selectedArea || 'All Place';
  const hasMissingArea = cart.some(c => !c.area);

  const summaryStats = useMemo(() => {
    const total = items.length;
    const totalQty = items.reduce((sum, it) => sum + it.qty, 0);
    const checked = items.filter(it => it.checking).length;
    const scanIn = items.filter(it => it.scanIn).length;
    const scanOut = items.filter(it => it.scanOut).length;
    return { total, totalQty, checked, scanIn, scanOut };
  }, [items]);

  function goToFullSummary() {
    setSummaryOpen(false);
    navigate(`/event-summary?name=${encodeURIComponent(eventName)}`);
  }

  function doScan(id) {
    const now = new Date().toLocaleString('en-US', { month:'short', day:'numeric', year:'numeric', hour:'numeric', minute:'2-digit', hour12:true });
    setItems(is => is.map(it => {
      if (it.id !== id) return it;
      const next = { ...it, scanned: true };
      if (!it.scanIn)  return { ...next, scanIn: now };
      if (!it.scanOut) return { ...next, scanOut: now };
      return next;
    }));
  }

  function openScanPopup(item) {
    setScanningItem(item);
    setScanPhase('ready');
  }

  function closeScanPopup() {
    setScanningItem(null);
    setScanPhase('ready');
  }

  function startScan() {
    setScanPhase('scanning');
    setTimeout(() => setScanPhase('done'), 900);
  }

  function finishScan() {
    if (scanningItem) {
      const group = scanningItem.groupId ? packages.find(p => p.id === scanningItem.groupId) : null;
      if (group) group.itemIds.forEach(id => doScan(id));
      else doScan(scanningItem.id);
    }
    closeScanPopup();
  }

  function deleteItem(id) {
    if (!window.confirm('Delete this item from the event?')) return;
    setItems(is => is.filter(i => i.id !== id));
  }

  // --- Inventory picker → Cart ---
  function addToCart(inv, qty, warehouse) {
    const stockHere = stockAtWarehouse(inv, warehouse);
    const existing = cart.find(x => x.inventoryId === inv.id && x.warehouse === warehouse);
    if (existing) {
      const newQty = Math.min(stockHere, existing.qty + qty);
      setCart(c => c.map(x => x.cartId === existing.cartId ? { ...x, qty: newQty } : x));
    } else {
      setCart(c => [...c, {
        cartId: nextCartId, inventoryId: inv.id, name: inv.name, sku: inv.sku,
        category: inv.category, unit: inv.unit, totalStock: stockHere,
        warehouse, qty: Math.min(stockHere, qty), area: '', subArea: '',
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
        id: nextId + i, name: c.name, area: c.area, subArea: c.subArea, stage: eventStatus,
        qty: c.qty, pic: '', checking: false, scanned: false, groupId: null,
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
            Back to Event
          </button>
        </div>

        <div className="event-header-row">
          <div className="event-heading">{eventName}</div>

          <div className="event-actions-bar">
            <button
              className="action-icon-btn btn-pkg"
              title="Packaging — group items to scan together"
              onClick={openPackagingModal}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
            </button>
            <button className="action-icon-btn btn-cart" title="Cart" onClick={() => setPickerOpen(true)}>
              <IconCart />
              {cart.length > 0 && <span className="action-icon-badge">{cart.length}</span>}
            </button>
            <button className="btn-new" onClick={() => { setPickerQuery(''); setPickerCategory(''); setPickerOpen(true); }}>
              <IconPlus /> Add Item
            </button>
            <div className="more-menu-wrap" ref={moreMenuRef}>
              <button className="action-icon-btn more-btn" title="More menu" onClick={() => setMoreMenuOpen(o => !o)}>
                <IconMoreVertical />
              </button>
              {moreMenuOpen && (
                <div className="more-menu-dropdown">
                  <button className="more-menu-item" onClick={() => { setSummaryOpen(true); setMoreMenuOpen(false); }}>
                    <IconBarChart /> Summary
                  </button>
                  <button className="more-menu-item" onClick={() => { window.print(); setMoreMenuOpen(false); }}>
                    <IconPrint /> Print
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="event-status-section">
          <span className="event-status-section-label">Event Status</span>
          <div className="event-status-stepper-wrap">
            <Stepper
              steps={stages}
              currentIndex={stages.indexOf(eventStatus)}
              onStepClick={changeEventStatus}
            />
          </div>
          {stageScanEnabled && hasNextStage && (
            <button
              type="button"
              className="btn-next-stage"
              disabled={unscannedCount > 0}
              title={unscannedCount > 0 ? `${unscannedCount} item(s) still need to be scanned` : `Move to "${stages[stageIndex + 1]}"`}
              onClick={handleNextClick}
            >
              Next
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          )}
        </div>

        {stepperError && (
          <div className="stepper-error-banner">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            {stepperError}
            <button type="button" className="stepper-error-dismiss" onClick={() => setStepperError('')}>×</button>
          </div>
        )}

        <div className="filter-row">
          <div style={{ flex: 1, minWidth: 190 }}>
            <SearchableSelect
              value={selectedArea}
              onChange={setSelectedArea}
              placeholder="All Place"
              searchPlaceholder="Search area…"
              emptyText="No area found"
              options={[
                { value: '', label: 'All Place', meta: String(items.length) },
                ...AREAS.map(a => ({ value: a, label: a, meta: String(areaCounts[a] || 0) })),
              ]}
            />
          </div>

          <div className="filter-row-right">
            <button className="btn btn-check" onClick={() => {}}>
              <IconSearch /> Check
            </button>
          </div>
        </div>

        <div className="search-row">
          <div className="search-wrap">
            <IconSearch />
            <input className="search-input" type="text" placeholder="Keyword Search" value={kwSearch} onChange={e => setKwSearch(e.target.value)} />
          </div>
        </div>

        <div className="stage-tabs">
          {stageScanEnabled && (
            <button type="button" className={`stage-tab${effectiveStageFilter === 'waiting' ? ' active' : ''}`} onClick={() => setStageFilter('waiting')}>
              Waiting Scan <span className="stage-tab-count">{waitingScanItems.length}</span>
            </button>
          )}
          <button type="button" className={`stage-tab${effectiveStageFilter === 'grouped' ? ' active' : ''}`} onClick={() => setStageFilter('grouped')}>
            Grouped <span className="stage-tab-count">{packages.length}</span>
          </button>
          <button type="button" className={`stage-tab${effectiveStageFilter === 'all' ? ' active' : ''}`} onClick={() => setStageFilter('all')}>
            All <span className="stage-tab-count">{scopedItems.length}</span>
          </button>
          <button type="button" className={`stage-tab${effectiveStageFilter === 'added' ? ' active' : ''}`} onClick={() => setStageFilter('added')}>
            Added New <span className="stage-tab-count">{currentStageItems.length}</span>
          </button>
        </div>

        {effectiveStageFilter === 'grouped' ? (
          <>
            <p className="summary-text">
              <strong>{packages.length}</strong> box{packages.length === 1 ? '' : 'es'} packaged &mdash; each box scans as one QR code instead of scanning every item inside it one by one.
            </p>
            {packages.length === 0
              ? <div className="no-data">No boxes yet. Use the box icon above to group items into one.</div>
              : (
                <div className="package-list">
                  {packages.map(pkg => {
                    const members = items.filter(it => it.groupId === pkg.id);
                    const allScanned = members.length > 0 && members.every(it => it.scanned);
                    return (
                      <div key={pkg.id} className="package-card">
                        <div className="package-header">
                          <div className="package-header-info">
                            <span className="package-icon">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
                            </span>
                            <div>
                              <div className="package-name">{pkg.name}</div>
                              <div className="package-meta">{members.length} item{members.length === 1 ? '' : 's'} in this box</div>
                            </div>
                          </div>
                          {stageScanEnabled && members.length > 0 && (
                            <button className={`btn-ia-scan${allScanned ? ' scanned' : ''}`} style={{ flex: '0 0 auto', padding: '7px 14px' }} onClick={() => openScanPopup(members[0])}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h.01M14 17h3v3M17 14h3"/></svg>
                              {allScanned ? 'Re-scan Box' : 'Scan Box'}
                            </button>
                          )}
                        </div>
                        <div className="items-grid package-items-grid">
                          {members.map(it => (
                            <ItemCard key={it.id} item={it} group={pkg} showScanButton={false} onDelete={deleteItem} />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            }
          </>
        ) : (
          <>
            <p className="summary-text">
              {effectiveStageFilter === 'waiting' ? (
                <><strong>{stageFiltered.length}</strong> item{stageFiltered.length === 1 ? '' : 's'} still need{stageFiltered.length === 1 ? 's' : ''} scanning at event status <strong>&ldquo;{eventStatus}&rdquo;</strong> in Area <strong>&ldquo;{areaLabel}&rdquo;</strong></>
              ) : (
                <><strong>{stageFiltered.length}</strong> pcs items at event status <strong>&ldquo;{eventStatus}&rdquo;</strong> in Area <strong>&ldquo;{areaLabel}&rdquo;</strong></>
              )}
            </p>

            {stageFiltered.length === 0
              ? <div className="no-data">No Data</div>
              : (
                <div className="items-grid">
                  {stageFiltered.map(it => (
                    <ItemCard
                      key={it.id}
                      item={it}
                      group={it.groupId ? packages.find(p => p.id === it.groupId) : null}
                      showScanButton={stageScanEnabled}
                      onScanClick={openScanPopup}
                      onDelete={deleteItem}
                    />
                  ))}
                </div>
              )
            }
          </>
        )}
      </div>

      {/* Inventory Picker + Cart Modal — two panels, no popping in/out */}
      <Modal
        open={pickerOpen}
        title="Add Item from Inventory"
        onClose={() => setPickerOpen(false)}
        size="4xl"
        className="inv-pick-modal"
        bodyClassName="inv-pick-modal-body"
        footer={
          <>
            <button className="btn-cancel-m" onClick={() => setPickerOpen(false)}><IconClose /> Close</button>
            <button className="btn-checkout" onClick={handleCheckoutClick} disabled={cart.length === 0}>
              <IconCheck /> {hasMissingArea ? 'Complete Location' : 'Save to Event'}
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
                <input className="search-input" type="text" placeholder="Search by name or SKU…" value={pickerQuery} onChange={e => setPickerQuery(e.target.value)} />
              </div>
              <SearchableSelect
                inline
                value={pickerCategory}
                onChange={setPickerCategory}
                placeholder="All Categories"
                options={[{ value:'', label:'All Categories' }, ...categories.map(c => ({ value:c, label:c }))]}
              />
            </div>

            <div className="inv-pick-list">
              {pickerFiltered.length === 0
                ? <div className="no-data">No items found.</div>
                : pickerFiltered.map(inv => {
                  const qty = pickerQty[inv.id] ?? 1;
                  const warehouse = pickerWarehouse[inv.id] ?? inv.warehouse;
                  const stockHere = stockAtWarehouse(inv, warehouse);
                  const outOfStock = stockHere <= 0;
                  return (
                    <div className="inv-pick-row" key={inv.id}>
                      <InvThumb />
                      <div className="inv-pick-info">
                        <div className="inv-pick-name-row">
                          <span className="inv-pick-name">{inv.name}</span>
                          {stockBadge(outOfStock ? 'Out of Stock' : inv.stockStatus)}
                        </div>
                        <div className="inv-pick-meta">
                          <span style={{ fontFamily: 'monospace' }}>{inv.sku}</span> · {inv.category} · {inv.unit}
                        </div>
                        <div className="inv-pick-stock">Available stock at {warehouse}: <strong>{stockHere} {inv.unit}</strong></div>
                        <div className="inv-pick-warehouse-row">
                          <label>Take from warehouse</label>
                          <SearchableSelect
                            inline
                            value={warehouse}
                            onChange={v => setPickerWarehouse(w => ({ ...w, [inv.id]: v }))}
                            options={WAREHOUSES.map(w => ({ value:w, label:w }))}
                          />
                        </div>
                      </div>
                      <div className="inv-pick-actions">
                        <input
                          className="inv-pick-qty" type="number" min={1} max={stockHere}
                          value={qty} disabled={outOfStock}
                          onChange={e => setPickerQty(q => ({ ...q, [inv.id]: Math.max(1, Math.min(stockHere, parseInt(e.target.value) || 1)) }))}
                        />
                        <button
                          className="btn-add-cart" disabled={outOfStock}
                          onClick={() => addToCart(inv, qty, warehouse)}
                        >
                          <IconCart /> {outOfStock ? 'Out of Stock' : 'Add'}
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
              <IconCart /> Cart <span className="inv-cart-count">{cart.length}</span>
            </div>

            {cart.length === 0
              ? <div className="cart-empty">Cart is empty</div>
              : (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10, flexShrink: 0 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-2)', cursor: 'pointer' }}>
                      <input type="checkbox" checked={selectedCartIds.length === cart.length} onChange={toggleSelectAllCart} />
                      Select All ({selectedCartIds.length}/{cart.length})
                    </label>
                    <button
                      className="btn btn-ghost" disabled={selectedCartIds.length === 0}
                      onClick={() => setBulkPanelOpen(o => !o)}
                      style={{ fontSize: 12, padding: '6px 10px', alignSelf: 'flex-start' }}
                    >
                      Assign Location ({selectedCartIds.length})
                    </button>
                  </div>

                  {bulkPanelOpen && (
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, padding: '10px 12px', marginBottom: 12, background: 'var(--brand-bg)', borderRadius: 'var(--r-lg)', flexWrap: 'wrap', flexShrink: 0 }}>
                      <SearchableSelect
                        inline
                        value={bulkArea}
                        onChange={v => { setBulkArea(v); setBulkSubArea(''); }}
                        placeholder="Select Area"
                        options={initialAreas.map(a => ({ value:a.name, label:a.name }))}
                      />
                      <SearchableSelect
                        inline
                        value={bulkSubArea}
                        onChange={setBulkSubArea}
                        disabled={!bulkArea}
                        placeholder={(SUB_AREAS[bulkArea] || []).length ? 'Select Sub Area' : '(No Sub Area)'}
                        options={(SUB_AREAS[bulkArea] || []).map(s => ({ value:s, label:s }))}
                      />
                      <button className="btn-save-modal" disabled={!bulkArea} onClick={applyBulkAssign}>
                        <IconCheck /> Apply to {selectedCartIds.length} items
                      </button>
                      <button className="btn-cancel-m" onClick={() => setBulkPanelOpen(false)}>Cancel</button>
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

      <Modal open={summaryOpen} title="Event Summary" onClose={() => setSummaryOpen(false)} size="lg">
        <div style={{ fontWeight: 700, fontSize: 14.5, color: 'var(--text)', marginBottom: 2 }}>{eventName}</div>
        <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 18 }}>Status: {eventStatus}</div>

        <div className="summary-popup-kpis">
          <div className="summary-popup-kpi">
            <div className="summary-popup-kpi-value">{summaryStats.total}</div>
            <div className="summary-popup-kpi-label">Total Items</div>
          </div>
          <div className="summary-popup-kpi">
            <div className="summary-popup-kpi-value">{summaryStats.checked}</div>
            <div className="summary-popup-kpi-label">Checked</div>
          </div>
          <div className="summary-popup-kpi">
            <div className="summary-popup-kpi-value">{summaryStats.scanIn}</div>
            <div className="summary-popup-kpi-label">Scanned In</div>
          </div>
        </div>

        <p className="summary-text" style={{ marginBottom: 0 }}>
          Total quantity across all items: <strong>{summaryStats.totalQty}</strong> · Scanned out:{' '}
          <strong>{summaryStats.scanOut}</strong> of {summaryStats.total}
        </p>

        <button type="button" className="summary-popup-view-detail" onClick={goToFullSummary}>
          <IconBarChart /> View Full Detail
        </button>
      </Modal>

      <Modal open={!!scanningItem} title="Scan Item" onClose={closeScanPopup}>
        {scanningItem && (() => {
          const group = scanningItem.groupId ? packages.find(p => p.id === scanningItem.groupId) : null;
          return (
            <div style={{ textAlign: 'center', padding: '12px 10px 4px' }}>
              {group ? (
                <>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>Group: {group.name}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 22 }}>{group.itemIds.length} items will be scanned together</div>
                </>
              ) : (
                <>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{scanningItem.name}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 22 }}>{scanningItem.area}</div>
                </>
              )}

              {scanPhase === 'ready' && (
                <>
                  <div className="scan-target-box">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h7M14 21h7M14 17.5h3.5"/></svg>
                  </div>
                  <button type="button" className="btn-save-modal" onClick={startScan} style={{ marginTop: 20 }}>
                    Start Scan
                  </button>
                </>
              )}

              {scanPhase === 'scanning' && (
                <>
                  <div className="scan-target-box scanning">
                    <div className="scan-spinner" />
                  </div>
                  <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 16 }}>Scanning…</p>
                </>
              )}

              {scanPhase === 'done' && (
                <>
                  <div className="scan-target-box success">
                    <CheckIcon />
                  </div>
                  <p style={{ fontWeight: 700, color: 'var(--green)', marginTop: 16, marginBottom: 0 }}>
                    {group ? 'Group Scanned' : 'Item Scanned'}
                  </p>
                  <button type="button" className="btn-save-modal" onClick={finishScan} style={{ marginTop: 16 }}>
                    <IconCheck /> Done
                  </button>
                </>
              )}
            </div>
          );
        })()}
      </Modal>

      <Modal
        open={packagingOpen}
        title="Group Items for Packaging"
        onClose={() => setPackagingOpen(false)}
        footer={
          <>
            <button className="btn-cancel-modal" onClick={() => setPackagingOpen(false)}><IconClose /> Cancel</button>
            <button className="btn-save-modal" disabled={!packagingName.trim() || packagingSelection.length === 0} onClick={createPackage}>
              <IconCheck /> Create Group ({packagingSelection.length})
            </button>
          </>
        }
      >
        <div className="form-group">
          <label>Group Name <span style={{ color: 'var(--red)' }}>*</span></label>
          <input type="text" placeholder="e.g. Ceremony Decor Bundle" value={packagingName} onChange={e => setPackagingName(e.target.value)} />
        </div>
        <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 10 }}>
          Any item not already in a box can be added, regardless of stage.
        </p>
        <div className="package-pick-list">
          {packableItems.length === 0
            ? <div className="no-data">No ungrouped items to package.</div>
            : packableItems.map(it => (
              <div
                key={it.id}
                className={`package-pick-row${packagingSelection.includes(it.id) ? ' selected' : ''}`}
                onClick={() => togglePackagingSelection(it.id)}
              >
                <input type="checkbox" checked={packagingSelection.includes(it.id)} onChange={() => togglePackagingSelection(it.id)} onClick={e => e.stopPropagation()} />
                <div>
                  <div className="package-pick-row-name">{it.name}</div>
                  <div className="package-pick-row-meta">{it.area} · Qty: {it.qty}</div>
                </div>
              </div>
            ))
          }
        </div>
      </Modal>
    </>
  );
}
