import { initialStatuses } from '../data/eventStatuses';

const KEY = 'emi_event_statuses';

export function getEventStatuses() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // fall through to default
  }
  return [...initialStatuses];
}

export function saveEventStatuses(statuses) {
  localStorage.setItem(KEY, JSON.stringify(statuses));
}

export function resetEventStatuses() {
  localStorage.removeItem(KEY);
}

// Ordered stage names for the Event Detail stepper — however many rows exist here
// is however many steps the stepper shows.
export function getEventStageNames() {
  return [...getEventStatuses()].sort((a, b) => a.order - b.order).map(s => s.status);
}

export function isScanStage(statusName) {
  const statuses = getEventStatuses();
  const record = statuses.find(s => s.status === statusName);
  return record?.scan === 'Scan';
}
