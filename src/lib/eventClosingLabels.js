// Shared display info for the eventClosing.js status flag, so the Event listing
// page and Event Detail page can't drift apart the way EventPage.jsx's separate
// hardcoded status-dropdown list already has (see docs/context.md open question
// #10) — both pages import this instead of hardcoding labels/badge classes twice.
export const CLOSING_LABELS = {
  // 'upcoming' and 'on-going' are both derived sub-states of the single stored
  // 'on-going' value (see eventClosing.js's isOnGoingByItems) — an event with no
  // items yet shows as Upcoming; once it has items, it shows as On Going.
  'upcoming':           { label: 'Upcoming',             badgeClass: 'badge-gray' },
  'on-going':           { label: 'On Going',              badgeClass: 'badge-green' },
  'ready-to-close':     { label: 'Ready to Close',       badgeClass: 'badge-orange' },
  'checking-inventory': { label: 'Checking Inventory',   badgeClass: 'badge-blue' },
  'returned-completed': { label: 'Returned & Completed', badgeClass: 'badge-green' },
  'transferred':        { label: 'Transferred',          badgeClass: 'badge-purple' },
};
