import { inventoryData } from '../data/inventory';
import { wiData } from '../data/warehouseInventory';

// Items created by a finished "New Production" request (Event Detail → Request Production).
//
// A production request only knows a name, a quantity and which warehouse the item
// goes to — it can't know SKU, category, unit, rack, valuation, … So when a request
// is marked Done we create a *draft* item here with `needsSetup: true`. Inventory and
// Warehouse Inventory highlight these rows until someone completes them, then call
// markItemSetUp(name). Stored in localStorage so the highlight survives a reload.
//
// Shape of one stored record: { catalog: <Inventory row>, row: <Warehouse Inventory row> }
const KEY = 'emi_produced_items';

function readAll() {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(list) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

function fmtDate(d) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

// Inventory (catalog) rows for produced items, flagged needsSetup while incomplete.
export function getProducedCatalog() {
  return readAll().map(r => r.catalog);
}

// Warehouse Inventory rows for produced items. stockOpnameStore seeds its live
// rows from this, so a produced item survives a page reload.
export function getProducedRows() {
  return readAll().map(r => r.row);
}

// Full Inventory catalog = static seed data + produced items.
export function getCatalog() {
  return [...inventoryData, ...getProducedCatalog()];
}

export function isNeedsSetup(itemName) {
  return readAll().some(r => r.catalog.name === itemName && r.catalog.needsSetup);
}

export function countNeedsSetup() {
  return readAll().filter(r => r.catalog.needsSetup).length;
}

// Clears the highlight for an item (called once its info has been completed).
export function markItemSetUp(itemName) {
  writeAll(readAll().map(r => r.catalog.name !== itemName ? r : { ...r, catalog: { ...r.catalog, needsSetup: false } }));
}

// Creates the draft catalog item + warehouse row for a finished production request.
// Returns { catalog, row }. The caller must also add `row` to the live warehouse
// rows (stockOpnameStore.addInventoryRow) — this file can't import that store
// without a circular import.
export function addProducedItem({ name, qty, warehouseName, vendorName, producedFor }) {
  const all = readAll();
  const catalogId = Math.max(0, ...inventoryData.map(i => i.id), ...all.map(r => r.catalog.id)) + 1;
  const rowId = Math.max(0, ...wiData.map(r => r.id), ...all.map(r => r.row.id)) + 1;
  const now = fmtDate(new Date());
  const catalog = {
    id: catalogId, name, sku: `NEW-${String(catalogId).padStart(3, '0')}`, category: '', unit: '',
    warehouse: warehouseName, totalStock: qty, stockStatus: 'Available', updatedAt: now,
    needsSetup: true, source: 'production', producedBy: vendorName || '', producedFor: producedFor || '',
  };
  const row = {
    id: rowId, name, warehouseStock: qty, warehouseName, itemStock: qty, stokMin: 0, stokUsed: 0,
    valuation: 0, totalValuation: 0, minStatus: 'Not Set', flag1: '', flag2: '', asile: '', rack: '',
    level: '', lantai: '', lorong: '', updatedAt: now,
  };
  writeAll([...all, { catalog, row }]);
  return { catalog, row };
}
