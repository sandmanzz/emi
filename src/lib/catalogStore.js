import { inventoryData } from '../data/inventory';
import { getInventoryRows, renameItemRows, setItemValuation, stockInto } from './stockOpnameStore';

// The Inventory catalog (master data of items) — persisted in localStorage (2026-10-16).
// Stored fields:  { id, name, sku, category, unit, itemValue, desc, homeWarehouse,
//                   needsSetup, source, producedBy, producedFor, updatedAt }
// DERIVED on read from warehouse rows (lib/stockOpnameStore.js — the single stock source):
//   totalStock  = Σ itemStock of the rows with the same name
//   warehouses  = [{ name, stock }] sorted by stock, `warehouse` = the main one (or homeWarehouse)
//   stockStatus = 'Out of Stock' (0) | 'Low Stock' (≤ Σ row minimums, or ≤ 10 when no minimum is set) | 'Available'
// Items are joined to rows by NAME (the app has no item ids on rows/events yet), so a rename
// is propagated to the warehouse rows here. Event items keep their old name (see PRD).
const KEY = 'emi_catalog';
const LEGACY_PRODUCED_KEY = 'emi_produced_items';
const LOW_STOCK_DEFAULT = 10;

function fmtDate(d) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function strip(i) {
  return {
    id: i.id, name: i.name, sku: i.sku || '', category: i.category || '', unit: i.unit || '',
    itemValue: Number(i.itemValue) || 0, desc: i.desc || '', homeWarehouse: i.homeWarehouse || i.warehouse || '',
    needsSetup: !!i.needsSetup, source: i.source || '', producedBy: i.producedBy || '', producedFor: i.producedFor || '',
    updatedAt: i.updatedAt || '-',
  };
}

function load() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY));
    if (Array.isArray(v)) return v;
  } catch { /* fall through to seed */ }
  let legacy = [];
  try { legacy = (JSON.parse(localStorage.getItem(LEGACY_PRODUCED_KEY)) || []).map(r => r.catalog).filter(Boolean); } catch { /* none */ }
  return [...inventoryData, ...legacy].map(strip);
}

let items = load();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* keep in memory */ } };

// Catalog with stock fields derived from the warehouse rows.
export function getCatalog() {
  const byName = new Map();
  for (const r of getInventoryRows()) {
    const e = byName.get(r.name) || { total: 0, min: 0, list: [] };
    const stock = Number(r.itemStock) || 0;
    e.total += stock;
    e.min += Number(r.stokMin) || 0;
    e.list.push({ name: r.warehouseName, stock });
    byName.set(r.name, e);
  }
  return items.map(i => {
    const e = byName.get(i.name) || { total: 0, min: 0, list: [] };
    const warehouses = [...e.list].sort((a, b) => b.stock - a.stock);
    const low = e.min > 0 ? e.total <= e.min : e.total <= LOW_STOCK_DEFAULT;
    return {
      ...i, totalStock: e.total, warehouses,
      warehouse: warehouses[0]?.name || i.homeWarehouse || '',
      stockStatus: e.total === 0 ? 'Out of Stock' : low ? 'Low Stock' : 'Available',
    };
  });
}

export function getCatalogItem(id) {
  return getCatalog().find(i => i.id === Number(id)) || null;
}

export function isSkuTaken(sku, exceptId = null) {
  const s = sku.trim().toLowerCase();
  return !!s && items.some(i => i.id !== exceptId && i.sku.toLowerCase() === s);
}
export function isNameTaken(name, exceptId = null) {
  const n = name.trim().toLowerCase();
  return items.some(i => i.id !== exceptId && i.name.toLowerCase() === n);
}

// Creates an item. `opening` = { warehouse, qty } puts its first stock in a warehouse (logged).
export function addCatalogItem(data, opening = null, by = '') {
  const id = Math.max(0, ...items.map(i => i.id)) + 1;
  const item = strip({ ...data, id, updatedAt: fmtDate(new Date()) });
  items = [...items, item];
  save();
  if (opening && opening.warehouse && Number(opening.qty) > 0) {
    stockInto(item.name, opening.warehouse, Number(opening.qty), { reason: 'Opening stock', by, note: 'New item' }, { valuation: item.itemValue });
  }
  return item;
}

// Updates an item. A rename is carried to the warehouse rows; a new Item Value is copied to
// the rows' valuation so Warehouse Inventory's valuation stays the same number.
export function updateCatalogItem(id, changes) {
  const old = items.find(i => i.id === id);
  if (!old) return null;
  const next = strip({ ...old, ...changes, id, updatedAt: fmtDate(new Date()) });
  items = items.map(i => i.id === id ? next : i);
  save();
  if (next.name !== old.name) renameItemRows(old.name, next.name);
  if (next.itemValue !== old.itemValue) setItemValuation(next.name, next.itemValue);
  return next;
}

// Deletes an item. Refused (returns false) while it still has stock in any warehouse.
export function deleteCatalogItem(id) {
  const item = getCatalog().find(i => i.id === id);
  if (!item || item.totalStock > 0) return false;
  items = items.filter(i => i.id !== id);
  save();
  return true;
}

// --- "Needs setup" drafts (items created by a finished production) -----------------

export function isNeedsSetup(itemName) {
  return items.some(i => i.name === itemName && i.needsSetup);
}
export function markItemSetUp(itemName) {
  items = items.map(i => i.name === itemName ? { ...i, needsSetup: false } : i);
  save();
}
