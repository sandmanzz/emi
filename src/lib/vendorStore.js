import { initialVendors } from '../data/vendors';

// Vendors are managed in the Vendor CMS page (Master Data → Vendor, detail at
// /vendor-detail?id=) and picked in Item Loan (borrowers) and in Event Detail →
// Request Production / Warehouse Inventory → Production (who makes an item).
//
// Fields: { id, name, origin, description, phone, address }
//   origin — 'Internal' | 'External'. Production requests filter vendors by this.
// Older records used `contact` (now `phone`) and a free-text `type` (now folded into
// `description`); normalize() backfills both on read so old localStorage still works.
const KEY = 'emi_vendors';

export const VENDOR_ORIGINS = ['Internal', 'External'];

function normalize(v) {
  const internal = v.type === 'Internal Team' || v.contact === 'internal';
  return {
    id: v.id,
    name: v.name,
    origin: v.origin === 'Internal' || v.origin === 'External' ? v.origin : (internal ? 'Internal' : 'External'),
    description: v.description ?? v.type ?? '',
    phone: v.phone ?? (v.contact && v.contact !== 'internal' ? v.contact : ''),
    address: v.address ?? '',
  };
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

export function getVendor(id) {
  return getVendors().find(v => v.id === Number(id)) || null;
}

function save(vendors) {
  localStorage.setItem(KEY, JSON.stringify(vendors));
}

export function addVendor({ name, origin = 'External', description = '', phone = '', address = '' }) {
  const current = getVendors();
  const nextId = Math.max(0, ...current.map(v => v.id)) + 1;
  const entry = { id: nextId, name, origin, description, phone, address };
  save([...current, entry]);
  return entry;
}

export function updateVendor(id, changes) {
  save(getVendors().map(v => v.id === id ? { ...v, ...changes } : v));
}

export function deleteVendor(id) {
  save(getVendors().filter(v => v.id !== id));
}
