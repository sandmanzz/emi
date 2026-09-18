import { eiData } from '../data/eventInventory';
import { getEventStageNames } from './eventStatuses';

const KEY = 'emi_event_progress'; // { [eventName]: statusName }

function readAll() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
}

export function getEventProgress(eventName) {
  return readAll()[eventName] || null;
}

export function saveEventProgress(eventName, statusName) {
  const all = readAll();
  all[eventName] = statusName;
  localStorage.setItem(KEY, JSON.stringify(all));
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
