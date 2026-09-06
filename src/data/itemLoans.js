// Each loan is one borrowing transaction ("order") to a vendor, covering one or
// more items at once. Items can come from our own warehouse stock (source:
// 'warehouse', tied to a real inventoryRowId) or be a new/external item that
// isn't in our inventory at all (source: 'new') — borrowing one of those has no
// stock impact since we never had it in stock to begin with. Each item line
// tracks its own return, so a single loan can be partially returned.
export const initialItemLoans = [
  { id: 1,
    vendorId: 1, vendorName: 'Ari Setiawan', contactPerson: 'Ari Setiawan', contactPhone: '0812-3456-7890',
    purpose: 'Neighborhood community event', loanDate: '2026-03-25', dueDate: '2026-04-05',
    items: [
      { id: 1, itemName: 'White Tiffany Chair', source: 'warehouse', warehouse: 'Warehouse Bali 66', inventoryRowId: null, unit: 'unit', qty: 20, returnDate: null, returnCondition: null, returnNote: '' },
    ] },
  { id: 2,
    vendorId: 2, vendorName: 'Studio Foto Kilau', contactPerson: 'Rian', contactPhone: '0813-2233-4455',
    purpose: 'Product photo session', loanDate: '2026-03-20', dueDate: '2026-03-28',
    items: [
      { id: 1, itemName: 'Backdrop Stand 2m', source: 'warehouse', warehouse: 'Warehouse C9', inventoryRowId: null, unit: 'unit', qty: 2, returnDate: '2026-03-27', returnCondition: 'Good', returnNote: '' },
    ] },
  { id: 3,
    vendorId: 3, vendorName: 'Divisi Marketing', contactPerson: 'Internal', contactPhone: 'internal',
    purpose: 'Office documentation', loanDate: '2026-04-02', dueDate: '2026-04-15',
    items: [
      { id: 1, itemName: 'Mini Camera Tripod', source: 'warehouse', warehouse: 'Warehouse Cililitan', inventoryRowId: null, unit: 'unit', qty: 3, returnDate: null, returnCondition: null, returnNote: '' },
    ] },
  { id: 4,
    vendorId: 4, vendorName: 'Katering Bu Yuni', contactPerson: 'Bu Yuni', contactPhone: '0857-1111-2222',
    purpose: 'Thanksgiving gathering', loanDate: '2026-03-10', dueDate: '2026-03-20',
    items: [
      { id: 1, itemName: 'White Buffet Table', source: 'warehouse', warehouse: 'Warehouse Surabaya', inventoryRowId: null, unit: 'unit', qty: 4, returnDate: '2026-03-19', returnCondition: 'Good', returnNote: '' },
    ] },
  { id: 5,
    vendorId: 5, vendorName: 'Wedding Organizer Mitra', contactPerson: 'Rina', contactPhone: '0819-4567-8901',
    purpose: 'Sub-rental to partner vendor', loanDate: '2026-04-05', dueDate: '2026-04-12',
    items: [
      { id: 1, itemName: 'Large Round Candle Holder', source: 'warehouse', warehouse: 'Warehouse Bali 70', inventoryRowId: null, unit: 'pcs', qty: 30, returnDate: null, returnCondition: null, returnNote: '' },
      { id: 2, itemName: 'Gold Charger Plate',        source: 'warehouse', warehouse: 'Warehouse Bali 70', inventoryRowId: null, unit: 'pcs', qty: 50, returnDate: null, returnCondition: null, returnNote: '' },
    ] },
  { id: 6,
    vendorId: 6, vendorName: 'Toko Dekorasi Rina', contactPerson: 'Rina Wijaya', contactPhone: '0821-9988-7766',
    purpose: 'Borrowed for an exhibition', loanDate: '2026-02-01', dueDate: '2026-02-10',
    items: [
      { id: 1, itemName: 'Acrylic Ball Silver 20cm', source: 'warehouse', warehouse: 'Warehouse Bali 70', inventoryRowId: null, unit: 'pcs', qty: 15, returnDate: null, returnCondition: null, returnNote: '' },
      { id: 2, itemName: 'Antique Brass Candelabra',  source: 'new', warehouse: '', inventoryRowId: null, unit: 'pcs', qty: 2, returnDate: null, returnCondition: null, returnNote: '' },
    ] },
];
