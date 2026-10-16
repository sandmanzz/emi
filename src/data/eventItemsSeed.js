// Per-event demo items for the small events in data/events.js (ids 95-99), so some
// events show a short, realistic item list instead of the 26 generic demo items
// (`initialItems` in EventDetailPage.jsx) that every other event falls back to.
// Keyed by the same "<date> | <EVENT NAME>" key Event Detail uses. Item names all exist in
// the Inventory catalog, so the item drawer shows Category / SKU / Warehouse.
// Each item's `stage` must be at or before the event's seeded stage (see SEED_STAGE in
// lib/eventProgress.js), otherwise the "All" tab hides it.

const ev = (date, name) => `${date} | ${name.toUpperCase()}`;

function item(id, f) {
  return {
    id, subArea: '', scanned: false, groupId: null, pic: '', checking: false, warehouseItem: true,
    scanIn: null, scanOut: null, note: '', checked: false, ownership: 'IHC', ...f,
  };
}

export const SEED_EVENT_ITEMS = {
  // 5 items, at "On preparing items"
  [ev('2026-04-22', 'Intimate Dinner Ubud')]: [
    item(1, { name: 'Round Banquet Table', area: 'GUEST TABLE', qty: 2, stage: 'Created by admin up', pic: 'Agus', warehouse: 'Warehouse Surabaya' }),
    item(2, { name: 'Gold Rim Dining Chair', area: 'GUEST TABLE', qty: 12, stage: 'Created by admin up', pic: 'Agus', warehouse: 'Warehouse Bali 66' }),
    item(3, { name: 'Peony Centerpiece Pink', area: 'GUEST TABLE', subArea: 'Centerpiece', qty: 2, stage: 'Created by admin up', pic: 'Dewi', warehouse: 'Warehouse Bali 70', note: 'Fresh water in the morning.' }),
    item(4, { name: 'Festoon Bulb String 20m', area: 'ENTRANCE', qty: 2, stage: 'On preparing items', pic: 'Hendra', warehouse: 'Warehouse Cililitan' }),
    item(5, { name: 'Linen Napkin Set', area: 'GUEST TABLE', qty: 12, stage: 'On preparing items', ownership: 'IHP', warehouse: 'Warehouse Bali 70' }),
  ],
  // 4 items, at "Created by admin up"
  [ev('2026-04-28', 'Baby Shower Mila')]: [
    item(1, { name: 'Balloon Arch Kit Pastel', area: 'ENTRANCE', qty: 1, stage: 'Created by admin up', pic: 'Novi', warehouse: 'Warehouse Surabaya' }),
    item(2, { name: 'White Latex Balloon', area: 'ENTRANCE', qty: 120, stage: 'Created by admin up', pic: 'Novi', warehouse: 'Warehouse Surabaya' }),
    item(3, { name: "Baby's Breath Bouquet", area: 'DISPLAY TABLE', subArea: 'Item Stands', qty: 10, stage: 'Created by admin up', ownership: 'IHP', warehouse: 'Warehouse Bali 66' }),
    item(4, { name: 'Display Table Riser Set', area: 'DISPLAY TABLE', subArea: 'Item Stands', qty: 2, stage: 'Created by admin up', warehouse: 'Warehouse Bali 70' }),
  ],
  // 8 items, at "Finish setup"
  [ev('2026-05-15', 'Engagement Rina & Bayu')]: [
    item(1, { name: 'Iron Flower Arch 60cm', area: 'CEREMONY', subArea: 'Arch', qty: 1, stage: 'Created by admin up', pic: 'Anto', warehouse: 'Warehouse Bali 70' }),
    item(2, { name: 'Artificial Rose Pink', area: 'CEREMONY', subArea: 'Arch', qty: 60, stage: 'Created by admin up', pic: 'Dewi', warehouse: 'Warehouse Bali 66' }),
    item(3, { name: 'Chiffon Drape Ivory 5m', area: 'CEREMONY', subArea: 'Altar Setup', qty: 4, stage: 'Created by admin up', pic: 'Anto', warehouse: 'Warehouse Bali 66' }),
    item(4, { name: 'White Tiffany Chair', area: 'GUEST TABLE', qty: 30, stage: 'On preparing items', pic: 'Darmian', warehouse: 'Warehouse Bali 66' }),
    item(5, { name: 'Organza Chair Sash', area: 'GUEST TABLE', qty: 30, stage: 'On preparing items', ownership: 'Outsource', warehouse: 'Warehouse Surabaya' }),
    item(6, { name: 'Acrylic Welcome Sign Board', area: 'ENTRANCE', qty: 1, stage: 'On preparing items', note: 'Names: Rina & Bayu, gold print.', warehouse: 'Warehouse Bali 70' }),
    item(7, { name: 'Tealight Holder 15cm', area: 'GUEST TABLE', qty: 24, stage: 'Finish setup', pic: 'Novi', warehouse: 'Warehouse Bali 70' }),
    item(8, { name: 'String Fairy Lights 10m', area: 'ENTRANCE', qty: 3, stage: 'Finish setup', pic: 'Hendra', warehouse: 'Warehouse Bali 70' }),
  ],
  // 3 items, at "Waiting scan in" (one already scanned)
  [ev('2026-04-14', 'Product Photoshoot Kilau')]: [
    item(1, { name: 'Backdrop Stand 2m', area: 'Area Hall', qty: 2, stage: 'Created by admin up', pic: 'Rian', scanned: true, checking: true, scanIn: 'Apr 9, 2026 08:20 AM', warehouse: 'Warehouse C9' }),
    item(2, { name: 'Spotlight Stand', area: 'Area Hall', qty: 2, stage: 'Created by admin up', pic: 'Rian', checking: true, warehouse: 'Warehouse C9' }),
    item(3, { name: 'Velvet Backdrop Curtain 4m', area: 'Area Hall', qty: 1, stage: 'On preparing items', ownership: 'IHP', warehouse: 'Warehouse Bali 66' }),
  ],
  // 6 items, at "Created by admin up"
  [ev('2026-06-18', 'Office Townhall Q2')]: [
    item(1, { name: 'PA Speaker System', area: 'Area Hall', qty: 2, stage: 'Created by admin up', pic: 'Hendra', warehouse: 'Warehouse Bali 66' }),
    item(2, { name: 'Wireless Handheld Microphone', area: 'Area Hall', qty: 3, stage: 'Created by admin up', pic: 'Hendra', warehouse: 'Warehouse C9', note: 'Currently out of stock — borrow if needed.' }),
    item(3, { name: 'Projector Screen 3x2m', area: 'Area Hall', qty: 1, stage: 'Created by admin up', warehouse: 'Warehouse Cililitan' }),
    item(4, { name: 'Glass Top Cocktail Table', area: 'COCKTAIL', qty: 6, stage: 'Created by admin up', warehouse: 'Warehouse Surabaya' }),
    item(5, { name: 'Extension Cable Reel 20m', area: 'LABOUR', qty: 4, stage: 'Created by admin up', ownership: 'Outsource', warehouse: 'Warehouse Bali 66' }),
    item(6, { name: 'Mini Camera Tripod', area: 'Area Hall', qty: 1, stage: 'Created by admin up', warehouse: 'Warehouse Cililitan' }),
  ],
};
