import { eiData } from '../data/eventInventory';
import { getEventStageNames } from './eventStatuses';

const KEY = 'emi_event_progress'; // { [eventName]: statusName }

// Seeds one demo event (src/data/events.js id 91) to sit at whatever the
// *last* Event Status stage currently is, so "Ready to Close" has a row to
// show without the user manually walking a stepper first — resolved live via
// getEventStageNames() rather than a hardcoded stage name, since that list is
// itself user-editable. Only applies when nothing's been explicitly saved yet.
const SEED_AT_LAST_STAGE = ['2026-10-18 | ROOFTOP SUNSET MIXER'];

function readAll() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
}

export function getEventProgress(eventName) {
  const saved = readAll()[eventName];
  if (saved) return saved;
  if (SEED_AT_LAST_STAGE.includes(eventName)) {
    const stages = getEventStageNames();
    return stages[stages.length - 1] || null;
  }
  return null;
}

export function saveEventProgress(eventName, statusName) {
  const all = readAll();
  all[eventName] = statusName;
  localStorage.setItem(KEY, JSON.stringify(all));
}

// Furthest stage an event has been advanced to with the Next button. Stages up to
// here stay selectable in the status dropdown (so the user can go back and forth);
// stages after it are view-only until Next is clicked again.
const FURTHEST_KEY = 'emi_event_furthest_stage'; // { [eventName]: statusName }

export function getEventFurthestStage(eventName) {
  try {
    return (JSON.parse(localStorage.getItem(FURTHEST_KEY)) || {})[eventName] || null;
  } catch {
    return null;
  }
}

export function saveEventFurthestStage(eventName, statusName) {
  let all = {};
  try { all = JSON.parse(localStorage.getItem(FURTHEST_KEY)) || {}; } catch { /* reset */ }
  all[eventName] = statusName;
  localStorage.setItem(FURTHEST_KEY, JSON.stringify(all));
}

// The event's current Event Status stage, resolved the same way Event Detail's
// stepper does: saved progress → the event's mock status from Event Inventory →
// the first configured stage. Shared so the Event listing's Edit modal and Event
// Detail can't disagree about which stage an event is at.
export function resolveEventStage(eventName) {
  const stages = getEventStageNames();
  const saved = getEventProgress(eventName);
  if (saved && stages.includes(saved)) return saved;
  const mockRow = eiData.find(r => r.event === eventName);
  if (mockRow && stages.includes(mockRow.status)) return mockRow.status;
  return stages[0] || '';
}
