import { initialVendors } from '../data/vendors';

const KEY = 'emi_vendors';

export function getVendors() {
  try {
    const stored = JSON.parse(localStorage.getItem(KEY));
    if (stored) return stored;
  } catch {
    // fall through to seed
  }
  return initialVendors;
}

export function addVendor({ name, contact, type }) {
  const current = getVendors();
  const nextId = Math.max(0, ...current.map(v => v.id)) + 1;
  const entry = { id: nextId, name, contact, type };
  localStorage.setItem(KEY, JSON.stringify([...current, entry]));
  return entry;
}
