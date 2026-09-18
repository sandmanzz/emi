import { getEventProgress } from './eventProgress';
import { getEventStageNames } from './eventStatuses';
import { hasItemsAdded } from './eventItemsFlag';

const KEY = 'emi_event_closing';

// A single event-level status flag, 5 values:
//  'on-going'           — default. Items exist on the event; it hasn't reached
//                          closing yet. Not persisted — the absence of a saved
//                          value (or an old/unrecognized one) means this.
//  'checking-inventory' — set once "Ready to Close" is pressed on Event Detail
//                          (only available once the event's own Event Status
//                          stepper is at its last stage — see isReadyToClose()).
//                          Cross-checking items and the Return & Transfer flow
//                          both happen while in this status.
//  'returned-completed' — terminal. Every item got resolved (Return or Transfer)
//                          and at least one was actually Returned.
//  'transferred'         — terminal. Every item got resolved and *none* were
//                          Returned — they all moved out to other events.
//
// "Ready to Close" itself is deliberately NOT one of the stored values here —
// it's a derived display state (on-going + at the last Event Status stage),
// computed by isReadyToClose() below, since it's automatic rather than something
// a user explicitly sets.
//
// Replaces the 4-value model from Rounds 12-14 (null/'ready-for-check'/
// 'ready-for-return'/'returned'); getEventClosing() migrates old stored values
// on read so existing demo localStorage doesn't end up in a dead state.

function readAll() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
}

export function getEventClosing(eventName) {
  const raw = readAll()[eventName];
  if (raw === 'ready-for-check' || raw === 'ready-for-return') return 'checking-inventory';
  if (raw === 'returned') return 'returned-completed';
  if (raw === 'checking-inventory' || raw === 'returned-completed' || raw === 'transferred') return raw;
  return 'on-going';
}

export function setEventClosing(eventName, status) {
  const all = readAll();
  all[eventName] = status;
  localStorage.setItem(KEY, JSON.stringify(all));
}

// "Ready to Close" — on-going, and the event's own Event Status stepper (tracked
// separately in eventProgress.js) is sitting at the last configured stage. If the
// event has never been opened yet (no saved progress), it's treated as not ready —
// this only becomes meaningful once someone has actually visited Event Detail.
export function isReadyToClose(eventName) {
  if (getEventClosing(eventName) !== 'on-going') return false;
  const savedStage = getEventProgress(eventName);
  if (!savedStage) return false;
  const stages = getEventStageNames();
  return stages.length > 0 && savedStage === stages[stages.length - 1];
}

// "Upcoming" and "On Going" are both represented by the single stored 'on-going'
// value — which of the two an event actually shows as is derived, not stored:
// an event counts as On Going once it has items, either from its seed
// `itemCount` (demo events that already "have items" without ever being opened)
// or from actually using "+ Add Item" on Event Detail (see eventItemsFlag.js).
// Everything else "on-going" but with no items yet is Upcoming.
export function isOnGoingByItems(eventName, itemCount) {
  return Number(itemCount) > 0 || hasItemsAdded(eventName);
}
