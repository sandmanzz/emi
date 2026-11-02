import { initialVendors } from '../data/vendors';

// Vendors are managed in Master Data → Production (/vendor, /vendor-detail?id=),
// Master Data → Rent (vendors we rent from, /rent, /rent-vendor-detail?id=) and
// Master Data → Outsource (vendors we hand work to, /outsource, /outsource-vendor-detail?id=).
//
// Fields: { id, name, origin, kinds, description, phone, address }
//   origin — 'Internal' | 'External'. Production requests filter vendors by this.
//   kinds  — 'production' | 'loan' (= Rent) | 'outsource': which CMS lists it and which picker
//            offers it (Request Production / Rent Item / Outsource Item).
//            Records saved before `kinds` existed get both, so nothing disappears.
// Older records used `contact` (now `phone`) and a free-text `type` (now folded into
// `description`); normalize() backfills both on read so old localStorage still works.
const KEY = 'emi_vendors';

export const VENDOR_ORIGINS = ['Internal', 'External'];
export const VENDOR_KINDS = ['production', 'loan', 'outsource'];
export const VENDOR_KIND_LABELS = { production: 'Production', loan: 'Rent', outsource: 'Outsource' };

function normalize(v) {
  const internal = v.type === 'Internal Team' || v.contact === 'internal';
  return {
    id: v.id,
    name: v.name,
    origin: v.origin === 'Internal' || v.origin === 'External' ? v.origin : (internal ? 'Internal' : 'External'),
    description: v.description ?? v.type ?? '',
    phone: v.phone ?? (v.contact && v.contact !== 'internal' ? v.contact : ''),
    address: v.address ?? '',
    kinds: Array.isArray(v.kinds) && v.kinds.length ? v.kinds : ['production', 'loan'],
  };
}

// One-time cleanup of data saved before 2026-10-16: drop the 4 seed vendors that were only
// Item Loan borrowers (people we lent to), matched by seed id + name, so they don't show up
// as rental vendors with 0 loans.
const LEGACY_BORROWERS = { 1: 'Ari Setiawan', 2: 'Studio Foto Kilau', 3: 'Divisi Marketing', 4: 'Katering Bu Yuni' };
const isLegacyBorrower = v => LEGACY_BORROWERS[v.id] === v.name;

// Outsource seed vendors (ids 101+) were added 2026-11-02. Vendor lists saved before that get
// them appended once (flag key), so the Outsource menu isn't empty; deleting them later sticks.
const OUTSOURCE_SEEDED_KEY = 'emi_vendors_outsource_seeded';
function withOutsourceSeed(stored) {
  if (localStorage.getItem(OUTSOURCE_SEEDED_KEY)) return stored;
  const ids = new Set(stored.map(v => v.id));
  const next = [...stored, ...initialVendors.filter(v => v.kinds.includes('outsource') && !ids.has(v.id))];
  localStorage.setItem(KEY, JSON.stringify(next));
  localStorage.setItem(OUTSOURCE_SEEDED_KEY, '1');
  return next;
}

export function getVendors() {
  try {
    const stored = JSON.parse(localStorage.getItem(KEY));
    if (Array.isArray(stored)) return withOutsourceSeed(stored).filter(v => !isLegacyBorrower(v)).map(normalize);
  } catch {
    // fall through to seed
  }
  return initialVendors.map(normalize);
}

// Vendors listed in one CMS ('production', 'loan' or 'outsource').
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
