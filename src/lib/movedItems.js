const KEY = 'emi_moved_items';

// Queues an item moved out of one event's "Ready for Return" phase into
// another still-ongoing event, at a chosen stage. Each event's item list is
// page-local state (no shared item store across events), so the receiving
// EventDetailPage reads its queue on mount, merges it in, then clears it —
// the same "localStorage as the join" pattern as eventClosing/eventProgress.

function readAll() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
}

export function getIncomingItems(eventName) {
  return readAll()[eventName] || [];
}

export function queueMovedItem(eventName, item) {
  const all = readAll();
  all[eventName] = [...(all[eventName] || []), item];
  localStorage.setItem(KEY, JSON.stringify(all));
}

export function clearIncomingItems(eventName) {
  const all = readAll();
  delete all[eventName];
  localStorage.setItem(KEY, JSON.stringify(all));
}
