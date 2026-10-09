# Backend Notes — EMI

Notes for the backend team, written from the frontend side. The frontend is a
static React SPA with **no backend yet**: every "save" today goes into React
state or `localStorage`. This file says what the real API needs to provide so
those mocks can be swapped out, and which business rules the backend must
enforce (not just the UI).

Related docs: [context.md](context.md) (what was asked for and why) and
[changes.md](changes.md) (what changed in the code). Newest sections first.
Endpoint paths and payloads below are **proposals**. Rename them freely, but
keep the behavior.

---

## Conventions (apply to every endpoint below)

- **Identify events by `id`, not by name.** Today the frontend keys per-event
  data by a string `"<date> | <EVENT NAME>"` (see `closingKeyFor()` in
  `EventPage.jsx` and the `?name=` param on `/event-detail`). That breaks as
  soon as an event is renamed or its date changes. It exists only because there
  is no backend. The real API should use a stable `eventId`, and the frontend
  will switch to it.
- **Tenant scoping.** Every record belongs to one tenant (customer). All reads
  and writes must be scoped to the logged-in user's tenant.
- **Roles.** Tenant users are `Admin` or `Employee` (Staff/Viewer). Where a
  rule below says "Admin only", enforce it on the server; the UI hiding a
  button is not enough.
- **Activity log.** Actions that change data write an entry
  (`userName, action, module, description, timestamp`). Today this is
  `addActivityLog()` in `src/lib/activityLogStore.js`. The backend should write
  these **itself** as part of the same transaction, not rely on the client.

---

## Event items — Bulk Assign Ownership (2026-09-18)

**UI:** Event Detail → ⋮ menu → **Bulk Assign Ownership**. The user picks a
target ownership (IHC / IHP / Outsource), selects any number of the event's
items (search and "current ownership" filters, with "select all shown"), and
applies it in one action. Single-item change still exists: clicking the
ownership badge on an item card cycles IHC → IHP → Outsource.

**Ownership values:** `IHC`, `IHP`, `Outsource`. Treat these as an enum. If
tenants will ever need their own values, make it a master-data table instead.
Tell the frontend before you do, because the list is hardcoded today
(`OWNERSHIP_CYCLE` in `EventDetailPage.jsx`).

**Proposed endpoint:**

```
PATCH /events/{eventId}/items/ownership
{
  "itemIds": [12, 15, 16],
  "ownership": "Outsource"
}
```

Response: the updated items (at least `id` + `ownership`), or `{ "updated": n }`.

**Rules:**
- **All or nothing.** Run it in one transaction. If any `itemId` does not
  belong to `eventId` (or the tenant), reject the whole request with 4xx.
  Do not partially apply.
- **Don't reject items that already have the target ownership.** Accept them
  as a no-op. The UI lets the user select them.
- **Activity log:** write **one** entry per bulk action, not one per item.
  Count only items whose value actually changed, e.g.
  `Bulk-assigned ownership Outsource to 3 item(s) on <event name>`. If nothing
  changed, write no entry (the frontend mock does the same).
- **Empty `itemIds`** returns 400. The UI disables the button in that case, but
  validate anyway.
- **Items in all stages are eligible.** The modal lists every item on the event,
  not only the ones in the current stage tab.
- **Open question for product:** should ownership be locked once the event
  reaches Checking Inventory or a terminal status (Returned & Completed /
  Transferred)? The frontend does not lock it today. Confirm before
  enforcing anything.

The single-item badge click can use the same endpoint with one id, or a plain
`PATCH /events/{eventId}/items/{itemId}` with `{ "ownership": "IHP" }`.

---

## Events — status flag and stage (2026-09-18)

An event has **two independent pieces of state**. Don't merge them into one
column:

1. **Stage:** the event's position in the configurable Event Status list
   (master data, `/event-status`: `order`, `code`, `status`, `scan: 'None' | 'Scan'`).
   Today: `src/lib/eventProgress.js` (localStorage `emi_event_progress`).
   - A **new event always starts at the first stage** (lowest `order`). The
     create form no longer has a Status field. Set this on the server when
     the event is created.
   - **Editing an event must not change its stage.** Only the stepper on
     Event Detail moves it.
   - While the event is at a stage with `scan: 'Scan'`, it may not advance
     until every item is scanned. Enforce this on the stage-change endpoint.
2. **Closing status flag:** stored values are `on-going`,
   `checking-inventory`, `returned-completed`, `transferred`. Today:
   `src/lib/eventClosing.js` (localStorage `emi_event_closing`).
   - **Upcoming** and **On Going** are both stored as `on-going`. What the
     list shows depends on whether the event has items: items exist → On Going,
     no items → Upcoming. Derive this from the item count; no separate flag is
     needed (the frontend's `eventItemsFlag.js` is only a mock for this).
   - **Ready to Close** is also derived, not stored: `on-going` + the stage is
     the last configured stage.
   - `on-going → checking-inventory` is allowed only when Ready to Close is true.
   - **Finalize** (end of Return & Transfer) is allowed only when every item has
     a resolution (`returned` or `transferred`). The result is
     `returned-completed` if at least one item was returned, otherwise
     `transferred`.
   - The Event list page has one tab per value (Upcoming, On Going, Ready to
     Close, Checking Inventory, Returned & Completed, Transferred). A list
     endpoint that accepts `?status=` with those six values (including the two
     derived ones) plus per-tab counts would let the page stop computing this
     client-side.

**Transfer between events:** moving an item from event A (during Checking
Inventory) to event B at a chosen stage. Today it is queued in localStorage
(`src/lib/movedItems.js`) and merged into B the next time B's Detail page
opens. On the backend it should be one transaction: remove from A (mark
`resolution: 'transferred'`) and create in B. The target must be an event
whose status is still `on-going`.

---

## Stage moves, broken items, production, convert (2026-10-05 → 2026-10-09)

Everything below is currently frontend-only (localStorage / component state). The rules are what the UI enforces and
what the real API must enforce. Product reasoning is in `context.md`; UI wiring is in `changes.md` Rounds 21–26.

**Event Status flags** (per status row; all booleans): `scan`, `productionItem`, `checkOwnership`. (`cuttingStock` and
`stockReturn` are legacy, no longer editable.)

**Moving an event forward (`POST /events/:id/advance`, suggested)** must be one atomic operation that, in order:
1. Rejects if the current stage has `scan` and items are unscanned.
2. If `checkOwnership` on the stage being left: the client has asked "does any item need an ownership change?". The
   answer is UI-only. Ownership changes use the existing bulk-assign endpoint.
3. For every item with `brokenQty > 0`: `qty -= brokenQty`, `brokenWrittenOff += brokenQty`, `brokenQty = 0`.
   (Event quantity only; warehouse stock is not touched.)
4. For every **Pending convert request**: deduct `fromQty` from warehouse row `fromRowId`, write a stock-ledger entry
   (reason `Convert`), add `toQty` of the new item to the event, set the request to `Converted`.
5. Sets the event stage. Going back never applies steps 3–4 and never undoes them.

**Item report (broken)**: `POST /events/:id/items/:itemId/report` `{ brokenQty (1..qty), note }`; `DELETE` removes it. Stores
reporter and time. Not allowed once the event is in Checking Inventory or later.

**Production request** (`type: 'production'`): `{ name, qty, area, subArea, warehouse (required, a real warehouse),
vendorOrigin ('Internal'|'External'), vendorId (must match origin), note, replacesItemId? }`. Status
`Requested → In Production → Done`; `Requested` can be cancelled. On `Done` the server must (a) add the item to the
event with ownership IHP, (b) create a **draft inventory item** flagged `needsSetup = true` (temporary SKU, empty
category/unit) unless the name already exists, and (c) create a warehouse stock row of `qty` in `warehouse`.
`needsSetup` clears when the item's info is completed (Warehouse Inventory edit, or an explicit "mark as set up").

**Convert request** (`type: 'convert'`): `{ fromRowId, fromQty, toName, toQty }`. Status `Pending → Converted`.
`fromQty` must be ≤ row stock minus other Pending converts from the same row (check again on apply). Only the
**old** item's stock is reduced (assumption, see context.md 2026-10-05).

**Stock ledger** (`GET /stock-movements`): `{ at, itemName, warehouse, change, before, after, reason, eventName, stage, note, by }`.
Powers Warehouse Inventory → Stock History. Every stock change from outside Warehouse Inventory must write one.

**Vendors** (`/vendors` CRUD): `{ id, name, contact, type (free-text category), origin ('Internal'|'External') }`.
Used by Item Loan and by production requests (filtered by `origin`). Deleting a vendor must not break old records:
loans and requests store `vendorName` as well as `vendorId`.

## Other mocked stores that need real endpoints

Same pattern as above: all of these are currently in-memory or localStorage
and reset or drift per browser.

| Frontend module | What it holds | Notes |
|---|---|---|
| `src/lib/tenantAuth.js` | Tenant login/register session | Replace with real auth + token. Demo passwords live in `src/data/users.js`. |
| `src/lib/stockOpnameStore.js` | Warehouse stock rows + opname history | Submit creates **Pending**. Only Admin can Approve (applies stock) or Reject. While one is Pending, starting a new opname must be refused. |
| `src/lib/itemLoanStore.js`, `src/lib/vendorStore.js` | Item loans, vendors | Borrow/return adjusts warehouse stock. |
| `src/lib/eventStatuses.js` | Event Status master data | Changing it changes every event's stepper. Probably Admin-only (open question #9 in context.md). |
| `src/lib/activityLogStore.js` | Activity log | Should be written server-side (see Conventions). |
| `src/data/*.js` | All seed data (events, items, warehouses, …) | Mock data only; shows the field names the UI expects. |

Mock "today" is `TODAY = 2026-04-09` in `src/data/events.js`. The real API
should use server time.
