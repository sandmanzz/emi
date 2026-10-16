import { initialEvents } from '../data/events';
import { getEventSeedItems, eventKeyOf } from './eventItems';
import { getEventClosing } from './eventClosing';
import { getCatalog } from './producedItems';

// Item clashes between events (Event Calendar, Event Report).
//
// An event BOOKS its items for its whole window: from the earliest of `date` (load-in /
// preparation) and `start`, to the latest of `finish` / `start` / `date`. Two events whose
// windows overlap and that both use the same catalog item "clash" on the overlapping days.
// - shared:   the item is booked by ≥ 2 events on that day, and their combined qty still fits
//             in our total stock → a planning heads-up.
// - shortage: combined qty > total stock (Σ Warehouse Inventory rows) → we can't serve both.
// Only items we own count: Outsource / rented items (`fromLoan`) and names that aren't in the
// catalog come from outside, so they can't clash on our stock. Events with no items
// (itemCount 0) and Transferred events (their items moved out) are ignored.

const DAY = 86400000;

export function isoDay(d) {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}
function parse(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function bookingWindow(e) {
  const days = [e.date, e.start, e.finish].filter(Boolean).sort();
  return { from: days[0], to: days[days.length - 1] };
}

let demandCache = null;
// Per event: Map(item name → qty) of the items it books from our stock.
function eventDemand() {
  if (demandCache) return demandCache;
  const catalogNames = new Set(getCatalog().map(i => i.name));
  demandCache = initialEvents
    .filter(e => (e.itemCount || 0) > 0)
    .map(e => ({ ...e, key: eventKeyOf(e), ...bookingWindow(e) }))
    .filter(e => getEventClosing(e.key) !== 'transferred')
    .map(e => {
      const demand = new Map();
      for (const it of getEventSeedItems(e.key)) {
        if (it.ownership === 'Outsource' || it.fromLoan || !catalogNames.has(it.name)) continue;
        demand.set(it.name, (demand.get(it.name) || 0) + Number(it.qty || 0));
      }
      return { key: e.key, name: e.name, from: e.from, to: e.to, location: e.location, demand };
    });
  return demandCache;
}

// Events (with their booking window) that touch [from, to] (ISO dates, inclusive).
export function eventsInRange(from, to) {
  return eventDemand().filter(e => e.from <= to && e.to >= from);
}

// Clashes in [from, to]:
//   byDay: Map(iso → { events: [event…], clashes: [{ item, entries:[{key,name,qty}], demand, stock, shortage }] })
//   list:  clashes merged into ranges where the same events book the same item on consecutive days,
//          sorted shortage first, then by size of the overrun / demand.
export function computeClashes(from, to) {
  const stock = new Map(getCatalog().map(i => [i.name, i.totalStock]));
  const events = eventsInRange(from, to);
  const byDay = new Map();
  for (let t = parse(from).getTime(); t <= parse(to).getTime(); t += DAY) {
    const day = isoDay(t);
    const active = events.filter(e => e.from <= day && e.to >= day);
    const clashes = [];
    if (active.length > 1) {
      const users = new Map();
      for (const e of active) {
        for (const [item, qty] of e.demand) {
          if (!users.has(item)) users.set(item, []);
          users.get(item).push({ key: e.key, name: e.name, qty });
        }
      }
      for (const [item, entries] of users) {
        if (entries.length < 2) continue;
        const demand = entries.reduce((s, x) => s + x.qty, 0);
        const have = stock.get(item) || 0;
        clashes.push({ item, entries, demand, stock: have, shortage: demand > have });
      }
      clashes.sort((a, b) => (b.shortage - a.shortage) || ((b.demand - b.stock) - (a.demand - a.stock)));
    }
    byDay.set(day, { events: active, clashes });
  }

  // Merge consecutive days with the same item + same set of events into one range.
  const open = new Map();
  const list = [];
  for (const [day, { clashes }] of byDay) {
    const seen = new Set();
    for (const c of clashes) {
      const sig = `${c.item}|${c.entries.map(e => e.key).sort().join('|')}`;
      seen.add(sig);
      const cur = open.get(sig);
      if (cur && cur.lastDay === isoDay(parse(day).getTime() - DAY)) {
        cur.to = day;
        cur.lastDay = day;
      } else {
        const rec = { ...c, from: day, to: day, lastDay: day };
        open.set(sig, rec);
        list.push(rec);
      }
    }
    for (const sig of [...open.keys()]) if (!seen.has(sig)) open.delete(sig);
  }
  list.sort((a, b) => (b.shortage - a.shortage) || ((b.demand - b.stock) - (a.demand - a.stock)) || a.from.localeCompare(b.from));
  return { byDay, list: list.map(({ lastDay, ...rest }) => rest), events }; // eslint-disable-line no-unused-vars
}

// Clashes of one event with any other event, over its own booking window.
export function clashesForEvent(eventKey) {
  const e = eventDemand().find(x => x.key === eventKey);
  if (!e) return [];
  return computeClashes(e.from, e.to).list.filter(c => c.entries.some(x => x.key === eventKey));
}
