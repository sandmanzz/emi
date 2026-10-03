import { useState, useMemo, useRef, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Modal from '../components/Modal';
import Drawer from '../components/Drawer';
import Stepper from '../components/Stepper';
import SearchableSelect from '../components/SearchableSelect';
import { IconSearch, IconPlus, IconEdit, IconDelete, IconClose, IconCheck, IconCart, IconPrint, IconBarChart, IconMoreVertical } from '../components/icons';
import { initialAreas, SUB_AREAS } from '../data/areas';
import { inventoryData, categories } from '../data/inventory';
import { initialWarehouses } from '../data/warehouses';
import { wiData } from '../data/warehouseInventory';
import { getEventStageNames, isScanStage, isCuttingStockStage, isStockReturnStage, isProductionStage } from '../lib/eventStatuses';
import { getProductionRequests, saveProductionRequests, PRODUCTION_STATUSES, PRODUCTION_BADGE } from '../lib/productionRequests';
import { resolveEventStage, saveEventProgress, getEventFurthestStage, saveEventFurthestStage } from '../lib/eventProgress';
import { getEventClosing, setEventClosing, isOnGoingByItems } from '../lib/eventClosing';
import { CLOSING_LABELS } from '../lib/eventClosingLabels';
import { markItemsAdded } from '../lib/eventItemsFlag';
import { getIncomingItems, queueMovedItem, clearIncomingItems } from '../lib/movedItems';
import { addActivityLog } from '../lib/activityLogStore';
import { getCurrentTenantUser } from '../lib/tenantAuth';
import { initialEvents } from '../data/events';

// Matches the "<date> | <NAME>" key this page reads its own ?name= from, so a
// candidate move-target event can be looked up in the same closing-status store.
function eventKeyFor(e) {
  return `${e.date} | ${(e.name || '').toUpperCase()}`;
}

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
  { id:1, name:'Chiffon White 4-6×1,2m',        area:'CEREMONY',        subArea:'', stage:'On preparing items',  scanned:false, groupId:null, qty:2,   pic:'Anto',    checking:true,  warehouseItem:false, scanIn:'May 26, 2025 10:42 PM', scanOut:'May 26, 2025 9:33 PM',  note:"Please take care this item, it's luxury item", checked:false, ownership:'IHC' },
  { id:2, name:'Hanging Rattan 1',               area:'PHOTOBOOTH',      subArea:'', stage:'On preparing items',  scanned:false, groupId:null, qty:2,   pic:'',        checking:false, warehouseItem:false, scanIn:null,                    scanOut:null,                    note:"Please take care this item, it's luxury item", checked:false, ownership:'IHC' },
  { id:3, name:'Hanging Rattan 2',               area:'RECEPTION',       subArea:'', stage:'On preparing items',  scanned:false, groupId:null, qty:10,  pic:'',        checking:false, warehouseItem:false, scanIn:null,                    scanOut:null,                    note:"Please take care this item, it's luxury item", checked:false, ownership:'IHC' },
  { id:4, name:'Hanging Rattan 3',               area:'RECEPTION',       subArea:'', stage:'On preparing items',  scanned:false, groupId:null, qty:10,  pic:'',        checking:false, warehouseItem:false, scanIn:null,                    scanOut:null,                    note:"Please take care this item, it's luxury item", checked:false, ownership:'IHC' },
  { id:5, name:'White Fabric 3m',                area:'ENTRANCE',        subArea:'', stage:'On preparing items',  scanned:false, groupId:null, qty:5,   pic:'Novi',    checking:false, warehouseItem:false, scanIn:null,                    scanOut:null,                    note:'', checked:false, ownership:'IHP' },
  { id:6, name:'Red Rose Flower',                area:'RECEPTION',       subArea:'', stage:'On preparing items',  scanned:false, groupId:null, qty:30,  pic:'Darmian', checking:true,  warehouseItem:false, scanIn:'Apr 9, 2026 08:00 AM',  scanOut:null,                    note:'', checked:true,  ownership:'IHC' },
  { id:7, name:'Standing Flower Tall',           area:'ENTRANCE',        subArea:'', stage:'On preparing items',  scanned:false, groupId:null, qty:4,   pic:'',        checking:false, warehouseItem:false, scanIn:null,                    scanOut:null,                    note:'', checked:false, ownership:'IHC' },
  { id:8, name:'Tealight Holder 15cm',           area:'GUEST TABLE',     subArea:'', stage:'On preparing items',  scanned:false, groupId:null, qty:50,  pic:'Anto',    checking:false, warehouseItem:true,  scanIn:null,                    scanOut:null,                    note:'', checked:false, ownership:'IHC' },
  { id:9, name:'Gold Ribbon 5m',                 area:'CEREMONY',        subArea:'', stage:'On preparing items',  scanned:false, groupId:null, qty:20,  pic:'',        checking:false, warehouseItem:false, scanIn:null,                    scanOut:null,                    note:'', checked:false, ownership:'Outsource' },
  { id:10,name:'White Candle 30cm',              area:'GUEST TABLE',     subArea:'', stage:'On preparing items',  scanned:false, groupId:null, qty:100, pic:'Novi',    checking:true,  warehouseItem:true,  scanIn:'Apr 9, 2026 07:30 AM',  scanOut:'Apr 9, 2026 09:00 AM', note:'', checked:true,  ownership:'IHC' },
  { id:11,name:'Backdrop Floral 3×2m',           area:'PHOTOBOOTH',      subArea:'', stage:'On preparing items',  scanned:false, groupId:null, qty:1,   pic:'',        checking:false, warehouseItem:false, scanIn:null,                    scanOut:null,                    note:'', checked:false, ownership:'IHP' },
  { id:12,name:'Tiffany Chair',                  area:'RECEPTION',       subArea:'', stage:'On preparing items',  scanned:false, groupId:null, qty:60,  pic:'Darmian', checking:false, warehouseItem:true,  scanIn:null,                    scanOut:null,                    note:'', checked:false, ownership:'IHC' },
  { id:13,name:'Fairy Light Curtain 3x3m',       area:'CHAMPAGNE WALL',  subArea:'', stage:'Created by admin up',  scanned:false, groupId:null, qty:2,   pic:'',        checking:false, warehouseItem:false, scanIn:null,                    scanOut:null,                    note:'', checked:false, ownership:'IHC' },
  { id:14,name:'Champagne Tower Glass Set',      area:'CHAMPAGNE WALL',  subArea:'', stage:'Finish setup',   scanned:false, groupId:null, qty:150, pic:'Novi',    checking:false, warehouseItem:false, scanIn:null,                    scanOut:null,                    note:'', checked:false, ownership:'Outsource' },
  { id:15,name:'Cocktail High Table',            area:'COCKTAIL',        subArea:'', stage:'Waiting scan in',scanned:false, groupId:null, qty:8,   pic:'Anto',    checking:true,  warehouseItem:true,  scanIn:null,                    scanOut:null,                    note:'', checked:false, ownership:'IHC' },
  { id:16,name:'Gold Bar Stool',                 area:'COCKTAIL',        subArea:'', stage:'Waiting scan in',scanned:false, groupId:null, qty:16,  pic:'Anto',    checking:true,  warehouseItem:true,  scanIn:null,                    scanOut:null,                    note:'', checked:false, ownership:'IHC' },
  { id:17,name:'Display Table Riser Set',        area:'DISPLAY TABLE',   subArea:'', stage:'Created by admin up',  scanned:false, groupId:null, qty:6,   pic:'',        checking:false, warehouseItem:false, scanIn:null,                    scanOut:null,                    note:'', checked:false, ownership:'IHP' },
  { id:18,name:'Fresh Flower Centerpiece',       area:'FLORIST',         subArea:'', stage:'Finish setup',   scanned:false, groupId:null, qty:12,  pic:'Dewi',    checking:false, warehouseItem:false, scanIn:null,                    scanOut:null,                    note:'', checked:false, ownership:'IHC' },
  { id:19,name:'Greenery Wall Panel',            area:'FLORIST',         subArea:'', stage:'Created by admin up',  scanned:false, groupId:null, qty:4,   pic:'',        checking:false, warehouseItem:false, scanIn:null,                    scanOut:null,                    note:'', checked:false, ownership:'IHC' },
  { id:20,name:'Labour Toolkit Bag',             area:'LABOUR',          subArea:'', stage:'On preparing items',  scanned:false, groupId:null, qty:3,   pic:'Hendra',  checking:true,  warehouseItem:true,  scanIn:null,                    scanOut:null,                    note:'', checked:false, ownership:'Outsource' },
  { id:21,name:'Lounge Sofa Set',                area:'LOUNGE',          subArea:'', stage:'Waiting scan in',scanned:false, groupId:null, qty:2,   pic:'Agus',    checking:true,  warehouseItem:true,  scanIn:null,                    scanOut:null,                    note:'', checked:false, ownership:'IHC' },
  { id:22,name:'Round Coffee Table',             area:'LOUNGE',          subArea:'', stage:'Waiting scan in',scanned:false, groupId:null, qty:2,   pic:'Agus',    checking:true,  warehouseItem:true,  scanIn:null,                    scanOut:null,                    note:'', checked:false, ownership:'IHC' },
  { id:23,name:'Bridal Backdrop Floral Wall',    area:'BRIDAL BACKDROP', subArea:'', stage:'Event running', scanned:false, groupId:null, qty:1,   pic:'Lina',    checking:true,  warehouseItem:false, scanIn:'Apr 9, 2026 09:10 AM',  scanOut:null,                    note:'', checked:false, ownership:'IHP' },
  { id:24,name:'Bridal Room Mirror Stand',       area:'BRIDAL ROOM',     subArea:'', stage:'On preparing items',  scanned:false, groupId:null, qty:1,   pic:'Siti',    checking:false, warehouseItem:true,  scanIn:null,                    scanOut:null,                    note:'', checked:false, ownership:'IHC' },
  { id:25,name:'Bridal Table Linen Set',         area:'BRIDAL TABLE',    subArea:'', stage:'Finish setup',   scanned:false, groupId:null, qty:3,   pic:'',        checking:false, warehouseItem:false, scanIn:null,                    scanOut:null,                    note:'', checked:false, ownership:'IHC' },
  { id:26,name:'Car Decoration Ribbon Kit',      area:'CAR DECOR',       subArea:'', stage:'Created by admin up',  scanned:false, groupId:null, qty:2,   pic:'',        checking:false, warehouseItem:false, scanIn:null,                    scanOut:null,                    note:'', checked:false, ownership:'IHC' },
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

function ownershipBadgeClass(ownership) {
  if (ownership === 'IHC') return 'badge-blue';
  if (ownership === 'IHP') return 'badge-purple';
  if (ownership === 'Outsource') return 'badge-orange';
  return 'badge-gray';
}

const OWNERSHIP_CYCLE = ['IHC', 'IHP', 'Outsource'];

function ItemCard({ item, group, showScanButton, onScanClick, onDelete, onCycleOwnership, onOpen, onModify }) {
  // The whole card opens the detail drawer; buttons inside stop propagation so
  // they keep doing their own job.
  const stop = fn => e => { e.stopPropagation(); fn(); };
  return (
    <div
      className={`item-card${onOpen ? ' clickable' : ''}`}
      onClick={onOpen ? () => onOpen(item) : undefined}
      onKeyDown={onOpen ? e => { if (e.key === 'Enter' && e.target === e.currentTarget) onOpen(item); } : undefined}
      tabIndex={onOpen ? 0 : undefined}
      role={onOpen ? 'button' : undefined}
      aria-label={onOpen ? `View details for ${item.name}` : undefined}
    >
      {(onModify || onDelete) && (
        <div className="item-card-actions">
          {onModify && (
            <button className="item-card-action modify" title="Modify" aria-label="Modify item" onClick={stop(() => onModify(item))}>
              <IconEdit />
            </button>
          )}
          {onDelete && (
            <button className="item-card-action delete" title="Delete" aria-label="Delete item" onClick={stop(() => onDelete(item.id))}>
              <IconDelete />
            </button>
          )}
        </div>
      )}
      <ImagePlaceholder />
      <div className="item-body">
        <div className="item-badge-row">
          <span className={`area-badge ${areaBadgeClass(item.area)}`}>{item.area}</span>
          {item.ownership && onCycleOwnership && (
            <button
              type="button"
              className={`badge ${ownershipBadgeClass(item.ownership)} ownership-badge-btn`}
              style={{ fontSize: 10 }}
              title="Click to change ownership (IHC / IHP / Outsource)"
              onClick={e => { e.stopPropagation(); onCycleOwnership(item.id); }}
            >
              {item.ownership}
            </button>
          )}
          {item.ownership && !onCycleOwnership && (
            <span className={`badge ${ownershipBadgeClass(item.ownership)}`} style={{ fontSize: 10 }}>{item.ownership}</span>
          )}
          <StockBadge item={item} />
          {item.fromProduction && (
            <span className="badge badge-purple" style={{ fontSize: 10 }} title="Produced via a production request">Production</span>
          )}
          {item.resolution === 'returned' && (
            <span className="badge badge-green" style={{ fontSize: 10 }}>Returned</span>
          )}
        </div>
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
            <button className={`btn-ia-scan${item.scanned ? ' scanned' : ''}`} onClick={e => { e.stopPropagation(); onScanClick(item); }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h.01M14 17h3v3M17 14h3"/></svg>
              {item.scanned ? 'Re-scan' : 'Scan'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// List (table) alternative to the card grid. Same callbacks as ItemCard; a missing
// onModify/onDelete/onCycleOwnership means that action is locked.
function ItemTable({ items, packages, showScanButton, onScanClick, onDelete, onCycleOwnership, onOpen, onModify }) {
  const stop = fn => e => { e.stopPropagation(); fn(); };
  return (
    <div className="table-wrap item-table-wrap">
      <table className="item-table">
        <thead>
          <tr>
            <th>Item</th>
            <th>Area</th>
            <th style={{ textAlign: 'right' }}>Qty</th>
            <th>PIC</th>
            <th>Ownership</th>
            <th style={{ textAlign: 'center' }}>Checking</th>
            <th>Scan In</th>
            <th>Scan Out</th>
            <th style={{ textAlign: 'right' }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => {
            const group = item.groupId ? packages.find(p => p.id === item.groupId) : null;
            return (
              <tr
                key={item.id}
                className="item-table-row"
                onClick={() => onOpen(item)}
                onKeyDown={e => { if (e.key === 'Enter' && e.target === e.currentTarget) onOpen(item); }}
                tabIndex={0}
                aria-label={`View details for ${item.name}`}
              >
                <td>
                  <div className="item-table-name">{item.name}</div>
                  <div className="item-table-flags">
                    {group && <span className="badge badge-gray" style={{ fontSize: 10 }}>{group.name}</span>}
                    {item.scanned && <span className="badge badge-green" style={{ fontSize: 10 }}>Scanned</span>}
                    <StockBadge item={item} />
                    {item.fromProduction && <span className="badge badge-purple" style={{ fontSize: 10 }}>Production</span>}
                    {item.resolution === 'returned' && <span className="badge badge-green" style={{ fontSize: 10 }}>Returned</span>}
                  </div>
                  {item.note && <div className="item-table-note">{item.note}</div>}
                </td>
                <td>
                  <span className={`area-badge ${areaBadgeClass(item.area)}`}>{item.area}</span>
                  {item.subArea && <div className="item-table-sub">{item.subArea}</div>}
                </td>
                <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{item.qty}</td>
                <td>{item.pic || '—'}</td>
                <td>
                  {onCycleOwnership ? (
                    <button type="button" className={`badge ${ownershipBadgeClass(item.ownership)} ownership-badge-btn`} style={{ fontSize: 10 }}
                      title="Click to change ownership (IHC / IHP / Outsource)" onClick={stop(() => onCycleOwnership(item.id))}>
                      {item.ownership}
                    </button>
                  ) : (
                    <span className={`badge ${ownershipBadgeClass(item.ownership)}`} style={{ fontSize: 10 }}>{item.ownership}</span>
                  )}
                </td>
                <td style={{ textAlign: 'center' }}>
                  <span className={`indicator-box${item.checking ? ' checked' : ''}`} style={{ margin: '0 auto' }}>{item.checking && <CheckIcon />}</span>
                </td>
                <td className="item-table-scan">{item.scanIn || <span className="item-table-muted">—</span>}</td>
                <td className="item-table-scan">{item.scanOut || <span className="item-table-muted">—</span>}</td>
                <td>
                  <div className="item-table-actions">
                    {showScanButton && (
                      <button className={`btn-ia-scan${item.scanned ? ' scanned' : ''}`} style={{ flex: '0 0 auto', padding: '5px 10px' }} onClick={stop(() => onScanClick(item))}>
                        {item.scanned ? 'Re-scan' : 'Scan'}
                      </button>
                    )}
                    {onModify && (
                      <button className="btn-icon edit" title="Modify" aria-label="Modify item" onClick={stop(() => onModify(item))}><IconEdit /></button>
                    )}
                    {onDelete && (
                      <button className="btn-icon delete" title="Delete" aria-label="Delete item" onClick={stop(() => onDelete(item.id))}><IconDelete /></button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// "Stock cut" until the item has been returned to stock, then "Stock returned".
function StockBadge({ item }) {
  if (item.stockReturned) return <span className="badge badge-green" style={{ fontSize: 10 }} title="Returned to warehouse stock">Stock returned</span>;
  if (item.stockCut) return <span className="badge badge-orange" style={{ fontSize: 10 }} title="Deducted from warehouse stock">Stock cut</span>;
  return null;
}

export default function EventDetailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const eventName = searchParams.get('name') || '03/06/2023 | GUNTUR + CLARISSA';
  const currentEventSeed = initialEvents.find(e => eventKeyFor(e) === eventName);
  const onGoingByItems = isOnGoingByItems(eventName, currentEventSeed?.itemCount);

  const currentUser = getCurrentTenantUser();

  const [items, setItems] = useState(() => {
    const incoming = getIncomingItems(eventName);
    if (incoming.length === 0) return initialItems;
    let id = 27;
    const added = incoming.map(inc => ({
      id: id++, name: inc.name, area: inc.area, subArea: inc.subArea || '', stage: inc.stage,
      scanned: false, groupId: null, qty: inc.qty, pic: inc.pic || '', checking: false,
      scanIn: null, scanOut: null, note: inc.note || '', checked: false, ownership: inc.ownership || 'IHC',
    }));
    return [...initialItems, ...added];
  });
  const [nextId, setNextId] = useState(() => 27 + getIncomingItems(eventName).length);
  const [stages] = useState(() => getEventStageNames());
  const [eventStatus, setEventStatus] = useState(() => resolveEventStage(eventName) || 'Preparation');
  const stageScanEnabled = isScanStage(eventStatus);
  // Furthest stage reached via Next — stages up to here can be reopened from the
  // status dropdown; later ones stay locked until Next is clicked.
  const [furthestIndex, setFurthestIndex] = useState(() => stages.indexOf(getEventFurthestStage(eventName)));
  const [pendingStage, setPendingStage] = useState(null); // stage awaiting confirmation
  const [closingStatus, setClosingStatus] = useState(() => getEventClosing(eventName));
  const [crossCheckOpen, setCrossCheckOpen] = useState(false);
  // Bulk Assign Ownership modal
  const [bulkOwnOpen, setBulkOwnOpen] = useState(false);
  const [bulkOwnTarget, setBulkOwnTarget] = useState('IHC');
  const [bulkOwnSelected, setBulkOwnSelected] = useState([]);
  const [bulkOwnQuery, setBulkOwnQuery] = useState('');
  const [bulkOwnFrom, setBulkOwnFrom] = useState('');
  const [returnTransferOpen, setReturnTransferOpen] = useState(false);
  const [transferPickerItemId, setTransferPickerItemId] = useState(null);
  const [transferTargetEvent, setTransferTargetEvent] = useState('');
  const [transferTargetStage, setTransferTargetStage] = useState('');
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

  // Items transferred out of another event's Checking Inventory phase are
  // queued here and merged into `items`/`nextId`'s initial state above (so the
  // merge itself is a pure read at mount, not a setState-in-effect); this just
  // clears the queue right after, so the same items aren't merged in again on
  // a later visit.
  useEffect(() => {
    clearIncomingItems(eventName);
  }, [eventName]);

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
  const [ownershipFilter, setOwnershipFilter] = useState('');
  const [stageFilter, setStageFilter] = useState('all'); // 'all' | 'previous' | 'current'

  // Item detail drawer + Modify modal
  const [detailItemId, setDetailItemId] = useState(null);
  const [editItemId, setEditItemId] = useState(null);
  const [editForm, setEditForm] = useState({ qty: 1, area: '', subArea: '', pic: '', ownership: 'IHC', note: '' });

  // Production requests (only offered at stages with productionItem: true)
  const productionEnabled = isProductionStage(eventStatus);
  const [productionRequests, setProductionRequestsState] = useState(() => getProductionRequests(eventName));
  const [productionOpen, setProductionOpen] = useState(false);
  const [productionForm, setProductionForm] = useState({ name: '', qty: 1, area: '', subArea: '', neededBy: '', note: '' });

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
    if (ownershipFilter && it.ownership !== ownershipFilter) return false;
    if (kwSearch && !it.name.toLowerCase().includes(kwSearch.toLowerCase()) && !it.area.toLowerCase().includes(kwSearch.toLowerCase())) return false;
    return true;
  }), [items, selectedArea, ownershipFilter, kwSearch]);

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

  const ownershipCounts = useMemo(() => {
    const map = {};
    items.forEach(it => { map[it.ownership] = (map[it.ownership] || 0) + 1; });
    return map;
  }, [items]);


  const unscannedCount = useMemo(() => items.filter(it => !it.scanned).length, [items]);
  const hasNextStage = stageIndex < stages.length - 1;
  // "Ready to Close" is a derived display state, not stored — see eventClosing.js.
  const readyToClose = closingStatus === 'on-going' && !hasNextStage;
  // Single lifecycle badge shown next to the event title.
  const phaseBadge = CLOSING_LABELS[
    closingStatus !== 'on-going' ? closingStatus
      : readyToClose ? 'ready-to-close'
      : onGoingByItems ? 'on-going' : 'upcoming'
  ];

  // Transfer target candidates — other events still "on-going" (upcoming, not
  // yet in any closing phase), matching the same set EventPage.jsx's "Upcoming"
  // tab shows.
  const transferTargetCandidates = useMemo(() => initialEvents
    .filter(e => e.type === 'upcoming')
    .map(e => ({ ...e, key: eventKeyFor(e) }))
    .filter(e => e.key !== eventName && getEventClosing(e.key) === 'on-going'),
  [eventName]);

  const maxReachedIndex = Math.max(furthestIndex, stageIndex);

  // Every stage change (Next, or reopening an already-reached stage from the
  // dropdown) goes through a confirmation popup first.
  function requestStageChange(step) {
    const targetIndex = stages.indexOf(step);
    if (targetIndex === stageIndex) return;
    if (targetIndex > maxReachedIndex + 1) return; // locked — only reachable via Next
    if (stageScanEnabled && targetIndex > stageIndex && unscannedCount > 0) {
      setStepperError(`${unscannedCount} item${unscannedCount === 1 ? '' : 's'} still need${unscannedCount === 1 ? 's' : ''} to be scanned before moving to the next stage.`);
      return;
    }
    setStepperError('');
    setPendingStage(step);
  }

  function handleNextClick() {
    if (!hasNextStage) return;
    requestStageChange(stages[stageIndex + 1]);
  }

  // Cutting-stock stages crossed when moving forward from the current stage to
  // `step` (current stage excluded, target included). Moving back never cuts.
  function cuttingStagesBetween(step) {
    const targetIndex = stages.indexOf(step);
    if (targetIndex <= stageIndex) return [];
    return stages.slice(stageIndex + 1, targetIndex + 1).filter(isCuttingStockStage);
  }

  const pendingCutStages = pendingStage ? cuttingStagesBetween(pendingStage) : [];
  const itemsToCut = useMemo(() => items.filter(it => !it.stockCut), [items]);

  // Stock-return stages crossed going forward (same rule as cutting).
  function returnStagesBetween(step) {
    const targetIndex = stages.indexOf(step);
    if (targetIndex <= stageIndex) return [];
    return stages.slice(stageIndex + 1, targetIndex + 1).filter(isStockReturnStage);
  }
  const pendingReturnStages = pendingStage ? returnStagesBetween(pendingStage) : [];
  // Items that will be returned: already cut (or about to be cut in this same move)
  // and not yet returned.
  const pendingReturnCount = pendingReturnStages.length === 0 ? 0 : items.filter(it =>
    !it.stockReturned && (it.stockCut || pendingCutStages.length > 0)).length;

  function confirmStageChange() {
    const step = pendingStage;
    if (!step) return;
    const targetIndex = stages.indexOf(step);
    if (cuttingStagesBetween(step).length > 0 && itemsToCut.length > 0) {
      const cutIds = new Set(itemsToCut.map(it => it.id));
      const totalQty = itemsToCut.reduce((sum, it) => sum + it.qty, 0);
      setItems(is => is.map(it => cutIds.has(it.id) ? { ...it, stockCut: true } : it));
      addActivityLog({
        userName: currentUser?.name || 'Admin', action: 'Update', module: 'Event Detail',
        description: `Cut stock for ${cutIds.size} item(s) (${totalQty} pcs) on ${eventName} at "${step}"`,
      });
    }
    if (returnStagesBetween(step).length > 0 && pendingReturnCount > 0) {
      const cutting = cuttingStagesBetween(step).length > 0;
      const toReturn = items.filter(it => !it.stockReturned && (it.stockCut || cutting));
      const returnIds = new Set(toReturn.map(it => it.id));
      const totalQty = toReturn.reduce((sum, it) => sum + it.qty, 0);
      setItems(is => is.map(it => returnIds.has(it.id) ? { ...it, stockCut: true, stockReturned: true } : it));
      addActivityLog({
        userName: currentUser?.name || 'Admin', action: 'Return', module: 'Event Detail',
        description: `Returned stock for ${returnIds.size} item(s) (${totalQty} pcs) on ${eventName} at "${step}"`,
      });
    }
    setEventStatus(step);
    saveEventProgress(eventName, step);
    if (targetIndex > furthestIndex) {
      setFurthestIndex(targetIndex);
      saveEventFurthestStage(eventName, step);
    }
    setStageFilter('all');
    setPendingStage(null);
  }

  // Once the event has reached the Stock Return stage, it can't take new items
  // (Add Item, Cart, Request Production). Stays locked even if the user goes back.
  const stockReturnIndex = stages.findIndex(isStockReturnStage);
  const addLocked = stockReturnIndex >= 0 && maxReachedIndex >= stockReturnIndex;
  // From Checking Inventory onward, items can't be modified or deleted.
  const itemsLocked = closingStatus !== 'on-going';

  // Card vs list view — a per-viewer preference, so localStorage is fine.
  const [viewMode, setViewMode] = useState(() => {
    try { return localStorage.getItem('emi_event_detail_view') === 'list' ? 'list' : 'card'; } catch { return 'card'; }
  });
  function changeViewMode(mode) {
    setViewMode(mode);
    try { localStorage.setItem('emi_event_detail_view', mode); } catch { /* ignore */ }
  }

  // Shared props for ItemCard / ItemTable; locked actions are passed as undefined.
  const itemActionProps = {
    onOpen: it => setDetailItemId(it.id),
    onModify: itemsLocked ? undefined : openModifyItem,
    onDelete: itemsLocked ? undefined : deleteItem,
    onCycleOwnership: itemsLocked ? undefined : cycleItemOwnership,
  };

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

  // Event Logistics Summary — generated going into the Return & Transfer step.
  // Items never marked "Checked" during Cross Check are flagged as missing.
  const logisticsSummary = useMemo(() => {
    const checkedItems = items.filter(it => it.checked);
    const missingItems = items.filter(it => !it.checked);
    return { total: items.length, checkedCount: checkedItems.length, missingItems };
  }, [items]);

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
    if (closingStatus !== 'on-going') return;
    if (!window.confirm('Delete this item from the event?')) return;
    setItems(is => is.filter(i => i.id !== id));
  }

  function toggleItemChecked(id) {
    setItems(is => is.map(it => it.id === id ? { ...it, checked: !it.checked } : it));
  }

  function cycleItemOwnership(id) {
    setItems(is => is.map(it => {
      if (it.id !== id) return it;
      const next = OWNERSHIP_CYCLE[(OWNERSHIP_CYCLE.indexOf(it.ownership) + 1) % OWNERSHIP_CYCLE.length];
      return { ...it, ownership: next };
    }));
  }

  // --- Bulk Assign Ownership ---
  const bulkOwnVisible = useMemo(() => items.filter(it => {
    if (bulkOwnFrom && it.ownership !== bulkOwnFrom) return false;
    if (bulkOwnQuery) {
      const q = bulkOwnQuery.toLowerCase();
      if (!it.name.toLowerCase().includes(q) && !it.area.toLowerCase().includes(q)) return false;
    }
    return true;
  }), [items, bulkOwnFrom, bulkOwnQuery]);
  const bulkOwnAllVisibleSelected = bulkOwnVisible.length > 0 && bulkOwnVisible.every(it => bulkOwnSelected.includes(it.id));

  function openBulkOwnership() {
    setBulkOwnTarget('IHC');
    setBulkOwnSelected([]);
    setBulkOwnQuery('');
    setBulkOwnFrom('');
    setBulkOwnOpen(true);
  }

  function toggleBulkOwnItem(id) {
    setBulkOwnSelected(sel => sel.includes(id) ? sel.filter(x => x !== id) : [...sel, id]);
  }

  // Select/deselect only what's currently visible, so a filtered "select all"
  // never silently touches items hidden by the search or ownership filter.
  function toggleBulkOwnAllVisible() {
    const visibleIds = bulkOwnVisible.map(it => it.id);
    setBulkOwnSelected(sel => bulkOwnAllVisibleSelected
      ? sel.filter(id => !visibleIds.includes(id))
      : [...new Set([...sel, ...visibleIds])]);
  }

  function applyBulkOwnership() {
    if (bulkOwnSelected.length === 0) return;
    const changed = items.filter(it => bulkOwnSelected.includes(it.id) && it.ownership !== bulkOwnTarget);
    setItems(is => is.map(it => bulkOwnSelected.includes(it.id) ? { ...it, ownership: bulkOwnTarget } : it));
    if (changed.length > 0) {
      addActivityLog({
        userName: currentUser?.name || 'Admin', action: 'Update', module: 'Event Detail',
        description: `Bulk-assigned ownership ${bulkOwnTarget} to ${changed.length} item(s) on ${eventName}`,
      });
    }
    setBulkOwnOpen(false);
  }

  // --- Closing the event: On Going -> (Ready to Close) -> Checking Inventory
  // -> Returned & Completed | Transferred ---
  function handleReadyToClose() {
    if (!window.confirm(`Close "${eventName}"? This moves it into Checking Inventory.`)) return;
    setEventClosing(eventName, 'checking-inventory');
    setClosingStatus('checking-inventory');
  }

  // --- Cross Check Items (checking-inventory phase) ---
  function openCrossCheck() {
    setCrossCheckOpen(true);
  }

  // --- Return Item & Transfer (checking-inventory's primary action) ---
  function openReturnTransfer() {
    setTransferPickerItemId(null);
    setTransferTargetEvent('');
    setTransferTargetStage('');
    setReturnTransferOpen(true);
  }

  function closeReturnTransfer() {
    setReturnTransferOpen(false);
    setTransferPickerItemId(null);
  }

  function resolveItemReturn(id) {
    setItems(is => is.map(it => it.id === id ? { ...it, resolution: 'returned' } : it));
  }

  function openTransferPicker(item) {
    setTransferPickerItemId(item.id);
    setTransferTargetEvent('');
    setTransferTargetStage('');
  }

  function cancelTransferPicker() {
    setTransferPickerItemId(null);
  }

  function confirmTransferItem() {
    const item = items.find(it => it.id === transferPickerItemId);
    if (!item || !transferTargetEvent || !transferTargetStage) return;
    const target = transferTargetCandidates.find(e => e.key === transferTargetEvent);
    queueMovedItem(transferTargetEvent, {
      name: item.name, area: item.area, subArea: item.subArea,
      stage: transferTargetStage, qty: item.qty, pic: item.pic,
      ownership: item.ownership, note: item.note,
    });
    setItems(is => is.filter(it => it.id !== item.id));
    addActivityLog({
      userName: currentUser?.name || 'Admin', action: 'Transfer', module: 'Event Detail',
      description: `Transferred "${item.name}" from ${eventName} to ${target?.name || transferTargetEvent} (${transferTargetStage})`,
    });
    setTransferPickerItemId(null);
  }

  const unresolvedItems = useMemo(() => items.filter(it => !it.resolution), [items]);

  function finalizeReturnTransfer() {
    if (unresolvedItems.length > 0) return;
    const hasAnyReturned = items.some(it => it.resolution === 'returned');
    const finalStatus = hasAnyReturned ? 'returned-completed' : 'transferred';
    setEventClosing(eventName, finalStatus);
    setClosingStatus(finalStatus);
    addActivityLog({
      userName: currentUser?.name || 'Admin', action: finalStatus === 'transferred' ? 'Transfer' : 'Return',
      module: 'Event Detail',
      description: `"${eventName}" finalized as ${CLOSING_LABELS[finalStatus].label}`,
    });
    closeReturnTransfer();
  }

  // --- Item detail drawer & Modify ---
  const detailItem = detailItemId != null ? items.find(it => it.id === detailItemId) : null;
  const editItem = editItemId != null ? items.find(it => it.id === editItemId) : null;

  function openModifyItem(item) {
    setEditForm({ qty: item.qty, area: item.area, subArea: item.subArea || '', pic: item.pic || '', ownership: item.ownership || 'IHC', note: item.note || '' });
    setEditItemId(item.id);
  }

  function saveModifyItem() {
    if (!editItem || !editForm.area || !(Number(editForm.qty) >= 1)) return;
    const qty = Math.floor(Number(editForm.qty));
    setItems(is => is.map(it => it.id === editItem.id
      ? { ...it, qty, area: editForm.area, subArea: editForm.subArea, pic: editForm.pic.trim(), ownership: editForm.ownership, note: editForm.note.trim() }
      : it));
    addActivityLog({
      userName: currentUser?.name || 'Admin', action: 'Update', module: 'Event Detail',
      description: `Modified "${editItem.name}" on ${eventName}`,
    });
    setEditItemId(null);
  }

  function deleteItemFromDrawer(id) {
    if (!window.confirm('Delete this item from the event?')) return;
    setItems(is => is.filter(i => i.id !== id));
    setDetailItemId(null);
  }

  // --- Production requests ---
  function setProductionRequests(updater) {
    setProductionRequestsState(current => {
      const next = typeof updater === 'function' ? updater(current) : updater;
      saveProductionRequests(eventName, next);
      return next;
    });
  }

  function openProductionRequest() {
    setProductionForm({ name: '', qty: 1, area: '', subArea: '', neededBy: '', note: '' });
    setProductionOpen(true);
  }

  const productionFormValid = productionForm.name.trim() && Number(productionForm.qty) >= 1 && productionForm.area;

  function submitProductionRequest() {
    if (!productionFormValid) return;
    const id = Math.max(0, ...productionRequests.map(r => r.id)) + 1;
    const req = {
      id, name: productionForm.name.trim(), qty: Math.floor(Number(productionForm.qty)),
      area: productionForm.area, subArea: productionForm.subArea, neededBy: productionForm.neededBy,
      note: productionForm.note.trim(), status: 'Requested', stage: eventStatus,
      requestedBy: currentUser?.name || 'Admin', requestedAt: new Date().toLocaleDateString('en-CA'), // local YYYY-MM-DD
    };
    setProductionRequests(rs => [req, ...rs]);
    addActivityLog({
      userName: req.requestedBy, action: 'Create', module: 'Event Detail',
      description: `Requested production of "${req.name}" (${req.qty} pcs) for ${eventName}`,
    });
    setProductionOpen(false);
    setStageFilter('production');
  }

  // Requested -> In Production -> Done. Done adds the produced item to the event.
  function advanceProductionRequest(req) {
    const nextStatus = PRODUCTION_STATUSES[PRODUCTION_STATUSES.indexOf(req.status) + 1];
    if (!nextStatus) return;
    if (nextStatus === 'Done') {
      if (!window.confirm(`Mark "${req.name}" as done? It will be added to this event's items.`)) return;
      setItems(is => [...is, {
        id: nextId, name: req.name, area: req.area, subArea: req.subArea, stage: eventStatus,
        qty: req.qty, pic: '', checking: false, scanned: false, groupId: null, warehouseItem: false,
        scanIn: null, scanOut: null, note: req.note, checked: false, ownership: 'IHP', fromProduction: true,
      }]);
      setNextId(n => n + 1);
    }
    setProductionRequests(rs => rs.map(r => r.id === req.id ? { ...r, status: nextStatus } : r));
    addActivityLog({
      userName: currentUser?.name || 'Admin', action: 'Update', module: 'Event Detail',
      description: `Production request "${req.name}" on ${eventName} → ${nextStatus}`,
    });
  }

  function cancelProductionRequest(req) {
    if (!window.confirm(`Cancel the production request for "${req.name}"?`)) return;
    setProductionRequests(rs => rs.filter(r => r.id !== req.id));
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
        checked: false, ownership: 'IHC',
      })),
    ]);
    setNextId(n => n + cart.length);
    setCart([]);
    setSelectedCartIds([]);
    markItemsAdded(eventName);
  }

  return (
    <>
      <h1 className="page-title">Event Detail</h1>
      <div className="card">
        <button className="ed-back-link" onClick={() => navigate('/event')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          Back to Event
        </button>

        <div className="event-header-row">
          <div className="event-title-wrap">
            <div className="event-heading">{eventName}</div>
            <span className={`badge ${phaseBadge.badgeClass}`}>{phaseBadge.label}</span>
          </div>

          <div className="event-actions-bar">
            {productionEnabled && closingStatus === 'on-going' && !addLocked && (
              <button className="btn btn-ghost btn-request-production" onClick={openProductionRequest}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
                Request Production
              </button>
            )}
            <button className="action-icon-btn btn-cart-outline" title={addLocked ? 'Stock has been returned — no more items can be added' : 'Cart'} disabled={addLocked} onClick={() => setPickerOpen(true)}>
              <IconCart />
              {cart.length > 0 && <span className="action-icon-badge">{cart.length}</span>}
            </button>
            <button
              className="btn-new"
              disabled={addLocked}
              title={addLocked ? 'Stock has been returned — no more items can be added' : undefined}
              onClick={() => { setPickerQuery(''); setPickerCategory(''); setPickerOpen(true); }}
            >
              <IconPlus /> Add Item
            </button>
            <div className="more-menu-wrap" ref={moreMenuRef}>
              <button className="action-icon-btn more-btn" title="More menu" onClick={() => setMoreMenuOpen(o => !o)}>
                <IconMoreVertical />
              </button>
              {moreMenuOpen && (
                <div className="more-menu-dropdown">
                  {closingStatus === 'checking-inventory' && (
                    <button className="more-menu-item" onClick={() => { openCrossCheck(); setMoreMenuOpen(false); }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                      Cross Check Items
                    </button>
                  )}
                  <button className="more-menu-item" onClick={() => { openPackagingModal(); setMoreMenuOpen(false); }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
                    Group Items
                  </button>
                  {!itemsLocked && (
                    <button className="more-menu-item" onClick={() => { openBulkOwnership(); setMoreMenuOpen(false); }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
                      Bulk Assign Ownership
                    </button>
                  )}
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
          <Stepper
            steps={stages}
            currentIndex={stageIndex}
            maxIndex={maxReachedIndex}
            onStepClick={closingStatus === 'on-going' ? requestStageChange : undefined}
          />
          {closingStatus === 'on-going' && !readyToClose && hasNextStage && (
            <button
              type="button"
              className="btn-next-stage"
              disabled={stageScanEnabled && unscannedCount > 0}
              title={stageScanEnabled && unscannedCount > 0 ? `${unscannedCount} item(s) still need to be scanned` : `Move to "${stages[stageIndex + 1]}"`}
              onClick={handleNextClick}
            >
              Next: {stages[stageIndex + 1]}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          )}
          {readyToClose && (
            <button type="button" className="btn-next-stage" onClick={handleReadyToClose}>
              Close &amp; Start Checking
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          )}
          {closingStatus === 'checking-inventory' && (
            <button type="button" className="btn-next-stage" onClick={openReturnTransfer}>
              Ready for Return
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          )}
        </div>

        {(addLocked || itemsLocked) && (
          <div className="ed-lock-note">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            {itemsLocked
              ? 'This event is in Checking Inventory or later — items can no longer be modified or deleted.'
              : 'Stock has been returned for this event — no more items can be added.'}
          </div>
        )}

        {stepperError && (
          <div className="stepper-error-banner">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            {stepperError}
            <button type="button" className="stepper-error-dismiss" onClick={() => setStepperError('')}>×</button>
          </div>
        )}

        <div className="ed-toolbar">
          <div className="search-wrap ed-toolbar-search">
            <IconSearch />
            <input className="search-input" type="text" placeholder="Search item or area…" value={kwSearch} onChange={e => setKwSearch(e.target.value)} />
          </div>

          <div className="ed-toolbar-select">
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

          <div className="ed-toolbar-select">
            <SearchableSelect
              value={ownershipFilter}
              onChange={setOwnershipFilter}
              placeholder="All Ownership"
              options={[
                { value: '', label: 'All Ownership', meta: String(items.length) },
                { value: 'IHC', label: 'IHC', meta: String(ownershipCounts.IHC || 0) },
                { value: 'IHP', label: 'IHP', meta: String(ownershipCounts.IHP || 0) },
                { value: 'Outsource', label: 'Outsource', meta: String(ownershipCounts.Outsource || 0) },
              ]}
            />
          </div>
        </div>

        <div className="stage-tabs-row">
        <div className="stage-tabs">
          <button type="button" className={`stage-tab${effectiveStageFilter === 'all' ? ' active' : ''}`} onClick={() => setStageFilter('all')}>
            All <span className="stage-tab-count">{scopedItems.length}</span>
          </button>
          <button type="button" className={`stage-tab${effectiveStageFilter === 'added' ? ' active' : ''}`} onClick={() => setStageFilter('added')}>
            Added New <span className="stage-tab-count">{currentStageItems.length}</span>
          </button>
          {stageScanEnabled && (
            <button type="button" className={`stage-tab${effectiveStageFilter === 'waiting' ? ' active' : ''}`} onClick={() => setStageFilter('waiting')}>
              Waiting Scan <span className="stage-tab-count">{waitingScanItems.length}</span>
            </button>
          )}
          <button type="button" className={`stage-tab${effectiveStageFilter === 'grouped' ? ' active' : ''}`} onClick={() => setStageFilter('grouped')}>
            Grouped <span className="stage-tab-count">{packages.length}</span>
          </button>
          {(productionEnabled || productionRequests.length > 0) && (
            <button type="button" className={`stage-tab${effectiveStageFilter === 'production' ? ' active' : ''}`} onClick={() => setStageFilter('production')}>
              Production <span className="stage-tab-count">{productionRequests.length}</span>
            </button>
          )}
        </div>
          <div className="view-toggle" role="group" aria-label="Item view">
            <button type="button" className={viewMode === 'card' ? 'active' : ''} aria-pressed={viewMode === 'card'} title="Card view" onClick={() => changeViewMode('card')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
            </button>
            <button type="button" className={viewMode === 'list' ? 'active' : ''} aria-pressed={viewMode === 'list'} title="List view" onClick={() => changeViewMode('list')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
            </button>
          </div>
        </div>

        {effectiveStageFilter === 'production' ? (
          <>
            <p className="summary-text">
              <strong>{productionRequests.length}</strong> production request{productionRequests.length === 1 ? '' : 's'}
              {productionEnabled ? '' : ' · new requests can only be made at a stage with Production Item enabled'}
            </p>
            {productionRequests.length === 0
              ? <div className="no-data">No production requests yet. Use &ldquo;Request Production&rdquo; above to ask for a new item.</div>
              : (
                <div className="production-list">
                  {productionRequests.map(req => {
                    const nextStatus = PRODUCTION_STATUSES[PRODUCTION_STATUSES.indexOf(req.status) + 1];
                    return (
                      <div key={req.id} className="production-card">
                        <div className="production-card-main">
                          <div className="production-card-title">
                            {req.name}
                            <span className={`badge ${PRODUCTION_BADGE[req.status]}`} style={{ fontSize: 10.5 }}>{req.status}</span>
                          </div>
                          <div className="production-card-meta">
                            <span>Qty {req.qty}</span>
                            <span>{req.area}{req.subArea ? ` · ${req.subArea}` : ''}</span>
                            {req.neededBy && <span>Needed by {req.neededBy}</span>}
                            <span>Requested by {req.requestedBy} on {req.requestedAt}</span>
                          </div>
                          {req.note && <div className="production-card-note">{req.note}</div>}
                        </div>
                        <div className="production-card-actions">
                          {req.status === 'Requested' && (
                            <button type="button" className="btn btn-ghost" onClick={() => cancelProductionRequest(req)}>Cancel</button>
                          )}
                          {nextStatus && (
                            <button type="button" className="btn-save-modal" onClick={() => advanceProductionRequest(req)}>
                              {nextStatus === 'In Production' ? 'Start Production' : 'Mark Done'}
                            </button>
                          )}
                          {!nextStatus && <span className="production-done-note">Added to event items</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            }
          </>
        ) : effectiveStageFilter === 'grouped' ? (

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
                        {viewMode === 'list' ? (
                          <ItemTable items={members} packages={packages} showScanButton={false} {...itemActionProps} />
                        ) : (
                          <div className="items-grid package-items-grid">
                            {members.map(it => (
                              <ItemCard key={it.id} item={it} group={pkg} showScanButton={false} {...itemActionProps} />
                            ))}
                          </div>
                        )}
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
                <><strong>{stageFiltered.length}</strong> item{stageFiltered.length === 1 ? '' : 's'} waiting to be scanned &middot; {areaLabel}</>
              ) : (
                <><strong>{stageFiltered.length}</strong> item{stageFiltered.length === 1 ? '' : 's'} &middot; {areaLabel}</>
              )}
            </p>

            {stageFiltered.length === 0
              ? <div className="no-data">No Data</div>
              : (
                viewMode === 'list' ? (
                  <ItemTable items={stageFiltered} packages={packages} showScanButton={stageScanEnabled} onScanClick={openScanPopup} {...itemActionProps} />
                ) : (
                  <div className="items-grid">
                    {stageFiltered.map(it => (
                      <ItemCard
                        key={it.id}
                        item={it}
                        group={it.groupId ? packages.find(p => p.id === it.groupId) : null}
                        showScanButton={stageScanEnabled}
                        onScanClick={openScanPopup}
                        {...itemActionProps}
                      />
                    ))}
                  </div>
                )
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

      {/* Item detail drawer — opens when an item card is clicked */}
      <Drawer
        open={!!detailItem}
        title={detailItem?.name}
        subtitle={detailItem ? `${detailItem.area}${detailItem.subArea ? ` · ${detailItem.subArea}` : ''}` : ''}
        onClose={() => setDetailItemId(null)}
        footer={detailItem && (
          <>
            {itemsLocked ? (
              <span className="drawer-lock-note">Locked — event is in {CLOSING_LABELS[closingStatus]?.label || 'closing'}</span>
            ) : (
              <button className="btn-del-ok" style={{ marginRight: 'auto' }} onClick={() => deleteItemFromDrawer(detailItem.id)}><IconDelete /> Delete</button>
            )}
            {stageScanEnabled && (
              <button className="btn btn-ghost" onClick={() => openScanPopup(detailItem)}>{detailItem.scanned ? 'Re-scan' : 'Scan'}</button>
            )}
            {!itemsLocked && (
              <button className="btn-save-modal" onClick={() => openModifyItem(detailItem)}><IconEdit /> Modify</button>
            )}
          </>
        )}
      >
        {detailItem && (() => {
          const group = detailItem.groupId ? packages.find(p => p.id === detailItem.groupId) : null;
          const rows = [
            ['Quantity', detailItem.qty],
            ['PIC', detailItem.pic || '—'],
            ['Area', detailItem.area],
            ['Sub Area', detailItem.subArea || '—'],
            ['Ownership', detailItem.ownership || '—'],
            ['Added at stage', detailItem.stage],
            ['Source', detailItem.fromProduction ? 'Production request' : detailItem.warehouseItem ? 'Warehouse inventory' : 'Non-warehouse item'],
            ['Group', group ? group.name : '—'],
            ['Checking', detailItem.checking ? 'Yes' : 'No'],
            ['Cross-checked', detailItem.checked ? 'Yes' : 'No'],
            ['Scan In', detailItem.scanIn || 'Not yet'],
            ['Scan Out', detailItem.scanOut || 'Not yet'],
          ];
          return (
            <>
              <div className="drawer-img"><ImagePlaceholder /></div>
              <div className="item-badge-row" style={{ marginBottom: 14 }}>
                <span className={`area-badge ${areaBadgeClass(detailItem.area)}`}>{detailItem.area}</span>
                {detailItem.ownership && <span className={`badge ${ownershipBadgeClass(detailItem.ownership)}`} style={{ fontSize: 10 }}>{detailItem.ownership}</span>}
                {detailItem.scanned && <span className="badge badge-green" style={{ fontSize: 10 }}>Scanned</span>}
                <StockBadge item={detailItem} />
                {detailItem.resolution === 'returned' && <span className="badge badge-green" style={{ fontSize: 10 }}>Returned</span>}
              </div>
              <dl className="drawer-dl">
                {rows.map(([k, v]) => (
                  <div key={k} className="drawer-dl-row"><dt>{k}</dt><dd>{v}</dd></div>
                ))}
              </dl>
              <div className="drawer-section-label">Note</div>
              {detailItem.note ? <div className="item-note" style={{ marginTop: 0 }}>{detailItem.note}</div> : <p className="drawer-empty">No note.</p>}
            </>
          );
        })()}
      </Drawer>

      {/* Modify item */}
      <Modal
        open={!!editItem}
        title="Modify Item"
        onClose={() => setEditItemId(null)}
        footer={
          <>
            <button className="btn-cancel-modal" onClick={() => setEditItemId(null)}><IconClose /> Cancel</button>
            <button className="btn-save-modal" onClick={saveModifyItem} disabled={!editForm.area || !(Number(editForm.qty) >= 1)}><IconCheck /> Save</button>
          </>
        }
      >
        {editItem && (
          <>
            <div className="form-group">
              <label>Item</label>
              <input type="text" value={editItem.name} disabled />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Quantity <span style={{ color: 'var(--red)' }}>*</span></label>
                <input type="number" min="1" value={editForm.qty} onChange={e => setEditForm(f => ({ ...f, qty: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Ownership</label>
                <SearchableSelect
                  value={editForm.ownership}
                  onChange={v => setEditForm(f => ({ ...f, ownership: v }))}
                  options={OWNERSHIP_CYCLE.map(o => ({ value: o, label: o }))}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Area <span style={{ color: 'var(--red)' }}>*</span></label>
                <SearchableSelect
                  value={editForm.area}
                  onChange={v => setEditForm(f => ({ ...f, area: v, subArea: '' }))}
                  placeholder="Select Area"
                  options={AREAS.map(a => ({ value: a, label: a }))}
                />
              </div>
              <div className="form-group">
                <label>Sub Area</label>
                <SearchableSelect
                  value={editForm.subArea}
                  onChange={v => setEditForm(f => ({ ...f, subArea: v }))}
                  placeholder={(SUB_AREAS[editForm.area] || []).length ? 'Select Sub Area' : '(No Sub Area)'}
                  options={[{ value: '', label: '—' }, ...(SUB_AREAS[editForm.area] || []).map(s => ({ value: s, label: s }))]}
                />
              </div>
            </div>
            <div className="form-group">
              <label>PIC</label>
              <input type="text" placeholder="Person in charge" value={editForm.pic} onChange={e => setEditForm(f => ({ ...f, pic: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Note</label>
              <textarea placeholder="e.g. Handle with care" value={editForm.note} onChange={e => setEditForm(f => ({ ...f, note: e.target.value }))} />
            </div>
          </>
        )}
      </Modal>

      {/* Request Production — ask for a new item to be produced */}
      <Modal
        open={productionOpen}
        title="Request Production"
        onClose={() => setProductionOpen(false)}
        footer={
          <>
            <button className="btn-cancel-modal" onClick={() => setProductionOpen(false)}><IconClose /> Cancel</button>
            <button className="btn-save-modal" onClick={submitProductionRequest} disabled={!productionFormValid}><IconCheck /> Submit Request</button>
          </>
        }
      >
        <p className="confirm-msg" style={{ marginTop: 0, marginBottom: 16 }}>
          Ask for a new item that isn&rsquo;t in inventory to be produced for this event. Once it&rsquo;s marked done, it&rsquo;s added to the event&rsquo;s items.
        </p>
        <div className="form-group">
          <label>Item Name <span style={{ color: 'var(--red)' }}>*</span></label>
          <input type="text" placeholder="e.g. Custom Welcome Sign 1×2m" value={productionForm.name} onChange={e => setProductionForm(f => ({ ...f, name: e.target.value }))} />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Quantity <span style={{ color: 'var(--red)' }}>*</span></label>
            <input type="number" min="1" value={productionForm.qty} onChange={e => setProductionForm(f => ({ ...f, qty: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Needed By</label>
            <input type="date" value={productionForm.neededBy} onChange={e => setProductionForm(f => ({ ...f, neededBy: e.target.value }))} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Area <span style={{ color: 'var(--red)' }}>*</span></label>
            <SearchableSelect
              value={productionForm.area}
              onChange={v => setProductionForm(f => ({ ...f, area: v, subArea: '' }))}
              placeholder="Select Area"
              options={AREAS.map(a => ({ value: a, label: a }))}
            />
          </div>
          <div className="form-group">
            <label>Sub Area</label>
            <SearchableSelect
              value={productionForm.subArea}
              onChange={v => setProductionForm(f => ({ ...f, subArea: v }))}
              placeholder={(SUB_AREAS[productionForm.area] || []).length ? 'Select Sub Area' : '(No Sub Area)'}
              options={[{ value: '', label: '—' }, ...(SUB_AREAS[productionForm.area] || []).map(s => ({ value: s, label: s }))]}
            />
          </div>
        </div>
        <div className="form-group">
          <label>Notes</label>
          <textarea placeholder="Size, material, color, reference…" value={productionForm.note} onChange={e => setProductionForm(f => ({ ...f, note: e.target.value }))} />
        </div>
      </Modal>

      {/* Stage change confirmation — Next or reopening an earlier stage */}
      <Modal
        open={!!pendingStage}
        title={pendingStage && stages.indexOf(pendingStage) > stageIndex ? 'Move to next stage?' : 'Go back to an earlier stage?'}
        onClose={() => setPendingStage(null)}
        footer={
          <>
            <button className="btn-cancel-modal" onClick={() => setPendingStage(null)}><IconClose /> Cancel</button>
            <button className="btn-save-modal" onClick={confirmStageChange}>
              <IconCheck /> {pendingReturnStages.length > 0 && pendingReturnCount > 0 ? 'Confirm & Return Stock'
                : pendingCutStages.length > 0 && itemsToCut.length > 0 ? 'Confirm & Cut Stock' : 'Confirm'}
            </button>
          </>
        }
      >
        <div className="stage-confirm-route">
          <span>{eventStatus}</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          <strong>{pendingStage}</strong>
        </div>
        {pendingStage && isScanStage(pendingStage) && (
          <p className="confirm-msg">Items must be scanned at this stage before the event can move on.</p>
        )}
        {pendingCutStages.length > 0 && (
          <div className="stage-confirm-cut">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <div>
              <strong>Cutting Stock is on for {pendingCutStages.map(s => `“${s}”`).join(', ')}.</strong>
              {itemsToCut.length > 0 ? (
                <> Confirming deducts <strong>{itemsToCut.length} item{itemsToCut.length === 1 ? '' : 's'}</strong> ({itemsToCut.reduce((sum, it) => sum + it.qty, 0)} pcs) from warehouse stock. Going back to an earlier stage does not restore it.</>
              ) : (
                <> All items on this event have already been deducted, so nothing more will be cut.</>
              )}
            </div>
          </div>
        )}
        {pendingReturnStages.length > 0 && (
          <div className="stage-confirm-cut stage-confirm-return">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
            <div>
              <strong>Stock Return is on for {pendingReturnStages.map(s => `“${s}”`).join(', ')}.</strong>
              {pendingReturnCount > 0 ? (
                <> Confirming returns <strong>{pendingReturnCount} item{pendingReturnCount === 1 ? '' : 's'}</strong> to warehouse stock.</>
              ) : (
                <> No items have had their stock cut, so nothing will be returned.</>
              )}
              {' '}After this, <strong>no more items can be added</strong> to this event.
            </div>
          </div>
        )}
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

      <Modal
        open={bulkOwnOpen}
        title="Bulk Assign Ownership"
        onClose={() => setBulkOwnOpen(false)}
        size="lg"
        footer={
          <>
            <button className="btn-cancel-modal" onClick={() => setBulkOwnOpen(false)}><IconClose /> Cancel</button>
            <button className="btn-save-modal" onClick={applyBulkOwnership} disabled={bulkOwnSelected.length === 0}>
              <IconCheck /> Assign {bulkOwnTarget} to {bulkOwnSelected.length} item{bulkOwnSelected.length === 1 ? '' : 's'}
            </button>
          </>
        }
      >
        <div className="bulk-own-target">
          <span className="bulk-own-label">Assign ownership</span>
          <div className="bulk-own-segments" role="radiogroup" aria-label="Target ownership">
            {OWNERSHIP_CYCLE.map(o => (
              <button
                key={o}
                type="button"
                role="radio"
                aria-checked={bulkOwnTarget === o}
                className={`bulk-own-segment${bulkOwnTarget === o ? ' active' : ''}`}
                onClick={() => setBulkOwnTarget(o)}
              >
                <span className={`badge ${ownershipBadgeClass(o)}`}>{o}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="bulk-own-filters">
          <div className="search-wrap" style={{ flex: 1 }}>
            <IconSearch />
            <input className="search-input" type="text" placeholder="Search item or area…"
              value={bulkOwnQuery} onChange={e => setBulkOwnQuery(e.target.value)} />
          </div>
          <div style={{ width: 180 }}>
            <SearchableSelect
              value={bulkOwnFrom}
              onChange={setBulkOwnFrom}
              options={[{ value: '', label: 'All ownership' }, ...OWNERSHIP_CYCLE.map(o => ({ value: o, label: `Only ${o}` }))]}
              placeholder="All ownership"
            />
          </div>
        </div>

        {bulkOwnVisible.length === 0
          ? <div className="no-data">No items match.</div>
          : (
            <>
              <div className="indicator-row indicator-row-clickable bulk-own-selectall" onClick={toggleBulkOwnAllVisible}>
                <span className={`indicator-box${bulkOwnAllVisibleSelected ? ' checked' : ''}`}>
                  {bulkOwnAllVisibleSelected && <CheckIcon />}
                </span>
                <span>Select all shown ({bulkOwnVisible.length})</span>
                <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontWeight: 500 }}>
                  {bulkOwnSelected.length} selected
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 380, overflowY: 'auto' }}>
                {bulkOwnVisible.map(it => {
                  const sel = bulkOwnSelected.includes(it.id);
                  return (
                    <div
                      key={it.id}
                      className="indicator-row indicator-row-clickable"
                      style={{ padding: '8px 10px', gap: 10, border: `1px solid ${sel ? 'var(--brand)' : 'var(--border-2)'}`, borderRadius: 'var(--r)' }}
                      onClick={() => toggleBulkOwnItem(it.id)}
                    >
                      <span className={`indicator-box${sel ? ' checked' : ''}`}>
                        {sel && <CheckIcon />}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{it.name}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{it.area} · {it.stage} · Qty: {it.qty}</div>
                      </div>
                      <span className={`badge ${ownershipBadgeClass(it.ownership)}`}>{it.ownership}</span>
                      {sel && it.ownership !== bulkOwnTarget && (
                        <>
                          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>→</span>
                          <span className={`badge ${ownershipBadgeClass(bulkOwnTarget)}`}>{bulkOwnTarget}</span>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )
        }
      </Modal>

      <Modal
        open={crossCheckOpen}
        title="Cross Check Items"
        onClose={() => setCrossCheckOpen(false)}
        size="lg"
        footer={
          <button className="btn-save-modal" onClick={() => setCrossCheckOpen(false)}><IconCheck /> Done</button>
        }
      >
        <p className="confirm-msg" style={{ marginBottom: 14 }}>
          <strong>{logisticsSummary.checkedCount}</strong> of <strong>{logisticsSummary.total}</strong> items checked so far. Click a row to toggle it.
        </p>
        {items.length === 0
          ? <div className="no-data">No items on this event.</div>
          : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 420, overflowY: 'auto' }}>
              {items.map(it => (
                <div
                  key={it.id}
                  className="indicator-row indicator-row-clickable"
                  style={{ padding: '8px 10px', border: '1px solid var(--border-2)', borderRadius: 'var(--r)' }}
                  onClick={() => toggleItemChecked(it.id)}
                >
                  <span className={`indicator-box${it.checked ? ' checked' : ''}`}>
                    {it.checked && <CheckIcon />}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{it.name}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{it.area} · Qty: {it.qty}</div>
                  </div>
                </div>
              ))}
            </div>
          )
        }
      </Modal>

      <Modal
        open={returnTransferOpen}
        title="Return Item & Transfer"
        onClose={closeReturnTransfer}
        size="lg"
        footer={
          <>
            <button className="btn-cancel-modal" onClick={closeReturnTransfer}><IconClose /> Close</button>
            <button className="btn-save-modal" disabled={unresolvedItems.length > 0} onClick={finalizeReturnTransfer}>
              <IconCheck /> Finalize ({items.length - unresolvedItems.length}/{items.length})
            </button>
          </>
        }
      >
        <p className="confirm-msg" style={{ marginBottom: 14 }}>
          <strong>Event Logistics Summary</strong> — <strong>{logisticsSummary.checkedCount}</strong> of <strong>{logisticsSummary.total}</strong> items were checked during Cross Check.
          {logisticsSummary.missingItems.length > 0
            ? <> <strong style={{ color: 'var(--red)' }}>{logisticsSummary.missingItems.length} item{logisticsSummary.missingItems.length === 1 ? '' : 's'}</strong> never got checked.</>
            : ' Every item was checked.'
          }
        </p>
        <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 14 }}>
          Resolve every item below — either <strong>Return</strong> it, or <strong>Transfer</strong> it to another
          on-going event — before this event can be finalized.
        </p>
        {items.length === 0
          ? <div className="no-data">No items left on this event — finalizing will mark it Transferred.</div>
          : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 420, overflowY: 'auto' }}>
              {items.map(it => (
                <div key={it.id} style={{ border: '1px solid var(--border-2)', borderRadius: 'var(--r-lg)', padding: '10px 12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{it.name}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{it.area} · Qty: {it.qty}</div>
                    </div>
                    {it.resolution === 'returned' ? (
                      <span className="badge badge-green" style={{ fontSize: 10, flexShrink: 0 }}>Returned</span>
                    ) : transferPickerItemId !== it.id && (
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        <button className="btn-ia-scan" style={{ flex: 'none', padding: '6px 12px' }} onClick={() => resolveItemReturn(it.id)}>Return</button>
                        <button className="btn-ia-move" style={{ flex: 'none', padding: '6px 12px' }} onClick={() => openTransferPicker(it)}>Transfer</button>
                      </div>
                    )}
                  </div>
                  {transferPickerItemId === it.id && (
                    <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <SearchableSelect
                        value={transferTargetEvent}
                        onChange={setTransferTargetEvent}
                        placeholder="Select an on-going event"
                        emptyText="No other on-going events"
                        options={transferTargetCandidates.map(e => ({ value: e.key, label: `${e.name} (${e.code})` }))}
                      />
                      <SearchableSelect
                        value={transferTargetStage}
                        onChange={setTransferTargetStage}
                        placeholder="Select event status stage"
                        options={stages.map(s => ({ value: s, label: s }))}
                      />
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn-save-modal" disabled={!transferTargetEvent || !transferTargetStage} onClick={confirmTransferItem}>
                          <IconCheck /> Confirm Transfer
                        </button>
                        <button className="btn-cancel-m" onClick={cancelTransferPicker}>Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        }
      </Modal>
    </>
  );
}
