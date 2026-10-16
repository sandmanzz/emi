# Context — Claude Web sessions — EMI

This file records the work done in **Claude Code on the web** sessions (cloud
container, repo cloned fresh each session). The user asked for it
("buat md file baru untuk menyimpan semuanya bernama context-claude-web").
It has everything for these sessions in one place: what was asked, what was
decided, what was built, and what is still open.

It **adds to** the three existing docs. It does not replace them:
- [context.md](context.md) — product requirements and decisions (the source of truth).
- [changes.md](changes.md) — code changelog, one "Round" per change.
- [backend.md](backend.md) — what the real API must provide.

Every Claude Web round also gets a short entry in those three files that links back here.
Newest session first.

---

## How to work on this repo in a Claude Web session

- **Standing rules (from context.md):** log every instruction, re-read the docs before new
  work, and say so when a request clashes with an earlier decision instead of guessing.
  Every code change gets a `changes.md` entry. Backend-relevant behaviour goes into `backend.md`.
- **Stack:** React 19 + Vite + react-router, plain JSX/CSS. **No backend.** Data is seeded from
  `src/data/*.js` and mutated in module stores (`src/lib/*Store.js`) or `localStorage`.
- **Mock today:** `TODAY = 2026-04-09` (`src/data/events.js`). Seed dates are written around it.
- **Run:** `npm ci && npm run dev` (port 5173). Login `dewi@emi.id` / `Admin@123` (Admin).
- **Lint baseline:** `npx eslint src` reports **18 problems (8 errors, 10 warnings)** that predate
  these sessions. A change should not add to that number.
- **localStorage gotcha:** stores that are seeded only when nothing is saved (vendors, production
  requests) keep the old data in a browser that used the app before. Clear `emi_vendors`,
  `emi_production_requests` and `emi_production_log` (or all site data) to see the new seed.

---

## Session 2026-10-16 — Item Value, multi-select category, Production tab, Vendor CMS + detail, mock data

### Request (verbatim, with the screenshot each point referred to)
> 1. ss 1 : di modul barang, perlu ada namanya item value, dimana di listing perlu ada tampikan total nilai asset nya yang dibaca dari sum item value.
> 2. ss 2 : tolong pastikan category bisa multi select
> 3. ss 3 : di bagian warehouse inventory perlu ada tambahan tab untuk production untuk mencatat barang barang yang di produksi
> 4. buatkan CMS vendor, nama, internal, external, description, phone, address ketika di klik salah satu row nya kita melihat detail nya termasuk barang apa saja yang kita produksi dari mereka dan dari event mana
> 5. bermainlah dengan mock data, jika belum ada buatkan mock data yang proper agar bisa terlihat lebih detail, ss 5 contohnya seperti ini karena ada yang tidak ada warehouse dan category
> 6. buat md file baru untuk menyimpan semuanya bernama context-claude-web

Screenshots: (1) Inventory listing, (2) Inventory's category filter dropdown, (3) Warehouse
Inventory tabs, (5) the Event Detail item drawer for "Display Table Riser Set" showing
"—" for Category, SKU and Warehouse.

### Decisions and assumptions (the user did not specify these; change them if wrong)

**#1 Item Value**
- New field `itemValue` on every Inventory catalog item: the value of **one unit**, in Rupiah.
- **Total Asset Value = Σ (Item Value × Total Stock)**. ⚠️ The request says "sum item value".
  A plain sum of unit prices would add a Rp 15.000 flower and a Rp 15.000.000 sound system as
  if each were one piece, so it was read as value × stock. If a plain sum was meant, change
  `totalAssetValue` in `InventoryPage.jsx`.
- Listing: two new columns, **Item Value** and **Total Value** (both sortable). A **Total Asset
  Value** card above the table shows the whole inventory. When a filter is active, it also shows the
  filtered total. A table footer row shows the total for the current filter.
- Items without a value show "Not set" and count as 0. The card says how many there are.
- Inventory Detail shows Item Value and Total Value too.
- Warehouse Inventory's `valuation` (was 0 everywhere) is now seeded with the same unit value,
  and `totalValuation = valuation × itemStock`. The two are **not linked live**: editing one does
  not change the other. Flagged as an open question below.

**#2 Multi-select category**
- The Inventory category filter is now multi-select: checkboxes, a count per category, "Clear",
  and the trigger reads "Floral", "Floral, Lighting" or "Floral +2". None selected = all categories.
- Built as a `multiple` prop on the shared `SearchableSelect`, so any other filter can use it.
- ⚠️ Read as **the filter** (that was the screenshot). An item still has **one** category.
  If an item should belong to several categories, that is a data-model change. Say so.

**#3 Production tab in Warehouse Inventory**
- New 5th tab **Production**. It lists every production in one table, from two sources:
  - **Event productions**: requests from Event Detail → Request Production. They are read-only
    here, with "Update in Event Detail", because marking one Done also adds the item to that event.
  - **Restock productions**: recorded on this tab with **Record Production**. They are not tied to an
    event. Fields: item (existing catalog item, or a new name), qty, deploy-to warehouse, made by
    Internal/External + vendor, note. Flow: Requested → Start → In Production → Mark Done.
    **Done adds the qty to that warehouse's stock** and writes a "Production" line in Stock History.
    If the item has no row in that warehouse, a row is opened first. If the item is not in the
    catalog, it becomes a "Needs setup" draft, the same as an event production.
- Filters: search (item/vendor/event/warehouse), status, source (event / restock), warehouse.
  KPIs: records, in progress, done, qty produced.
- Event productions now record `finishedAt` when marked Done.

**#4 Vendor CMS + detail**
- Vendor fields are now exactly **name, Internal/External, description, phone, address**.
  `contact` became `phone`. The free-text `type` was dropped. For records already saved in
  localStorage, `normalize()` copies `contact` → `phone` and `type` → `description`.
- List: Name, Type (Internal/External badge), Description, Phone, Address, Productions (count),
  Edit/Delete. **Clicking a row opens `/vendor-detail?id=`.** Search covers all text fields.
- Detail page: profile card, KPIs (productions, events served, qty produced, in progress),
  **Items Produced** (per item: qty done / qty total and which events), the value of finished
  production (qty × current Item Value), **Production History** (item, qty, event link,
  deploy-to, status, finished date), and the vendor's Item Loans when there are any.
- The New/Edit form is one shared component (`VendorFormModal`), used by both pages.
- Item Loan's quick "new vendor" form now asks for Phone + Description, and lists vendors with
  their Internal/External type.

**#5 Mock data**
- **26 catalog items added** (ids 73–98): the item names used by Event Detail's demo items,
  which had no catalog entry. This is why the drawer showed "—". Each one has a category, SKU,
  unit, warehouse, stock and item value, plus a matching Warehouse Inventory row (ids 81–106).
  The drawer now shows Category / SKU / Warehouse for every demo item.
- **Item Value** for all 98 items, plus valuation for the 8 warehouse-only rows (angpao boxes,
  stickers, flower holder).
- **Vendors:** the 6 existing vendors got description, phone and address. 8 production vendors
  were added (ids 7–14): iron workshop, in-house carpentry, in-house florists, textile, acrylic,
  in-house lighting, rattan, candles.
- **Production history:** 26 event productions across 11 events, past and upcoming, with a mix of
  Done / In Production / Requested. Some are "Replaces broken". There are also 6 restock records.
  File: `src/data/productionSeed.js`. Event productions are keyed by the event key, so they also show
  in each event's **Production** tab on Event Detail.
- The first catalog item's description moved into `inventory.js`.

**#6** This file.

### Bug fixed along the way
- **Inventory Detail showed "Item not found" for item ids 23–72.** It had its own stale copy of
  the first 22 items. It now reads the same catalog as the listing (`getCatalog()`), and it gained
  a **Production History** card for the item.

### Open questions / things to confirm
1. Asset value = **value × stock** (see #1). Confirm, or say it should be a plain sum.
2. Category multi-select = **filter only** (see #2), not several categories per item.
3. **Item Value (catalog) and Valuation (Warehouse Inventory) are separate fields** that hold the
   same seed number. Should Warehouse Inventory valuation always follow the catalog Item Value?
   If yes, the warehouse field should become read-only and be derived from the catalog.
4. **Inventory catalog `totalStock` is static seed data.** It does not follow Warehouse Inventory.
   This predates these sessions. For example, a restock marked Done raises the warehouse row
   (0 → 40), but the Inventory listing still shows the old Total Stock, so its asset value
   doesn't move either. Fixing it means deriving Total Stock from the warehouse rows.
5. **Event productions marked Done do not add stock** to the deploy-to warehouse when the item
   already exists in the catalog. They only create a draft for brand-new items (existing
   behaviour from Round 26). Restock productions do add stock. Should event productions add stock
   too?
6. Vendors and production requests seed only when nothing is stored yet, so a browser with old
   data won't show the new mock vendors and productions until its site data is cleared.

### Files
New: `src/components/ProductionLogTab.jsx`, `src/components/VendorFormModal.jsx`,
`src/pages/VendorDetailPage.jsx`, `src/data/productionSeed.js`, `docs/context-claude-web.md`.
Changed: `src/App.jsx` (route `/vendor-detail`), `src/components/SearchableSelect.jsx`
(`multiple`), `src/data/inventory.js`, `src/data/warehouseInventory.js`, `src/data/vendors.js`,
`src/lib/productionRequests.js`, `src/lib/vendorStore.js`, `src/pages/InventoryPage.jsx`,
`src/pages/InventoryDetailPage.jsx`, `src/pages/WarehouseInventoryPage.jsx`,
`src/pages/VendorPage.jsx`, `src/pages/ItemLoanPage.jsx`, `src/pages/EventDetailPage.jsx`
(vendor picker meta, `finishedAt`), `src/style.css`.

### Verified
- `npm run build` passes. Lint is still at the 18-problem baseline.
- Checked in Chromium at 1440px: Inventory (asset card, columns, multi-select with 2
  categories → 26 items, Rp318.870.000), Inventory Detail id 89, Warehouse Inventory →
  Production, Vendor list, Vendor detail (Bengkel Las Maju Jaya), the Event Detail drawer for
  "Display Table Riser Set" (now Decoration / DTR-089 / Warehouse Bali 70).
- Restock flow: Gold Ribbon 5m, Start → Mark Done → Warehouse Bali 66 stock 0 → 40, and a
  "+40 Production" line in Stock History.
- The only console error is the existing duplicate-key "5" warning (context.md open question #20).
