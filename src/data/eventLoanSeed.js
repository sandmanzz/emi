// Demo "Borrow Item" records: items an event borrows (rents) from a loan vendor because
// we don't own enough of them. Keyed by the same "<date> | <EVENT NAME>" key Event Detail
// uses. Shown in Event Detail → Borrowed tab, Loan → Borrowed Items and each loan vendor's
// detail page. Status: Requested → Borrowed (received, item added to the event) → Returned.
// rentalCost = Rupiah per unit for the whole loan period.

const ev = (date, name) => `${date} | ${name.toUpperCase()}`;

function loan(id, f) {
  return { id, subArea: '', note: '', requestedBy: 'Dewi Anjani', borrowedAt: null, returnedAt: null, ...f };
}

export const SEED_EVENT_LOANS = {
  [ev('2025-11-20', 'Wedding Bali Cliff')]: [
    loan(2, { itemName: 'Tent 10x10m Clear Top', qty: 2, unit: 'unit', area: 'CEREMONY', vendorId: 19, vendorName: 'Tenda Megah Rental', startDate: '2025-11-21', dueDate: '2025-11-24', rentalCost: 3500000, status: 'Returned', stage: 'On preparing items', requestedAt: '2025-11-01', borrowedAt: '2025-11-21', returnedAt: '2025-11-24' }),
    loan(1, { itemName: 'Cross-Back Chair', qty: 80, unit: 'unit', area: 'GUEST TABLE', vendorId: 15, vendorName: 'Sewa Kursi Jaya Rental', startDate: '2025-11-21', dueDate: '2025-11-24', rentalCost: 25000, status: 'Returned', stage: 'On preparing items', requestedAt: '2025-11-01', borrowedAt: '2025-11-21', returnedAt: '2025-11-24' }),
  ],
  [ev('2026-01-18', 'Gala Dinner BCA')]: [
    loan(2, { itemName: 'Moving Head Spotlight', qty: 8, unit: 'unit', area: 'Area Hall', subArea: 'Main Stage', vendorId: 18, vendorName: 'Nusantara Sound & Light', startDate: '2026-01-19', dueDate: '2026-01-21', rentalCost: 450000, status: 'Returned', stage: 'Finish setup', requestedAt: '2026-01-05', borrowedAt: '2026-01-19', returnedAt: '2026-01-21', note: 'With 1 operator.' }),
    loan(1, { itemName: 'Champagne Glass Coupe', qty: 300, unit: 'pcs', area: 'CHAMPAGNE WALL', vendorId: 17, vendorName: 'Glassware Pro Rental', startDate: '2026-01-19', dueDate: '2026-01-21', rentalCost: 4000, status: 'Returned', stage: 'Finish setup', requestedAt: '2026-01-05', borrowedAt: '2026-01-19', returnedAt: '2026-01-22', note: '6 broken, charged Rp 35.000 each.' }),
  ],
  [ev('2026-02-14', 'Grand Wedding Surabaya')]: [
    loan(3, { itemName: 'Round Banquet Table', qty: 30, unit: 'unit', area: 'GUEST TABLE', vendorId: 16, vendorName: 'Bali Party Rental', startDate: '2026-02-13', dueDate: '2026-02-16', rentalCost: 75000, status: 'Returned', stage: 'On preparing items', requestedAt: '2026-01-25', borrowedAt: '2026-02-13', returnedAt: '2026-02-16' }),
    loan(2, { itemName: 'Tiffany Chair', qty: 250, unit: 'unit', area: 'GUEST TABLE', vendorId: 15, vendorName: 'Sewa Kursi Jaya Rental', startDate: '2026-02-13', dueDate: '2026-02-16', rentalCost: 20000, status: 'Returned', stage: 'On preparing items', requestedAt: '2026-01-25', borrowedAt: '2026-02-13', returnedAt: '2026-02-16' }),
    loan(1, { itemName: 'Wireless Handheld Microphone', qty: 4, unit: 'unit', area: 'Area Hall', vendorId: 18, vendorName: 'Nusantara Sound & Light', startDate: '2026-02-13', dueDate: '2026-02-15', rentalCost: 150000, status: 'Returned', stage: 'Finish setup', requestedAt: '2026-02-01', borrowedAt: '2026-02-13', returnedAt: '2026-02-15' }),
  ],
  [ev('2026-04-18', 'Beachside Anniversary')]: [
    loan(2, { itemName: 'Generator Silent 5000W', qty: 1, unit: 'unit', area: 'LABOUR', vendorId: 19, vendorName: 'Tenda Megah Rental', startDate: '2026-04-19', dueDate: '2026-04-22', rentalCost: 1200000, status: 'Borrowed', stage: 'On preparing items', requestedAt: '2026-04-01', borrowedAt: '2026-04-19' }),
    loan(1, { itemName: 'Lounge Sofa Set', qty: 3, unit: 'set', area: 'LOUNGE', vendorId: 16, vendorName: 'Bali Party Rental', startDate: '2026-04-19', dueDate: '2026-04-22', rentalCost: 850000, status: 'Borrowed', stage: 'On preparing items', requestedAt: '2026-04-01', borrowedAt: '2026-04-19' }),
  ],
  [ev('2026-05-08', 'Wedding Spring Garden')]: [
    loan(3, { itemName: 'Champagne Glass Coupe', qty: 200, unit: 'pcs', area: 'CHAMPAGNE WALL', vendorId: 17, vendorName: 'Glassware Pro Rental', startDate: '2026-05-09', dueDate: '2026-05-12', rentalCost: 4000, status: 'Requested', stage: 'On preparing items', requestedAt: '2026-04-06' }),
    loan(2, { itemName: 'Cross-Back Chair', qty: 120, unit: 'unit', area: 'GUEST TABLE', vendorId: 15, vendorName: 'Sewa Kursi Jaya Rental', startDate: '2026-05-09', dueDate: '2026-05-12', rentalCost: 25000, status: 'Requested', stage: 'On preparing items', requestedAt: '2026-04-06', note: 'Our own 120 are booked for Corporate Summit.' }),
    loan(1, { itemName: 'Tent 10x10m Clear Top', qty: 1, unit: 'unit', area: 'CEREMONY', vendorId: 19, vendorName: 'Tenda Megah Rental', startDate: '2026-05-09', dueDate: '2026-05-12', rentalCost: 3500000, status: 'Requested', stage: 'Created by admin up', requestedAt: '2026-04-02', note: 'Rain backup.' }),
  ],
  [ev('2026-05-28', 'Corporate Summit 2026')]: [
    loan(2, { itemName: 'PA Speaker System', qty: 2, unit: 'unit', area: 'Area Hall', subArea: 'Main Stage', vendorId: 18, vendorName: 'Nusantara Sound & Light', startDate: '2026-05-31', dueDate: '2026-06-04', rentalCost: 2500000, status: 'Requested', stage: 'Created by admin up', requestedAt: '2026-04-08' }),
    loan(1, { itemName: 'Glass Top Cocktail Table', qty: 15, unit: 'unit', area: 'COCKTAIL', vendorId: 16, vendorName: 'Bali Party Rental', startDate: '2026-05-31', dueDate: '2026-06-04', rentalCost: 120000, status: 'Requested', stage: 'Created by admin up', requestedAt: '2026-04-08' }),
  ],
  [ev('2026-06-10', 'Harvest Festival Bazaar')]: [
    loan(1, { itemName: 'Tent 10x10m Clear Top', qty: 4, unit: 'unit', area: 'ENTRANCE', vendorId: 19, vendorName: 'Tenda Megah Rental', startDate: '2026-06-11', dueDate: '2026-06-15', rentalCost: 3500000, status: 'Borrowed', stage: 'On preparing items', requestedAt: '2026-05-15', borrowedAt: '2026-06-11' }),
  ],
  [ev('2026-07-10', 'Wedding Bali Season')]: [
    loan(2, { itemName: 'Tiffany Chair', qty: 150, unit: 'unit', area: 'GUEST TABLE', vendorId: 15, vendorName: 'Sewa Kursi Jaya Rental', startDate: '2026-07-13', dueDate: '2026-07-16', rentalCost: 20000, status: 'Requested', stage: 'Created by admin up', requestedAt: '2026-04-07' }),
    loan(1, { itemName: 'Gold Charger Plate', qty: 200, unit: 'pcs', area: 'GUEST TABLE', vendorId: 5, vendorName: 'Wedding Organizer Mitra', startDate: '2026-07-13', dueDate: '2026-07-16', rentalCost: 8000, status: 'Requested', stage: 'Created by admin up', requestedAt: '2026-04-07' }),
  ],
  [ev('2026-04-22', 'Intimate Dinner Ubud')]: [
    loan(1, { itemName: 'Crystal Wine Glass Set', qty: 24, unit: 'pcs', area: 'GUEST TABLE', vendorId: 17, vendorName: 'Glassware Pro Rental', startDate: '2026-04-24', dueDate: '2026-04-26', rentalCost: 6000, status: 'Requested', stage: 'On preparing items', requestedAt: '2026-04-08' }),
  ],
  [ev('2026-05-15', 'Engagement Rina & Bayu')]: [
    loan(1, { itemName: 'Hanging Rattan 1', qty: 6, unit: 'pcs', area: 'CEREMONY', subArea: 'Altar Setup', vendorId: 6, vendorName: 'Toko Dekorasi Rina', startDate: '2026-05-16', dueDate: '2026-05-18', rentalCost: 60000, status: 'Requested', stage: 'Finish setup', requestedAt: '2026-04-09' }),
  ],
};

// Rentals NOT tied to an event (Loan → Borrowed Items → "New Rental"): items we rent and keep
// in one of our warehouses, e.g. a buffer before a busy season. They replace the old outbound
// "Item Loan" module (2026-10-16), whose direction was wrong — in EMI a loan always means
// WE borrow / rent from a vendor. Rented items are not ours, so they never change our stock.
export const SEED_GENERAL_RENTALS = [
  { id: 4, itemName: 'Champagne Glass Coupe', qty: 300, unit: 'pcs', warehouse: 'Warehouse C9', purpose: 'Glass buffer for the May events',
    vendorId: 17, vendorName: 'Glassware Pro Rental', startDate: '2026-04-01', dueDate: '2026-05-20', rentalCost: 3000, status: 'Borrowed',
    requestedBy: 'Novi', requestedAt: '2026-03-25', borrowedAt: '2026-04-01', returnedAt: null, note: '' },
  { id: 3, itemName: 'Projector Screen 3x2m', qty: 2, unit: 'unit', warehouse: 'Warehouse Cililitan', purpose: 'Client presentation week',
    vendorId: 18, vendorName: 'Nusantara Sound & Light', startDate: '2026-03-30', dueDate: '2026-04-05', rentalCost: 250000, status: 'Borrowed',
    requestedBy: 'Darmian', requestedAt: '2026-03-27', borrowedAt: '2026-03-30', returnedAt: null, note: 'Vendor asked to extend or return.' },
  { id: 2, itemName: 'Tiffany Chair', qty: 100, unit: 'unit', warehouse: 'Warehouse Bali 66', purpose: 'Buffer stock for the July wedding season',
    vendorId: 15, vendorName: 'Sewa Kursi Jaya Rental', startDate: '2026-06-28', dueDate: '2026-07-31', rentalCost: 15000, status: 'Requested',
    requestedBy: 'Dewi Anjani', requestedAt: '2026-04-08', borrowedAt: null, returnedAt: null, note: 'Monthly rate.' },
  { id: 1, itemName: 'Forklift Electric 1.5T', qty: 1, unit: 'unit', warehouse: 'Warehouse Surabaya', purpose: 'Re-racking during stock opname',
    vendorId: 19, vendorName: 'Tenda Megah Rental', startDate: '2026-02-10', dueDate: '2026-02-12', rentalCost: 1500000, status: 'Returned',
    requestedBy: 'Anto', requestedAt: '2026-02-03', borrowedAt: '2026-02-10', returnedAt: '2026-02-12', note: '' },
];
