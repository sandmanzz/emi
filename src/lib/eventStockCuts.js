import { getInventoryRows, applyStockMovement } from './stockOpnameStore';

// Cutting Stock / Stock Return — real stock movements (2026-11-12, owner: "jika sudah enable maka ketika masuk
// ke fase itu stok akan dianggap sudah berkurang dan di reservasi untuk event tersebut").
//
// Crossing a Cutting Stock stage deducts every warehouse line of the event from its warehouse row
// (ledger reason "Event cut", note "Reserved for <event>"). Crossing a Stock Return stage puts the same
// quantity back, minus units written off as broken (ledger reason "Event return").
// Which rows were cut is kept per event so a reload never cuts twice:
//   emi_event_stock_cuts = { [eventKey]: { [lineId]: { rowId, warehouse, qty, cutAt, returnedQty?, returnedAt? } } }
// Only lines that come from our stock count: warehouseItem true and not rented / outsourced.
const KEY = 'emi_event_stock_cuts';

function readAll() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}
function writeAll(all) {
  try { localStorage.setItem(KEY, JSON.stringify(all)); } catch { /* storage full: movements are still in the ledger */ }
}

export function getEventStockCuts(eventKey) {
  return readAll()[eventKey] || {};
}

export const isStockLine = it => it.warehouseItem !== false && !it.fromLoan && !it.fromOutsource;

// The row a line is taken from: same item in the line's warehouse, else the row with the most stock.
export function rowForLine(line, rows = getInventoryRows()) {
  const same = rows.filter(r => r.name === line.name);
  return same.find(r => r.warehouseName === line.warehouse) || same.sort((a, b) => (b.itemStock || 0) - (a.itemStock || 0))[0] || null;
}

// Preview for the confirm popup: per line which row, how much is available, and any shortfall.
export function previewCut(lines) {
  const rows = getInventoryRows();
  const left = new Map(rows.map(r => [r.id, Number(r.itemStock) || 0]));
  return lines.map(line => {
    const row = rowForLine(line, rows);
    if (!row) return { line, row: null, available: 0, cut: 0, short: line.qty };
    const available = left.get(row.id);
    const cut = Math.min(available, line.qty);
    left.set(row.id, available - cut);
    return { line, row, available, cut, short: line.qty - cut };
  });
}

// Deducts the lines from stock and remembers it. Returns { lines: n, qty, short }.
export function cutStock(eventKey, lines, { stage, by }) {
  const all = readAll();
  const cuts = all[eventKey] || {};
  let qty = 0; let short = 0; let n = 0;
  for (const p of previewCut(lines.filter(l => !cuts[l.id]))) {
    short += p.short;
    if (!p.row || p.cut <= 0) continue;
    applyStockMovement(p.row.id, -p.cut, { reason: 'Event cut', eventName: eventKey, stage, by, note: `Reserved for ${eventKey}` });
    cuts[p.line.id] = { rowId: p.row.id, warehouse: p.row.warehouseName, qty: p.cut, cutAt: new Date().toISOString() };
    qty += p.cut; n += 1;
  }
  all[eventKey] = cuts;
  writeAll(all);
  return { lines: n, qty, short };
}

// Returns what was cut, minus broken units written off on that line. Returns { lines, qty, lost }.
export function returnStock(eventKey, lines, { stage, by }) {
  const all = readAll();
  const cuts = all[eventKey] || {};
  let qty = 0; let lost = 0; let n = 0;
  for (const line of lines) {
    const c = cuts[line.id];
    if (!c || c.returnedAt) continue;
    const back = Math.max(0, c.qty - (line.brokenWrittenOff || 0));
    lost += c.qty - back;
    if (back > 0) applyStockMovement(c.rowId, back, { reason: 'Event return', eventName: eventKey, stage, by, note: `Back from ${eventKey}` });
    cuts[line.id] = { ...c, returnedQty: back, returnedAt: new Date().toISOString() };
    qty += back; n += 1;
  }
  all[eventKey] = cuts;
  writeAll(all);
  return { lines: n, qty, lost };
}

// Partial / full return at "For Return" (2026-11-12): `parts` = [{ line, qty }]. Adds qty back to the row the
// line was cut from and accumulates returnedQty; the cut is closed (returnedAt) once nothing is outstanding.
// Lines that were never cut (no Cutting Stock stage) move no stock — their stock never left.
export function returnStockParts(eventKey, parts, { stage, by }) {
  const all = readAll();
  const cuts = all[eventKey] || {};
  let qty = 0;
  for (const { line, qty: q } of parts) {
    const c = cuts[line.id];
    if (!c || c.returnedAt || q <= 0) continue;
    const outstanding = Math.max(0, c.qty - (line.brokenWrittenOff || 0) - (c.returnedQty || 0));
    const back = Math.min(q, outstanding);
    if (back <= 0) continue;
    applyStockMovement(c.rowId, back, { reason: 'Event return', eventName: eventKey, stage, by, note: `Back from ${eventKey}` });
    const returnedQty = (c.returnedQty || 0) + back;
    cuts[line.id] = { ...c, returnedQty, ...(returnedQty >= c.qty - (line.brokenWrittenOff || 0) ? { returnedAt: new Date().toISOString() } : {}) };
    qty += back;
  }
  all[eventKey] = cuts;
  writeAll(all);
  return { qty };
}

// Stock reserved by events right now: Map(rowId → qty). Used by Warehouse Inventory.
export function reservedByRow() {
  const m = new Map();
  for (const cuts of Object.values(readAll())) {
    for (const c of Object.values(cuts)) if (!c.returnedAt) m.set(c.rowId, (m.get(c.rowId) || 0) + c.qty - (c.returnedQty || 0));
  }
  return m;
}
