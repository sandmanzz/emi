import { initialVendors } from '../data/vendors';

// Vendors are managed in the Vendor CMS page (Master Data → Vendor) and picked in
// Item Loan (borrowers) and in Event Detail → Request Production (who makes an item).
//
// Fields: { id, name, contact, type, origin }
//   type   — free-text business category ("Decoration Rental", "Internal Team", …)
//   origin — 'Internal' | 'External'. Production requests filter vendors by this.
//            Records saved before `origin` existed are backfilled on read (see normalize).
const KEY = 'emi_vendors';

export const VENDOR_ORIGINS = ['Internal', 'External'];

function normalize(v) {
  if (v.origin === 'Internal' || v.origin === 'External') return v;
  const internal = v.type === 'Internal Team' || v.contact === 'internal';
  return { ...v, origin: internal ? 'Internal' : 'External' };
}

export function getVendors() {
  try {
    const stored = JSON.parse(localStorage.getItem(KEY));
    if (Array.isArray(stored)) return stored.map(normalize);
  } catch {
    // fall through to seed
  }
  return initialVendors.map(normalize);
}

function save(vendors) {
  localStorage.setItem(KEY, JSON.stringify(vendors));
}

export function addVendor({ name, contact, type, origin = 'External' }) {
  const current = getVendors();
  const nextId = Math.max(0, ...current.map(v => v.id)) + 1;
  const entry = { id: nextId, name, contact, type, origin };
  save([...current, entry]);
  return entry;
}

export function updateVendor(id, changes) {
  save(getVendors().map(v => v.id === id ? { ...v, ...changes } : v));
}

export function deleteVendor(id) {
  save(getVendors().filter(v => v.id !== id));
}
