import { wiData } from '../data/warehouseInventory';
import { initialOpnameHistory } from '../data/stockOpnameHistory';

// THE single source of stock (2026-10-16): warehouse inventory rows — one row per
// (item name, warehouse) — plus the stock ledger (Stock History) and opname history.
// Everything else derives from it: Inventory's Total Stock / status / asset value
// (lib/catalogStore.js), Event Detail's picker stock, reports.
//
// Persisted in localStorage so a reload keeps every change (it used to be in memory only,
// which made e.g. a finished restock lose its stock on reload while its record stayed Done).
// Seed = data/warehouseInventory.js (+ legacy produced-item rows) on first load only.
//
// Rule: EVERY stock change goes through this module and lands in the ledger:
//  - applyStockMovement(rowId, delta, info)   one row, +/- qty
//  - setInventoryRows(rows, info)             bulk replace; the difference per row is logged
//  - addInventoryRow(row, info)               new row; its opening stock is logged
//  - resolveOpname(...)                       approved counts are logged as 'Stock opname'
// info = { reason, eventName?, stage?, note?, by? }
const ROWS_KEY = 'emi_wh_rows';
const LEDGER_KEY = 'emi_stock_movements';
const OPNAME_KEY = 'emi_opname_history';
const LEGACY_PRODUCED_KEY = 'emi_produced_items'; // rows of production drafts saved before 2026-10-16

function read(key) {
  try {
    const v = JSON.parse(localStorage.getItem(key));
    return Array.isArray(v) ? v : null;
  } catch {
    return null;
  }
}
function write(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage full or blocked: keep in memory */ }
}

function seedRows() {
  const legacy = (read(LEGACY_PRODUCED_KEY) || []).map(r => r.row).filter(Boolean);
  return [...legacy, ...wiData];
}

let inventoryRows = read(ROWS_KEY) || seedRows();
let opnameHistory = read(OPNAME_KEY) || [...initialOpnameHistory];
let stockMovements = read(LEDGER_KEY) || [];
let nextHistoryId = Math.max(0, ...opnameHistory.map(h => h.id)) + 1;
let nextMovementId = Math.max(0, ...stockMovements.map(m => m.id)) + 1;

const saveRows = () => write(ROWS_KEY, inventoryRows);
const saveLedger = () => write(LEDGER_KEY, stockMovements);
const saveOpname = () => write(OPNAME_KEY, opnameHistory);

function fmtDate(d) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
}
function stamp() {
  return new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
export function minStatusFor(stock, min) {
  if (!min) return 'Not Set';
  if (stock <= min) return 'Critical';
  if (stock <= min * 1.5) return 'Warning';
  return 'Safe';
}
// Keeps the derived fields of a row in line with its stock.
function withStock(row, stock) {
  return {
    ...row, itemStock: stock, warehouseStock: stock, totalValuation: (Number(row.valuation) || 0) * stock,
    minStatus: minStatusFor(stock, row.stokMin), updatedAt: fmtDate(new Date()),
  };
}

function log(row, before, after, info = {}) {
  if (before === after) return null;
  const entry = {
    id: nextMovementId++, at: stamp(), itemName: row.name, warehouse: row.warehouseName,
    change: after - before, before, after, reason: info.reason || 'Manual edit',
    eventName: info.eventName || '', stage: info.stage || '', note: info.note || '', by: info.by || '',
  };
  stockMovements = [entry, ...stockMovements];
  return entry;
}

// --- Rows -------------------------------------------------------------------------

export function getInventoryRows() {
  return inventoryRows;
}

export function nextRowId() {
  return Math.max(0, ...inventoryRows.map(r => r.id)) + 1;
}

// Adds one new row. Its stock is logged as an opening movement (0 → stock).
export function addInventoryRow(row, info = { reason: 'New stock row' }) {
  inventoryRows = [row, ...inventoryRows];
  log(row, 0, Number(row.itemStock) || 0, info);
  saveRows();
  saveLedger();
}

// Bulk replace (Warehouse Inventory edits, Moving Order…). Stock differences per row id are
// logged with `info.reason`; rows that disappear are logged as going to 0, new rows as opening stock.
export function setInventoryRows(rows, info = {}) {
  const before = new Map(inventoryRows.map(r => [r.id, r]));
  const after = new Map(rows.map(r => [r.id, r]));
  rows.forEach(r => {
    const old = before.get(r.id);
    log(r, old ? Number(old.itemStock) || 0 : 0, Number(r.itemStock) || 0, old ? info : { ...info, reason: info.newRowReason || info.reason || 'New stock row' });
  });
  inventoryRows.forEach(r => {
    if (!after.has(r.id)) log(r, Number(r.itemStock) || 0, 0, { ...info, reason: info.deleteReason || 'Row deleted' });
  });
  inventoryRows = rows;
  saveRows();
  saveLedger();
}

// Changes one row's stock by `delta` (never below 0) and logs it. Returns the ledger entry.
export function applyStockMovement(rowId, delta, info) {
  const row = inventoryRows.find(r => r.id === rowId);
  if (!row) return null;
  const before = Number(row.itemStock) || 0;
  const after = Math.max(0, before + delta);
  inventoryRows = inventoryRows.map(r => r.id !== rowId ? r : withStock(r, after));
  const entry = log(row, before, after, info);
  saveRows();
  saveLedger();
  return entry;
}

// Adds `qty` of an item to a warehouse, opening the row if needed. Used for stock coming in
// (production, rental received). `template` supplies valuation etc. for a new row.
export function stockInto(itemName, warehouseName, qty, info, template = {}) {
  const row = inventoryRows.find(r => r.name === itemName && r.warehouseName === warehouseName);
  if (row) return applyStockMovement(row.id, qty, info);
  const fresh = {
    id: nextRowId(), name: itemName, warehouseStock: 0, warehouseName, itemStock: 0, stokMin: 0, stokUsed: 0,
    valuation: Number(template.valuation) || 0, totalValuation: 0, minStatus: 'Not Set',
    flag1: '', flag2: '', asile: '', rack: '', level: '', lantai: '', lorong: '', updatedAt: '-',
  };
  inventoryRows = [fresh, ...inventoryRows];
  return applyStockMovement(fresh.id, qty, info);
}

// Renames an item on every row (catalog rename). Not a stock change, so nothing is logged.
export function renameItemRows(oldName, newName) {
  inventoryRows = inventoryRows.map(r => r.name === oldName ? { ...r, name: newName } : r);
  saveRows();
}

// Sets the valuation of every row of an item (catalog Item Value change keeps them in line).
export function setItemValuation(itemName, value) {
  inventoryRows = inventoryRows.map(r => r.name !== itemName ? r
    : { ...r, valuation: value, totalValuation: value * (Number(r.itemStock) || 0) });
  saveRows();
}

// --- Ledger -----------------------------------------------------------------------

export function getStockMovements() {
  return stockMovements;
}

// --- Stock opname -----------------------------------------------------------------

export function getOpnameHistory() {
  return opnameHistory;
}

export function addOpnameHistory(entry) {
  const withId = { ...entry, id: nextHistoryId++ };
  opnameHistory = [withId, ...opnameHistory];
  saveOpname();
  return withId;
}

export function hasPendingOpname() {
  return opnameHistory.some(h => h.status === 'Pending');
}

export function resolveOpname(id, status, approvedBy) {
  const entry = opnameHistory.find(h => h.id === id);
  if (!entry) return;

  opnameHistory = opnameHistory.map(h =>
    h.id === id ? { ...h, status, resolvedAt: new Date().toString(), resolvedBy: approvedBy } : h
  );
  saveOpname();

  if (status === 'Approved') {
    const byRowId = new Map(entry.items.map(it => [it.rowId, it]));
    inventoryRows = inventoryRows.map(row => {
      const change = byRowId.get(row.id);
      if (!change) return row;
      log(row, Number(row.itemStock) || 0, change.after, { reason: 'Stock opname', by: approvedBy, note: `Opname #${id}` });
      return withStock(row, change.after);
    });
    saveRows();
    saveLedger();
  }
}
