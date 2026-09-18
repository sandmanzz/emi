const KEY = 'emi_event_items_added';

// Tracks whether an event has ever had an item explicitly added to it via the
// "+ Add Item" / cart checkout flow on Event Detail — this is the live signal
// behind the Upcoming -> On Going transition (see eventClosing.js's
// isOnGoingByItems). Separate from the event's static seed `itemCount`, which
// covers demo events that already "have items" without ever visiting Event
// Detail.

function readAll() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
}

export function markItemsAdded(eventName) {
  const all = readAll();
  if (all[eventName]) return;
  all[eventName] = true;
  localStorage.setItem(KEY, JSON.stringify(all));
}

export function hasItemsAdded(eventName) {
  return !!readAll()[eventName];
}
