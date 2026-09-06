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
