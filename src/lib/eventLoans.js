import { SEED_EVENT_LOANS } from '../data/eventLoanSeed';
import { eventLabel } from './productionRequests';

// "Borrow Item": an event borrows (rents) items from a loan vendor (Master Data → Loan).
// Only offered on Event Detail while the event is at an Event Status stage with
// `loanItem: true`. Stored per event in localStorage; an event with nothing stored falls
// back to its demo seed (data/eventLoanSeed.js), and the first save replaces it.
// Not to be confused with Item Loan (lib/itemLoanStore.js), where *we lend our* items out.
const KEY = 'emi_event_loans'; // { [eventKey]: Loan[] }

// Requested → Borrowed (received; the item is added to the event) → Returned (sent back).
export const LOAN_STATUSES = ['Requested', 'Borrowed', 'Returned'];

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

// Every event's loans in one list (Loan → Borrowed Items, loan vendor detail), newest first.
export function getAllEventLoans() {
  const stored = readAll();
  const keys = new Set([...Object.keys(SEED_EVENT_LOANS), ...Object.keys(stored)]);
  return [...keys]
    .flatMap(eventKey => getEventLoans(eventKey).map(l => ({ ...l, uid: `${eventKey}:${l.id}`, eventKey, eventName: eventLabel(eventKey) })))
    .sort((a, b) => String(b.requestedAt).localeCompare(String(a.requestedAt)));
}
