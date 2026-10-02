// Production requests: asks for a new item to be produced for an event (not
// pulled from inventory). Only offered while the event is at an Event Status
// stage with `productionItem: true`. Stored per event in localStorage.
const KEY = 'emi_production_requests'; // { [eventName]: Request[] }

// Request lifecycle, in order. Marking one "Done" adds the item to the event.
export const PRODUCTION_STATUSES = ['Requested', 'In Production', 'Done'];

export const PRODUCTION_BADGE = {
  'Requested':     'badge-orange',
  'In Production': 'badge-blue',
  'Done':          'badge-green',
};

function readAll() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
}

export function getProductionRequests(eventName) {
  return readAll()[eventName] || [];
}

export function saveProductionRequests(eventName, requests) {
  const all = readAll();
  all[eventName] = requests;
  localStorage.setItem(KEY, JSON.stringify(all));
}
