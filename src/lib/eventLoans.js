import { SEED_EVENT_LOANS, SEED_GENERAL_RENTALS, SEED_EVENT_OUTSOURCE } from '../data/eventLoanSeed';
import { eventLabel } from './productionRequests';

// LOAN in EMI always means: WE borrow / rent items from a loan vendor (Master Data → Loan).
// Two kinds of record, same lifecycle and fields:
//  - event rental   — Event Detail → Borrow Item; the item joins the event when received.
//  - general rental — Loan → Borrowed Items → New Rental; kept in one of our warehouses
//                     (`warehouse`, `purpose`), not tied to an event.
// Rented items are not our assets: they never change warehouse stock or asset value.
//
// "Borrow Item": an event borrows (rents) items from a loan vendor (Master Data → Loan).
// Only offered on Event Detail while the event is at an Event Status stage with
// `loanItem: true`. Stored per event in localStorage; an event with nothing stored falls
// back to its demo seed (data/eventLoanSeed.js), and the first save replaces it.
//
// OUTSOURCE (2026-11-02, owner: "outsource sama seperti rent juga konsepnya") reuses this whole
// module with kind = 'outsource': its own stores, vendors (Master Data → Outsource), Event Status
// flag `outsourceItem` and Event Detail "Outsource Item". Every function takes `kind`
// ('loan' = Rent, the default, or 'outsource'). Only the words shown to users differ (KIND_TEXT).
const STORES = {
  loan:      { eventKey: 'emi_event_loans',     generalKey: 'emi_rentals',           seedEvent: SEED_EVENT_LOANS,     seedGeneral: SEED_GENERAL_RENTALS },
  outsource: { eventKey: 'emi_event_outsource', generalKey: 'emi_outsource_general', seedEvent: SEED_EVENT_OUTSOURCE, seedGeneral: [] },
};
const store = kind => STORES[kind] || STORES.loan;

// UI words per kind. `received` / `done` = how the stored 'Borrowed' / 'Returned' statuses are shown.
export const KIND_TEXT = {
  loan: {
    name: 'Rent', action: 'Rent Item', tab: 'Rented', itemsTab: 'Rented Items', vendor: 'Rent vendor', menu: '/rent',
    detail: '/rent-vendor-detail', received: 'Rented', done: 'Returned', cost: 'Rental cost', record: 'rental',
    from: 'Rent from', until: 'Return by', doneVerb: 'returned to the vendor', markDone: 'Mark Returned', badge: 'Rent',
  },
  outsource: {
    name: 'Outsource', action: 'Outsource Item', tab: 'Outsourced', itemsTab: 'Outsourced Items', vendor: 'Outsource vendor', menu: '/outsource',
    detail: '/outsource-vendor-detail', received: 'Received', done: 'Completed', cost: 'Outsource cost', record: 'outsource order',
    from: 'Needed from', until: 'Until', doneVerb: 'completed', markDone: 'Mark Completed', badge: 'Outsource',
  },
};
export const kindText = kind => KIND_TEXT[kind] || KIND_TEXT.loan;
export function statusLabels(kind = 'loan') {
  const t = kindText(kind);
  return { Requested: 'Requested', Borrowed: t.received, Returned: t.done, Overdue: 'Overdue' };
}

// Requested → Borrowed (received; the item is added to the event) → Returned (sent back).
export const LOAN_STATUSES = ['Requested', 'Borrowed', 'Returned'];

// What users see. Internally the received state is still 'Borrowed' (stored data); the UI says Rented.
export const LOAN_LABEL = { Requested: 'Requested', Borrowed: 'Rented', Returned: 'Returned', Overdue: 'Overdue' };

export const LOAN_BADGE = {
  'Requested': 'badge-orange',
  'Borrowed':  'badge-blue',
  'Returned':  'badge-green',
  'Overdue':   'badge-red',
};

function readAll(kind) {
  try {
    return JSON.parse(localStorage.getItem(store(kind).eventKey)) || {};
  } catch {
    return {};
  }
}

export function getEventLoans(eventKey, kind = 'loan') {
  const all = readAll(kind);
  return eventKey in all ? all[eventKey] : (store(kind).seedEvent[eventKey] || []);
}

export function saveEventLoans(eventKey, loans, kind = 'loan') {
  const all = readAll(kind);
  all[eventKey] = loans;
  localStorage.setItem(store(kind).eventKey, JSON.stringify(all));
}

// Borrowed but past its due date (compared with the app's mock today, passed in).
export function loanDisplayStatus(loan, today) {
  if (loan.status === 'Borrowed' && loan.dueDate && new Date(loan.dueDate) < today) return 'Overdue';
  return loan.status;
}

export function loanTotalCost(loan) {
  return Number(loan.qty || 0) * Number(loan.rentalCost || 0);
}

// --- General (non-event) rentals ------------------------------------------------------
export function getGeneralRentals(kind = 'loan') {
  try {
    const v = JSON.parse(localStorage.getItem(store(kind).generalKey));
    if (Array.isArray(v)) return v;
  } catch { /* fall through to seed */ }
  return store(kind).seedGeneral;
}

export function saveGeneralRentals(list, kind = 'loan') {
  localStorage.setItem(store(kind).generalKey, JSON.stringify(list));
}

// Every rental in one list (Loan → Borrowed Items, loan vendor detail, dashboard, search),
// newest first. `uid` is unique; general rentals have eventKey null and a `warehouse`.
export function getAllEventLoans(kind = 'loan') {
  const stored = readAll(kind);
  const keys = new Set([...Object.keys(store(kind).seedEvent), ...Object.keys(stored)]);
  const fromEvents = [...keys]
    .flatMap(eventKey => getEventLoans(eventKey, kind).map(l => ({ ...l, uid: `${eventKey}:${l.id}`, source: 'event', eventKey, eventName: eventLabel(eventKey) })));
  const general = getGeneralRentals(kind).map(l => ({ ...l, uid: `g:${l.id}`, source: 'general', eventKey: null, eventName: '' }));
  return [...fromEvents, ...general].sort((a, b) => String(b.requestedAt).localeCompare(String(a.requestedAt)));
}
export const getAllRentals = getAllEventLoans;
