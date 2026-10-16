import { initialVendors } from '../data/vendors';

// Vendors are managed in Master Data → Vendor (production, /vendor-detail?id=) and
// Master Data → Loan (rental vendors we borrow from, /loan-vendor-detail?id=).
//
// Fields: { id, name, origin, kinds, description, phone, address }
//   origin — 'Internal' | 'External'. Production requests filter vendors by this.
//   kinds  — ['production'] and/or ['loan']: which CMS lists it (Vendor menu = production,
//            Loan menu = loan) and which pickers offer it (Request Production / Borrow Item).
//            Records saved before `kinds` existed get both, so nothing disappears.
// Older records used `contact` (now `phone`) and a free-text `type` (now folded into
// `description`); normalize() backfills both on read so old localStorage still works.
const KEY = 'emi_vendors';

export const VENDOR_ORIGINS = ['Internal', 'External'];
export const VENDOR_KINDS = ['production', 'loan'];
export const VENDOR_KIND_LABELS = { production: 'Production', loan: 'Loan' };

function normalize(v) {
  const internal = v.type === 'Internal Team' || v.contact === 'internal';
  return {
    id: v.id,
    name: v.name,
    origin: v.origin === 'Internal' || v.origin === 'External' ? v.origin : (internal ? 'Internal' : 'External'),
    description: v.description ?? v.type ?? '',
    phone: v.phone ?? (v.contact && v.contact !== 'internal' ? v.contact : ''),
    address: v.address ?? '',
    kinds: Array.isArray(v.kinds) && v.kinds.length ? v.kinds : [...VENDOR_KINDS],
  };
}

// One-time cleanup of data saved before 2026-10-16: drop the 4 seed vendors that were only
// Item Loan borrowers (people we lent to), matched by seed id + name, so they don't show up
// as rental vendors with 0 loans.
const LEGACY_BORROWERS = { 1: 'Ari Setiawan', 2: 'Studio Foto Kilau', 3: 'Divisi Marketing', 4: 'Katering Bu Yuni' };
const isLegacyBorrower = v => LEGACY_BORROWERS[v.id] === v.name;

export function getVendors() {
  try {
    const stored = JSON.parse(localStorage.getItem(KEY));
    if (Array.isArray(stored)) return stored.filter(v => !isLegacyBorrower(v)).map(normalize);
  } catch {
    // fall through to seed
  }
  return initialVendors.map(normalize);
}

// Vendors listed in one CMS ('production' or 'loan').
export function getVendorsOfKind(kind) {
  return getVendors().filter(v => v.kinds.includes(kind));
}

export function getVendor(id) {
  return getVendors().find(v => v.id === Number(id)) || null;
}

function save(vendors) {
  localStorage.setItem(KEY, JSON.stringify(vendors));
}

export function addVendor({ name, origin = 'External', kinds = ['production'], description = '', phone = '', address = '' }) {
  const current = getVendors();
  const nextId = Math.max(0, ...current.map(v => v.id)) + 1;
  const entry = { id: nextId, name, origin, kinds, description, phone, address };
  save([...current, entry]);
  return entry;
}

export function updateVendor(id, changes) {
  save(getVendors().map(v => v.id === id ? { ...v, ...changes } : v));
}

export function deleteVendor(id) {
  save(getVendors().filter(v => v.id !== id));
}
