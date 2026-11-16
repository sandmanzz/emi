import { getEventLoans, saveEventLoans, LOAN_STATUSES, kindText, statusLabels } from './eventLoans';
import { getProductionRequests, saveProductionRequests, PRODUCTION_STATUSES } from './productionRequests';
import { stockInProduced } from './producedItems';
import { queueMovedItem } from './movedItems';
import { getEventClosing } from './eventClosing';
import { resolveEventStage } from './eventProgress';
import { addActivityLog } from './activityLogStore';

// One set of actions for event-linked Rent / Outsource / Production records (2026-11-16, owner: "antara outsource,
// rent, production harus sync dengan data yang ada di main navbar"). The main menus (Rent → Rented Items,
// Outsource → Outsourced Items, Production → Produced Items) can now move EVENT records forward too, writing to
// the same per-event stores Event Detail reads, so both places always show the same status.
// When a record is received / done from a menu, the item is queued for the event (lib/movedItems.js) and appears on
// Event Detail the next time it is opened — same result as doing it on Event Detail.

const today = () => new Date().toLocaleDateString('en-CA');

// Actions are allowed only while the event is still on-going (from Ready for Checking on, nothing is added).
export function eventAcceptsChanges(eventKey) {
  return getEventClosing(eventKey) === 'on-going';
}

// Rent / Outsource: Requested → Borrowed (received; item joins the event) → Returned.
export function advanceEventRental(kind, rec, by) {
  const list = getEventLoans(rec.eventKey, kind);
  const cur = list.find(l => l.id === rec.id);
  if (!cur) return null;
  const next = LOAN_STATUSES[LOAN_STATUSES.indexOf(cur.status) + 1];
  if (!next) return null;
  if (next === 'Borrowed') {
    if (!eventAcceptsChanges(rec.eventKey)) return null;
    queueMovedItem(rec.eventKey, {
      name: cur.itemName, area: cur.area, subArea: cur.subArea || '', stage: resolveEventStage(rec.eventKey), qty: cur.qty,
      ownership: 'Outsource', note: cur.note || '', warehouseItem: false, loanVendor: cur.vendorName,
      ...(kind === 'outsource' ? { fromOutsource: true } : { fromLoan: true }),
    });
  }
  saveEventLoans(rec.eventKey, list.map(l => l.id !== cur.id ? l : {
    ...l, status: next, ...(next === 'Borrowed' ? { borrowedAt: today() } : { returnedAt: today() }),
  }), kind);
  addActivityLog({ userName: by, action: 'Update', module: kindText(kind).name, description: `${kindText(kind).name} "${cur.itemName}" for ${rec.eventName || rec.eventKey} → ${statusLabels(kind)[next]} (from the ${kindText(kind).name} menu)` });
  return next;
}

export function cancelEventRental(kind, rec, by) {
  const list = getEventLoans(rec.eventKey, kind);
  saveEventLoans(rec.eventKey, list.filter(l => !(l.id === rec.id && l.status === 'Requested')), kind);
  addActivityLog({ userName: by, action: 'Delete', module: kindText(kind).name, description: `Cancelled ${kindText(kind).record} "${rec.itemName}" for ${rec.eventName || rec.eventKey}` });
}

// Production: Requested → In Production → Done (stock goes into the deploy warehouse; item joins the event as IHP).
export function advanceEventProduction(rec, by) {
  const list = getProductionRequests(rec.eventKey);
  const cur = list.find(r => r.id === rec.id);
  if (!cur || cur.type === 'convert') return null;
  const next = PRODUCTION_STATUSES[PRODUCTION_STATUSES.indexOf(cur.status) + 1];
  if (!next) return null;
  if (next === 'Done') {
    stockInProduced({ name: cur.name, qty: cur.qty, warehouseName: cur.warehouse, vendorName: cur.vendorName, producedFor: rec.eventKey, by });
    if (eventAcceptsChanges(rec.eventKey)) {
      queueMovedItem(rec.eventKey, {
        name: cur.name, area: cur.area, subArea: cur.subArea || '', stage: resolveEventStage(rec.eventKey), qty: cur.qty,
        ownership: 'IHP', note: cur.note || '', fromProduction: true, warehouse: cur.warehouse,
      });
    }
  }
  saveProductionRequests(rec.eventKey, list.map(r => r.id !== cur.id ? r : {
    ...r, status: next, ...(next === 'Done' ? { finishedAt: today() } : {}),
  }));
  addActivityLog({ userName: by, action: 'Update', module: 'Production', description: `Production "${cur.name}" for ${rec.eventName || rec.eventKey} → ${next} (from the Production menu)` });
  return next;
}
