# Context & Requirements Log — EMI

This file is the running source of truth for product requirements and decisions on
this project. Per the user's standing instruction:

1. Every new instruction the user gives gets logged here.
2. Before starting new work, re-read this file so prior decisions aren't contradicted
   or silently redone.
3. If a new instruction clashes with something already decided here, or a requested
   feature seems like it doesn't fit well, say so to the user instead of guessing
   silently.

This file complements [update-history.md](update-history.md) — that file is a
changelog of what changed in the code and why; this file is the log of what was
*asked for* and the decisions made in response, independent of whether the code has
caught up yet.

---

## Current decisions, by topic

### Event lifecycle (stepper stages) — ⚠️ superseded, see "Event Status is the real source of truth" below
- ~~The event-level stepper stages are: Requirement → Preparation → Purchasing →
  Push to Truck → During Event → After Event (6 stages), admin-configurable via a
  new Event Settings page, stored in `src/data/eventStages.js` +
  `src/lib/eventStages.js`.~~ **This entire sub-system has been deleted.** It was
  built without realizing the app already had a pre-existing "Event Status" master
  data page (under Master Data, `/event-status`) that does the same job with more
  granularity. See the dedicated section below — this note is kept only so the
  history is legible; don't resurrect `eventStages.js` or `EventSettingsPage.jsx`.
- What's unchanged: each item on an event still carries a `stage` field recording
  which stage was active when it was added — this powers the "All / From Previous
  Stage / New in X" tabs on Event Detail. Only the *source* of the stage names
  changed (now Event Status records instead of the deleted `eventStages.js`).

### Event Status is the real source of truth (discovered clash, 2026-08-27)
While building the above, the user pointed out the app already had a fuller-featured
"Event Status" master-data page (`/event-status`, under Master Data — pre-existing,
not built this session) that models almost the same thing, per status row:
`order`, `status` (name), a scan setting, `eventRunning` (count), `updatedAt`. This
made the freshly-built Event Settings stage-editor + global scan-toggle **fully
redundant**, so it was deleted in favor of consolidating onto Event Status:
- **Event Detail's stepper now reads directly from Event Status**, sorted by
  `order` — whatever rows exist there become however many stepper stages there are,
  in that order. Extracted into `src/data/eventStatuses.js` (seed) +
  `src/lib/eventStatuses.js` (`getEventStageNames()`, `isScanStage(name)`,
  get/save/reset — localStorage-backed, same pattern the deleted `eventStages.js`
  used) so Event Detail and Event Status page share one live source instead of the
  page-local-only `useState` Event Status originally had.
- **The per-status scan field was simplified** from two overlapping fields
  (`showScan: boolean` + `action: '' | 'SCAN IN' | 'SCAN OUT'`, which could
  contradict each other since both were independently editable) down to **one**
  field: `scan: 'None' | 'Scan'`. The "Scan Action" dropdown and "Show Scan Button"
  checkbox in the New/Edit Status modal are now a single "Scan" dropdown with just
  those two options; the table's two separate columns ("Show Scan", "Scan Action")
  are now one "Scan" column.
- **Whether an item's Scan button appears at all on Event Detail is now driven by
  the current event status's `scan` field** — while the event is at a status with
  `scan: 'Scan'` (e.g. "Waiting scan in"), item cards show a Scan button; at any
  other status, no Scan button appears on any item. The "Next" button and the
  forward-stepper-click gate (block advancing while items are unscanned) key off
  this same per-status flag now, instead of the deleted global toggle.
- Seed data for Event Status (`src/data/eventStatuses.js`) is the 9 rows that were
  already in `EventStatusPage.jsx`: Created by admin up → On preparing items →
  Finish setup → Waiting scan in (scan) → Event running → Waiting scan out (scan) →
  Finished → Postphone → Disable. The 26 seeded items on the demo event were
  remapped from the old 6-stage names onto these 9 (Requirement→Created by admin up,
  Preparation→On preparing items, Purchasing→Finish setup, Push to Truck→Waiting
  scan in, During Event→Event running) so the demo still makes sense.
- **The "Event Settings" sidebar entry (Admin-only, under Events) is kept**, since
  that access point was explicitly requested earlier — but it now just links
  straight to `/event-status` instead of a separate page, since that's where the
  real settings live.

### Event Summary
- The "Summary" action from Event Detail now opens as a **popup/modal** (a condensed
  view), not a full-page navigation.
- The user can still reach a **full detail view** — the existing full-page
  `EventSummaryPage` — via a link inside that popup. The full page now shows a
  **breadcrumb** (Event → [event name] → Summary) since it's no longer the primary
  entry point.

### Authentication & roles (tenant app)
- The tenant app (everything under `/`, as opposed to `/superadmin/*`) previously had
  **no authentication at all** — anyone could load any URL, and the header's Logout
  button was a no-op. This request adds real (mock, no-backend) auth:
  - `/login`, `/register`, `/forgot-password` — public pages.
  - Two roles: **Admin** and **Employee**. Reused the existing `src/data/users.js`
    roster (Admin/Staff/Viewer) rather than inventing a second parallel user list —
    "Admin" role logs in as Admin, "Staff"/"Viewer" log in as Employee-tier.
  - Mock credentials are seeded on that same file (see Open Questions/Flags below for
    the exact demo logins).
  - All tenant routes are now behind a `RequireTenantAuth` guard, mirroring the
    existing `RequireAuth` pattern already used for `/superadmin/*`.

### Event Settings (admin-only)
- A new sidebar menu item, **visible only to the Admin role**, per request #5.
- Scope interpretation (not specified by the user beyond "tambahan menu event
  settings" — flagged as an assumption): a page for managing the event stage list
  itself (add/rename/reorder/remove stages) — see "Event lifecycle" above. This is
  the most defensible MVP scope given no further detail; happy to extend or redirect
  if this isn't what was meant.

### Mock data
- Item and location/warehouse mock data has been substantially expanded per request
  #1 — more items inside events, and more items per warehouse/location — to make the
  demo feel populated rather than sparse. This is additive to the existing seed data
  established earlier (see update-history.md Round 1–5).

### Scan gate before stage advancement
- Event Settings gets a second control: **"Require scan before advancing stage"**
  (on/off, saved immediately, independent of the stage-list Save button since it's a
  simple toggle). Stored in `localStorage` under its own key
  (`src/lib/eventScanSetting.js`), separate from the stage-list key.
- Each item's **Scan** button now opens a popup (dummy — no real barcode/camera
  integration, per the request) instead of instantly toggling scan-in/out. Confirming
  the popup marks the item `scanned: true` (a new field, distinct from the existing
  `scanIn`/`scanOut` timestamp tracking, which the popup also still advances so that
  system keeps working as before).
- When the toggle is **on**, clicking a stepper step *ahead* of the current stage is
  blocked with an inline error banner if any item is still unscanned. Moving
  *backward* in the stepper is never blocked (only forward progress is gated, since
  the ask was specifically about advancing "to next").
- When the toggle is **off** (the default), the stepper behaves exactly as before —
  no scan requirement.

### Next button for the scan gate
- The scan-gate error banner (block + message on stepper click) stays, but there is
  now also an explicit **"Next" button** next to the stepper. It is only rendered
  when the "Require scan before advancing stage" setting is on. It is **disabled**
  until every item is scanned, and **enabled** once they all are. Clicking it moves
  the event to the single next stage (not an arbitrary jump — unlike clicking a
  stepper dot directly, which still jumps to whatever stage you click and is still
  gated by the same rule).

### Grouped items — real-world purpose and dedicated tab
The user clarified the actual point of Packaging: in the physical warehouse, ~10
items get put into one box, and a single QR code is stuck on that box — so scanning
one code checks in everything inside it instead of scanning 10 items individually.
The UI already grouped items for scanning, but there was no dedicated place to
review boxes as boxes. Added a fourth tab, **"Grouped,"** next to All / From
Previous Stage / New in [stage], on Event Detail's item list:
- Shows every package as its own **box card** — box name, item count, and (only
  when the current Event Status stage has Scan enabled) a **"Scan Box" /
  "Re-scan Box"** button that scans every item inside it at once, reusing the
  existing group-scan logic (the scan popup already said "N items will be scanned
  together" for a grouped item; this just surfaces that at the box level instead
  of per-item).
- Items inside a box card don't get their own per-item Scan button here — scanning
  is a box-level action, matching the one-QR-code-per-box reality.
- The "Grouped" tab count is the number of boxes (packages), not items inside them.

### Item grouping / "Packaging"
- The box-shaped icon button in the Event Detail header (previously inert, labeled
  "Packaging") now does something: it **groups items together** so they can be
  scanned as one unit instead of one at a time.
  - Only usable at the **first** stage of the event (whatever stage is first in the
    admin-configured list — "Requirement" by default). Disabled everywhere else.
  - Clicking it opens a popup listing the event's items that belong to that first
    stage and aren't already in a group; the user selects a subset and names the
    group.
  - Once grouped, scanning **any item in that group** scans the whole group at once
    (all member items get marked Scanned together). Ungrouped items keep scanning
    individually, unchanged.

### Stock Opname — split into its own page, with an approval workflow
This replaces the earlier decision (see the Round 5 / update-history.md entry) where
Stock Opname was a tab inside Warehouse Inventory. New shape:
- **Warehouse Inventory** page keeps the "Inventory" and "Opname History" tabs, but
  the "Stock Opname" tab is gone — replaced by a **"Start Stock Opname" button** that
  navigates to a new, separate page/route rather than switching an inline tab.
- **New Stock Opname page**: first the user **picks a warehouse** (opname is scoped
  to one warehouse at a time — no more "All Warehouses" option), then the counting
  screen for that warehouse's items appears.
- On each item, the user now records two things, not just actual stock:
  - **Actual stock** (unchanged from before).
  - **Condition** — Good or Poor. If Poor, a manual text field appears to describe
    what's wrong (replaces the old always-optional free-text note — now the note is
    tied to a poor-condition item instead of being generic).
- Submitting **no longer applies the stock changes immediately.** It creates a
  **Pending** entry in Stock Opname History instead. An Admin ("owner") reviews it
  there and **Approves** (which then applies the stock changes for real) or
  **Rejects** (no stock change). This is a real behavior change from the original
  Stock Opname build, which applied changes instantly on submit.
- **Gate:** while any opname entry is sitting at **Pending**, a new stock opname
  cannot be started — the "Start Stock Opname" trigger is disabled with an
  explanation until the pending one is resolved (Approved or Rejected).
- Architecture note for whoever picks this up: since Warehouse Inventory and the new
  Stock Opname page are different routes/components, and this app has no
  Context/Redux, the mutable inventory rows + opname history are now held in a
  small shared module (`src/lib/stockOpnameStore.js`) instead of page-local
  `useState`, so both pages see the same live data. It's in-memory only (resets on a
  full page reload) — consistent with the rest of the app's "no backend" data model.

### Warehouse Inventory — View Detail, Edit, Delete
The Inventory tab's row actions ("Detail" and "Delete" icon buttons) existed visually
but did nothing — no `onClick`. Wired up (2026-08-27 request):
- **View Detail** opens a read-only modal with all of that row's fields (stock
  figures, status, flags, aisle/rack/level/floor/lane, last updated) — no edit
  capability, just a clean readable view.
- **Edit** (new icon button, previously didn't exist) reuses the "Add Warehouse
  Item" modal in an edit mode — item name becomes fixed/read-only text instead of
  the item-catalog picker (renaming isn't supported, only the numbers/location
  fields), everything else stays editable the same as create.
- **Delete** asks for confirmation (`window.confirm`), then removes the row.
- All three write through to the shared `src/lib/stockOpnameStore.js` (the same
  store Stock Opname reads/writes), not just local page state — otherwise an edit
  or delete made here wouldn't be visible from the Stock Opname page.

### Moving Order (inter-warehouse stock transfer)
New third tab on Warehouse Inventory, next to Inventory and Opname History. Lets a
user move stock of one or more items from one warehouse to another in a single
order.
- "Create Moving Order" flow: pick a **source warehouse** first, then a scrollable,
  searchable, checkbox list of every item with stock at that warehouse appears —
  check as many as needed, each gets its own quantity input (capped at that
  item's stock). This replaced an earlier single-item-only version after the user
  pointed out a real move often covers multiple items and asked for warehouse-first,
  then multi-select. Then pick a **destination warehouse** (can't be the same as
  source).
- On submit, it's applied **immediately** — no Pending/Approve step like Stock
  Opname has. This is a deliberate difference, not an oversight: the request didn't
  mention an approval step for Moving Order the way it explicitly did for Stock
  Opname, so none was built. Flagged below in case symmetry was actually wanted.
- Effect (per selected item): the source row's stock decreases by that item's
  quantity; if a row for that same item already exists at the destination
  warehouse, its stock increases by the same amount; otherwise a new row is
  created there. One Moving Order history record is kept per item moved (item,
  from, to, qty, moved by/at) in a table on the same tab — a batch of 3 items
  produces 3 rows sharing the same timestamp, not one grouped row, to keep the
  table simple.
- Also goes through `src/lib/stockOpnameStore.js` so Inventory, Stock Opname, and
  Moving Order all agree on live stock levels.

### Event Inventory → Event Detail link
Each row on `/event-inventory` now has a "View Event" action that navigates to
`/event-detail?name=<event>`. Caveat worth knowing: `EventInventoryPage.jsx`'s
dataset is mostly synthetic padding (up to 364 rows, most named `Event 43`, `Event
44`, etc. — see `src/data/eventInventory.js`) that doesn't correspond to any real
record in `src/data/events.js`, and `EventDetailPage.jsx`'s item list is a single
hardcoded dataset regardless of which event name is passed in — so clicking through
from a synthetic row still shows the same generic demo item list, not a
per-event-specific one. This is a pre-existing architecture limit (not introduced
by this change), not a bug in the new link itself.

### Searchable dropdown replaces native `<select>`
The user flagged (with a screenshot) that the Moving Order modal's item picker —
a native browser `<select>` listing ~40 items — looked bad, and asked for "a
dropdown that can be searched, not the default [native] one," clarifying they
meant this broadly rather than just that one field.
- Built a shared `src/components/SearchableSelect.jsx`: a custom trigger + search
  box + filterable option list, rendered via a React portal to `document.body`
  (so it isn't clipped by a modal's `overflow: hidden`, which a plain
  absolutely-positioned dropdown would be). Supports a compact `inline` mode for
  toolbar filters and a full-width mode for form fields, plus an optional `meta`
  per option (used for stock/item counts, mirroring what the old `<option>` text
  showed in parentheses).
- Replaced **every native `<select>` in the tenant app** with it — Warehouse
  Inventory (6: warehouse/status filters, Add/Edit item's warehouse field, Moving
  Order's item and destination pickers, Opname History's warehouse filter), Stock
  Opname's warehouse picker, Event Detail (the Area filter — which was already a
  hand-rolled custom dropdown with a documented bug of not closing on outside
  click, now fixed by using the shared component — plus the category filter,
  per-item "take from warehouse" picker, and bulk-assign area/sub-area pickers),
  and the remaining pages with filters or pickers (Item Loan, Event Summary,
  Event, Event Inventory, Inventory, Inventory Report, Sync Inventory, Sub Area,
  Log, Event Status, Users, AI Analyzer, Overview Report).
- **The SaaS Owner Panel (`/superadmin/*`) was intentionally left out of this
  sweep** — it's a separate product area untouched by any other work this
  session, so converting its dropdowns wasn't assumed to be part of the ask.
  Flagged in Open Questions below in case it should be included too.
- Removed the old one-off `.custom-select` / `.dropdown-*` CSS (previously used
  only by Event Detail's Area filter) since the shared component's `.ss-*` CSS
  replaces it everywhere.

### Product knowledge page
- All of the above (plus everything already in this file) is also recapped as an
  in-app, navigable page — not just this markdown file — per the request "product
  knowledge yang bisa diakses di halaman khusus." Built as a real route in the app
  (a rendered page, not a static `.html` export the user has to find on disk), styled
  consistently with the rest of the tenant UI. See update-history.md for the route.

---

## Open questions / assumptions flagged to the user

These are called out per the user's standing instruction #3 (tell me if something
clashes or seems off) — proceeding with the stated assumption unless corrected:

1. **"Event Settings" content** — interpreted as event-stage management (see above),
   since no other detail was given. If this was meant to be something else (e.g.
   per-event settings like notification rules, visibility, or team assignment),
   flag it and it'll be redirected.
2. **New "Requirement" stage precedes "Preparation."** Existing seeded demo items
   still default to `stage: 'Preparation'` (unchanged) — i.e. the demo event doesn't
   retroactively act as if it's still in "Requirement." New events would naturally
   start at the first stage.
3. **Employee role** is being treated as "everything an Admin can do, except the
   Event Settings menu" — since that was the only access difference actually
   specified. If Employee should be restricted elsewhere too, say so.
4. **Register / Forgot Password have no backend**, consistent with the rest of the
   app. Register creates a session for the current tab only (lost on refresh, same
   as every other piece of mutable state in this app). Forgot Password shows a
   generic "if that email exists, instructions were sent" confirmation without
   actually sending anything — this is standard practice even in real apps that don't
   want to leak which emails are registered.
5. **"Owner" (for opname approval) = the tenant Admin role**, not the SaaS Owner
   Panel (`/superadmin`). Stock opname is a tenant business operation with no
   relation to the SaaS billing/customer layer, so it's gated the same way Event
   Settings is — by `isTenantAdmin()`. If "owner" was meant to be a distinct role
   from Admin, or the actual SaaS Owner Panel, flag it.
6. **"Next" button's scope** — it advances exactly one stage forward (`stages[i+1]`).
   Clicking a stepper dot directly still allows jumping to any stage (existing
   behavior), and is still blocked by the same scan-completion rule when moving
   forward. If direct dot-jumping should also be disabled/hidden whenever the scan
   gate is active (so Next is the *only* way to move forward), say so — currently
   both coexist.
7. **Packaging groups are scoped to a single event** (not shared/reusable across
   events) and can only be built from items already at the first stage. Once an item
   is grouped, it stays grouped for the rest of that event's lifecycle — there's no
   "remove from group" UI yet, since it wasn't asked for.
8. **Rejected opname entries don't retry automatically** — a Reject just closes out
   that entry (Pending → Rejected, no stock change) and unblocks starting a new one.
   If a rejected opname should instead be *editable and resubmittable*, that's a
   different flow than what's built.
9. **Event Status editing is not Admin-gated.** `/event-status` was already visible
   to everyone under Master Data before this session touched anything, and that
   visibility was left as-is when Event Settings' content was folded into it — only
   the sidebar *shortcut* under Events is Admin-only, not the page itself. So right
   now any logged-in user (Admin or Employee) can add/edit/reorder/delete statuses,
   which quietly changes stepper stages and scan requirements for every event. If
   stage/scan configuration should be Admin-only now that it lives here, that needs
   an explicit `isTenantAdmin()` gate added to `EventStatusPage.jsx`'s edit actions
   (view could stay open) — flagging this rather than guessing, since restricting an
   already-open page is a bigger call than the reverse.
10. **`EventPage.jsx`'s own status dropdown (for assigning a status to an event in
    the main Event list) still has its own hardcoded copy of the 9 status label
    strings**, unrelated to `src/data/eventStatuses.js`. It was already like this
    before this session and wasn't part of what was asked to fix — but it means
    renaming/adding/removing an Event Status now silently desyncs that dropdown.
    Not fixed, just flagged as a pre-existing, now more visible, inconsistency.
11. **The "Scan" requirement scope stayed "all items in the event," not "just items
    at the current status."** Only *whether* scanning is required/shown changed
    (now per-status via Event Status), not *which* items count toward the
    unscanned-count gate — that still checks every item on the event regardless of
    stage. If the gate should only count items whose own `stage` matches the
    current status, say so.
12. **Moving Order has no approval step**, unlike Stock Opname which explicitly
    does. Applied this way because the request for Moving Order didn't mention
    approval the way the Stock Opname request did — if it should also go through a
    Pending → Approve/Reject flow for symmetry, that's a small extension of the
    same pattern already built for Stock Opname.
13. **Event Inventory's "View Event" link doesn't guarantee a meaningful Event
    Detail page** for the ~340 synthetic placeholder rows (`Event 43`, etc.) — see
    "Event Inventory → Event Detail link" above. The link itself works; the
    destination page just isn't wired to show per-event-specific items yet for any
    event (a limitation that predates this request).
14. **The searchable-dropdown conversion covers the tenant app only, not the SaaS
    Owner Panel (`/superadmin/*`).** That's a separate, untouched product area —
    if its dropdowns (customer/plan/payment filters, etc.) should be converted
    too for full consistency, say so and it's the same mechanical swap.

---

## Raw instruction log

### 2026-08-28 — Grouped-items tab + clarified purpose; confirmed Event Settings location
1. Asked where "Event Settings" with the scan option went — confirmed (see
   "Event Status is the real source of truth") it was intentionally consolidated
   into the Event Status page; nothing was broken by the recent dropdown work.
2. Asked for a dedicated tab in the item list for grouped items, and explained
   the real-world purpose: ~10 items go in one box, one QR code goes on the box,
   scanning that code checks in everything inside — clarifying why grouping
   exists at all.

### 2026-08-28 — Moving Order: warehouse-first, multi-item selection
1. Moving Order should support moving multiple items at once.
2. Flow should be: pick the source warehouse first, then show the items inside
   that warehouse so the user can pick several.

### 2026-08-28 — Searchable dropdown replaces native `<select>`, app-wide (tenant app)
1. Flagged (with a screenshot of the Moving Order item picker) that a native
   `<select>` with ~40 long options looks bad.
2. Asked for a searchable dropdown, not the browser default, and confirmed this
   should apply broadly rather than just to that one field.

### 2026-08-27 — Warehouse item CRUD, Moving Order, Event Inventory link
1. Add View Detail, Edit, and Delete for warehouse items (the row actions already
   existed visually but weren't wired up).
2. Add a "Moving Order" feature — creating one moves stock of an item from one
   warehouse to another.
3. On the Event Inventory page, add a way to view the Event Detail page from each
   row.

Entries are logged from this point forward, most recent first. Instructions given
earlier in the project are captured as implemented decisions in
[update-history.md](update-history.md) rather than reconstructed verbatim here.

### 2026-08-27 — Event Status is the real source of truth (clash + consolidation)
Discovered mid-build: the app already had an "Event Status" master-data page
(`/event-status`, pre-existing, not built this session) that overlaps almost
entirely with the Event Settings stage-editor + scan-toggle just built. The user's
instructions, plus a screenshot of the existing page, made the intended
relationship explicit:
1. The Stock Opname warehouse picker should also show each warehouse's item count.
2. The per-item Scan button on Event Detail should be controlled by the *current*
   Event Status row's scan setting — if that status has scan-in/scan-out enabled,
   the scan option shows on the event's item list; otherwise it doesn't.
3. The Scan Action field on Event Status should be simplified to just "Scan" or
   "None" (not separate Scan In / Scan Out) — update both the edit form and the
   table listing.
4. The event's stepper stages should be read directly from Event Status — e.g. if
   Event Status has 5 rows, the event's stepper has 5 stages too.

Net effect: the Event Settings stage-editor + global scan toggle (built earlier
today) were deleted and fully replaced by Event Status. See "Event Status is the
real source of truth" above for the consolidated decisions, and the flagged items
#9–#11 above for what was deliberately left alone (Admin-gating on Event Status
itself, the separate stale dropdown in `EventPage.jsx`, and the unscanned-count
gate's scope).

### 2026-08-27 — Next button, item grouping, Stock Opname approval workflow
The user re-emphasized the logging process itself: every instruction must be logged
clearly enough for their own developer to read and understand later, not just as a
note-to-self. The five asks, each tied to the Event Detail / Warehouse Inventory
screens:
1. When the scan-required setting is on, show a "Next" button next to the stepper.
   Disabled by default; becomes clickable only once every item is scanned.
2. The box-icon button in the Event Detail header groups items together — usable
   only at the event's first stage. Clicking it opens a picker limited to
   first-stage items not already grouped; once grouped, scanning one item in the
   group scans the whole group.
3. Stock Opname must let the user pick a warehouse, and must live on its own page —
   not the same page as Warehouse Inventory. Warehouse Inventory only *triggers* it;
   the dedicated page is where the user picks a warehouse and then runs the count.
4. In that opname process, the user records each item's actual stock **and**
   condition (good / not good); if not good, a manual text field appears to describe
   the issue.
5. After submitting, the opname goes into Stock Opname History as **Pending**, where
   the owner (Admin) can Approve or Reject it. While one is Pending, no new stock
   opname can be started.

### 2026-08-27 — Product knowledge page + scan gate on stage advancement
1. Recap all of the information/decisions above into a "product knowledge" resource
   accessible via a dedicated in-app page (named as an example: PRD.html).
2. Continuing the Event Settings work: add an "enable scan" option. When enabled,
   items must be scanned before the stepper can move to the next stage; if not, show
   an error. When disabled, no such restriction.
3. Each item gets a Scan button that opens a scanning popup (dummy/mock — just build
   a placeholder version for now). After scanning, the item's status becomes
   "scanned." Once every item is scanned, Next becomes clickable.

### 2026-08-27 — Event lifecycle, Event Summary UX, tenant auth, Event Settings
Verbatim ask (translated context preserved above under "Current decisions"):
1. Add more mock data for items inside events and items per location/warehouse.
2. Expand the event stepper stages to: Requirement → Preparation → Purchasing →
   Push to Truck → During Event → After Event.
3. Turn Event Summary into a popup, while still allowing a full detail view reachable
   with a breadcrumb.
4. Add Login, Register, and Forgot Password pages for the tenant app, with mock login
   data — an Admin login and an Employee login.
5. For the Admin login, add an "Event Settings" menu under Events.

Also established as a standing process rule at the same time: log every instruction
here, confirm it's understood, and flag anything that clashes with prior decisions or
seems like a poor fit before building it.
