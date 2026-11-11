# EMI — Answers for the mobile team (from the code on `main`, commit f59524c)

> Source: repo `sandmanzz/emi`, branch `main`. Every answer cites its file. **"Seed" JSON below is generated straight
> from `src/data/*.js`** (trimmed where noted). Where the seed does **not** contain something you asked for, it says so and
> gives an *illustrative fixture* clearly marked as such — do not treat those as web data.
>
> Three facts that change how you read everything below:
> 1. **The web app has no backend.** Seeds + `localStorage`. Event lines live in Event Detail page state (not persisted).
> 2. **Scanning in the web app is simulated** (a popup with a 0.9 s fake "scanning" animation). There is no QR payload,
>    no camera, no code matching. The QR Code menu is a placeholder page. Details in §B.
> 3. **"Today" is the mock `TODAY = new Date('2026-04-09')`** (`src/data/events.js`).

---

## A. Seed data

### A1. Stage list — `src/data/eventStatuses.js` (`initialStatuses`), full
Stepper order = sort by `order`. Lib: `src/lib/eventStatuses.js`.
```json
[
{"order":1,"id":1,"code":"CBA","status":"Created by admin up","scan":"None","cuttingStock":false,"stockReturn":false,"productionItem":false,"checkOwnership":false,"allowDelete":true,"loanItem":true,"outsourceItem":true},
{"order":2,"id":2,"code":"OPI","status":"On preparing items","scan":"None","cuttingStock":false,"stockReturn":false,"productionItem":true,"checkOwnership":false,"allowDelete":true,"loanItem":true,"outsourceItem":true},
{"order":3,"id":3,"code":"FS","status":"Finish setup","scan":"None","cuttingStock":false,"stockReturn":false,"productionItem":true,"checkOwnership":true,"allowDelete":true,"loanItem":true,"outsourceItem":true},
{"order":4,"id":4,"code":"WSI","status":"Waiting scan in","scan":"Scan","cuttingStock":false,"stockReturn":false,"productionItem":false,"checkOwnership":false,"allowDelete":false,"loanItem":false,"outsourceItem":false},
{"order":5,"id":5,"code":"ER","status":"Event running","scan":"None","cuttingStock":false,"stockReturn":false,"productionItem":false,"checkOwnership":false,"allowDelete":false,"loanItem":false,"outsourceItem":false},
{"order":6,"id":6,"code":"WSO","status":"Waiting scan out","scan":"Scan","cuttingStock":false,"stockReturn":false,"productionItem":false,"checkOwnership":false,"allowDelete":false,"loanItem":false,"outsourceItem":false},
{"order":7,"id":7,"code":"FIN","status":"Finished","scan":"None","cuttingStock":false,"stockReturn":false,"productionItem":false,"checkOwnership":false,"allowDelete":false,"loanItem":false,"outsourceItem":false},
{"order":8,"id":8,"code":"PP","status":"Postphone","scan":"None","cuttingStock":false,"stockReturn":false,"productionItem":false,"checkOwnership":false,"allowDelete":true,"loanItem":false,"outsourceItem":false},
{"order":9,"id":9,"code":"DIS","status":"Disable","scan":"None","cuttingStock":false,"stockReturn":false,"productionItem":false,"checkOwnership":false,"allowDelete":true,"loanItem":false,"outsourceItem":false}
]
```
Notes:
- `cuttingStock` is **false everywhere and can no longer be set**: the owner removed it from Event Settings on 2026-10-05
  (`docs/context.md`). The cutting logic in `EventDetailPage.jsx` is dormant. `stockReturn` is settable (only one stage may
  have it) but the seed sets none.
- `outsourceItem`: rows saved before it existed fall back to `loanItem` (`isOutsourceStage`).
- The full status object also has `eventRunning` (display counter) and `updatedAt`.

### A2. Events across all closing states — `src/data/events.js` + `src/lib/eventClosing.js` (`SEED_CLOSING`) + `src/lib/eventProgress.js` (`SEED_STAGE`, `SEED_AT_LAST_STAGE`)
`closingTab` and `savedStage` are not fields on the event; they come from those two libs (added here for you).
```json
[
{"id":75,"eventKey":"2026-02-14 | GRAND WEDDING SURABAYA","name":"Grand Wedding Surabaya","code":"GWS","start":"2026-02-14","finish":"2026-02-15","date":"2026-02-14","location":"Surabaya","type":"past","itemCount":248,"closingTab":"Returned & Completed (legacy type \"past\")","savedStage":"(none)"},
{"id":90,"eventKey":"2026-10-01 | AUTUMN GARDEN PARTY","name":"Autumn Garden Party","code":"AGP","start":"2026-10-05","finish":"2026-10-05","date":"2026-10-01","location":"Bandung","type":"upcoming","itemCount":0,"closingTab":"Upcoming","savedStage":"(none) → first stage \"Created by admin up\""},
{"id":91,"eventKey":"2026-10-18 | ROOFTOP SUNSET MIXER","name":"Rooftop Sunset Mixer","code":"RSM","start":"2026-10-20","finish":"2026-10-20","date":"2026-10-18","location":"Jakarta","type":"upcoming","itemCount":58,"closingTab":"Ready to Close","savedStage":"last configured stage (= \"Disable\", order 9)"},
{"id":92,"eventKey":"2026-06-10 | HARVEST FESTIVAL BAZAAR","name":"Harvest Festival Bazaar","code":"HFB","start":"2026-06-12","finish":"2026-06-14","date":"2026-06-10","location":"Malang","type":"upcoming","itemCount":140,"closingTab":"Checking Inventory","savedStage":"(none) → first stage"},
{"id":93,"eventKey":"2026-05-12 | DOWNTOWN PRODUCT LAUNCH","name":"Downtown Product Launch","code":"DPL","start":"2026-05-15","finish":"2026-05-15","date":"2026-05-12","location":"Surabaya","type":"upcoming","itemCount":0,"closingTab":"Transferred","savedStage":"(none) → first stage"},
{"id":94,"eventKey":"2026-04-18 | BEACHSIDE ANNIVERSARY","name":"Beachside Anniversary","code":"BSA","start":"2026-04-20","finish":"2026-04-21","date":"2026-04-18","location":"Bali","type":"upcoming","itemCount":64,"closingTab":"Returned & Completed","savedStage":"(none) → first stage"},
{"id":95,"eventKey":"2026-04-22 | INTIMATE DINNER UBUD","name":"Intimate Dinner Ubud","code":"IDU","start":"2026-04-25","finish":"2026-04-25","date":"2026-04-22","location":"Ubud, Bali","type":"upcoming","itemCount":5,"closingTab":"On Going","savedStage":"On preparing items"},
{"id":97,"eventKey":"2026-05-15 | ENGAGEMENT RINA & BAYU","name":"Engagement Rina & Bayu","code":"ERB","start":"2026-05-17","finish":"2026-05-17","date":"2026-05-15","location":"Surabaya","type":"upcoming","itemCount":8,"closingTab":"On Going","savedStage":"Finish setup"},
{"id":98,"eventKey":"2026-04-14 | PRODUCT PHOTOSHOOT KILAU","name":"Product Photoshoot Kilau","code":"PPK","start":"2026-04-15","finish":"2026-04-15","date":"2026-04-14","location":"Denpasar","type":"upcoming","itemCount":3,"closingTab":"On Going (at scan stage)","savedStage":"Waiting scan in"}
]
```
How each tab is derived (`src/pages/EventPage.jsx`, `rawUpcoming…rawTransferred`):
- Upcoming = `type 'upcoming'` ∧ closing `on-going` ∧ not ready-to-close ∧ **no items** (`itemCount 0` and nothing added).
- On Going = same but **has items**.
- Ready to Close = `type 'upcoming'` ∧ current stage = **last stage by order**. ⚠ With the seed that last stage is **"Disable"**
  (order 9), so "Ready to Close" means "stepper at Disable". See C15.
- Checking Inventory / Transferred / Returned & Completed = stored closing value. **Every legacy `type: 'past'` event
  (ids 70–82) is folded into Returned & Completed.**
- Saved stage when nothing is stored: `resolveEventStage` → mock status from `data/eventInventory.js` (matched by event key;
  in practice no seed match) → **first stage**.

### A3. Event lines — `src/data/eventItemsSeed.js` (`SEED_EVENT_ITEMS`), 2 events, complete
```json
[
{"event":"2026-04-14 | PRODUCT PHOTOSHOOT KILAU","id":1,"subArea":"","scanned":true,"groupId":null,"pic":"Rian","checking":true,"warehouseItem":true,"scanIn":"Apr 9, 2026 08:20 AM","scanOut":null,"note":"","checked":false,"ownership":"IHC","name":"Backdrop Stand 2m","area":"Area Hall","qty":2,"stage":"Created by admin up","warehouse":"Warehouse C9"},
{"event":"2026-04-14 | PRODUCT PHOTOSHOOT KILAU","id":2,"subArea":"","scanned":false,"groupId":null,"pic":"Rian","checking":true,"warehouseItem":true,"scanIn":null,"scanOut":null,"note":"","checked":false,"ownership":"IHC","name":"Spotlight Stand","area":"Area Hall","qty":2,"stage":"Created by admin up","warehouse":"Warehouse C9"},
{"event":"2026-04-14 | PRODUCT PHOTOSHOOT KILAU","id":3,"subArea":"","scanned":false,"groupId":null,"pic":"","checking":false,"warehouseItem":true,"scanIn":null,"scanOut":null,"note":"","checked":false,"ownership":"IHP","name":"Velvet Backdrop Curtain 4m","area":"Area Hall","qty":1,"stage":"On preparing items","warehouse":"Warehouse Bali 66"},
{"event":"2026-05-15 | ENGAGEMENT RINA & BAYU","id":1,"subArea":"Arch","scanned":false,"groupId":null,"pic":"Anto","checking":false,"warehouseItem":true,"scanIn":null,"scanOut":null,"note":"","checked":false,"ownership":"IHC","name":"Iron Flower Arch 60cm","area":"CEREMONY","qty":1,"stage":"Created by admin up","warehouse":"Warehouse Bali 70"},
{"event":"2026-05-15 | ENGAGEMENT RINA & BAYU","id":2,"subArea":"Arch","scanned":false,"groupId":null,"pic":"Dewi","checking":false,"warehouseItem":true,"scanIn":null,"scanOut":null,"note":"","checked":false,"ownership":"IHC","name":"Artificial Rose Pink","area":"CEREMONY","qty":60,"stage":"Created by admin up","warehouse":"Warehouse Bali 66"},
{"event":"2026-05-15 | ENGAGEMENT RINA & BAYU","id":3,"subArea":"Altar Setup","scanned":false,"groupId":null,"pic":"Anto","checking":false,"warehouseItem":true,"scanIn":null,"scanOut":null,"note":"","checked":false,"ownership":"IHC","name":"Chiffon Drape Ivory 5m","area":"CEREMONY","qty":4,"stage":"Created by admin up","warehouse":"Warehouse Bali 66"},
{"event":"2026-05-15 | ENGAGEMENT RINA & BAYU","id":4,"subArea":"","scanned":false,"groupId":null,"pic":"Darmian","checking":false,"warehouseItem":true,"scanIn":null,"scanOut":null,"note":"","checked":false,"ownership":"IHC","name":"White Tiffany Chair","area":"GUEST TABLE","qty":30,"stage":"On preparing items","warehouse":"Warehouse Bali 66"},
{"event":"2026-05-15 | ENGAGEMENT RINA & BAYU","id":5,"subArea":"","scanned":false,"groupId":null,"pic":"","checking":false,"warehouseItem":true,"scanIn":null,"scanOut":null,"note":"","checked":false,"ownership":"Outsource","name":"Organza Chair Sash","area":"GUEST TABLE","qty":30,"stage":"On preparing items","warehouse":"Warehouse Surabaya"},
{"event":"2026-05-15 | ENGAGEMENT RINA & BAYU","id":6,"subArea":"","scanned":false,"groupId":null,"pic":"","checking":false,"warehouseItem":true,"scanIn":null,"scanOut":null,"note":"Names: Rina & Bayu, gold print.","checked":false,"ownership":"IHC","name":"Acrylic Welcome Sign Board","area":"ENTRANCE","qty":1,"stage":"On preparing items","warehouse":"Warehouse Bali 70"},
{"event":"2026-05-15 | ENGAGEMENT RINA & BAYU","id":7,"subArea":"","scanned":false,"groupId":null,"pic":"Novi","checking":false,"warehouseItem":true,"scanIn":null,"scanOut":null,"note":"","checked":false,"ownership":"IHC","name":"Tealight Holder 15cm","area":"GUEST TABLE","qty":24,"stage":"Finish setup","warehouse":"Warehouse Bali 70"},
{"event":"2026-05-15 | ENGAGEMENT RINA & BAYU","id":8,"subArea":"","scanned":false,"groupId":null,"pic":"Hendra","checking":false,"warehouseItem":true,"scanIn":null,"scanOut":null,"note":"","checked":false,"ownership":"IHC","name":"String Fairy Lights 10m","area":"ENTRANCE","qty":3,"stage":"Finish setup","warehouse":"Warehouse Bali 70"}
]
```
⚠ **Not in any seed:** `brokenQty`, `stockCut`, `stockReturned`, `fromLoan`, `fromOutsource`, `fromProduction`,
`fromConvert`, a non-null `groupId`, `resolution`. They are only created at runtime by Event Detail actions
(`src/pages/EventDetailPage.jsx`). Packages (groups) start empty (`useState([])`, line ~412). Big events (`itemCount ≥ 30`)
get generated lines (`src/lib/eventItems.js`). For mobile fixtures use the **illustrative** lines below — the field names and
value formats are exactly what the web code writes:
```json
[
{"id":11,"name":"Tiffany Chair","area":"GUEST TABLE","subArea":"","stage":"On preparing items","qty":40,"pic":"Anto","ownership":"IHC","warehouseItem":true,"warehouse":"Warehouse Bali 66","groupId":null,"checking":true,"checked":false,"scanned":true,"scanIn":"Apr 9, 2026 08:20 AM","scanOut":null,"note":"","brokenQty":3,"brokenNote":"3 legs cracked during loading","brokenReportedBy":"Anto","brokenReportedAt":"09 Apr 2026, 10:05"},
{"id":12,"name":"Round Banquet Table","area":"GUEST TABLE","subArea":"","stage":"Created by admin up","qty":6,"pic":"Agus","ownership":"IHC","warehouseItem":true,"warehouse":"Warehouse Surabaya","groupId":null,"checking":false,"checked":true,"scanned":true,"scanIn":"Apr 9, 2026 08:20 AM","scanOut":"Apr 12, 2026 09:41 PM","note":"","stockCut":true,"stockReturned":true},
{"id":13,"name":"Gold Charger Plate","area":"GUEST TABLE","subArea":"","stage":"On preparing items","qty":120,"pic":"","ownership":"Outsource","warehouseItem":false,"groupId":null,"checking":false,"checked":false,"scanned":false,"scanIn":null,"scanOut":null,"note":"","fromLoan":true,"loanVendor":"Wedding Organizer Mitra"},
{"id":14,"name":"Floral Arch Installation","area":"CEREMONY","subArea":"","stage":"On preparing items","qty":1,"pic":"","ownership":"Outsource","warehouseItem":false,"groupId":null,"checking":false,"checked":false,"scanned":false,"scanIn":null,"scanOut":null,"note":"","fromOutsource":true,"loanVendor":"Bali Florist Collective"},
{"id":15,"name":"Acrylic Welcome Sign Board","area":"ENTRANCE","subArea":"","stage":"On preparing items","qty":2,"pic":"","ownership":"IHP","warehouseItem":true,"warehouse":"Warehouse Bali 70","groupId":null,"checking":false,"checked":false,"scanned":false,"scanIn":null,"scanOut":null,"note":"Custom 1x2m","fromProduction":true},
{"id":16,"name":"Artificial Rose Pink","area":"UNASSIGNED","subArea":"","stage":"Finish setup","qty":30,"pic":"","ownership":"IHC","warehouseItem":true,"groupId":null,"checking":false,"checked":false,"scanned":false,"scanIn":null,"scanOut":null,"note":"Converted from 10 × Artificial Flower Lunaria White","fromConvert":true},
{"id":17,"name":"Glass Votive Candle Holder","area":"GUEST TABLE","subArea":"Centerpiece","stage":"Created by admin up","qty":24,"pic":"Lina","ownership":"IHC","warehouseItem":true,"warehouse":"Warehouse C9","groupId":1,"checking":false,"checked":false,"scanned":false,"scanIn":null,"scanOut":null,"note":""}
]
```
Package object (runtime): `{ id, name, itemIds: number[] }` (illustrative: `{"id":1,"name":"Box A – Centerpiece","itemIds":[17]}`).
`brokenWrittenOff` (int) appears after a write-off; `resolution: "returned"` during closing.

### A4. Items + warehouse rows — `src/data/inventory.js` (`inventoryData`) + `src/data/warehouseInventory.js` (`wiData`)
20 rows: 7 Critical, 9 Safe, 4 Not Set, plus the catalog items they belong to (98 items / 106 rows in total).
Items:
```json
[
{"id":1,"name":"Artificial Flower Chrysant Giant White","sku":"AFG-001","category":"Floral","unit":"pcs","itemValue":45000,"homeWarehouse":"Warehouse Bali 66"},
{"id":2,"name":"Artificial Flower Lunaria White","sku":"AFL-002","category":"Floral","unit":"pcs","itemValue":35000,"homeWarehouse":"Warehouse Bali 66"},
{"id":3,"name":"Artificial Rose Pink","sku":"ARP-003","category":"Floral","unit":"pcs","itemValue":25000,"homeWarehouse":"Warehouse Bali 66"},
{"id":4,"name":"Backdrop Stand 2m","sku":"BSD-004","category":"Equipment","unit":"unit","itemValue":1250000,"homeWarehouse":"Warehouse C9"},
{"id":5,"name":"White Latex Balloon","sku":"BLP-005","category":"Decoration","unit":"pcs","itemValue":1500,"homeWarehouse":"Warehouse Surabaya"},
{"id":6,"name":"Large Round Candle Holder","sku":"CHB-006","category":"Decoration","unit":"pcs","itemValue":85000,"homeWarehouse":"Warehouse Bali 70"},
{"id":7,"name":"Cylinder-Shaped Crystal","sku":"CBT-007","category":"Decoration","unit":"pcs","itemValue":60000,"homeWarehouse":"Warehouse Bali 66"},
{"id":8,"name":"Plain White Fabric 3m","sku":"FPP-008","category":"Fabric","unit":"meter","itemValue":75000,"homeWarehouse":"Warehouse Cililitan"},
{"id":21,"name":"Acrylic Ball Silver 20cm","sku":"ABS-021","category":"Decoration","unit":"pcs","itemValue":55000,"homeWarehouse":"Warehouse Bali 70"},
{"id":25,"name":"Spotlight Stand","sku":"SPS-025","category":"Lighting","unit":"unit","itemValue":650000,"homeWarehouse":"Warehouse C9"},
{"id":31,"name":"Faux Greenery Garland 2m","sku":"FGG-031","category":"Decoration","unit":"pcs","itemValue":95000,"homeWarehouse":"Warehouse Bali 70"},
{"id":32,"name":"Wireless Handheld Microphone","sku":"WHM-032","category":"Equipment","unit":"unit","itemValue":1850000,"homeWarehouse":"Warehouse C9"},
{"id":35,"name":"Peony Centerpiece Pink","sku":"PCP-035","category":"Floral","unit":"pcs","itemValue":210000,"homeWarehouse":"Warehouse Bali 70"},
{"id":39,"name":"Tropical Anthurium Red","sku":"TAR-039","category":"Floral","unit":"pcs","itemValue":65000,"homeWarehouse":"Warehouse C9"},
{"id":41,"name":"Rattan Peacock Chair","sku":"RPC-041","category":"Furniture","unit":"unit","itemValue":2750000,"homeWarehouse":"Warehouse Bali 70"},
{"id":44,"name":"Velvet Lounge Sofa 2-Seater","sku":"VLS-044","category":"Furniture","unit":"unit","itemValue":6500000,"homeWarehouse":"Warehouse Bali 66"}
]
```
Rows (all fields, incl. `stokMin` and location fields `asile`, `rack`, `level`, `lantai` = floor, `lorong` = lane):
```json
[
{"id":33,"name":"Spotlight Stand","warehouseStock":6,"warehouseName":"Warehouse C9","itemStock":6,"stokMin":8,"stokUsed":1,"valuation":650000,"totalValuation":3900000,"minStatus":"Critical","flag1":"","flag2":"","asile":"A","rack":3,"level":1,"lantai":1,"lorong":"L1","updatedAt":"30 Mar 2026"},
{"id":39,"name":"Faux Greenery Garland 2m","warehouseStock":3,"warehouseName":"Warehouse Bali 70","itemStock":3,"stokMin":5,"stokUsed":1,"valuation":95000,"totalValuation":285000,"minStatus":"Critical","flag1":"","flag2":"","asile":"","rack":"","level":"","lantai":"","lorong":"","updatedAt":"22 Mar 2026"},
{"id":40,"name":"Wireless Handheld Microphone","warehouseStock":0,"warehouseName":"Warehouse C9","itemStock":0,"stokMin":4,"stokUsed":0,"valuation":1850000,"totalValuation":0,"minStatus":"Critical","flag1":"","flag2":"","asile":"A","rack":4,"level":1,"lantai":1,"lorong":"L1","updatedAt":"20 Mar 2026"},
{"id":43,"name":"Peony Centerpiece Pink","warehouseStock":6,"warehouseName":"Warehouse Bali 70","itemStock":6,"stokMin":8,"stokUsed":1,"valuation":210000,"totalValuation":1260000,"minStatus":"Critical","flag1":"","flag2":"","asile":"","rack":"","level":"","lantai":"","lorong":"","updatedAt":"17 Sep 2026"},
{"id":47,"name":"Tropical Anthurium Red","warehouseStock":0,"warehouseName":"Warehouse C9","itemStock":0,"stokMin":5,"stokUsed":0,"valuation":65000,"totalValuation":0,"minStatus":"Critical","flag1":"","flag2":"","asile":"","rack":"","level":"","lantai":"","lorong":"","updatedAt":"15 Sep 2026"},
{"id":49,"name":"Rattan Peacock Chair","warehouseStock":4,"warehouseName":"Warehouse Bali 70","itemStock":4,"stokMin":6,"stokUsed":0,"valuation":2750000,"totalValuation":11000000,"minStatus":"Critical","flag1":"","flag2":"","asile":"","rack":"","level":"","lantai":"","lorong":"","updatedAt":"14 Sep 2026"},
{"id":52,"name":"Velvet Lounge Sofa 2-Seater","warehouseStock":8,"warehouseName":"Warehouse Bali 66","itemStock":8,"stokMin":10,"stokUsed":2,"valuation":6500000,"totalValuation":52000000,"minStatus":"Critical","flag1":"","flag2":"","asile":"","rack":"","level":"","lantai":"","lorong":"","updatedAt":"13 Sep 2026"},
{"id":2,"name":"Acrylic Flower Sticker L=188cm W=88cm","warehouseStock":100,"warehouseName":"Warehouse Bali 66","itemStock":100,"stokMin":5,"stokUsed":7,"valuation":650000,"totalValuation":65000000,"minStatus":"Safe","flag1":1,"flag2":"","asile":1,"rack":1,"level":1,"lantai":"","lorong":"","updatedAt":"-"},
{"id":9,"name":"Artificial Flower Chrysant Giant White","warehouseStock":342,"warehouseName":"Warehouse Bali 66","itemStock":342,"stokMin":10,"stokUsed":0,"valuation":45000,"totalValuation":15390000,"minStatus":"Safe","flag1":2,"flag2":1,"asile":2,"rack":1,"level":2,"lantai":"","lorong":"","updatedAt":"12 Mar 2025"},
{"id":10,"name":"Artificial Flower Lunaria White","warehouseStock":327,"warehouseName":"Warehouse Bali 66","itemStock":327,"stokMin":20,"stokUsed":15,"valuation":35000,"totalValuation":11445000,"minStatus":"Safe","flag1":1,"flag2":2,"asile":1,"rack":2,"level":1,"lantai":"","lorong":"","updatedAt":"10 Mar 2025"},
{"id":11,"name":"Artificial Rose Pink","warehouseStock":182,"warehouseName":"Warehouse Bali 66","itemStock":182,"stokMin":15,"stokUsed":0,"valuation":25000,"totalValuation":4550000,"minStatus":"Safe","flag1":1,"flag2":1,"asile":1,"rack":1,"level":3,"lantai":"","lorong":"","updatedAt":"08 Mar 2025"},
{"id":12,"name":"Backdrop Stand 2m","warehouseStock":8,"warehouseName":"Warehouse C9","itemStock":8,"stokMin":2,"stokUsed":1,"valuation":1250000,"totalValuation":10000000,"minStatus":"Safe","flag1":"","flag2":"","asile":"A","rack":1,"level":1,"lantai":1,"lorong":"L1","updatedAt":"07 Mar 2025"},
{"id":13,"name":"White Latex Balloon","warehouseStock":500,"warehouseName":"Warehouse Surabaya","itemStock":500,"stokMin":50,"stokUsed":0,"valuation":1500,"totalValuation":750000,"minStatus":"Safe","flag1":"","flag2":"","asile":"B","rack":2,"level":1,"lantai":1,"lorong":"L2","updatedAt":"-"},
{"id":14,"name":"Large Round Candle Holder","warehouseStock":60,"warehouseName":"Warehouse Bali 70","itemStock":60,"stokMin":5,"stokUsed":5,"valuation":85000,"totalValuation":5100000,"minStatus":"Safe","flag1":"","flag2":"","asile":"","rack":"","level":"","lantai":"","lorong":"","updatedAt":"-"},
{"id":15,"name":"Cylinder-Shaped Crystal","warehouseStock":100,"warehouseName":"Warehouse Bali 66","itemStock":100,"stokMin":10,"stokUsed":0,"valuation":60000,"totalValuation":6000000,"minStatus":"Safe","flag1":1,"flag2":"","asile":1,"rack":3,"level":1,"lantai":"","lorong":"","updatedAt":"-"},
{"id":16,"name":"Plain White Fabric 3m","warehouseStock":20,"warehouseName":"Warehouse Cililitan","itemStock":20,"stokMin":3,"stokUsed":2,"valuation":75000,"totalValuation":1500000,"minStatus":"Safe","flag1":"","flag2":"","asile":"C","rack":1,"level":2,"lantai":1,"lorong":"L3","updatedAt":"05 Mar 2025"},
{"id":1,"name":"Acrylic Ball Silver 20cm","warehouseStock":189,"warehouseName":"Warehouse Bali 70","itemStock":170,"stokMin":0,"stokUsed":0,"valuation":55000,"totalValuation":9350000,"minStatus":"Not Set","flag1":"","flag2":"","asile":"TBC","rack":"TBC","level":"TBC","lantai":"","lorong":"","updatedAt":"-"},
{"id":3,"name":"Acrylic Flower Sticker L=200cm W=100cm","warehouseStock":4,"warehouseName":"Warehouse Bali 70","itemStock":4,"stokMin":0,"stokUsed":0,"valuation":780000,"totalValuation":3120000,"minStatus":"Not Set","flag1":"","flag2":"","asile":"","rack":"","level":"","lantai":"","lorong":"","updatedAt":"-"},
{"id":4,"name":"Angpao Barrel Iron Trim","warehouseStock":2,"warehouseName":"Warehouse Bali 70","itemStock":2,"stokMin":0,"stokUsed":0,"valuation":550000,"totalValuation":1100000,"minStatus":"Not Set","flag1":"","flag2":"","asile":"","rack":"","level":"","lantai":"","lorong":"","updatedAt":"-"},
{"id":5,"name":"House-Shaped Wooden Angpao Box","warehouseStock":1,"warehouseName":"Warehouse Bali 70","itemStock":1,"stokMin":0,"stokUsed":0,"valuation":425000,"totalValuation":425000,"minStatus":"Not Set","flag1":"","flag2":"","asile":"","rack":"","level":"","lantai":"","lorong":"","updatedAt":"-"}
]
```
⚠ The seed has **no `Warning` row**. `minStatus` is stored in the seed, and recomputed on any stock change by
`minStatusFor(stock, min)` (`src/lib/stockOpnameStore.js`): `min 0 → Not Set`, `stock ≤ min → Critical`,
`stock ≤ 1.5·min → Warning`, else `Safe`. Illustrative Warning row: change row 2 (`Acrylic Flower Sticker L=188cm W=88cm`,
`stokMin 5`) to `itemStock 7` → Warning. Catalog fields `totalStock`/`warehouse`/`stockStatus` in `inventory.js` are legacy
and **re-derived** from rows by `src/lib/catalogStore.js`.

### A5. Master data
`src/data/warehouses.js` (`"Buy"` is a placeholder, not a real place — excluded from deploy/keep pickers):
```json
[
{"id":1,"name":"Buy","location":"None","pic":"Novi","createdAt":"24 Feb 2025, 02:02","updatedAt":"-"},
{"id":2,"name":"Warehouse Bali 66","location":"Bali - Bali Cliff Street No. 66","pic":"Novi","createdAt":"23 Feb 2022, 06:02","updatedAt":"24 Feb 2025, 02:02"},
{"id":3,"name":"Warehouse Bali 69","location":"Bali","pic":"Anto/Novi","createdAt":"24 Feb 2025, 02:02","updatedAt":"-"},
{"id":4,"name":"Warehouse Bali 70","location":"Bali - Bali Cliff Street No. 70","pic":"Anto/Novi","createdAt":"23 Feb 2022, 06:02","updatedAt":"24 Feb 2025, 02:02"},
{"id":5,"name":"Warehouse C9","location":"C9 Bali","pic":"","createdAt":"24 Mar 2025, 01:03","updatedAt":"-"},
{"id":6,"name":"Warehouse C9","location":"C9 Bali","pic":"","createdAt":"24 Mar 2025, 01:03","updatedAt":"-"},
{"id":7,"name":"Warehouse C9","location":"C9 Bali","pic":"","createdAt":"24 Mar 2025, 01:03","updatedAt":"-"},
{"id":8,"name":"Warehouse C9 Update","location":"C9 Bali","pic":"","createdAt":"24 Feb 2025, 02:02","updatedAt":"24 Mar 2025, 01:03"},
{"id":9,"name":"Warehouse Cililitan","location":"East Jakarta","pic":"Darmian","createdAt":"17 Feb 2025, 14:02","updatedAt":"-"},
{"id":10,"name":"Warehouse Surabaya","location":"Surabaya","pic":"Anto","createdAt":"23 Feb 2022, 06:02","updatedAt":"24 Feb 2025, 02:02"}
]
```
`src/data/areas.js` — `initialAreas`:
```json
[
{"id":1,"name":"BRIDAL BACKDROP","desc":"Main bridal backdrop setup area","createdAt":"2024-01-10","updatedAt":"2024-03-12"},
{"id":2,"name":"BRIDAL ROOM","desc":"Preparation and dressing room area","createdAt":"2024-01-10","updatedAt":"2024-03-12"},
{"id":3,"name":"BRIDAL TABLE","desc":"Head table for bride and groom","createdAt":"2024-01-10","updatedAt":"2024-04-01"},
{"id":4,"name":"CAR DECOR","desc":"Decoration for wedding cars","createdAt":"2024-01-15","updatedAt":"2024-04-01"},
{"id":5,"name":"CEREMONY","desc":"Main ceremony stage and aisle","createdAt":"2024-01-15","updatedAt":"2024-04-02"},
{"id":6,"name":"CHAMPAGNE WALL","desc":"Champagne tower and glass wall display","createdAt":"2024-01-20","updatedAt":"2024-04-02"},
{"id":7,"name":"COCKTAIL","desc":"Cocktail reception area setup","createdAt":"2024-01-20","updatedAt":"2024-04-03"},
{"id":8,"name":"DISPLAY TABLE","desc":"Product & gift display table","createdAt":"2024-01-22","updatedAt":"2024-04-03"},
{"id":9,"name":"ENTRANCE","desc":"Main entrance and welcome area","createdAt":"2024-01-22","updatedAt":"2024-04-05"},
{"id":10,"name":"FLORIST","desc":"Flower arrangement and staging area","createdAt":"2024-02-01","updatedAt":"2024-04-05"},
{"id":11,"name":"GUEST TABLE","desc":"Guest seating table setup","createdAt":"2024-02-01","updatedAt":"2024-04-08"},
{"id":12,"name":"LABOUR","desc":"Labour and logistics staging area","createdAt":"2024-02-05","updatedAt":"2024-04-08"},
{"id":13,"name":"LOUNGE","desc":"VIP lounge and relaxation area","createdAt":"2024-02-05","updatedAt":"2024-04-10"},
{"id":14,"name":"Area Hall","desc":"Main event hall area","createdAt":"2024-02-10","updatedAt":"2024-04-10"},
{"id":15,"name":"Area 22 up","desc":"Second floor multipurpose area","createdAt":"2024-02-12","updatedAt":"2024-04-12"}
]
```
`SUB_AREAS`:
```json
{
  "BRIDAL BACKDROP": [
    "Backdrop Stand",
    "Flower Arch",
    "Lighting Rig"
  ],
  "BRIDAL ROOM": [
    "Dressing Table",
    "Mirror Panel",
    "Bridal Chair"
  ],
  "BRIDAL TABLE": [
    "Table Linen",
    "Centerpiece",
    "Chair Cover"
  ],
  "CAR DECOR": [
    "Car Ribbon",
    "Car Flowers"
  ],
  "CEREMONY": [
    "Aisle Runner",
    "Altar Setup",
    "Pew Flowers",
    "Arch"
  ],
  "CHAMPAGNE WALL": [
    "Glass Holder",
    "Champagne Stand",
    "Backdrop"
  ],
  "COCKTAIL": [
    "Cocktail Table",
    "Bar Decor",
    "High-Top Stools"
  ],
  "DISPLAY TABLE": [
    "Table Cloth",
    "Item Stands"
  ],
  "ENTRANCE": [
    "Welcome Board",
    "Flower Gate",
    "Balloon Arch",
    "Signage"
  ],
  "FLORIST": [
    "Roses",
    "White Lilies",
    "Greenery"
  ],
  "GUEST TABLE": [
    "Centerpiece",
    "Name Card",
    "Table Number",
    "Linen"
  ],
  "LABOUR": [],
  "LOUNGE": [
    "Sofa Set",
    "Coffee Table",
    "Side Lamp"
  ],
  "Area Hall": [
    "Main Stage",
    "Side Wings"
  ]
}
```
`src/data/categories.js`:
```json
[
{"id":1,"name":"Floral","desc":"Fresh and artificial flower arrangements","itemCount":3,"createdAt":"2024-01-05","updatedAt":"2024-03-10"},
{"id":2,"name":"Furniture","desc":"Tables, chairs, and seating equipment","itemCount":3,"createdAt":"2024-01-05","updatedAt":"2024-03-10"},
{"id":3,"name":"Lighting","desc":"Stage and ambiance lighting equipment","itemCount":0,"createdAt":"2024-01-05","updatedAt":"2024-03-12"},
{"id":4,"name":"Fabric","desc":"Linens, drapes, and fabric materials","itemCount":3,"createdAt":"2024-01-05","updatedAt":"2024-03-12"},
{"id":5,"name":"Decoration","desc":"Ornamental and decorative event accessories","itemCount":8,"createdAt":"2024-01-05","updatedAt":"2024-04-01"},
{"id":6,"name":"Equipment","desc":"Technical and functional event equipment","itemCount":3,"createdAt":"2024-01-05","updatedAt":"2024-04-01"}
]
```
`src/data/units.js` (items store `abbr`):
```json
[
{"id":1,"name":"Piece","abbr":"pcs","desc":"Individual item count","itemCount":15,"createdAt":"2024-01-05","updatedAt":"2024-03-10"},
{"id":2,"name":"Meter","abbr":"meter","desc":"Length measurement in meters","itemCount":3,"createdAt":"2024-01-05","updatedAt":"2024-03-10"},
{"id":3,"name":"Unit","abbr":"unit","desc":"Complete assembled unit","itemCount":7,"createdAt":"2024-01-05","updatedAt":"2024-03-12"},
{"id":4,"name":"Roll","abbr":"roll","desc":"Material supplied in rolled form","itemCount":1,"createdAt":"2024-01-05","updatedAt":"2024-03-12"},
{"id":5,"name":"Set","abbr":"set","desc":"A matched collection of items","itemCount":0,"createdAt":"2024-01-10","updatedAt":"2024-04-01"},
{"id":6,"name":"Box","abbr":"box","desc":"Items packaged in a box","itemCount":0,"createdAt":"2024-01-10","updatedAt":"2024-04-01"}
]
```
`src/data/vendors.js` — all kinds (`loan` = Rent; 101–103 = outsource):
```json
[
{"id":5,"name":"Wedding Organizer Mitra","origin":"External","kinds":["loan"],"phone":"0819-4567-8901","address":"Jl. Kemang Raya No. 7, South Jakarta","description":"Partner wedding organizer. Rents out tableware, charger plates and décor to us."},
{"id":6,"name":"Toko Dekorasi Rina","origin":"External","kinds":["production","loan"],"phone":"0821-9988-7766","address":"Pasar Kumbasari Blok B-12, Denpasar, Bali","description":"Decoration rental shop. Produces small decorative pieces on request."},
{"id":7,"name":"Bengkel Las Maju Jaya","origin":"External","kinds":["production"],"phone":"0812-7788-1200","address":"Jl. Gatot Subroto Barat No. 88, Denpasar, Bali","description":"Iron and steel workshop. Makes flower arches, stands and metal frames."},
{"id":8,"name":"Workshop Kayu Internal","origin":"Internal","kinds":["production"],"phone":"Ext. 221","address":"Warehouse Bali 70 – workshop area","description":"Our in-house carpentry team. Builds wooden furniture, panels and display risers."},
{"id":9,"name":"Tim Florist Internal","origin":"Internal","kinds":["production"],"phone":"Ext. 230","address":"Warehouse Bali 66 – florist room","description":"In-house florists. Make artificial and fresh flower arrangements and walls."},
{"id":10,"name":"CV Kain Nusantara","origin":"External","kinds":["production"],"phone":"0822-4455-9000","address":"Jl. Cigondewah Kaler No. 12, Bandung","description":"Textile supplier and tailor. Sews drapes, table linen and chair sashes."},
{"id":11,"name":"Akrilik Prima","origin":"External","kinds":["production"],"phone":"0818-6060-3131","address":"Jl. Mangga Dua Raya Blok C-5, North Jakarta","description":"Acrylic laser-cutting shop. Makes signage, table numbers and acrylic décor."},
{"id":12,"name":"Tim Lighting Internal","origin":"Internal","kinds":["production"],"phone":"Ext. 245","address":"Warehouse C9 – electrical room","description":"In-house lighting technicians. Assemble light curtains and marquee letters."},
{"id":13,"name":"Rattan Craft Cirebon","origin":"External","kinds":["production"],"phone":"0813-2020-7878","address":"Desa Tegalwangi, Weru, Cirebon","description":"Rattan craftsmen. Weave hanging rattan décor and peacock chairs."},
{"id":14,"name":"Lilin Aroma Jogja","origin":"External","kinds":["production"],"phone":"0274-555-1919","address":"Jl. Kaliurang Km 9, Sleman, Yogyakarta","description":"Candle maker. Supplies pillar candles and tealights in bulk."},
{"id":15,"name":"Sewa Kursi Jaya Rental","origin":"External","kinds":["loan"],"phone":"0812-9000-1515","address":"Jl. Imam Bonjol No. 301, Denpasar, Bali","description":"Chair and table rental: Tiffany, cross-back, banquet tables. Delivers and picks up."},
{"id":16,"name":"Bali Party Rental","origin":"External","kinds":["loan"],"phone":"0361-777-262","address":"Jl. Bypass Ngurah Rai No. 88, Sanur, Bali","description":"Party equipment rental: lounge sets, cocktail tables, linens and tableware."},
{"id":17,"name":"Glassware Pro Rental","origin":"External","kinds":["loan"],"phone":"0811-3838-404","address":"Jl. Kenjeran No. 120, Surabaya","description":"Glassware and champagne tower sets for rent, charged per piece."},
{"id":18,"name":"Nusantara Sound & Light","origin":"External","kinds":["loan"],"phone":"0821-5454-7070","address":"Jl. Fatmawati No. 15, South Jakarta","description":"Sound system, microphones, moving heads and stage lighting rental with operator."},
{"id":19,"name":"Tenda Megah Rental","origin":"External","kinds":["loan"],"phone":"0813-1122-3344","address":"Jl. Soekarno-Hatta No. 9, Malang","description":"Tents, flooring and generator rental for outdoor events."},
{"id":101,"name":"Bali Florist Collective","origin":"External","kinds":["outsource"],"phone":"0812-3800-4411","address":"Jl. Raya Kerobokan No. 45, Badung, Bali","description":"Fresh-flower arrangements and installations, made and set up on site."},
{"id":102,"name":"Videotron Nusantara","origin":"External","kinds":["outsource"],"phone":"0811-9090-2233","address":"Jl. TB Simatupang No. 18, South Jakarta","description":"LED videotron screens with operator, delivered and rigged for the event."},
{"id":103,"name":"Kru Rigging Profesional","origin":"External","kinds":["outsource"],"phone":"0857-4100-6677","address":"Jl. Ahmad Yani No. 210, Surabaya","description":"Stage rigging, truss and hanging-decor crew with their own equipment."}
]
```

### A6. Rent / outsource / production / opname / users
`src/data/eventLoanSeed.js` — `SEED_EVENT_LOANS` (rent, per event; first 4 of the event keys shown). All keys:
```
2025-11-20 | WEDDING BALI CLIFF
2026-01-18 | GALA DINNER BCA
2026-02-14 | GRAND WEDDING SURABAYA
2026-04-18 | BEACHSIDE ANNIVERSARY
2026-05-08 | WEDDING SPRING GARDEN
2026-05-28 | CORPORATE SUMMIT 2026
2026-06-10 | HARVEST FESTIVAL BAZAAR
2026-07-10 | WEDDING BALI SEASON
2026-07-12 | CORPORATE GALA BALI
2026-09-03 | GRAND GALA NIGHT
2026-04-28 | BABY SHOWER MILA
2026-04-22 | INTIMATE DINNER UBUD
2026-05-15 | ENGAGEMENT RINA & BAYU
```
```json
{
  "2025-11-20 | WEDDING BALI CLIFF": [
    {
      "id": 2,
      "subArea": "",
      "note": "",
      "requestedBy": "Dewi Anjani",
      "borrowedAt": "2025-11-21",
      "returnedAt": "2025-11-24",
      "itemName": "Tent 10x10m Clear Top",
      "qty": 2,
      "unit": "unit",
      "area": "CEREMONY",
      "vendorId": 19,
      "vendorName": "Tenda Megah Rental",
      "startDate": "2025-11-21",
      "dueDate": "2025-11-24",
      "rentalCost": 3500000,
      "status": "Returned",
      "stage": "On preparing items",
      "requestedAt": "2025-11-01"
    },
    {
      "id": 1,
      "subArea": "",
      "note": "",
      "requestedBy": "Dewi Anjani",
      "borrowedAt": "2025-11-21",
      "returnedAt": "2025-11-24",
      "itemName": "Cross-Back Chair",
      "qty": 80,
      "unit": "unit",
      "area": "GUEST TABLE",
      "vendorId": 15,
      "vendorName": "Sewa Kursi Jaya Rental",
      "startDate": "2025-11-21",
      "dueDate": "2025-11-24",
      "rentalCost": 25000,
      "status": "Returned",
      "stage": "On preparing items",
      "requestedAt": "2025-11-01"
    }
  ],
  "2026-01-18 | GALA DINNER BCA": [
    {
      "id": 2,
      "subArea": "Main Stage",
      "note": "With 1 operator.",
      "requestedBy": "Dewi Anjani",
      "borrowedAt": "2026-01-19",
      "returnedAt": "2026-01-21",
      "itemName": "Moving Head Spotlight",
      "qty": 8,
      "unit": "unit",
      "area": "Area Hall",
      "vendorId": 18,
      "vendorName": "Nusantara Sound & Light",
      "startDate": "2026-01-19",
      "dueDate": "2026-01-21",
      "rentalCost": 450000,
      "status": "Returned",
      "stage": "Finish setup",
      "requestedAt": "2026-01-05"
    },
    {
      "id": 1,
      "subArea": "",
      "note": "6 broken, charged Rp 35.000 each.",
      "requestedBy": "Dewi Anjani",
      "borrowedAt": "2026-01-19",
      "returnedAt": "2026-01-22",
      "itemName": "Champagne Glass Coupe",
      "qty": 300,
      "unit": "pcs",
      "area": "CHAMPAGNE WALL",
      "vendorId": 17,
      "vendorName": "Glassware Pro Rental",
      "startDate": "2026-01-19",
      "dueDate": "2026-01-21",
      "rentalCost": 4000,
      "status": "Returned",
      "stage": "Finish setup",
      "requestedAt": "2026-01-05"
    }
  ],
  "2026-02-14 | GRAND WEDDING SURABAYA": [
    {
      "id": 4,
      "subArea": "",
      "note": "Same plates later booked for Wedding Spring Garden, Corporate Gala Bali, Wedding Bali Season and Grand Gala Night.",
      "requestedBy": "Dewi Anjani",
      "borrowedAt": "2026-02-13",
      "returnedAt": "2026-02-16",
      "itemName": "Gold Charger Plate",
      "qty": 250,
      "unit": "pcs",
      "area": "GUEST TABLE",
      "vendorId": 5,
      "vendorName": "Wedding Organizer Mitra",
      "startDate": "2026-02-13",
      "dueDate": "2026-02-16",
      "rentalCost": 8000,
      "status": "Returned",
      "stage": "On preparing items",
      "requestedAt": "2026-01-25"
    },
    {
      "id": 3,
      "subArea": "",
      "note": "",
      "requestedBy": "Dewi Anjani",
      "borrowedAt": "2026-02-13",
      "returnedAt": "2026-02-16",
      "itemName": "Round Banquet Table",
      "qty": 30,
      "unit": "unit",
      "area": "GUEST TABLE",
      "vendorId": 16,
      "vendorName": "Bali Party Rental",
      "startDate": "2026-02-13",
      "dueDate": "2026-02-16",
      "rentalCost": 75000,
      "status": "Returned",
      "stage": "On preparing items",
      "requestedAt": "2026-01-25"
    },
    {
      "id": 2,
      "subArea": "",
      "note": "",
      "requestedBy": "Dewi Anjani",
      "borrowedAt": "2026-02-13",
      "returnedAt": "2026-02-16",
      "itemName": "Tiffany Chair",
      "qty": 250,
      "unit": "unit",
      "area": "GUEST TABLE",
      "vendorId": 15,
      "vendorName": "Sewa Kursi Jaya Rental",
      "startDate": "2026-02-13",
      "dueDate": "2026-02-16",
      "rentalCost": 20000,
      "status": "Returned",
      "stage": "On preparing items",
      "requestedAt": "2026-01-25"
    },
    {
      "id": 1,
      "subArea": "",
      "note": "",
      "requestedBy": "Dewi Anjani",
      "borrowedAt": "2026-02-13",
      "returnedAt": "2026-02-15",
      "itemName": "Wireless Handheld Microphone",
      "qty": 4,
      "unit": "unit",
      "area": "Area Hall",
      "vendorId": 18,
      "vendorName": "Nusantara Sound & Light",
      "startDate": "2026-02-13",
      "dueDate": "2026-02-15",
      "rentalCost": 150000,
      "status": "Returned",
      "stage": "Finish setup",
      "requestedAt": "2026-02-01"
    }
  ],
  "2026-04-18 | BEACHSIDE ANNIVERSARY": [
    {
      "id": 2,
      "subArea": "",
      "note": "",
      "requestedBy": "Dewi Anjani",
      "borrowedAt": "2026-04-19",
      "returnedAt": null,
      "itemName": "Generator Silent 5000W",
      "qty": 1,
      "unit": "unit",
      "area": "LABOUR",
      "vendorId": 19,
      "vendorName": "Tenda Megah Rental",
      "startDate": "2026-04-19",
      "dueDate": "2026-04-22",
      "rentalCost": 1200000,
      "status": "Borrowed",
      "stage": "On preparing items",
      "requestedAt": "2026-04-01"
    },
    {
      "id": 1,
      "subArea": "",
      "note": "",
      "requestedBy": "Dewi Anjani",
      "borrowedAt": "2026-04-19",
      "returnedAt": null,
      "itemName": "Lounge Sofa Set",
      "qty": 3,
      "unit": "set",
      "area": "LOUNGE",
      "vendorId": 16,
      "vendorName": "Bali Party Rental",
      "startDate": "2026-04-19",
      "dueDate": "2026-04-22",
      "rentalCost": 850000,
      "status": "Borrowed",
      "stage": "On preparing items",
      "requestedAt": "2026-04-01"
    }
  ]
}
```
`SEED_GENERAL_RENTALS` (rent kept in a warehouse, not tied to an event), full:
```json
[
{"id":4,"itemName":"Champagne Glass Coupe","qty":300,"unit":"pcs","warehouse":"Warehouse C9","purpose":"Glass buffer for the May events","vendorId":17,"vendorName":"Glassware Pro Rental","startDate":"2026-04-01","dueDate":"2026-05-20","rentalCost":3000,"status":"Borrowed","requestedBy":"Novi","requestedAt":"2026-03-25","borrowedAt":"2026-04-01","returnedAt":null,"note":""},
{"id":3,"itemName":"Projector Screen 3x2m","qty":2,"unit":"unit","warehouse":"Warehouse Cililitan","purpose":"Client presentation week","vendorId":18,"vendorName":"Nusantara Sound & Light","startDate":"2026-03-30","dueDate":"2026-04-05","rentalCost":250000,"status":"Borrowed","requestedBy":"Darmian","requestedAt":"2026-03-27","borrowedAt":"2026-03-30","returnedAt":null,"note":"Vendor asked to extend or return."},
{"id":2,"itemName":"Tiffany Chair","qty":100,"unit":"unit","warehouse":"Warehouse Bali 66","purpose":"Buffer stock for the July wedding season","vendorId":15,"vendorName":"Sewa Kursi Jaya Rental","startDate":"2026-06-28","dueDate":"2026-07-31","rentalCost":15000,"status":"Requested","requestedBy":"Dewi Anjani","requestedAt":"2026-04-08","borrowedAt":null,"returnedAt":null,"note":"Monthly rate."},
{"id":1,"itemName":"Forklift Electric 1.5T","qty":1,"unit":"unit","warehouse":"Warehouse Surabaya","purpose":"Re-racking during stock opname","vendorId":19,"vendorName":"Tenda Megah Rental","startDate":"2026-02-10","dueDate":"2026-02-12","rentalCost":1500000,"status":"Returned","requestedBy":"Anto","requestedAt":"2026-02-03","borrowedAt":"2026-02-10","returnedAt":"2026-02-12","note":""}
]
```
`SEED_EVENT_OUTSOURCE`, full (there are no general outsource records):
```json
{
  "2026-01-18 | GALA DINNER BCA": [
    {
      "id": 2,
      "subArea": "Main Stage",
      "note": "Includes operator and rigging.",
      "requestedBy": "Dewi Anjani",
      "borrowedAt": "2026-01-19",
      "returnedAt": "2026-01-21",
      "itemName": "LED Videotron 4x3m",
      "qty": 1,
      "unit": "unit",
      "area": "Area Hall",
      "vendorId": 102,
      "vendorName": "Videotron Nusantara",
      "startDate": "2026-01-19",
      "dueDate": "2026-01-21",
      "rentalCost": 18000000,
      "status": "Returned",
      "stage": "Finish setup",
      "requestedAt": "2026-01-04"
    },
    {
      "id": 1,
      "subArea": "",
      "note": "",
      "requestedBy": "Dewi Anjani",
      "borrowedAt": "2026-01-19",
      "returnedAt": "2026-01-19",
      "itemName": "Fresh Flower Centerpiece",
      "qty": 40,
      "unit": "pcs",
      "area": "GUEST TABLE",
      "vendorId": 101,
      "vendorName": "Bali Florist Collective",
      "startDate": "2026-01-19",
      "dueDate": "2026-01-19",
      "rentalCost": 450000,
      "status": "Returned",
      "stage": "Finish setup",
      "requestedAt": "2026-01-04"
    }
  ],
  "2026-04-18 | BEACHSIDE ANNIVERSARY": [
    {
      "id": 1,
      "subArea": "",
      "note": "Fresh white roses and baby breath.",
      "requestedBy": "Dewi Anjani",
      "borrowedAt": "2026-04-08",
      "returnedAt": null,
      "itemName": "Floral Arch Installation",
      "qty": 1,
      "unit": "set",
      "area": "CEREMONY",
      "vendorId": 101,
      "vendorName": "Bali Florist Collective",
      "startDate": "2026-04-19",
      "dueDate": "2026-04-19",
      "rentalCost": 12500000,
      "status": "Borrowed",
      "stage": "On preparing items",
      "requestedAt": "2026-04-02"
    }
  ],
  "2026-05-08 | WEDDING SPRING GARDEN": [
    {
      "id": 2,
      "subArea": "",
      "note": "",
      "requestedBy": "Dewi Anjani",
      "borrowedAt": null,
      "returnedAt": null,
      "itemName": "Hanging Flower Ceiling",
      "qty": 1,
      "unit": "set",
      "area": "CEREMONY",
      "vendorId": 103,
      "vendorName": "Kru Rigging Profesional",
      "startDate": "2026-05-08",
      "dueDate": "2026-05-10",
      "rentalCost": 9000000,
      "status": "Requested",
      "stage": "On preparing items",
      "requestedAt": "2026-04-06"
    },
    {
      "id": 1,
      "subArea": "",
      "note": "",
      "requestedBy": "Dewi Anjani",
      "borrowedAt": null,
      "returnedAt": null,
      "itemName": "Fresh Flower Centerpiece",
      "qty": 25,
      "unit": "pcs",
      "area": "GUEST TABLE",
      "vendorId": 101,
      "vendorName": "Bali Florist Collective",
      "startDate": "2026-05-09",
      "dueDate": "2026-05-09",
      "rentalCost": 450000,
      "status": "Requested",
      "stage": "On preparing items",
      "requestedAt": "2026-04-06"
    }
  ],
  "2026-05-28 | CORPORATE SUMMIT 2026": [
    {
      "id": 1,
      "subArea": "Main Stage",
      "note": "",
      "requestedBy": "Dewi Anjani",
      "borrowedAt": null,
      "returnedAt": null,
      "itemName": "LED Videotron 4x3m",
      "qty": 2,
      "unit": "unit",
      "area": "Area Hall",
      "vendorId": 102,
      "vendorName": "Videotron Nusantara",
      "startDate": "2026-05-31",
      "dueDate": "2026-06-03",
      "rentalCost": 18000000,
      "status": "Requested",
      "stage": "Created by admin up",
      "requestedAt": "2026-04-08"
    }
  ]
}
```
`src/data/productionSeed.js` — `SEED_EVENT_PRODUCTION` (first 3 events). All keys:
```
2025-11-20 | WEDDING BALI CLIFF
2026-01-18 | GALA DINNER BCA
2026-02-14 | GRAND WEDDING SURABAYA
2026-04-03 | WEDDING B
2026-04-18 | BEACHSIDE ANNIVERSARY
2026-05-08 | WEDDING SPRING GARDEN
2026-05-28 | CORPORATE SUMMIT 2026
2026-06-10 | HARVEST FESTIVAL BAZAAR
2026-07-10 | WEDDING BALI SEASON
2026-09-03 | GRAND GALA NIGHT
```
```json
{
  "2025-11-20 | WEDDING BALI CLIFF": [
    {
      "id": 2,
      "type": "production",
      "subArea": "",
      "replacesItemId": null,
      "note": "Cliff-side ceremony backdrop, white and blush palette.",
      "requestedBy": "Dewi Anjani",
      "name": "Bridal Backdrop Floral Wall",
      "qty": 1,
      "area": "BRIDAL BACKDROP",
      "warehouse": "Warehouse Bali 70",
      "vendorOrigin": "Internal",
      "vendorId": 9,
      "vendorName": "Tim Florist Internal",
      "status": "Done",
      "stage": "On preparing items",
      "requestedAt": "2025-11-02",
      "finishedAt": "2025-11-15"
    },
    {
      "id": 1,
      "type": "production",
      "subArea": "",
      "replacesItemId": null,
      "note": "",
      "requestedBy": "Dewi Anjani",
      "name": "Hanging Rattan 1",
      "qty": 6,
      "area": "PHOTOBOOTH",
      "warehouse": "Warehouse Bali 70",
      "vendorOrigin": "External",
      "vendorId": 13,
      "vendorName": "Rattan Craft Cirebon",
      "status": "Done",
      "stage": "On preparing items",
      "requestedAt": "2025-10-28",
      "finishedAt": "2025-11-12"
    }
  ],
  "2026-01-18 | GALA DINNER BCA": [
    {
      "id": 3,
      "type": "production",
      "subArea": "",
      "replacesItemId": null,
      "note": "",
      "requestedBy": "Dewi Anjani",
      "name": "Marquee Letter Light \"LOVE\"",
      "qty": 1,
      "area": "ENTRANCE",
      "warehouse": "Warehouse Bali 70",
      "vendorOrigin": "Internal",
      "vendorId": 12,
      "vendorName": "Tim Lighting Internal",
      "status": "Done",
      "stage": "Finish setup",
      "requestedAt": "2026-01-02",
      "finishedAt": "2026-01-12"
    },
    {
      "id": 2,
      "type": "production",
      "subArea": "",
      "replacesItemId": null,
      "note": "Gold mirror acrylic with client logo.",
      "requestedBy": "Dewi Anjani",
      "name": "Acrylic Welcome Sign Board",
      "qty": 2,
      "area": "ENTRANCE",
      "warehouse": "Warehouse Bali 70",
      "vendorOrigin": "External",
      "vendorId": 11,
      "vendorName": "Akrilik Prima",
      "status": "Done",
      "stage": "Finish setup",
      "requestedAt": "2026-01-03",
      "finishedAt": "2026-01-10"
    },
    {
      "id": 1,
      "type": "production",
      "subArea": "",
      "replacesItemId": null,
      "note": "",
      "requestedBy": "Dewi Anjani",
      "name": "Mirror Table Number Stand",
      "qty": 30,
      "area": "GUEST TABLE",
      "warehouse": "Warehouse Bali 66",
      "vendorOrigin": "External",
      "vendorId": 11,
      "vendorName": "Akrilik Prima",
      "status": "Done",
      "stage": "On preparing items",
      "requestedAt": "2025-12-29",
      "finishedAt": "2026-01-08"
    }
  ],
  "2026-02-14 | GRAND WEDDING SURABAYA": [
    {
      "id": 3,
      "type": "production",
      "subArea": "",
      "replacesItemId": null,
      "note": "Replaces 4 arches reported broken after Gala Dinner BCA.",
      "requestedBy": "Dewi Anjani",
      "name": "Iron Flower Arch 60cm",
      "qty": 4,
      "area": "CEREMONY",
      "warehouse": "Warehouse Bali 70",
      "vendorOrigin": "External",
      "vendorId": 7,
      "vendorName": "Bengkel Las Maju Jaya",
      "status": "Done",
      "stage": "On preparing items",
      "requestedAt": "2026-01-20",
      "finishedAt": "2026-02-04",
      "reason": "broken"
    },
    {
      "id": 2,
      "type": "production",
      "subArea": "",
      "replacesItemId": null,
      "note": "",
      "requestedBy": "Dewi Anjani",
      "name": "Bridal Table Linen Set",
      "qty": 3,
      "area": "BRIDAL TABLE",
      "warehouse": "Warehouse Cililitan",
      "vendorOrigin": "External",
      "vendorId": 10,
      "vendorName": "CV Kain Nusantara",
      "status": "Done",
      "stage": "On preparing items",
      "requestedAt": "2026-01-22",
      "finishedAt": "2026-02-06"
    },
    {
      "id": 1,
      "type": "production",
      "subArea": "",
      "replacesItemId": null,
      "note": "",
      "requestedBy": "Dewi Anjani",
      "name": "Display Table Riser Set",
      "qty": 4,
      "area": "DISPLAY TABLE",
      "warehouse": "Warehouse Bali 70",
      "vendorOrigin": "Internal",
      "vendorId": 8,
      "vendorName": "Workshop Kayu Internal",
      "status": "Done",
      "stage": "Created by admin up",
      "requestedAt": "2026-01-18",
      "finishedAt": "2026-02-01"
    }
  ]
}
```
`SEED_MANUAL_PRODUCTION` (first 4):
```json
[
{"id":6,"name":"Tealight Holder 15cm","qty":100,"warehouse":"Warehouse Bali 70","vendorOrigin":"External","vendorId":14,"vendorName":"Lilin Aroma Jogja","status":"In Production","requestedBy":"Dewi Anjani","requestedAt":"2026-04-06","note":"Restock before wedding season."},
{"id":5,"name":"Gold Ribbon 5m","qty":40,"warehouse":"Warehouse Bali 66","vendorOrigin":"External","vendorId":6,"vendorName":"Toko Dekorasi Rina","status":"Requested","requestedBy":"Novi","requestedAt":"2026-04-08","note":"Stock is 0."},
{"id":4,"name":"Hanging Rattan 3","qty":8,"warehouse":"Warehouse Bali 70","vendorOrigin":"External","vendorId":13,"vendorName":"Rattan Craft Cirebon","status":"Done","requestedBy":"Anto","requestedAt":"2026-02-20","finishedAt":"2026-03-12"},
{"id":3,"name":"Velvet Drape Panel","qty":10,"warehouse":"Warehouse Cililitan","vendorOrigin":"External","vendorId":10,"vendorName":"CV Kain Nusantara","status":"Done","requestedBy":"Darmian","requestedAt":"2026-02-02","finishedAt":"2026-02-18"}
]
```
`src/data/stockOpnameHistory.js` — first 2 (14 opnames total; statuses: {"Approved":12,"Rejected":2}):
```json
[
  {
    "id": 1,
    "appliedAt": "05 Apr 2026",
    "appliedBy": "Anto",
    "warehouse": "Warehouse Bali 66",
    "countedCount": 34,
    "status": "Approved",
    "resolvedAt": "05 Apr 2026",
    "resolvedBy": "Dewi Anjani",
    "items": [
      {
        "rowId": 11,
        "name": "Artificial Rose Pink",
        "warehouseName": "Warehouse Bali 66",
        "before": 190,
        "after": 182,
        "diff": -8,
        "condition": "Poor",
        "note": "Found a few damaged stems during the count"
      },
      {
        "rowId": 19,
        "name": "Yellow Coconut Palm Leaf",
        "warehouseName": "Warehouse Bali 66",
        "before": 45,
        "after": 50,
        "diff": 5,
        "condition": "Good",
        "note": "Additional stock located on the back shelf"
      }
    ]
  },
  {
    "id": 2,
    "appliedAt": "28 Mar 2026",
    "appliedBy": "Darmian",
    "warehouse": "Warehouse Cililitan",
    "countedCount": 14,
    "status": "Approved",
    "resolvedAt": "28 Mar 2026",
    "resolvedBy": "Dewi Anjani",
    "items": [
      {
        "rowId": 29,
        "name": "Mini Camera Tripod",
        "warehouseName": "Warehouse Cililitan",
        "before": 6,
        "after": 5,
        "diff": -1,
        "condition": "Poor",
        "note": "One unit sent out for repair"
      }
    ]
  }
]
```
`src/data/users.js` (demo plaintext passwords):
```json
[
{"id":1,"name":"Dewi Anjani","email":"dewi@emi.id","role":"Admin","status":"active","lastActive":"2026-04-09 09:15","password":"Admin@123"},
{"id":2,"name":"Anto","email":"anto@emi.id","role":"Staff","status":"active","lastActive":"2026-04-09 11:10","password":"Staff@123"},
{"id":3,"name":"Novi","email":"novi@emi.id","role":"Staff","status":"active","lastActive":"2026-04-09 08:02","password":"Staff@123"},
{"id":4,"name":"Darmian","email":"darmian@emi.id","role":"Staff","status":"active","lastActive":"2026-04-08 16:30","password":"Staff@123"},
{"id":5,"name":"Budi Santoso","email":"budi@emi.id","role":"Viewer","status":"inactive","lastActive":"2026-03-20 11:05","password":"Viewer@123"}
]
```

---

## B. Scan

**7. What is encoded in an item QR?** Nothing yet. `/qr-code` renders `PlaceholderPage title="QR Code"` (`src/App.jsx`,
line ~110); there is no generator and no QR library. **Proposal for mobile/backend:** one QR per *event line* or per
*package box* is what the owner described ("~10 items in one box, one QR on the box, one scan checks in everything" —
`docs/context.md`, "Grouped items"). Suggested payload: `emi:line:<eventId>:<lineId>` and `emi:box:<eventId>:<packageId>`;
optionally `emi:item:<sku>` for catalog lookups. This needs an owner decision.

**8. Per line or per unit?** **Per line.** One scan marks the whole line (any qty). If the line is in a package
(`groupId`), one scan marks **every line in that package** (`finishScan` → `doScan` for each `group.itemIds`,
`src/pages/EventDetailPage.jsx` ~line 751). Inside the Grouped tab only the box has a Scan button.

> **Update 2026-11-11:** fixed on web — the stage now decides: first scan stage = scan-in, later scan stages = scan-out;
> Scan In / Scan Out fields are hidden until those stages are reached. See `docs/prd/PRD-2026-11-11.md` §2.

**9. Scan in vs scan out?** Decided by **order of scans, not by the stage** (`doScan`, ~line 725):
```js
const next = { ...it, scanned: true };
if (!it.scanIn)  return { ...next, scanIn: now };   // first scan
if (!it.scanOut) return { ...next, scanOut: now };  // second scan
return next;                                        // further scans: no change
```
`now` = `new Date().toLocaleString('en-US', {month:'short', day:'numeric', year:'numeric', hour:'numeric', minute:'2-digit', hour12:true})`
→ `Apr 9, 2026 08:20 AM`. ⚠ Gap: `scanned` stays `true` after scan-in, so at "Waiting scan out" the lines are **not**
counted as waiting and the gate passes without scan-out. **Recommended for mobile:** scan-in at the first `scan` stage,
scan-out at the later `scan` stage(s) (i.e. "waiting" = `!scanIn` at the first scan stage, `!scanOut` after it). Confirm with owner.

**10. No match / already scanned / item on two lines?** Not applicable on web — the user taps the **Scan** button on a
specific line, so there is no code lookup. Already-scanned lines can be "re-scanned" (third scan = no change).
**Recommended:** no match → error "Not on this event"; already scanned for this phase → info toast, no change; same item
on several lines/areas → show a picker of the matching lines (area + qty) — never auto-pick.

**11. Does Next require every line scanned?** **Yes, blocked** (`requestStageChange`, ~line 514): at a stage with
`scan: 'Scan'`, moving forward while any line has `scanned === false` shows the inline error
`"<n> item(s) still need(s) to be scanned before moving to the next stage."` and does nothing. Going back is never blocked.

---

## C. Stage change (Next)

**12. Code and dialog texts** — `src/pages/EventDetailPage.jsx`. Flow order: `requestStageChange` → `firstFlowStep`
(`'ownership'` → `'broken'` → `'confirm'`; going back skips the first two) → `confirmStageChange`.
```js
function firstFlowStep(step) {
  if (stages.indexOf(step) <= stageIndex) return 'confirm';
  if (askOwnership) return 'ownership';          // isCheckOwnershipStage(current) && not answered yet for this stage
  if (brokenItems.length > 0) return 'broken';
  return 'confirm';
}
function confirmStageChange() {
  // 1. cutting stage crossed → items.stockCut = true (+ activity log "Cut stock for N item(s) (Q pcs) …")
  // 2. stock-return stage crossed → stockCut && !stockReturned → stockReturned = true (+ log "Returned stock for …")
  // 3. forward only: writeOffBrokenItems(step); applyConversions(step)
  // 4. setEventStatus(step); saveEventProgress; furthest = max(furthest, step); tab → 'all'
}
```
Exact texts:
- **Ownership** — title `Check ownership`; route `"<current>" → "<target>"`; body `Before moving on from "<current>": does any
  item need a change of ownership (IHC / IHP / Outsource)?` + `Choose Yes to open Bulk Assign Ownership. Once you save it,
  the move continues automatically.` Buttons: `Cancel` · `No, continue` · `Yes, change ownership`.
- **Broken** — title `Broken items reported`; `<n> item(s) still has/have broken units. If you continue, the broken units are
  taken out of the quantity used in this event.` Table: Item · Prepared · Broken · Used after. Footer note `Example: 10 chairs
  prepared, 5 reported broken → only 5 are used. To replace them instead, cancel and use Create Production on the item first.`
  Buttons: `Cancel` · `Continue anyway`.
- **Confirm** — title `Move to next stage?` (forward) / `Go back to an earlier stage?` (back). Optional blocks:
  - scan target: `Items must be scanned at this stage before the event can move on.`
  - cut: `Cutting Stock is on for "<stage>". Confirming deducts <n> items (<q> pcs) from warehouse stock. Going back to an
    earlier stage does not restore it.` / `All items on this event have already been deducted, so nothing more will be cut.`
  - convert: `<n> convert request(s) will be applied. Warehouse stock will be reduced:` + list `fromQty × fromName (fromWarehouse) → toQty × toName`
  - return: `Stock Return is on for "<stage>". Confirming returns <n> items to warehouse stock.` / `No items have had their
    stock cut, so nothing will be returned.` + ` After this, no more items can be added to this event.`
  - Button: `Confirm & Return Stock` / `Confirm & Cut Stock` / `Confirm`.

**13. What can the user do in the ownership check?** Answer Yes/No. **Yes** opens the existing **Bulk Assign Ownership**
modal (filter by current ownership + search, multi-select lines, pick target IHC/IHP/Outsource, Save); saving resumes the
move automatically (`resumeStage`). **No** continues to the broken/confirm step. The question is asked once per stage.

**14. Skip several stages?** Next = exactly one step. The stage dropdown allows any stage `≤ furthest + 1`, so after going
back you can jump forward several steps up to the furthest reached; cut/return/convert/write-off then apply for the whole
crossed range. Never beyond furthest + 1.

**15. Postphone / Disable?** They are **ordinary stages** at the end of the list (order 8 and 9) — no special code anywhere
(only listed in `src/pages/PRDPage.jsx`). They are reached with Next like any stage, and because "Disable" is the last
stage, **reaching it is what makes the event "Ready to Close"**. That is almost certainly not intended; treat it as an open
owner question (suggestion: flag them as non-pipeline "hold" statuses).

---

## D. Broken items

**16.** Any logged-in user (no role check), at **any stage** while items are not locked (closing `on-going`; from Checking
Inventory on, the drawer actions are hidden). Entry: item drawer → `Create Report` / `Edit Report`. Fields: Broken Quantity
(1…line qty, required), "What happened?" note. Edit = reopen and save; `Remove report` withdraws it (confirm dialog). The
write-off happens on the next forward stage move (`writeOffBrokenItems`: `qty -= brokenQty`, `brokenWrittenOff += brokenQty`).
Code: `openReport`, `saveReport`, `clearReport` (~line 944).

**17.** No photo — not supported. (Recommended for mobile; would need a backend upload field.)

---

## E. Closing

**18. Return vs Transfer.** On an event in Checking Inventory: `Cross Check Items` (tick `checked` per line) and
`Ready for Return` → modal **"Return Item & Transfer"**. It shows the *Event Logistics Summary* ("<checked> of <total> items
were checked during Cross Check … <n> items never got checked") and, per line, buttons **Return** / **Transfer**.
Transfer expands two selects: **target event** = every other event with `type 'upcoming'` and closing `on-going`
(label `"<name> (<code>)"`), and **target stage** = any stage of the Event Status list. `Confirm Transfer` removes the line
here and queues it in `emi_moved_items[targetKey]` (name, area, subArea, stage, qty, pic, ownership, note); the target event
merges it on open. Footer `Finalize (<resolved>/<total>)` enabled when all lines are resolved →
`returned-completed` if ≥ 1 Returned, else `transferred`. Code: `resolveItemReturn`, `confirmTransferItem`,
`finalizeReturnTransfer` (~lines 860–905), modal ~line 2565.

**19. Partial?** **No.** Return and Transfer always take the whole line qty.

---

## F. Stock opname — `src/pages/StockOpnamePage.jsx`, approval in `src/pages/WarehouseInventoryPage.jsx` (Opname History)

**20.** Pick a warehouse (shows row counts) → `Start` → table of that warehouse's rows with a **search box by item name**
(no scan) → per row enter **actual qty** (defaults to system stock) and **condition** Good/Poor (+ note when Poor) → confirm
→ submit. Variance = actual − system.

**21.** No draft / save-later — the count lives in page state until submitted. **Only one Pending opname at a time in the
whole tenant** (not per warehouse): while one is Pending the page shows `There's a stock opname awaiting approval. A new one
can't be started until it's been approved or rejected.` (`hasPendingOpname()`).

**22.** Submitted lines = rows where `actual − system ≠ 0` **or** condition `Poor` (`changedRows`). Each line:
`{rowId, name, warehouseName, before, after, diff, condition, note (only if Poor), valuation}`; `countedCount` = all rows of
that warehouse. **Poor does nothing to stock** — only `after` is written on Admin approval (ledger reason `Stock opname`,
note `Opname #<id>`). Poor is informational (shown in history/report).

---

## G. Rent / Outsource receive & return — `src/lib/eventLoans.js`, `src/components/EventLoans.jsx`, `src/components/LoanLogTab.jsx`

**23.** Always the **full qty**. No partial receive/return.

**24.** Any logged-in user. Event records: buttons on Event Detail → Rented / Outsourced tab; warehouse rentals: Rent →
Rented Items. Recorded: `borrowedAt` / `returnedAt` (date `YYYY-MM-DD`) and an activity-log entry with the user name.
No photo, note or receiver name at receive/return time (the note is only on the request).

---

## H. Users, roles, auth — `src/lib/tenantAuth.js`, `src/data/users.js`

**25.** Admin-only today: approve/reject stock opname (`WarehouseInventoryPage.jsx`, `isAdmin`), the **Event Settings** menu
entry (`Sidebar.jsx` — only the menu link is hidden; the `/event-status` route itself is not guarded) and Users management.
Everything else is open to Staff **and** Viewer — Viewer is **not** read-only in the code. The read-only Viewer in the PRD is an
**[ASSUMPTION]**; it was never confirmed by the owner. Inactive users cannot log in.

**26.** Not decided by the owner. The PRD's mobile priorities are field work (Event Detail on site, scan, broken report,
opname counting, receive/return). Admin-only actions (opname approval) are an open question.

---

## I. Formatting and text

**27.** `src/lib/format.js` (full):
```js
export function fmtNum(n, maxFractionDigits = 2) {
  if (n === null || n === undefined || n === '') return n;
  const x = typeof n === 'number' ? n : Number(n);
  if (!Number.isFinite(x)) return n; // leave text like 'TBC' / '—' untouched
  return x.toLocaleString('id-ID', { maximumFractionDigits: maxFractionDigits });
}
export function formatIDR(n) {
  return 'Rp' + Number(n || 0).toLocaleString('id-ID');
}
```
Date helpers (there is no shared date module; they are local):
```js
// "09 Apr 2026" — catalogStore.js / stockOpnameStore.js fmtDate, StockOpnamePage formatToday
`${String(d.getDate()).padStart(2,'0')} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]} ${d.getFullYear()}`
// "09 Apr 2026" from ISO — EventLoans.jsx / LoanLogTab.jsx fmt
new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
// ledger "09 Apr 2026, 10:05" — stockOpnameStore.js stamp(); broken brokenReportedAt uses the same options
new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
// scan "Apr 9, 2026 08:20 AM" — EventDetailPage.jsx doScan
new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })
// business dates stored as ISO: new Date().toLocaleDateString('en-CA') → "2026-04-09"
```
Note: the real `toLocaleString('en-US')` output is `Apr 9, 2026, 8:20 AM` (comma, no zero pad); seed values are written
`Apr 9, 2026 08:20 AM`. Display either; store ISO in your own model.

**28.** `src/lib/eventLoans.js`:
```js
export const KIND_TEXT = {
  loan: {
    name: 'Rent', action: 'Rent Item', tab: 'Rented', itemsTab: 'Rented Items', vendor: 'Rent vendor', menu: '/rent',
    detail: '/rent-vendor-detail', received: 'Rented', done: 'Returned', cost: 'Rental cost', record: 'rental',
    from: 'Rent from', until: 'Return by', doneVerb: 'returned to the vendor', markDone: 'Mark Returned', badge: 'Rent',
  },
  outsource: {
    name: 'Outsource', action: 'Outsource Item', tab: 'Outsourced', itemsTab: 'Outsourced Items', vendor: 'Outsource vendor', menu: '/outsource',
    detail: '/outsource-vendor-detail', received: 'Received', done: 'Completed', cost: 'Outsource cost', record: 'outsource order',
    from: 'Needed from', until: 'Until', doneVerb: 'completed', markDone: 'Mark Completed', badge: 'Outsource',
  },
};
export function statusLabels(kind = 'loan') {   // stored status → label
  const t = KIND_TEXT[kind] || KIND_TEXT.loan;
  return { Requested: 'Requested', Borrowed: t.received, Returned: t.done, Overdue: 'Overdue' };
}
export const LOAN_STATUSES = ['Requested', 'Borrowed', 'Returned'];
export const LOAN_BADGE = { Requested: 'badge-orange', Borrowed: 'badge-blue', Returned: 'badge-green', Overdue: 'badge-red' };
// Overdue: status === 'Borrowed' && dueDate < today
```
`src/lib/eventClosingLabels.js`:
```js
export const CLOSING_LABELS = {
  'upcoming':           { label: 'Upcoming',             badgeClass: 'badge-gray' },
  'on-going':           { label: 'On Going',             badgeClass: 'badge-green' },
  'ready-to-close':     { label: 'Ready to Close',       badgeClass: 'badge-orange' },
  'checking-inventory': { label: 'Checking Inventory',   badgeClass: 'badge-blue' },
  'returned-completed': { label: 'Returned & Completed', badgeClass: 'badge-green' },
  'transferred':        { label: 'Transferred',          badgeClass: 'badge-purple' },
};
```
Other exact labels: production `Requested / In Production / Done` (`PRODUCTION_BADGE`: orange/blue/green), convert
`Pending / Converted`; ownership `IHC / IHP / Outsource`; line badges `Scanned`, `Stock cut`, `Stock returned`,
`Broken item · N`, `Production`, `Converted`, `Rented`, `Outsourced`, `Returned`, `Needs setup`; Event Detail buttons
`Outsource Item`, `Rent Item`, `Request Production`, `Add Item`, `Close & Start Checking`, `Ready for Return`,
`Cross Check Items`; tabs `All · Added New · Waiting Scan · Grouped · Production · Rented · Outsourced`.

---

## J. Scope and design

**29. Mobile v1 screens** — not decided by the owner. Recommendation from the PRD (§7, §9): Login; Event list (6 tabs,
search); Event Detail (lines by area, card/list, scan, broken report, Modify = location/qty rules, stage Next with the 3 dialogs,
Rented/Outsourced tabs with receive/return, closing Return/Transfer); Stock Opname counting; item/stock lookup.
Dashboard, Event Calendar and Event Report = v2 (read-only views, desktop-heavy).

**30. Design.** There is no brand guide; the web uses these tokens (`src/style.css :root`) and **Inter** font, favicon
`public/favicon.svg`:
```css
--bg:#f6f8fb; --white:#ffffff; --border:#e4e7ef; --border-2:#eff0f6;
--text:#111827; --text-2:#374151; --text-muted:#9ca3af;
--brand:#4f46e5; --brand-bg:#eef2ff; --brand-dark:#4338ca;
--green:#059669; --green-bg:#ecfdf5; --red:#dc2626; --red-bg:#fef2f2;
--orange:#ea580c; --orange-bg:#fff7ed; --purple:#7c3aed; --purple-bg:#f5f3ff;
--r:7px; --r-lg:11px; --r-xl:14px;
```
Primary action buttons are green (`--green`, e.g. "Save", "Add Item"), brand indigo for links/active tabs/Next.
Whether mobile must match is an owner decision; matching these tokens keeps the two apps consistent.

**31. Mock vs API.** Not decided. Recommendation: code against the §8 API contract behind a repository layer, and ship a
mock implementation seeded with the JSON above + `TODAY = 2026-04-09`. That lets you switch to the real backend without
rewriting screens.

**32. Offline.** Not decided by the owner. Venues often have bad signal, so recommendation: v1 online-first with an
**outbox queue** for scans, broken reports, opname counts and receive/return (client UUIDs, replayed in order, server
re-validates). Full offline editing later.

**33. Owner decisions in `docs/context.md` that matter for mobile (and are not, or only partly, in the PRD):**
1. **Packaging = one QR per box**: ~10 items in one box, one scan checks in the whole box. Grouping is done with
   ⋮ menu → **Group Items** (the old "first stage only" rule in context.md is **not enforced** in the current code — it is
   offered at any stage). Grouped tab shows boxes; scan is box-level there.
2. **Scan gate**: at scan stages, Next is blocked until every line is scanned; going back is never blocked.
3. **Next is the only way forward**; every stage change goes through a confirmation popup.
4. **Cutting Stock was removed from Event Settings** (2026-10-05); cutting logic is dormant. **Stock Return** can be set on
   one stage only; after it, no items can be added (locked even if you go back).
5. **From Checking Inventory onward** lines can't be modified/deleted, ownership can't change; Returned & Completed and
   Transferred events are **view-only** (no Edit/Delete).
6. **Check Ownership** is asked once per stage when leaving a flagged stage; "Yes" opens Bulk Assign Ownership.
7. **Broken items**: report any time before Checking; warned before moving on; write-off reduces qty used;
   "Create Production" replaces broken units.
8. **Modify Item** (2026-11-02): only location; qty only for lines added at the current stage.
9. **Past events can't be edited**; **Finish Date ≥ Start Date**.
10. **Rent = temporary, returned, never an asset; Production Done = asset; Outsource = like Rent.**
11. **Quick-add**: item and vendor can be created inside the Rent/Outsource/Production forms; vendor lists are filtered
    by kind; vendors with active records can't be deleted.
12. **Numbers**: dot thousands separator everywhere (`id-ID`).
13. **UI language English** (the web has an EN switch), owner talks Indonesian.
14. **Responsive rules** of the web (breakpoint 900 px, phone ≤ 560 px: 1-column forms, full-width modals/drawer, tables
    scroll horizontally) — useful reference for tablet layouts.
15. **Viewer read-only** and **mobile for Admin or crew** are *not* decided (see H25/H26).

Open owner questions to send back: QR payload (B7), scan-in vs scan-out rule (B9), Postphone/Disable as pipeline stages
(C15), photo on broken report (D17), Viewer read-only and mobile audience (H25/H26), v1 scope/offline/API (J29–J32).
