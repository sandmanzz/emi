import { initialActivityLogs } from '../data/activityLogs';

const KEY = 'emi_activity_logs';

function pad(n) {
  return String(n).padStart(2, '0');
}

function nowTimestamp() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function getActivityLogs() {
  try {
    const stored = JSON.parse(localStorage.getItem(KEY));
    if (stored) return stored;
  } catch {
    // fall through to seed
  }
  return initialActivityLogs;
}

export function addActivityLog({ userName, action, module, description }) {
  const current = getActivityLogs();
  const nextId = Math.max(0, ...current.map(l => l.id)) + 1;
  const entry = { id: nextId, timestamp: nowTimestamp(), userName, action, module, description };
  localStorage.setItem(KEY, JSON.stringify([entry, ...current]));
  return entry;
}
