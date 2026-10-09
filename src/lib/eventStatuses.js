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

// Missing field (statuses saved before this flag existed) counts as false.
export function isCuttingStockStage(statusName) {
  const record = getEventStatuses().find(s => s.status === statusName);
  return record?.cuttingStock === true;
}

// While an event sits at a stage with this flag, Event Detail offers "Request Production".
export function isProductionStage(statusName) {
  const record = getEventStatuses().find(s => s.status === statusName);
  return record?.productionItem === true;
}

// While the event is at this stage, clicking Next first asks whether items need an
// ownership change. Missing field counts as false.
export function isCheckOwnershipStage(statusName) {
  const record = getEventStatuses().find(s => s.status === statusName);
  return record?.checkOwnership === true;
}

// Moving into this stage returns cut items to warehouse stock; after it, the event
// can't take new items.
export function isStockReturnStage(statusName) {
  const record = getEventStatuses().find(s => s.status === statusName);
  return record?.stockReturn === true;
}
