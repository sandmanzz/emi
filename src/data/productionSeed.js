// Demo production history, so Production → Produced Items, Vendor detail and
// each event's Production tab have something to show without walking the whole
// Request Production flow first.
//
// SEED_EVENT_PRODUCTION is keyed by the same "<date> | <EVENT NAME>" key Event Detail
// uses (see eventKeyFor in EventDetailPage.jsx). Records have the same shape as a
// request made in Event Detail → Request Production (type 'production').
// Seeded "Done" records point at items that already exist in the catalog, so marking
// them done never needs to create a "Needs setup" draft item.
//
// SEED_MANUAL_PRODUCTION are productions recorded straight from Warehouse Inventory →
// Production (restocking, not tied to an event): eventKey is null.

const ev = (date, name) => `${date} | ${name.toUpperCase()}`;

function req(id, f) {
  return { id, type: 'production', subArea: '', replacesItemId: null, note: '', requestedBy: 'Dewi Anjani', ...f };
}

export const SEED_EVENT_PRODUCTION = {
  [ev('2025-11-20', 'Wedding Bali Cliff')]: [
    req(2, { name: 'Bridal Backdrop Floral Wall', qty: 1, area: 'BRIDAL BACKDROP', warehouse: 'Warehouse Bali 70', vendorOrigin: 'Internal', vendorId: 9, vendorName: 'Tim Florist Internal', status: 'Done', stage: 'On preparing items', requestedAt: '2025-11-02', finishedAt: '2025-11-15', note: 'Cliff-side ceremony backdrop, white and blush palette.' }),
    req(1, { name: 'Hanging Rattan 1', qty: 6, area: 'PHOTOBOOTH', warehouse: 'Warehouse Bali 70', vendorOrigin: 'External', vendorId: 13, vendorName: 'Rattan Craft Cirebon', status: 'Done', stage: 'On preparing items', requestedAt: '2025-10-28', finishedAt: '2025-11-12' }),
  ],
  [ev('2026-01-18', 'Gala Dinner BCA')]: [
    req(3, { name: 'Marquee Letter Light "LOVE"', qty: 1, area: 'ENTRANCE', warehouse: 'Warehouse Bali 70', vendorOrigin: 'Internal', vendorId: 12, vendorName: 'Tim Lighting Internal', status: 'Done', stage: 'Finish setup', requestedAt: '2026-01-02', finishedAt: '2026-01-12' }),
    req(2, { name: 'Acrylic Welcome Sign Board', qty: 2, area: 'ENTRANCE', warehouse: 'Warehouse Bali 70', vendorOrigin: 'External', vendorId: 11, vendorName: 'Akrilik Prima', status: 'Done', stage: 'Finish setup', requestedAt: '2026-01-03', finishedAt: '2026-01-10', note: 'Gold mirror acrylic with client logo.' }),
    req(1, { name: 'Mirror Table Number Stand', qty: 30, area: 'GUEST TABLE', warehouse: 'Warehouse Bali 66', vendorOrigin: 'External', vendorId: 11, vendorName: 'Akrilik Prima', status: 'Done', stage: 'On preparing items', requestedAt: '2025-12-29', finishedAt: '2026-01-08' }),
  ],
  [ev('2026-02-14', 'Grand Wedding Surabaya')]: [
    req(3, { name: 'Iron Flower Arch 60cm', qty: 4, area: 'CEREMONY', warehouse: 'Warehouse Bali 70', vendorOrigin: 'External', vendorId: 7, vendorName: 'Bengkel Las Maju Jaya', status: 'Done', stage: 'On preparing items', requestedAt: '2026-01-20', finishedAt: '2026-02-04', note: 'Replaces 4 arches reported broken after Gala Dinner BCA.', reason: 'broken' }),
    req(2, { name: 'Bridal Table Linen Set', qty: 3, area: 'BRIDAL TABLE', warehouse: 'Warehouse Cililitan', vendorOrigin: 'External', vendorId: 10, vendorName: 'CV Kain Nusantara', status: 'Done', stage: 'On preparing items', requestedAt: '2026-01-22', finishedAt: '2026-02-06' }),
    req(1, { name: 'Display Table Riser Set', qty: 4, area: 'DISPLAY TABLE', warehouse: 'Warehouse Bali 70', vendorOrigin: 'Internal', vendorId: 8, vendorName: 'Workshop Kayu Internal', status: 'Done', stage: 'Created by admin up', requestedAt: '2026-01-18', finishedAt: '2026-02-01' }),
  ],
  [ev('2026-04-03', 'Wedding B')]: [
    req(2, { name: 'White Candle 30cm', qty: 120, area: 'GUEST TABLE', warehouse: 'Warehouse Surabaya', vendorOrigin: 'External', vendorId: 14, vendorName: 'Lilin Aroma Jogja', status: 'Done', stage: 'On preparing items', requestedAt: '2026-03-10', finishedAt: '2026-03-24' }),
    req(1, { name: 'Greenery Wall Panel', qty: 2, area: 'FLORIST', warehouse: 'Warehouse Cililitan', vendorOrigin: 'Internal', vendorId: 9, vendorName: 'Tim Florist Internal', status: 'Done', stage: 'Created by admin up', requestedAt: '2026-03-08', finishedAt: '2026-03-20' }),
  ],
  [ev('2026-04-18', 'Beachside Anniversary')]: [
    req(2, { name: 'Hanging Rattan 2', qty: 12, area: 'RECEPTION', warehouse: 'Warehouse Bali 70', vendorOrigin: 'External', vendorId: 13, vendorName: 'Rattan Craft Cirebon', status: 'Done', stage: 'On preparing items', requestedAt: '2026-03-25', finishedAt: '2026-04-10' }),
    req(1, { name: 'Organza Chair Sash', qty: 80, area: 'RECEPTION', warehouse: 'Warehouse Surabaya', vendorOrigin: 'External', vendorId: 10, vendorName: 'CV Kain Nusantara', status: 'Done', stage: 'On preparing items', requestedAt: '2026-03-22', finishedAt: '2026-04-06' }),
  ],
  [ev('2026-05-08', 'Wedding Spring Garden')]: [
    req(3, { name: 'Iron Flower Arch 60cm', qty: 2, area: 'ENTRANCE', warehouse: 'Warehouse Bali 70', vendorOrigin: 'External', vendorId: 7, vendorName: 'Bengkel Las Maju Jaya', status: 'In Production', stage: 'On preparing items', requestedAt: '2026-04-02', note: 'Two arches reported broken on Wedding B.', reason: 'broken' }),
    req(2, { name: 'Standing Flower Tall', qty: 4, area: 'ENTRANCE', warehouse: 'Warehouse Bali 66', vendorOrigin: 'Internal', vendorId: 9, vendorName: 'Tim Florist Internal', status: 'In Production', stage: 'On preparing items', requestedAt: '2026-04-03' }),
    req(1, { name: 'Fairy Light Curtain 3x3m', qty: 2, area: 'CHAMPAGNE WALL', warehouse: 'Warehouse Bali 70', vendorOrigin: 'Internal', vendorId: 12, vendorName: 'Tim Lighting Internal', status: 'Done', stage: 'Created by admin up', requestedAt: '2026-03-28', finishedAt: '2026-04-07' }),
  ],
  [ev('2026-05-28', 'Corporate Summit 2026')]: [
    req(2, { name: 'Acrylic Welcome Sign Board', qty: 3, area: 'ENTRANCE', warehouse: 'Warehouse Bali 70', vendorOrigin: 'External', vendorId: 11, vendorName: 'Akrilik Prima', status: 'Requested', stage: 'Created by admin up', requestedAt: '2026-04-08', note: 'Clear acrylic, white print, summit logo.' }),
    req(1, { name: 'Display Table Riser Set', qty: 6, area: 'DISPLAY TABLE', warehouse: 'Warehouse Bali 70', vendorOrigin: 'Internal', vendorId: 8, vendorName: 'Workshop Kayu Internal', status: 'In Production', stage: 'Created by admin up', requestedAt: '2026-04-05' }),
  ],
  [ev('2026-06-10', 'Harvest Festival Bazaar')]: [
    req(2, { name: 'Wooden Bench Rustic', qty: 6, area: 'LOUNGE', warehouse: 'Warehouse Cililitan', vendorOrigin: 'Internal', vendorId: 8, vendorName: 'Workshop Kayu Internal', status: 'Done', stage: 'On preparing items', requestedAt: '2026-05-12', finishedAt: '2026-05-30' }),
    req(1, { name: 'Paper Lantern String 5m', qty: 20, area: 'ENTRANCE', warehouse: 'Warehouse Surabaya', vendorOrigin: 'External', vendorId: 6, vendorName: 'Toko Dekorasi Rina', status: 'Done', stage: 'On preparing items', requestedAt: '2026-05-10', finishedAt: '2026-05-25' }),
  ],
  [ev('2026-07-10', 'Wedding Bali Season')]: [
    req(3, { name: 'Bridal Backdrop Floral Wall', qty: 1, area: 'BRIDAL BACKDROP', warehouse: 'Warehouse Bali 70', vendorOrigin: 'Internal', vendorId: 9, vendorName: 'Tim Florist Internal', status: 'Requested', stage: 'Created by admin up', requestedAt: '2026-04-07' }),
    req(2, { name: 'Rattan Peacock Chair', qty: 2, area: 'BRIDAL ROOM', warehouse: 'Warehouse Bali 70', vendorOrigin: 'External', vendorId: 13, vendorName: 'Rattan Craft Cirebon', status: 'Requested', stage: 'Created by admin up', requestedAt: '2026-04-06' }),
    req(1, { name: 'Chiffon White 4-6×1,2m', qty: 10, area: 'CEREMONY', warehouse: 'Warehouse Bali 66', vendorOrigin: 'External', vendorId: 10, vendorName: 'CV Kain Nusantara', status: 'In Production', stage: 'Created by admin up', requestedAt: '2026-04-04' }),
  ],
  [ev('2026-09-03', 'Grand Gala Night')]: [
    req(1, { name: 'Gold Candelabra 5-Arm', qty: 8, area: 'GUEST TABLE', warehouse: 'Warehouse C9', vendorOrigin: 'External', vendorId: 7, vendorName: 'Bengkel Las Maju Jaya', status: 'Requested', stage: 'Created by admin up', requestedAt: '2026-04-09', note: 'Out of stock — current 0 in Warehouse C9.' }),
  ],
};

export const SEED_MANUAL_PRODUCTION = [
  { id: 6, name: 'Tealight Holder 15cm', qty: 100, warehouse: 'Warehouse Bali 70', vendorOrigin: 'External', vendorId: 14, vendorName: 'Lilin Aroma Jogja', status: 'In Production', requestedBy: 'Dewi Anjani', requestedAt: '2026-04-06', note: 'Restock before wedding season.' },
  { id: 5, name: 'Gold Ribbon 5m', qty: 40, warehouse: 'Warehouse Bali 66', vendorOrigin: 'External', vendorId: 6, vendorName: 'Toko Dekorasi Rina', status: 'Requested', requestedBy: 'Novi', requestedAt: '2026-04-08', note: 'Stock is 0.' },
  { id: 4, name: 'Hanging Rattan 3', qty: 8, warehouse: 'Warehouse Bali 70', vendorOrigin: 'External', vendorId: 13, vendorName: 'Rattan Craft Cirebon', status: 'Done', requestedBy: 'Anto', requestedAt: '2026-02-20', finishedAt: '2026-03-12' },
  { id: 3, name: 'Velvet Drape Panel', qty: 10, warehouse: 'Warehouse Cililitan', vendorOrigin: 'External', vendorId: 10, vendorName: 'CV Kain Nusantara', status: 'Done', requestedBy: 'Darmian', requestedAt: '2026-02-02', finishedAt: '2026-02-18' },
  { id: 2, name: 'Faux Floral Wall Panel', qty: 2, warehouse: 'Warehouse Cililitan', vendorOrigin: 'Internal', vendorId: 9, vendorName: 'Tim Florist Internal', status: 'Done', requestedBy: 'Dewi Anjani', requestedAt: '2026-01-10', finishedAt: '2026-01-24' },
  { id: 1, name: 'Round Coffee Table', qty: 4, warehouse: 'Warehouse Bali 66', vendorOrigin: 'Internal', vendorId: 8, vendorName: 'Workshop Kayu Internal', status: 'Done', requestedBy: 'Anto', requestedAt: '2025-12-01', finishedAt: '2025-12-19' },
];
