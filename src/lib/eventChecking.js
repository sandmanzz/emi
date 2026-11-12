// Closing checks per event line (2026-11-12, owner: after Finished the event goes to "Ready for Checking";
// every item gets a Checked button and a Note; when all are checked the main action becomes "For Return";
// items not fully collected yet make the event "Partial Return").
// Stored so a reload keeps the work (event lines themselves are page state):
//   emi_event_checking = { [eventKey]: { [lineId]: { checked, checkedBy, checkedAt, note, returnedQty, returnedAt, transferredTo } } }
// returnedQty = pieces back in the warehouse so far (cumulative over partial returns).
const KEY = 'emi_event_checking';

// Demo (2026-11-12): Harvest Festival Bazaar is half checked; Summit Afterparty is a Partial Return with 3 items (lines 2, 9, 17: 4 pcs back each)
// still out. Used only while nothing is stored for that event.
function seedChecking() {
  const harvest = {};
  for (let id = 1; id <= 80; id++) harvest[id] = { checked: true, checkedBy: 'Agus', checkedAt: '2026-06-15T09:00:00' };
  harvest[3].note = '2 pieces scratched, still usable';
  harvest[17] = { ...harvest[17], note: 'Box arrived wet — dry before storing' };
  harvest[95] = { checked: false, note: 'Still at the venue, pick up Monday' };
  const summit = {};
  for (let id = 1; id <= 64; id++) summit[id] = { checked: true, checkedBy: 'Lina', checkedAt: '2026-06-02T08:00:00', returnedQty: 1, returnedAt: '2026-06-02T10:00:00' };
  for (const id of [2, 9, 17]) summit[id] = { checked: true, checkedBy: 'Lina', checkedAt: '2026-06-02T08:00:00', returnedQty: 4, note: 'Rest still at Raffles rooftop, pickup scheduled' };
  return { '2026-06-10 | HARVEST FESTIVAL BAZAAR': harvest, '2026-05-30 | SUMMIT AFTERPARTY': summit };
}

function readAll() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}

export function getEventChecking(eventKey) {
  const all = readAll();
  return eventKey in all ? all[eventKey] : (seedChecking()[eventKey] || {});
}

export function updateLineChecking(eventKey, lineId, patch) {
  const all = readAll();
  const ev = eventKey in all ? all[eventKey] : { ...(seedChecking()[eventKey] || {}) };
  ev[lineId] = { ...(ev[lineId] || {}), ...patch };
  all[eventKey] = ev;
  try { localStorage.setItem(KEY, JSON.stringify(all)); } catch { /* storage full */ }
  return ev[lineId];
}
