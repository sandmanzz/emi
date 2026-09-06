import { initialItemLoans } from '../data/itemLoans';

// Item Loan's Listing and Detail pages are separate routes that both need to see
// the same loan orders (creating one on Listing, then opening it on Detail to
// process a return, must reflect back on Listing's status column) — same
// in-memory module-store pattern as stockOpnameStore.js. Resets on a full page
// reload, like the rest of this app's mutable state.
let loans = [...initialItemLoans];

export function getLoans() {
  return loans;
}

export function setLoans(next) {
  loans = next;
}
