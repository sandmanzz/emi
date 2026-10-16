import { initialEvents } from '../data/events';
import { SEED_EVENT_ITEMS } from '../data/eventItemsSeed';
import { GENERIC_EVENT_ITEMS } from '../data/genericEventItems';
import { SUB_AREAS } from '../data/areas';
import { getCatalog } from './producedItems';
import { getEventStageNames } from './eventStatuses';
import { resolveEventStage } from './eventProgress';
import { getEventClosing } from './eventClosing';

// The item list an event starts with — one source for Event Detail and Event Report:
//   1. its own hand-written list (data/eventItemsSeed.js, small demo events), else
//   2. a generated list of exactly `itemCount` lines when the event is big (>= 30), so the
//      demo shows the real case of hundreds of items per event, else
//   3. the 26 generic demo items (data/genericEventItems.js).
// Generation is deterministic (seeded by event id): the same event always gets the same list.
// Item names come from the Inventory catalog, so Category / SKU / Warehouse / value resolve.
// (No backend: Event Detail edits still live in page state only.)

const GENERATE_FROM = 30;
const AREAS = ['CEREMONY', 'ENTRANCE', 'GUEST TABLE', 'LOUNGE', 'FLORIST', 'BRIDAL BACKDROP', 'BRIDAL TABLE',
  'BRIDAL ROOM', 'COCKTAIL', 'CHAMPAGNE WALL', 'DISPLAY TABLE', 'CAR DECOR', 'LABOUR', 'Area Hall'];
const PICS = ['Anto', 'Novi', 'Darmian', 'Dewi', 'Hendra', 'Agus', 'Lina', 'Siti', ''];
const QTY_RANGE = { Furniture: [2, 60], Floral: [4, 80], Lighting: [1, 12], Decoration: [2, 100], Fabric: [2, 40], Equipment: [1, 6] };

function keyFor(e) {
  return `${e.date} | ${(e.name || '').toUpperCase()}`;
}

// Small seeded PRNG (mulberry32) so lists are stable between visits.
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function fmtScan(date, hour) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} ${String(hour).padStart(2, '0')}:00 AM`;
}

function generate(event, key) {
  const rand = rng(event.id * 7919);
  const pick = list => list[Math.floor(rand() * list.length)];
  const catalog = getCatalog().filter(i => i.category);
  const stages = getEventStageNames();
  const stageIdx = Math.max(0, stages.indexOf(resolveEventStage(key)));
  const closing = getEventClosing(key);
  const done = event.type === 'past' || closing === 'returned-completed' || closing === 'transferred';
  const checking = closing === 'checking-inventory';
  const scanInIdx = stages.findIndex(s => /scan in/i.test(s));
  const scanOutIdx = stages.findIndex(s => /scan out/i.test(s));
  // How far along the event is, 0..1, drives how many items are checked / scanned.
  const pScanIn = done || checking ? 0.97 : scanInIdx >= 0 && stageIdx > scanInIdx ? 0.95 : stageIdx === scanInIdx ? 0.55 : 0;
  const pScanOut = done || checking ? 0.93 : scanOutIdx >= 0 && stageIdx > scanOutIdx ? 0.9 : stageIdx === scanOutIdx ? 0.45 : 0;
  const pChecking = done || checking ? 0.98 : Math.min(0.9, 0.15 + stageIdx * 0.18);

  const used = new Set(); // keep (item, area) pairs unique, as a real list would be
  return Array.from({ length: event.itemCount }, (_, i) => {
    let cat = pick(catalog);
    let area = pick(AREAS);
    for (let tries = 0; tries < 12 && used.has(`${cat.name}|${area}`); tries += 1) {
      cat = pick(catalog);
      area = pick(AREAS);
    }
    used.add(`${cat.name}|${area}`);
    const subs = SUB_AREAS[area] || [];
    const [lo, hi] = QTY_RANGE[cat.category] || [1, 20];
    const scanIn = rand() < pScanIn;
    const scanOut = scanIn && rand() < pScanOut;
    const r = rand();
    const ownership = r < 0.7 ? 'IHC' : r < 0.9 ? 'IHP' : 'Outsource';
    const broken = (scanIn && rand() < 0.04) ? 1 + Math.floor(rand() * 3) : 0;
    const qty = lo + Math.floor(rand() * (hi - lo + 1));
    return {
      id: i + 1, name: cat.name, area, subArea: subs.length && rand() < 0.5 ? pick(subs) : '',
      stage: stages[Math.floor(Math.pow(rand(), 0.7) * (stageIdx + 1))] || stages[0],
      scanned: scanIn, groupId: null, qty: Math.max(qty, broken + 1), pic: pick(PICS),
      checking: scanIn || rand() < pChecking, warehouseItem: ownership !== 'Outsource', warehouse: cat.warehouse,
      scanIn: scanIn ? fmtScan(event.start || event.date, 7 + (i % 4)) : null,
      scanOut: scanOut ? fmtScan(event.finish || event.start || event.date, 9 + (i % 3)) : null,
      note: rand() < 0.05 ? 'Handle with care.' : '',
      checked: (done || checking) && rand() < (done ? 0.95 : 0.5),
      ownership,
      ...(broken ? { brokenQty: broken, brokenNote: 'Reported during the event.', brokenReportedBy: pick(PICS.filter(Boolean)), brokenReportedAt: event.finish || event.start } : {}),
    };
  });
}

const cache = new Map();

export function getEventSeedItems(eventKey) {
  if (SEED_EVENT_ITEMS[eventKey]) return SEED_EVENT_ITEMS[eventKey];
  const event = initialEvents.find(e => keyFor(e) === eventKey);
  if (!event || !(event.itemCount >= GENERATE_FROM)) return GENERIC_EVENT_ITEMS;
  if (!cache.has(eventKey)) cache.set(eventKey, generate(event, eventKey));
  return cache.get(eventKey);
}

export { keyFor as eventKeyOf };
