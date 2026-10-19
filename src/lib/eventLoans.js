import { SEED_EVENT_LOANS, SEED_GENERAL_RENTALS } from '../data/eventLoanSeed';
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
const KEY = 'emi_event_loans'; // { [eventKey]: Loan[] }

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

function readAll() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
}

export function getEventLoans(eventKey) {
  const all = readAll();
  return eventKey in all ? all[eventKey] : (SEED_EVENT_LOANS[eventKey] || []);
}

export function saveEventLoans(eventKey, loans) {
  const all = readAll();
  all[eventKey] = loans;
  localStorage.setItem(KEY, JSON.stringify(all));
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
const GENERAL_KEY = 'emi_rentals';

export function getGeneralRentals() {
  try {
    const v = JSON.parse(localStorage.getItem(GENERAL_KEY));
    if (Array.isArray(v)) return v;
  } catch { /* fall through to seed */ }
  return SEED_GENERAL_RENTALS;
}

export function saveGeneralRentals(list) {
  localStorage.setItem(GENERAL_KEY, JSON.stringify(list));
}

// Every rental in one list (Loan → Borrowed Items, loan vendor detail, dashboard, search),
// newest first. `uid` is unique; general rentals have eventKey null and a `warehouse`.
export function getAllEventLoans() {
  const stored = readAll();
  const keys = new Set([...Object.keys(SEED_EVENT_LOANS), ...Object.keys(stored)]);
  const fromEvents = [...keys]
    .flatMap(eventKey => getEventLoans(eventKey).map(l => ({ ...l, uid: `${eventKey}:${l.id}`, source: 'event', eventKey, eventName: eventLabel(eventKey) })));
  const general = getGeneralRentals().map(l => ({ ...l, uid: `g:${l.id}`, source: 'general', eventKey: null, eventName: '' }));
  return [...fromEvents, ...general].sort((a, b) => String(b.requestedAt).localeCompare(String(a.requestedAt)));
}
export const getAllRentals = getAllEventLoans;
