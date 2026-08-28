import { wiData } from '../data/warehouseInventory';
import { initialOpnameHistory } from '../data/stockOpnameHistory';

// Warehouse Inventory and Stock Opname are separate pages/routes. This app has no
// Context/Redux, so the mutable inventory rows + opname history live here as a
// small in-memory module store instead of page-local useState, so both pages read
// and write the same live data. Resets on a full page reload — consistent with the
// rest of the app's no-backend model.

let inventoryRows = [...wiData];
let opnameHistory = [...initialOpnameHistory];
let nextHistoryId = Math.max(0, ...opnameHistory.map(h => h.id)) + 1;

export function getInventoryRows() {
  return inventoryRows;
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
