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
- **Git (standing rule, 2026-10-16):** "selalu langsung merge ke main saja". Every finished change is
  committed and **merged straight into `main`** (fast-forward, no PR), without asking first. A work branch
  `claude/<topic>` may be pushed as well, but `main` is where the change must end up.
- **Stack:** React 19 + Vite + react-router, plain JSX/CSS. **No backend.** Data is seeded from
  `src/data/*.js` and mutated in module stores (`src/lib/*Store.js`) or `localStorage`.
- **Mock today:** `TODAY = 2026-04-09` (`src/data/events.js`). Seed dates are written around it.
- **Run:** `npm ci && npm run dev` (port 5173). Login `dewi@emi.id` / `Admin@123` (Admin).
- **Lint baseline:** `npx eslint src` reports **13 problems (6 errors, 7 warnings)**, all pre-existing
  (it was 18 before the Event Report rewrite). A change should not add to that number.
- **localStorage gotcha:** stores that are seeded only when nothing is saved (vendors, production
  requests) keep the old data in a browser that used the app before. Clear `emi_vendors`,
  `emi_production_requests` and `emi_production_log` (or all site data) to see the new seed.

---

## Session 2026-10-16 (3) — Borrow Item, Loan CMS, two-tab vendor menus, Event Report rewrite, event filters, PRD

**Full spec: [prd/PRD-2026-10-16.md](prd/PRD-2026-10-16.md)** (written for other AI agents; covers the whole day).

### Request (verbatim)
> 1. di event setting sama juga tmbahkan option untuk meminjam barang
> 2. kemudian tambahkan menu loan di menu untuk CMS nya,bisa add loan vendor, edit dan delete, ketika 1 vendor di klik bisa lihat detail nya termasuk barang apa yang dibuat
> 3. di menu loan ada 2 tab nanti tab untuk melihat list vendor dan list melihat keseluruhan barang yang dipinjam. hal ini harus diterapkan juga di CMS. production vendor sama uga
> 4. kemudian tolong rewrite dan perbaiki tampilan untuk event report, perlu di catat aktual case nya barang bisa mencapai ratusan jadi harus benar benar optimal dan bagus
> 5. di event listing tambahkan juga fitur untuk melakukan filter
>
> dari semua yang sudah kita lakukan hari ini buatkan PRD per tanggal, isi dari PRD ini ditujukan agar bisa dipake oleh AI lain tanpa membuat bingung.

### Decisions (details in the PRD; ⚠️ = assumption to confirm)
- **#1** New Event Status flag **Borrow Item** (`loanItem`). At such a stage, Event Detail shows **Borrow Item**
  (rent from a loan vendor) and a **Borrowed** tab: Requested → Mark Received (item joins the event as Outsource)
  → Mark Returned. Overdue = Borrowed and past the due date. ⚠️ Read as "the event borrows from a vendor", the same
  pattern as Production Item.
- **#2** Master Data → **Loan** = a CMS for loan vendors (add / edit / delete). A row opens `/loan-vendor-detail`
  with what we borrowed, for which event, quantities out now and rental cost.
  ⚠️ **Clash flagged:** the existing **Item Loan** module is the opposite direction (we lend *our* items out).
  It is kept as is. Its borrowers (vendors 1–4) are now tagged `loan`, so they appear in the Loan list with 0 loans.
- **#3** Both vendor menus now have two tabs: **Vendors** | **Produced Items** (Vendor menu, same list as Warehouse
  Inventory → Production) and **Vendors** | **Borrowed Items** (Loan menu). Vendors have `kinds` (production / loan),
  and one vendor can be in both. Deleting from one menu only removes it from that list.
- **#4** **Event Report rewritten** (`/event-summary`, now also in the sidebar under Report). It uses real events and the
  same item list as Event Detail. Big events get a generated list of their real `itemCount` (up to 312 lines).
  KPIs, a sortable per-area table, breakdowns, and an item table with search, multi-filters, group by area, sorting,
  25/50/100/All rows, a sticky header, CSV export and full print. The old page used 4 fake events.
- **#5** Event list **filter bar**: location, stage, size, start-date range. It applies to all tabs and the tab counts.
- **PRD**: `docs/prd/PRD-YYYY-MM-DD.md`, one file per date.

### Verified
Build OK. Lint is now **13 problems** (it was 18; the old report page's issues went away with the rewrite). In Chromium:
- The 312-line report loads in about 0.5 s, and "All" renders 326 rows (with group headers) in about 0.5 s.
- Borrow flow: request → received adds the item (All 8 → 9).
- The Loan list, Borrowed Items, loan vendor detail, Vendor → Produced Items, and Event filters (Bali → 3 of 27) all work.
- Event Detail for a 211-item event renders in about 1.4 s.
- No new console errors.

---

## Session 2026-10-16 (2) — One Add Item button, favicon, Print Plan, Allow Delete, small mock events

### Request (verbatim)
> 1. ss 1. kita gabung saja antara cart dan add item disini tolong jadikan 1
> 2. update favicon
> 3. ss 2. tolong tambahkan 3dot icon untuk print. plan, ketika diklik maka ada print untuk menampilkan list barang yang dibutuhkan untuk barang dengan location tersebut. jadi harus ada option nya juga. tapi intinya fungsinya adalah itu
> 4. ss 3 : tambahkan allow delete option juga
> 5. buatkan tambahan mock data untuk event dengan jumlah item yang lebih sedikit

Screenshots: (1) the Event Detail header with the cart icon button next to "+ Add Item", (2) Event Detail
of Autumn Garden Party, (3) the Event Status table with its Scan / Production Item / Check Ownership columns.

### Decisions and assumptions (change them if wrong)

**#1 One button.** The cart icon button is gone. **"+ Add Item"** opens the same picker (catalog on the
left, cart on the right). While the cart has items, the button shows a small white pill with a cart icon
and the count, e.g. `+ Add Item 🛒 1`. Nothing else changed: the cart still lives only in this page's state,
and "Save to Event" still adds the items.

**#2 Favicon.** `public/favicon.svg` was Vite's default logo. It is now an EMI mark: a brand-indigo
(`#4f46e5`) rounded tile with a white box (inventory) and a green check badge (event ready).
The tab title is now **"EMI Inventory"** (was "emi-react"). Also added `theme-color` and `apple-touch-icon`.

**#3 Print Plan** (Event Detail ⋮ → **Print Plan**). A printable **Preparation Plan**: what has to be
prepared for each location (Area) of the event.
- Options:
  - **Location**: multi-select over the areas that have items, with counts. Empty = all.
  - **Items**: "up to the current stage" (same as the All tab, the default) or "all items on the event".
  - **Show**: Warehouse / Ownership / PIC / Note columns, and **One page per location**.
- The sheet has a header (event, dates, location, current stage, printed at/by), a summary (locations,
  item lines, total pcs), and one section per location, split by sub area. Each item row has #, item + SKU,
  category, qty + unit, warehouse, owner, PIC, note, and an empty "Ready" box to tick by hand.
  Signature lines are at the bottom: Prepared by, Checked by, Received at location.
- The modal shows a live preview. **Print** copies that preview into a hidden iframe and prints it, so only
  the sheet prints, not the app.
- The old ⋮ "Print" (prints the whole page) is kept, renamed **"Print Page"**.
- ⚠️ "location" was read as the event's **Area** (the "All Place" filter). Warehouse comes from the item
  (picked warehouse) or else the catalog's home warehouse.

**#4 Allow Delete** (Event Status). New per-status boolean `allowDelete`. It has a column, a KPI card,
and a True/False field in New/Edit Status, like the other flags.
- ⚠️ Read as "**items may be deleted from an event while it is at this status**", the same kind of
  per-stage rule as the other flags in that table. It is **not** about deleting the status row itself.
  If that was meant, say so.
- While the event is at a stage with `allowDelete: false`, Event Detail hides the delete button on cards
  and list rows. The drawer shows "Delete is off at "<stage>" (Event Status → Allow Delete)" instead of Delete.
- Seed: **True** for Created by admin up, On preparing items, Finish setup, Postphone, Disable.
  **False** for Waiting scan in, Event running, Waiting scan out, Finished (once items are being moved,
  removing them should be blocked). A missing field counts as **True**, so a status list already saved in
  localStorage keeps the old behaviour (delete allowed) until it is edited.
- The existing lock is unchanged: from Checking Inventory onward nothing can be modified or deleted.

**#5 Small mock events.** Until now every event's detail showed the same 26 generic items. Five new
upcoming events (ids 95–99) have their **own short item lists** (`src/data/eventItemsSeed.js`) and a
seeded stage (`SEED_STAGE` in `lib/eventProgress.js`):

| Event | Items | Seeded stage | Shows off |
|---|---|---|---|
| Intimate Dinner Ubud | 5 | On preparing items | 2 locations, Print Plan |
| Baby Shower Mila | 4 | Created by admin up | delete allowed |
| Engagement Rina & Bayu | 8 | Finish setup | sub areas, Production + Check Ownership stage |
| Product Photoshoot Kilau | 3 | Waiting scan in | 1 scanned / 2 not, Next blocked, delete off |
| Office Townhall Q2 | 6 | Created by admin up | an out-of-stock mic with a note |

All item names exist in the catalog (so the drawer shows Category / SKU / Warehouse), and every item's
stage is at or before the event's stage. They appear in the **On Going** tab, because `itemCount` > 0.
EventPage's next new-event id moved from 95 to 100.

### Open questions
1. Allow Delete = per-stage **item** deletion (see #4). Confirm.
2. Print Plan "location" = **Area**. Should it also be possible to print per **warehouse** (a pick list
   for the warehouse team)? It would be a small extra option.
3. Items on Event Detail are still not saved per event (pre-existing): adding or deleting items is lost on
   reload. The new per-event seeds only fix *which* items an event starts with.

### Files
New: `src/components/PrintPlanModal.jsx`, `src/data/eventItemsSeed.js`.
Changed: `public/favicon.svg`, `index.html`, `src/pages/EventDetailPage.jsx`, `src/pages/EventStatusPage.jsx`,
`src/pages/EventPage.jsx`, `src/data/eventStatuses.js`, `src/data/events.js`, `src/lib/eventStatuses.js`
(`isDeleteAllowedStage`), `src/lib/eventProgress.js` (`SEED_STAGE`), `src/style.css`.

### Verified
- Build passes. Lint is still at the 18-problem baseline.
- In Chromium: the merged button shows `🛒 1` after adding one item. Print Plan preview for Engagement
  Rina & Bayu (3 locations, sub areas), the GUEST TABLE filter → 1 section, and Print sends exactly the sheet
  to the print document. Allow Delete: 0 delete buttons at "Waiting scan in" (Product Photoshoot Kilau)
  with the drawer note, and 4 at "Created by admin up" (Baby Shower Mila). Event Status table + new KPI.
  The favicon renders, and the tab title is "EMI Inventory".

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
- **Production history:** 23 event productions across 10 events, past and upcoming, with a mix of
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
