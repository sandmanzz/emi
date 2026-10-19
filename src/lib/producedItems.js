import { getCatalog, addCatalogItem, isNeedsSetup, markItemSetUp } from './catalogStore';
import { stockInto } from './stockOpnameStore';

// Items created by a finished "New Production" (Event Detail → Request Production, or
// Production → Produced Items → Record Production).
//
// A production only knows a name, a quantity and which warehouse it goes to — not SKU,
// category, unit or value. So when one is marked Done for an item that isn't in the
// catalog yet, a *draft* catalog item is created with `needsSetup: true`; Inventory and
// Warehouse Inventory highlight it until someone completes it (Inventory → Edit).
// Since 2026-10-16 the catalog and the warehouse rows are persistent stores
// (lib/catalogStore.js, lib/stockOpnameStore.js); this module only wires them together.

export { getCatalog, isNeedsSetup, markItemSetUp };

// Puts `qty` of a produced item into `warehouseName` (logged as 'Production' in Stock History),
// creating the "Needs setup" draft first when the item is new. Returns the catalog item.
export function stockInProduced({ name, qty, warehouseName, vendorName, producedFor, by = '' }) {
  let item = getCatalog().find(i => i.name === name);
  if (!item) {
    const n = Math.max(0, ...getCatalog().map(i => i.id)) + 1;
    item = addCatalogItem({
      name, sku: `NEW-${String(n).padStart(3, '0')}`, category: '', unit: '', itemValue: 0,
      homeWarehouse: warehouseName, needsSetup: true, source: 'production',
      producedBy: vendorName || '', producedFor: producedFor || '',
    });
  }
  stockInto(name, warehouseName, Number(qty) || 0, {
    reason: 'Production', eventName: producedFor || '', note: vendorName ? `Made by ${vendorName}` : '', by,
  }, { valuation: item.itemValue });
  return item;
}
