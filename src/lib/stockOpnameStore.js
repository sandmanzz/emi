import { wiData } from '../data/warehouseInventory';
import { initialOpnameHistory } from '../data/stockOpnameHistory';
import { getProducedRows } from './producedItems';

// Warehouse Inventory and Stock Opname are separate pages/routes. This app has no
// Context/Redux, so the mutable inventory rows + opname history live here as a
// small in-memory module store instead of page-local useState, so both pages read
// and write the same live data. Resets on a full page reload — consistent with the
// rest of the app's no-backend model.

// Produced items (finished production requests) are persisted separately and merged in on load.
let inventoryRows = [...getProducedRows(), ...wiData];
let opnameHistory = [...initialOpnameHistory];
let nextHistoryId = Math.max(0, ...opnameHistory.map(h => h.id)) + 1;

export function getInventoryRows() {
  return inventoryRows;
}

// Adds one new warehouse row (used when a production request is finished).
export function addInventoryRow(row) {
  inventoryRows = [row, ...inventoryRows];
}

export function setInventoryRows(rows) {
  inventoryRows = rows;
}

export function getOpnameHistory() {
  return opnameHistory;
}

export function addOpnameHistory(entry) {
  const withId = { ...entry, id: nextHistoryId++ };
  opnameHistory = [withId, ...opnameHistory];
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

  if (status === 'Approved') {
    const byRowId = new Map(entry.items.map(it => [it.rowId, it]));
    inventoryRows = inventoryRows.map(row => {
      const change = byRowId.get(row.id);
      if (!change) return row;
      return {
        ...row,
        itemStock: change.after,
        warehouseStock: change.after,
        totalValuation: row.valuation * change.after,
        minStatus: !row.stokMin ? 'Not Set' : change.after <= row.stokMin ? 'Critical' : change.after <= row.stokMin * 1.5 ? 'Warning' : 'Safe',
      };
    });
  }
}

// --- Stock history (ledger) ---------------------------------------------------
// Every stock change made outside Warehouse Inventory itself (e.g. an event's
// Convert request being applied) is recorded here, so it can be tracked in the
// Warehouse Inventory "Stock History" tab. In-memory like the rows above.
let stockMovements = [];
let nextMovementId = 1;

export function getStockMovements() {
  return stockMovements;
}

function fmtDate(d) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

// Changes one warehouse-inventory row's stock by `delta` (never below 0) and logs it.
// `info` = { reason, eventName, stage, note, by }. Returns the log entry, or null if
// the row doesn't exist.
export function applyStockMovement(rowId, delta, info) {
  const row = inventoryRows.find(r => r.id === rowId);
  if (!row) return null;
  const before = row.itemStock;
  const after = Math.max(0, before + delta);
  inventoryRows = inventoryRows.map(r => r.id !== rowId ? r : {
    ...r,
    itemStock: after,
    warehouseStock: after,
    totalValuation: r.valuation * after,
    minStatus: !r.stokMin ? 'Not Set' : after <= r.stokMin ? 'Critical' : after <= r.stokMin * 1.5 ? 'Warning' : 'Safe',
    updatedAt: fmtDate(new Date()),
  });
  const entry = {
    id: nextMovementId++, at: new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
    itemName: row.name, warehouse: row.warehouseName, change: after - before, before, after, ...info,
  };
  stockMovements = [entry, ...stockMovements];
  return entry;
}
