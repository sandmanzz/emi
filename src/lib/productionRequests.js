import { SEED_EVENT_PRODUCTION, SEED_MANUAL_PRODUCTION } from '../data/productionSeed';
import { initialEvents } from '../data/events';

// Production requests: asks for a new item to be produced for an event (not
// pulled from inventory). Only offered while the event is at an Event Status
// stage with `productionItem: true`. Stored per event in localStorage.
// An event with nothing stored yet falls back to its demo seed (data/productionSeed.js);
// the first save for that event replaces the seed for good.
const KEY = 'emi_production_requests'; // { [eventName]: Request[] }

// Productions recorded straight from Warehouse Inventory → Production, not tied to
// an event (e.g. restocking). Same lifecycle; stored as one list.
const LOG_KEY = 'emi_production_log';

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
  const all = readAll();
  return eventName in all ? all[eventName] : (SEED_EVENT_PRODUCTION[eventName] || []);
}

export function saveProductionRequests(eventName, requests) {
  const all = readAll();
  all[eventName] = requests;
  localStorage.setItem(KEY, JSON.stringify(all));
}

// --- Manual (non-event) production records ---------------------------------------

export function getManualProductions() {
  try {
    const stored = JSON.parse(localStorage.getItem(LOG_KEY));
    if (Array.isArray(stored)) return stored;
  } catch {
    // fall through to seed
  }
  return SEED_MANUAL_PRODUCTION;
}

export function saveManualProductions(list) {
  localStorage.setItem(LOG_KEY, JSON.stringify(list));
}

// --- All productions, across every event + manual records -------------------------
// Read-only view used by Warehouse Inventory → Production, Vendor detail and
// Inventory detail. Convert requests are left out: they swap existing stock, they
// don't produce anything.

const eventByKey = new Map(initialEvents.map(e => [`${e.date} | ${(e.name || '').toUpperCase()}`, e]));

// Display name for an event key. Events created in the UI aren't in the seed, so fall
// back to the name part of the key.
export function eventLabel(eventKey) {
  if (!eventKey) return '';
  return eventByKey.get(eventKey)?.name || eventKey.split(' | ').slice(1).join(' | ');
}

export function getAllProductions() {
  const stored = readAll();
  const keys = new Set([...Object.keys(SEED_EVENT_PRODUCTION), ...Object.keys(stored)]);
  const fromEvents = [...keys].flatMap(eventKey =>
    getProductionRequests(eventKey)
      .filter(r => r.type !== 'convert')
      .map(r => ({ ...r, uid: `e:${eventKey}:${r.id}`, source: 'event', eventKey, eventName: eventLabel(eventKey) }))
  );
  const manual = getManualProductions().map(r => ({ ...r, uid: `m:${r.id}`, source: 'manual', eventKey: null, eventName: '' }));
  return [...fromEvents, ...manual].sort((a, b) => String(b.requestedAt).localeCompare(String(a.requestedAt)));
}
