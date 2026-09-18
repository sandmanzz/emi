# Changes — EMI (Event Management Inventory)

This file is a running changelog of functional changes made to the app, written so a
developer picking up the project cold can understand **what changed, why, and where** —
not just a diff summary. Entries are newest first. No calendar dates are attached to
older entries below because they weren't tracked at the time; treat the ordering as
chronological ("Round 1" happened before "Round 2", etc). Starting at Round 6 below,
every change gets an entry here as it lands — that's now a standing rule, not just a
nice-to-have. (This file used to be named `update-history.md` — renamed to `changes.md`,
content carried over as-is, nothing else changed.)

If you're new to this codebase, read **"Context every dev should know"** first — it
explains a few non-obvious conventions that the entries below assume you already know.

---

## Context every dev should know

- **No backend.** Everything is a static React SPA (Vite, plain JSX, no TypeScript).
  All "data" lives in `src/data/*.js` as exported arrays/consts and is seeded into
  `useState` on each page. Refreshing the browser resets any in-session edits —
  this is expected, not a bug.
- **Mock "today".** `src/data/events.js` exports `TODAY = new Date('2026-04-09')`.
  Every days-until / overdue / recency calculation across the app (Dashboard,
  Item Loan, Event countdowns) is computed against this constant, **not** the real
  system clock. If dates in the UI look "wrong", check this constant first.
- **Styling.** Plain CSS with custom properties in `src/style.css` — no Tailwind/CSS
  framework. The superadmin panel reuses the same variable *names* but overrides
  their values inside a `.sa-theme` scope for its dark theme.
- **Two separate apps in one router.** Tenant-facing pages (`/dashboard`, `/event`,
  `/inventory`, …) and the **SaaS Owner ("superadmin") panel** (`/superadmin/*`) live
  side by side in `App.jsx`. The superadmin panel has its own mock, localStorage-based
  auth (`src/lib/superAdminAuth.js`) — there is no real backend/session behind it.
  - Login: `/superadmin/login`
  - Demo credentials: `owner@emi-saas.com` / `Owner@123`
  - Discoverable in the tenant UI via the small **"Owner Panel"** link in the sidebar
    footer (added in Round 2 below) — before that it was only reachable by typing
    the URL directly.
- **Dev server port:** 3120 (`vite.config.js` → `server.port`, `strictPort: true`).
  Also configured in `.claude/launch.json` for the in-editor preview browser.
- **Reusable pieces worth knowing about:** `Modal.jsx` (size presets `md`→`4xl`),
  `Stepper.jsx` (event-level status stepper), `Pagination.jsx`, `SortTh.jsx`,
  `GlobalSearch.jsx`, `RequireAuth.jsx` / `RequireTenantAuth.jsx`, and
  `SearchableSelect.jsx` (Round 6 — replaces native `<select>` app-wide; see below).
- **Two auth systems, not one.** `/superadmin/*` uses `superAdminAuth.js` (see
  above). The tenant app (`/login`, everything else) uses a **separate** mock auth,
  `src/lib/tenantAuth.js` (localStorage key `emi_tenant_auth`), added in Round 6.
  Demo tenant logins: Admin `dewi@emi.id` / `Admin@123`, Employee `anto@emi.id` /
  `Staff@123`. Don't confuse the two — they don't share a session or a user list.

---

## Round 18 — Bulk Assign Ownership on Event Detail; `docs/backend.md`

**Files:** `src/pages/EventDetailPage.jsx`, `src/style.css`, `docs/backend.md` (new)

1. **⋮ menu → "Bulk Assign Ownership"** opens a modal. It has a segmented
   target picker (IHC / IHP / Outsource, reusing `OWNERSHIP_CYCLE` +
   `ownershipBadgeClass`), a search box, and a "current ownership" filter
   (`SearchableSelect`). Items are selected with the same `indicator-box`
   checkboxes as Cross Check Items. **"Select all shown"** only
   selects/deselects the currently filtered rows, and the selection persists
   while you change the search, so you can build it up across several
   searches. Each selected row that will change shows `old → new`. The footer
   button reads "Assign <X> to N items" and is disabled at 0.
2. Applying updates `items` state in one pass and writes **one** activity-log
   entry (only if something actually changed).
3. New modal state: `bulkOwnOpen`, `bulkOwnTarget`, `bulkOwnSelected`,
   `bulkOwnQuery`, `bulkOwnFrom`. New CSS: `.bulk-own-*`.
4. **`docs/backend.md`**: new doc for the backend developer. It covers the
   proposed `PATCH /events/{eventId}/items/ownership` contract and its rules
   (atomic, tenant/event scoped, one log entry), the event stage vs.
   closing-status model, and a table of every localStorage-mocked store that
   needs a real endpoint.

Verified live: selected 2 items across two searches ("curtain", "riser"),
assigned Outsource, and both cards updated while the other items stayed
unchanged. No console errors.

---

## Round 17 — Event tabs mirror the status flag; Status field hidden

**Files:** `src/pages/EventPage.jsx`, `src/lib/eventProgress.js`,
`src/pages/EventDetailPage.jsx`

1. **Event page tabs rebuilt** — one tab per status flag value: Upcoming, On
   Going, Ready to Close, Checking Inventory, Returned & Completed, Transferred
   (+ Invite User). Each tab reads from its own "raw bucket" (`rawUpcoming`,
   `rawOnGoing`, …) so tab counts don't change while typing in search. The
   previous session had started this but was interrupted halfway — the render
   still referenced removed variables (`upEvents`, `finishedEvents`,
   `pastEvents`, …), so the non-Upcoming tabs would have crashed. Tab labels
   come from `CLOSING_LABELS`, so they can't drift from the badges. Stats row:
   Total / Active / Checking Inventory / Completed.
2. **Status field removed from the New/Edit Event modal.** It was a hardcoded
   copy of the 9 Event Status names, not connected to anything, and always
   showed its placeholder. New events now get the first Event Status stage
   written to `eventProgress.js` on save; editing leaves the stage alone. PIC
   now shares a row with QR Type, and Address is full width.
3. **`resolveEventStage(eventName)` added to `eventProgress.js`** — the
   "saved progress → Event Inventory mock status → first stage" fallback that
   used to live inline in `EventDetailPage.jsx`, moved into one shared place.

Verified live: all 7 tabs render with no console errors; a new event lands in
Upcoming, and its Event Detail opens at stage 1 with the Upcoming badge.

---

## Round 16 — "Upcoming" split out from "On Going"

**Files:** `src/lib/eventItemsFlag.js` (new), `src/lib/eventClosing.js`,
`src/lib/eventClosingLabels.js`, `src/pages/EventPage.jsx`,
`src/pages/EventDetailPage.jsx`

Direct follow-up to Round 15, same day: the 5-status flag was missing a 6th
sub-state the user had forgotten to mention — an event with no items yet should
read as **Upcoming**, flipping to **On Going** the moment items are actually
added, regardless of whether the event's real-world date has arrived.

1. **New `eventItemsFlag.js`** — `markItemsAdded(eventName)` /
   `hasItemsAdded(eventName)`, a localStorage flag keyed by event name (same
   pattern as `eventClosing`/`eventProgress`/`movedItems`). Set by
   `EventDetailPage.jsx`'s `checkout()` right after items are added via the cart
   flow — this is the one and only trigger; opening an event's Detail page (which
   always shows the same generic 26-item demo seed regardless of the event's real
   `itemCount`, per the long-standing architecture limitation) does **not** set it.
2. **New `isOnGoingByItems(eventName, itemCount)` in `eventClosing.js`** —
   `itemCount > 0 || hasItemsAdded(eventName)`. Both `'upcoming'` and `'on-going'`
   are sub-states of the same stored `'on-going'` value; nothing new is persisted
   to the closing-status store itself, this is purely a derived display split.
3. **`eventClosingLabels.js`** gained an `'upcoming'` entry (`badge-gray`);
   `'on-going'`'s own badge color moved from gray to green now that gray means
   Upcoming.
4. **`EventPage.jsx`** — new `onGoingByItemsOf(e)` helper; `EventCard` (Upcoming
   tab) now shows an Upcoming-or-On-Going badge next to the event code whenever
   it isn't already showing the more specific "Ready to Close" badge.
5. **`EventDetailPage.jsx`** — looks up the current event's seed `itemCount` from
   `initialEvents` (already imported for Transfer's target-event picker), computes
   the same `isOnGoingByItems`, and shows the resulting badge next to the stepper
   whenever the event is on-going and not yet Ready to Close. `checkout()` now
   also calls `markItemsAdded(eventName)`.

Verified live: a brand-new event showed "Upcoming" on both its listing card and
Event Detail (0 items); after one Add Item → checkout, both flipped to "On Going"
in the same session, no reload needed.

---

## Round 15 — Event closing lifecycle rebuilt around a single 5-value status flag

**Files:** `src/lib/eventClosing.js` (rewritten), `src/lib/eventClosingLabels.js`
(new), `src/pages/EventDetailPage.jsx`, `src/pages/EventPage.jsx`

Requested as an explicit concept replacement ("saya ganti konsep saja"), not an
incremental tweak — this replaces Round 12–14's 4-value closing model (Close this
Event → Ready for Check → Ready for Return → Return, plus Round 14's standalone
per-item Move to Another Event button) with **one status flag, 5 values**, and
merges Return + Transfer into a single primary action flow. See
`docs/context.md`'s new topic section for the full reasoning and every flagged
interpretive call (there are several — this was a terse 5-bullet spec that needed
real judgment calls to become concrete UI/state); this entry covers the "what" and
"where," not the "why."

1. **`eventClosing.js` rewritten.** `getEventClosing()` now always returns one of
   `'on-going'` (default) / `'checking-inventory'` / `'returned-completed'` /
   `'transferred'` — never `null`/falsy anymore, and it **migrates** old values on
   read (`ready-for-check`/`ready-for-return` → `checking-inventory`, `returned` →
   `returned-completed`) so existing demo localStorage from earlier rounds doesn't
   end up stuck on a dead value. New `isReadyToClose(eventName)` derives the
   5th value, **"Ready to Close,"** from `on-going` + the event's saved
   `eventProgress` being at the last `eventStatuses` stage — it's a computed
   display state, never written to storage.
   - **Real bug caught before it shipped:** Round 14's
     `moveTargetCandidates`/`transferTargetCandidates` filter used
     `!getEventClosing(e.key)` (relying on the old falsy-default). Since
     `getEventClosing` now always returns a truthy string, that filter would have
     silently matched zero events. Fixed to
     `getEventClosing(e.key) === 'on-going'`.
2. **New `eventClosingLabels.js`** — a single `{ 'on-going': {label, badgeClass}, ... }`
   map both `EventPage.jsx` and `EventDetailPage.jsx` import, specifically so the
   status labels/colors can't drift between the two pages the way the *other*,
   already-flagged status dropdown in `EventPage.jsx`'s Edit Event modal already
   has (see Open Questions #10 — that one's still unfixed, just the cautionary
   example for why this map exists).
3. **`EventDetailPage.jsx`'s Event Status section rewritten** around the new flag:
   - `readyToClose = closingStatus === 'on-going' && !hasNextStage` (computed
     inline, live, rather than via the lib helper — this page already has the
     stage info in React state).
   - `handleReadyToClose()` replaces `handleCloseEvent()` — same confirm-then-set
     pattern, now writing `'checking-inventory'`.
   - The old whole-event "Return" button + Inventory Return Report modal, and the
     standalone per-item "Move to Another Event" button + its own modal, are all
     **removed**, replaced by:
     - **"Cross Check Items"** — new ⋮ menu entry (visible only during
       `checking-inventory`), opens a modal listing every item with a
       click-to-toggle checked row (reuses `toggleItemChecked`, previously an
       inline per-card control, now consolidated in one place). `ItemCard` no
       longer renders a Checked row or a Move button at all.
     - **"Return Item & Transfer"** — opened via the new primary action button
       ("Ready for Return"). Shows the renamed `logisticsSummary` memo (same
       computation as the old `returnReport`) as a banner, then every item with
       **Return** (sets `item.resolution = 'returned'`, item stays with a green
       badge) and **Transfer** (expands an inline target-event + target-stage
       picker in that item's own row — no second modal-on-modal; reuses
       `movedItems.js`/Activity Log exactly like Round 14's Move button did) side
       by side. A `unresolvedItems` memo gates the **Finalize** button.
     - `finalizeReturnTransfer()` — the new terminal-status decision point:
       `items.some(it => it.resolution === 'returned')` ? `'returned-completed'`
       : `'transferred'`. Logs one Activity Log entry either way.
4. **`EventPage.jsx` updated to match:**
   - `upEvents`/`totalUp` now just check `closingOf(e) === 'on-going'`.
   - `finishedEvents`/`totalFinished` now just check `closingOf(e) ===
     'checking-inventory'` (was a 2-value OR before).
   - `pastEvents`/`totalPast` now include `returned-completed` OR `transferred`
     (was just `returned`).
   - The middle tab label changed from "Finished Event" to **"Checking
     Inventory"** (matches the stats card and intro copy too).
   - `EventCard` (Upcoming tab) gained a `readyToClose` prop — shows the "Ready to
     Close" badge next to the event code when applicable.
   - New `pastExtraBadge(e)` helper — shows a distinguishing badge on Past Events
     rows that arrived via `returned-completed`/`transferred`, so they're visually
     distinct from plain seeded `type: 'past'` events (which get no badge) and
     from each other.

---

## Round 14 — Move to Another Event, Event Status "Code" field, item-card decluttering, Packaging folded into ⋮ menu

**Files:** `src/lib/movedItems.js` (new), `src/data/eventStatuses.js`,
`src/pages/EventStatusPage.jsx`, `src/pages/EventDetailPage.jsx`, `src/style.css`

Four independent changes requested together:

1. **Move to Another Event.** During the **Ready for Return** closing phase, every
   item card now shows a **"Move to Another Event"** button (`.btn-ia-move`) next to
   where the Scan button would be. Clicking it opens a modal to pick a target event
   (from `initialEvents`, filtered to `type: 'upcoming'` and not itself in any
   closing phase — the same set `EventPage.jsx`'s "Upcoming" tab shows) and a target
   Event Status stage (the same global `stages` list every event's stepper uses).
   Confirming:
   - Removes the item from the current event's `items` state.
   - Calls `queueMovedItem(targetEventKey, itemPayload)` (new `src/lib/movedItems.js`
     — a localStorage queue keyed by the same `"<date> | <NAME>"` string
     `eventClosing.js`/`eventProgress.js` already use, since there's no real
     cross-event item store).
   - Logs an Activity Log entry (module "Event Detail", action "Move").
   - `EventDetailPage.jsx`'s `items`/`nextId` lazy `useState` initializers now
     read `getIncomingItems(eventName)` and merge any queued items in at mount
     time (stamped with the chosen target stage, fresh sequential ids), and a
     separate `useEffect` calls `clearIncomingItems(eventName)` right after so
     they aren't merged in again later. Deliberately *not* a `setItems(...)`
     inside the effect itself — doing the merge in the effect body first tripped
     the `react-hooks/set-state-in-effect` lint rule (cascading-render warning),
     so the merge moved into the initializers, leaving the effect to only clear
     the now-consumed queue (a plain side effect, no state update).
   - **Gotcha #1:** a moved item only becomes visible in the target event once
     that event's own stepper reaches (or passes) the stage it was moved into —
     this follows the pre-existing `scopedItems` rule ("All" only shows items
     whose `stage` is at or before the event's current stage), not a new
     restriction. Verified live: moved an item from "Corporate Summit 2026" into
     "Wedding Bali Season" at stage "Event running" — it didn't show in "All"
     until the target event's stepper was advanced to "Event running."
   - **Gotcha #2 (bigger one):** `EventDetailPage.jsx` has no real per-event item
     store — every event's `items` are seeded fresh from the same generic
     26-item `initialItems` list on every mount, a pre-existing limitation this
     feature inherits rather than fixes. Since the moved-items queue is consumed
     exactly once, the merged item only stays visible for as long as that
     particular mounted page instance stays alive. Verified live: after the
     queue was cleared, opening the target event again in a brand-new tab showed
     26 items again, not 27 — the merge doesn't survive a remount. The move
     itself is still real (source removal + Activity Log entry both persist),
     but "landed in the target event" should be understood as "queued and
     merged into whichever session next has that page open," not "permanently
     added to that event's item list" — there's no such persisted list to add
     it to yet.
2. **Event Status gained a `code` field.** Added to `initialStatuses` in
   `src/data/eventStatuses.js` (short seeded codes like `CBA`, `OPI`, `ER`), the
   New/Edit modal in `EventStatusPage.jsx` (plain text input, uppercased on input),
   and a new "Code" column in the table (rendered as a `badge-gray` pill, or "—" if
   blank). Purely a label — nothing else reads it yet.
3. **Item card decluttering.** In `ItemCard` (`EventDetailPage.jsx`):
   - The "Warehouse Item" indicator row is removed from rendering entirely (the
     `item.warehouseItem` data field itself is untouched, just no longer displayed
     — nothing else in the codebase reads it).
   - The "Checked" indicator row is now conditional on a new `showCheckedToggle`
     prop, passed as `closingStatus === 'ready-for-check'` from both `ItemCard`
     call sites — so it only appears during the phase it's actually for, instead of
     on every card at every stage. It still writes to the same `item.checked` field
     the Inventory Return Report reads at Confirm Return time.
4. **Packaging folded into the ⋮ more-menu.** The standalone orange box-icon button
   (`.action-icon-btn.btn-pkg`) is removed from the header actions bar. A new "Group
   Items" entry (same `openPackagingModal` handler) was added to `.more-menu-dropdown`
   above Summary and Print. Dead CSS (`.btn-pkg`, `.action-icon-btn.btn-pkg`) removed
   from `style.css`.

See `docs/context.md`'s new topic section and open-questions #15–16 for the
interpretive calls made on this request (the "2 return options" wording, and what
happens to the Checked toggle once hidden from default view) — flag if either
reading is wrong.

---

## Round 13 — Ownership flag: clickable/editable + a real filter

**Files:** `src/pages/EventDetailPage.jsx`, `src/style.css`

Round 12 added the IHC/IHP/Outsource ownership flag as a read-only badge with no
way to change it after the fact, and no way to filter by it. Both fixed:

1. **The ownership badge is now a `<button>`, not a `<span>`**, and clicking it
   cycles `OWNERSHIP_CYCLE = ['IHC', 'IHP', 'Outsource']` via
   `cycleItemOwnership(id)` — `(currentIndex + 1) % 3`. Available on every item
   card at any Event Status stage or closing phase, matching "manual and
   flexible, can change anytime" from the request. New `.ownership-badge-btn`
   CSS just strips default `<button>` chrome (border/font) so it still looks
   like the existing `.badge` pill; a `:hover { filter: brightness(0.94) }` is
   the only visual affordance that it's clickable, plus a `title` tooltip.
2. **New Ownership filter** — a `SearchableSelect` next to the existing Area
   filter (`All Ownership` / `IHC` / `IHP` / `Outsource`, each with a live count
   via a new `ownershipCounts` memo, same shape as the pre-existing
   `areaCounts`). Wired into the same base `filtered` memo the Area filter and
   keyword search already go through, so it composes with every stage tab
   (Waiting Scan / Grouped / All / Added New) automatically rather than needing
   separate filtering logic per tab.

---

## Round 12 — Event closing lifecycle (Close → Ready for Check → Ready for Return → Return), item Checked flag, IHC/IHP/Outsource

**Files:** `src/lib/eventClosing.js` (new), `src/pages/EventDetailPage.jsx`,
`src/pages/EventPage.jsx`, `src/style.css`

A new phase was added covering what happens *after* an event finishes its
normal Event Status stepper — the gap between "the event happened" and "it's
fully archived/returned" wasn't modeled anywhere before this.

1. **New closing-phase state machine**, tracked independently of the normal
   Event Status stage: `null` (still in normal lifecycle) → `'ready-for-check'`
   → `'ready-for-return'` → `'returned'`. Persisted in new
   `src/lib/eventClosing.js` (`getEventClosing`/`setEventClosing`,
   localStorage key `emi_event_closing`), keyed by the exact same
   `"<date> | <NAME>"` string `EventDetailPage.jsx` already reads from its
   `?name=` query param — chosen specifically so `EventPage.jsx` (a different
   route entirely) can look up the same key via
   `` `${e.date} | ${e.name.toUpperCase()}` `` without a real join/backend.
2. **`EventDetailPage.jsx`'s "Next" button slot now has four possible faces**,
   swapped by `closingStatus`:
   - Normal lifecycle, at the last Event Status row (`!hasNextStage`): **"Close
     this Event"** (was previously nothing — the stepper just dead-ended with no
     button once you hit the last row). `handleCloseEvent()` confirms via
     `window.confirm`, then sets `closingStatus` to `'ready-for-check'`.
   - `'ready-for-check'`: an orange "Ready for Check" badge + a **"Ready for
     Return"** button (`handleReadyForReturn`, sets `'ready-for-return'`).
   - `'ready-for-return'`: a blue "Ready for Return" badge + a **"Return"**
     button that opens the new Inventory Return Report modal instead of
     transitioning directly.
   - `'returned'`: a green "Returned" badge, no further action.
   - The `Stepper`'s `onStepClick` is now `closingStatus ? undefined :
     changeEventStatus` — once an event enters the closing phase, its stage
     stepper freezes (no more moving between Event Status rows).
   - **Assumption, flagged in `docs/context.md`:** this progression is a plain
     3-click sequence, **not gated** on all items being Checked first. A "button
     stays disabled until 100% checked" reading was also plausible from the
     request's wording, but was rejected because it would make the Return
     report's "how many are missing" number always zero (nothing could reach
     Return with anything left unchecked). Easy to flip later if that reading
     was actually wanted — the gate would live in `handleReadyForReturn`.
3. **Inventory Return Report** (new `Modal`, opens from "Return"): reports
   `returnReport.checkedCount` of `returnReport.total` items were ever marked
   Checked, and lists every item that wasn't as "possibly missing." Purely
   informational — it's not a real stock reconciliation against Warehouse
   Inventory, just a review step before confirming. Confirming calls
   `confirmReturn()`, which sets `closingStatus` to `'returned'`.
4. **New "Checked" item indicator**, deliberately separate from the
   pre-existing "Checking" indicator (an older, different, always-static
   concept — `item.checking`, no toggle UI, unrelated to this). "Checked"
   (`item.checked`) is a third `indicator-row` under "Warehouse Item," but
   unlike the other two it's **clickable** (`onToggleChecked` prop threaded
   through `ItemCard`, new `.indicator-row-clickable` CSS for the hover
   affordance) and toggles on click via `toggleItemChecked(id)`. Available on
   every item card regardless of the current Event Status stage or closing
   phase — its only consequence today is what the Return report counts.
5. **New per-item ownership flag**: `'IHC'` / `'IHP'` / `'Outsource'`
   (`item.ownership`), rendered as a small colored badge next to the Area badge
   (new `.item-badge-row` wrapper — the Area badge's own `margin-bottom` moved
   onto this wrapper since it's no longer a lone element). All 26 seed items in
   `initialItems` were given a plausible mixed distribution; items added via
   the cart/checkout flow (`checkout()`) default to `'IHC'` since they're
   always pulled from the company's own warehouse stock in that flow — there's
   no picker yet to choose a different ownership per cart line.
6. **`EventPage.jsx` gained a "Finished Event" tab**, inserted between
   Upcoming and Past Events (tab bar + a 4th stats card, `repeat(3,1fr)` →
   `repeat(4,1fr)` in the header stats grid). It lists every event whose
   closing status is `'ready-for-check'` or `'ready-for-return'` — i.e.
   genuinely closed but not yet returned — with a small badge per row showing
   which of the two sub-phases it's in (reused `PastEventRow` via a new
   `extraBadge` prop rather than building a separate row component).
   `upEvents` now excludes anything that has entered the closing phase at all;
   `pastEvents` now also includes anything `'returned'`, on top of the
   original seed `type: 'past'` events. **Gotcha:** "only ready-for-check" was
   read literally in the initial request, but interpreted as "the whole closed-
   and-awaiting-return phase" (both sub-statuses) instead — a strictly-literal
   reading would make an event vanish from every single tab the moment it moved
   from Ready for Check to Ready for Return, which didn't seem like the intent.

---

## Round 11 — Item Loan: Listing + Detail split, multi-item orders, new/external items

**Files:** `src/data/itemLoans.js`, `src/lib/itemLoanStore.js` (new),
`src/pages/ItemLoanPage.jsx`, `src/pages/ItemLoanDetailPage.jsx` (new),
`src/App.jsx`, `src/components/GlobalSearch.jsx`, `src/pages/DashboardPage.jsx`

Round 10's Item Loan rebuild had a real gap, caught immediately after: it modeled
one item per loan, always sourced from live warehouse stock — but a real loan can
cover several items in one transaction, and can include an item the business
never stocked at all (borrowed straight from/through the vendor). Three changes,
all interdependent enough to land together:

1. **Data model: flat loan record → order + `items[]`.** A loan (order) now has
   header fields (vendor, contact, purpose, loan/due date) plus an `items` array,
   each with its own `itemName`, `source` (`'warehouse'` or `'new'`),
   `inventoryRowId` (only set for `'warehouse'` items), `qty`, `unit`, and its
   **own** `returnDate`/`returnCondition`/`returnNote`. `src/data/itemLoans.js`'s
   6 seed records were restructured to this shape (2 of them now genuinely
   multi-item, one of those including a `source: 'new'` line, so the seed data
   actually demonstrates every new code path instead of only single-item
   `'warehouse'` loans).

2. **New Loan modal: two add-modes feeding one staged item list.** "Items to
   Loan" has a **From Warehouse** tab (the existing `SearchableSelect` over
   `stockOpnameStore` rows with stock > 0) and a **New / External Item** tab
   (plain text name + qty + unit, no inventory lookup at all). Either adds a row
   to a `pendingItems` staging list (shown with a remove "×", mirroring Moving
   Order's item-list UI/CSS classes verbatim — `.mo-item-list`/`.mo-item-row`).
   Saving the loan iterates `pendingItems`: `source: 'warehouse'` lines decrement
   the matching `inventoryRowId`'s stock (same formula as Rounds 6/10's Moving
   Order and Item Loan stock math); `source: 'new'` lines are just recorded, no
   stock touched anywhere, ever, since there was never any to decrement.

3. **Listing + Detail split**, matching this app's established list→detail
   pattern (Event → Event Detail, etc.) rather than a flat table trying to show
   both loan-level and item-level information in one row. `src/lib/
   itemLoanStore.js` (new, in-memory module singleton — identical shape to
   `stockOpnameStore.js`) replaced `ItemLoanPage.jsx`'s local `useState` for
   `loans`, because Listing and the new Detail page are separate routes that
   both need to read *and mutate* the same orders (create on Listing, return an
   item on Detail, see the updated status back on Listing — impossible with
   page-local state).
   - `/item-loan` (Listing) — one row per order: vendor, an item preview
     (`firstItem.name` + `"+N more"`), loan/due date, and a computed
     `loanOrderStatus()`: **Returned** (every item has a `returnDate`),
     **Partially Returned** (some but not all), **Overdue**/**Borrowed**
     otherwise. `loanOrderStatus` is exported from `ItemLoanPage.jsx` and
     re-imported by the Detail page rather than duplicated.
   - `/item-loan-detail?id=` (new page, same `useSearchParams` + `?id=` +
     `parseInt` convention as `WarehouseDetailPage.jsx`/`InventoryDetailPage.jsx`)
     — order header info, then every item line with its **own** status and its
     **own** Return action, so returning 2 of 3 items correctly leaves the order
     "Partially Returned" instead of forcing an all-or-nothing return like Round
     10's version did. The Return modal itself (date + Good/Poor condition +
     notes) is unchanged from Round 10, just now scoped to one item line.
   - **Fallout fixed in the same pass:** `GlobalSearch.jsx` and
     `DashboardPage.jsx` both read the *old* flat shape directly
     (`loan.itemName`, `loan.returnDate`, `initialItemLoans.length` as a loan
     count) and broke the moment the data model changed — a `ReferenceError` that
     took a fresh browser tab to even see past a stale-HMR false alarm first (see
     "Context every dev should know" below on that gotcha). Global Search's Item
     Loan results now flatten `loans.flatMap(l => l.items.map(...))` and deep-link
     to `/item-loan-detail?id=<loan.id>` instead of the flat `/item-loan`.
     Dashboard's "Currently On Loan"/"Overdue Loans" KPIs now count individual
     **item lines** across all orders (`allLoanItems`), not orders themselves.

---

## Round 10 — Upgrade page, live activity log, Item Loan overhaul (Vendor + real borrow/return)

**Files:** `src/pages/UpgradePage.jsx` (new), `src/components/UpgradeCTA.jsx`, `src/App.jsx`,
`src/lib/activityLogStore.js` (new), `src/lib/tenantAuth.js`, `src/pages/LogPage.jsx`,
`src/pages/DashboardPage.jsx`, `src/data/vendors.js` (new), `src/lib/vendorStore.js` (new),
`src/data/itemLoans.js`, `src/pages/ItemLoanPage.jsx`

1. **`/upgrade` is now a full page**, not a navbar modal. `UpgradeCTA.jsx` was
   stripped down to just the gradient pill button + `navigate('/upgrade')` — all
   the plan-grid rendering logic (`initialPricingPlans`, `computePlanPrice`,
   `planFeatureList`, the mock "request sent" button state) moved to
   `UpgradePage.jsx` unchanged, plus two new sections: a "Current Plan" card
   (hardcoded to Starter, with invented usage numbers — there's no real
   per-tenant plan/usage data anywhere to read from) and a short static FAQ.
   Route added in `App.jsx` alongside the other tenant routes.

2. **Activity logging is now real, not purely decorative.** `src/data/
   activityLogs.js`'s `initialActivityLogs` used to be read directly by
   `LogPage.jsx` and `DashboardPage.jsx`'s "Recent Activity" — a static array
   nothing ever appended to, despite the Log page having Module/Action filters
   that implied it was tracking something live. New `src/lib/activityLogStore.js`
   (localStorage key `emi_activity_logs`) wraps that seed with `getActivityLogs()`
   / `addActivityLog({ userName, action, module, description })` (auto-assigns
   `id` and a `'YYYY-MM-DD HH:mm'` timestamp from the real clock — **not** the
   app's usual mocked `TODAY` constant, since a log entry should say when it
   actually happened in this browser session, not be pinned to the fake "today"
   the rest of the app pretends it is). `tenantAuth.js`'s `loginTenant`/
   `logoutTenant`/`registerTenant` now call `addActivityLog(...)`; `LogPage.jsx`
   and `DashboardPage.jsx` both switched their import from the static array to
   `getActivityLogs()`. **Scope:** only auth + Item Loan (below) actually log
   anything yet — event/warehouse/etc. CRUD across the rest of the app still
   doesn't, matching what was asked rather than instrumenting everything.

3. **Item Loan: Vendor entity + real stock impact + a proper Return flow.**
   - New `src/data/vendors.js` (6 seed vendors, reusing the exact names/contacts
     the old free-text `borrowerName`/`borrowerContact` fields already had, so
     nothing looks inconsistent) + `src/lib/vendorStore.js` (localStorage,
     `getVendors()`/`addVendor(...)`). The Loan Item modal's Vendor field is a
     `SearchableSelect` over this list, with a "+ New Vendor" button opening a
     small nested `Modal` (name/contact/type) — saving it calls `addVendor`,
     refreshes the local `vendors` state from the store, and auto-selects the new
     vendor's id in the loan form. Separate free-text Contact Person/Contact
     Phone fields remain (a specific loan's pickup contact can differ from the
     vendor's own listed contact) and fall back to the vendor's name/contact if
     left blank.
   - **Item picker switched from the static `inventoryData` catalog to the live,
     shared `stockOpnameStore.js` rows** (same store Warehouse Inventory and
     Moving Order read/write) — `SearchableSelect` over
     `getInventoryRows().filter(r => r.itemStock > 0)`, showing real per-
     warehouse stock as `meta`. Creating a loan now decrements that row's
     `itemStock`/`warehouseStock`/`totalValuation`/`minStatus` (same
     `deriveStatus` formula as Warehouse Inventory/Moving Order); each new loan
     record stores the `inventoryRowId` it came from. **Item Loan was previously
     completely isolated from real stock** — you could "borrow" any quantity of
     anything regardless of what a warehouse actually had. Verified: loaning 25
     units of an item at 170 in stock drops it to 145 in Warehouse Inventory,
     visible immediately (same in-memory module store, so it's live across pages
     within one session — resets on a hard reload like the rest of this store
     always has).
   - **"Mark as Returned" (single icon click, no record of anything) → a "Return
     Item" modal.** Fields: Return Date, Item Condition (Good/Poor — reusing
     Stock Opname's `.condition-toggle`/`.condition-btn` CSS and vocabulary
     verbatim for consistency, rather than inventing new "Damaged"-style wording),
     and a Condition Notes field shown only when Poor. Confirming restores stock
     to the loan's `inventoryRowId` (if it has one — see gotcha below) and logs a
     `Item Loan` / `Update` activity entry; a Poor return shows a small red
     "Poor" badge next to the loan's Returned status in the table.
   - **Gotcha:** the 6 seed loans in `itemLoans.js` all have `inventoryRowId:
     null` — they predate the live-stock wiring and were never really
     decremented from anything, so returning one of them intentionally does
     **not** restore any stock. Only loans created through the new "Loan Item"
     flow have a real `inventoryRowId` and thus real return-side stock
     restoration. Don't "fix" the seed records to have a fake row id just to make
     this symmetric — there's no real warehouse state they should be tied to.

---

## Round 9 — Header button sizing, mock-status fallback, Event Status edit mode, Upgrade CTA

**Files:** `src/style.css`, `src/data/eventInventory.js`, `src/pages/EventDetailPage.jsx`,
`src/pages/EventStatusPage.jsx`, `src/components/Layout.jsx`,
`src/components/UpgradeCTA.jsx` (new)

1. **Event Detail header buttons now all measure 36×36 / 36-tall.** The three
   icon buttons (Packaging, Cart, the "⋮" more-menu) use `.action-icon-btn`
   (fixed 36×36), but "+ Add Item" uses the shared `.btn-new` class, whose base
   padding computes to 30px tall — 6px short, visibly misaligned next to the
   icon buttons even though `.event-actions-bar` already has
   `align-items: center`. Rather than touch `.btn-new` globally (it's the
   correctly-sized "New" button on ~19 other pages' toolbars), added a scoped
   override: `.event-actions-bar .btn-new { height: 36px; }`.

2. **Event Detail's initial stage now has a real three-tier fallback**, not
   "saved progress or always stage 1." Round 7 added `localStorage`-backed
   per-event progress (`src/lib/eventProgress.js`), but a never-before-opened
   event still always fell back to `stages[0]`. Root cause of that being
   pointless: `src/data/eventInventory.js`'s `status` field was **the literal
   string `'Created by admin'` on every one of its 364 rows** — a typo (missing
   " up") that also meant it could never match a real canonical Event Status
   name for a lookup anyway, so there was nothing meaningful to fall back to.
   Fixed the typo everywhere, and gave the 7 hand-authored named event groups
   (as opposed to the ~326 synthetic `'Event 44'`-style padding rows, left
   uniform) distinct statuses across the lifecycle — Wedding Thamrin → On
   preparing items, Gala Dinner Bali → Finish setup, Birthday Party → Waiting
   scan in, Corporate Event → Event running, National Seminar → Waiting scan
   out, Traditional Wedding → Finished, Culinary Festival → Created by admin up.
   `EventDetailPage.jsx`'s `eventStatus` init now checks, in order: saved
   `localStorage` progress → `eiData` row matching this event name (if its
   `status` is a valid stage) → `stages[0]`. **Gotcha:** `eiData` still isn't a
   real per-event join to `src/data/events.js` (see the pre-existing
   Event-Inventory-link gap noted elsewhere in `docs/context.md`) — this fallback
   only fires for event *names* that happen to have a matching `eiData` row at
   all; most of the 300+ synthetic Event Inventory rows and anything opened by a
   name absent from `eiData` still lands on `stages[0]`, same as before.

3. **Event Status row reordering: instant-apply → edit-mode + Save.** Previously
   `moveOrder(id, dir)` mutated `statuses` (and called `saveEventStatuses`,
   i.e. wrote `localStorage`) on every single arrow click — no undo, no batching.
   Added `reorderMode` + `draftStatuses` state: an **"Edit Order"** toolbar
   button seeds `draftStatuses` from `statuses` and flips into reorder mode; the
   Order column's up/down arrows (previously always live) now only render at all
   when `reorderMode` is true — otherwise that cell just shows a `—` placeholder,
   so reordering is genuinely impossible without first entering edit mode. All
   arrow clicks mutate only `draftStatuses`; per-row Edit/Delete buttons and the
   "New" button are `disabled` while `reorderMode` is active to avoid interleaving
   the two edit flows. **Save Order** calls the original `setStatuses(() =>
   draftStatuses)` wrapper (which still persists via `saveEventStatuses`);
   **Cancel** just drops the draft. Entering edit mode also force-resets sort to
   Order-ascending (`setSortCol(0); setSortAsc(true)`) so the visual row order
   always matches what the arrows are actually reordering — sorting by another
   column mid-drag would make the arrows' effect look wrong even though the
   underlying `order` values are still correct.

4. **New "Upgrade" CTA in the top navbar**, next to the language switcher —
   gradient pill button, opens a modal (`src/components/UpgradeCTA.jsx`, new)
   showing the SaaS Owner Panel's actual plan catalog. Deliberately reuses
   `src/data/pricingPlans.js` + `computePlanPrice`/`planFeatureList` from
   `src/lib/pricingCalc.js` (the same data `/superadmin`'s Pricing page reads)
   instead of inventing separate numbers, so the two can't silently drift apart.
   This is explicitly a monetization **hook**, not a real upgrade flow — there's
   no billing integration; clicking a plan's button just flips it to a static
   "Request sent — we'll be in touch" state, no backend call. Wire this up for
   real (actual checkout, or at least a lead-capture form) when monetization
   actually becomes a priority.

---

## Round 8 — Event Detail: card delete UX, packaging scope, picker stock, header menu

**Files:** `src/pages/EventDetailPage.jsx`, `src/style.css`

Five independent polish fixes, requested together off a visual review with screenshots:

1. **Item card delete: bottom row → hover-only top overlay.** `ItemCard` used to
   render a full-width `.btn-ia-del` row at the bottom of every card, always
   visible, taking up permanent vertical space. It's now a small circular button
   (`.item-card-delete`) absolutely positioned at `top:8px; right:8px` over the
   image placeholder, `opacity:0` by default and `opacity:1` on `.item-card:hover`.
   Requires `.item-card` to have `position: relative` (added) so the absolute
   child anchors to the card, not some further-up ancestor.
2. **Packaging (grouping) works at any stage, not just the first one.** Removed
   `isFirstStage` and its gate entirely: the header box-icon trigger is no longer
   `disabled`, and `packableItems` is now just `items.filter(it => !it.groupId)` —
   previously it also required `stages.indexOf(it.stage) === 0`, so an item added
   after the event moved past the first stage could never be grouped, and the
   button was greyed out everywhere except the first stage. **Gotcha:** this is a
   real behavior change from the original Packaging design (see Round 6/Round 7's
   Packaging notes) — if "only group at the point items first arrive" turns out to
   matter for some workflow reason, this needs to be re-added deliberately, not
   assumed away.
3. **Removed the dead per-item box icon** (`.btn-ia-pkg`) from each card's action
   row — it rendered but had no `onClick`, ever (grouping has only ever happened
   through the header trigger → Group modal). Simplified `.item-actions` down to
   a single full-width Scan button (when `showScanButton` is true) instead of a
   two-button row; `.item-actions-row` and the `.btn-ia-pkg`/`.btn-ia-del` CSS
   rules were removed as dead code along with it.
4. **Inventory picker's stock number now depends on the selected warehouse.**
   `src/data/inventory.js`'s `inventoryData` gives every catalog item exactly one
   fixed `totalStock`/`warehouse` pair — it isn't a real multi-warehouse model.
   The "Add Item from Inventory" modal's per-row "Take from warehouse"
   `SearchableSelect` lets you pick *any* of the 10 warehouses, but the displayed
   stock, the quantity cap, and the Out-of-Stock gate were all still reading the
   catalog's single static number regardless of that selection — so switching
   warehouses visibly did nothing. Fixed with a new `stockAtWarehouse(inv,
   warehouseName)` helper that looks up the real number from
   `src/data/warehouseInventory.js` (`wiData`, the same per-warehouse dataset
   Warehouse Inventory and Moving Order use) by matching `name` + `warehouseName`,
   falling back to `0` if that item isn't stocked at the chosen warehouse at all.
   `addToCart()` now stores this resolved number as the cart line's `totalStock`
   too, so quantity edits in the cart panel stay capped correctly for whichever
   warehouse was selected at add-time. **Left alone:** the "Available"/"Low
   Stock" badge text still comes from the catalog's static `stockStatus` — only
   the *Out of Stock* determination was switched to the live per-warehouse number
   (0 stock there → Out of Stock, Add disabled), since shipping that inconsistency
   would let someone "add" a genuinely-zero-stock line to their cart.
5. **Print and Summary moved into the header's "⋮" more-menu**, which existed
   since Round 1 but had no `onClick` at all ("added for future actions," per that
   entry — this is that future). New `moreMenuOpen` state + a `mousedown` outside-
   click listener (mirroring the pattern in `SearchableSelect.jsx`) toggle a small
   absolutely-positioned dropdown (`.more-menu-dropdown`) anchored under the
   button; Print and Summary are now `.more-menu-item` buttons inside it instead
   of two separate icon buttons that lived in the `.filter-row-right` toolbar
   (which now holds only the Area filter and the Check button).

---

## Round 7 — Event Detail: persisted stage, restructured item-list tabs

**Files:** `src/pages/EventDetailPage.jsx`, `src/lib/eventProgress.js` (new)

Two related fixes to how Event Detail remembers and presents "where the event is right
now," requested after live testing surfaced both as confusing:

1. **The event's current stage now survives leaving and re-entering the page.**
   Previously `eventStatus` was plain `useState(() => stages[0])` — every time you
   opened *any* event's detail page (or just reloaded), it silently reset to stage 1
   ("Created by admin up"), even if you'd already advanced it further in an earlier
   visit. New `src/lib/eventProgress.js` persists the last-set stage **per event
   name** to `localStorage` (key `emi_event_progress`, shape `{ [eventName]:
   statusName }`) — the same "small localStorage-backed lib" pattern already used by
   `eventStatuses.js` and `tenantAuth.js`. `changeEventStatus()` now calls
   `saveEventProgress(eventName, step)` on every successful move; the page's initial
   `eventStatus` state reads it back via `getEventProgress(eventName)`, falling back
   to `stages[0]` only if nothing was saved yet (a genuinely first-ever visit) or the
   saved value no longer matches a real Event Status row (e.g. it was renamed/deleted
   on the Event Status page since). **In plain terms:** open an event, move it to
   "Waiting scan in," come back tomorrow (or just refresh) — it's still at "Waiting
   scan in," not back at square one.
   - Still mock/local: this is per-browser `localStorage`, not a real per-event
     field in `src/data/events.js` (which has no status field at all — see the
     pre-existing gap noted in `docs/context.md` about `EventPage.jsx`'s disconnected
     status dropdown). Clearing site data or opening in a different browser loses it,
     same as every other piece of mutable state in this app.

2. **Item-list tabs above the item grid were replaced.** Old set: **All** (every
   item regardless of stage), **From Previous Stage**, **New in "[stage]"**,
   **Grouped**. New set, in this order:
   - **Waiting Scan** — only rendered at all when the *current* Event Status row has
     Scan enabled (`stageScanEnabled`); shows items in scope (see below) that still
     have `scanned: false`. This is the "what do I still need to scan before Next
     unlocks" view that didn't exist before — you had to eyeball red ✗ badges across
     every card.
   - **Grouped** — unchanged from Round 6 (box cards, Scan Box button).
   - **All** — **redefined.** Now `scopedItems` = items whose `stage` index is `<=`
     the current stage's index, instead of every item regardless of stage. In
     practice this absorbs what "From Previous Stage" used to show (carried-over
     items) plus the current stage's own items, in one number — which is why "From
     Previous Stage" as a separate tab was dropped, it's now redundant. **Gotcha:**
     this technically changes "All" to *not* show items whose stage is still ahead of
     the current position — only reachable if the stepper was ever moved backward
     (an item's `stage` is a write-once historical marker, stamped at add-time, so it
     can end up "ahead" of a later, backward stepper move). Round 5's original
     "Semua shows everything regardless of stage" note is superseded by this — flag
     it if that all-inclusive behavior turns out to still be wanted somewhere.
   - **Added New** — same computation as the old "New in '[stage]'" (`stage ===`
     current stage exactly), just relabeled and moved last.
   - `waitingScanItems` and `scopedItems` are both plain derived filters — they do
     **not** change the actual Next-button gate. `unscannedCount` (the value that
     blocks `changeEventStatus`/`handleNextClick`) is intentionally left as-is,
     still counting unscanned items across the *whole* event regardless of stage —
     see the pre-existing "scan requirement scope" assumption in `docs/context.md`.
     If the gate should be scoped to match the new "All"/"Waiting Scan" definition,
     that's a follow-up, not something silently bundled into this change.
   - A stale-tab edge case is guarded defensively: if `stageFilter === 'waiting'` but
     the stage you land on (via `changeEventStatus`) no longer has Scan enabled, the
     page falls back to treating the view as `'all'` rather than rendering an
     invisible/broken tab — though in practice `changeEventStatus` already resets
     `stageFilter` to `'all'` on every stage change, so this mostly matters if that
     reset logic changes later.

---

## Round 6 — Tenant auth, Event Status consolidation, Stock Opname, Warehouse CRUD + Moving Order, Event Inventory link, searchable dropdowns

**Files:** too many to list individually — see `git log` / the commit this landed in
(`Add tenant auth, event lifecycle overhaul, stock opname, and searchable dropdowns`).
Touches roughly 48 files across `src/pages/`, `src/lib/`, `src/components/`,
`src/data/`, and `src/style.css`.

This was one large batch covering several distinct, mostly-independent feature
requests. Summarized here so a dev doesn't have to reverse-engineer intent from the
diff alone — see `docs/context.md`'s "Current decisions, by topic" for the full,
more granular reasoning behind each one (including flagged open questions).

- **Tenant authentication.** Mock, no-backend login/register/forgot-password
  (`src/lib/tenantAuth.js`, `LoginPage.jsx`/`RegisterPage.jsx`/`ForgotPasswordPage.jsx`,
  `RequireTenantAuth.jsx` route guard). Two roles, Admin and Employee — Employee can
  do everything Admin can except see the "Event Settings" sidebar shortcut. Fully
  separate from the pre-existing SaaS Owner Panel auth (`superAdminAuth.js`) — see
  the new "Two auth systems, not one" note above.
- **Event lifecycle consolidated onto the pre-existing Event Status master-data
  page** (`/event-status`, `EventStatusPage.jsx`). A first pass had built a
  standalone "Event Settings" stage editor + single global scan toggle before
  realizing Event Status already modeled this — with *more* granularity (a
  **Scan** field of "None"/"Scan" per status row, not one global switch). That
  duplicate system was deleted. Now:
  - `src/lib/eventStatuses.js` (`getEventStageNames()`, `isScanStage(name)`) is the
    single source of truth both `EventDetailPage.jsx`'s stepper and its scan-gate
    logic read from — add/rename/reorder/delete a row on Event Status and every
    event's stepper reflects it immediately, no code change needed.
  - **Scan gate:** when the *current* stage's Scan is "Scan", every item must have
    `scanned: true` before the stepper can move to a *later* stage (blocked with an
    inline error banner) or before the dedicated **Next** button (only shown at
    scan-enabled stages) unlocks. Moving backward is never blocked. The Scan button
    opens a dummy scan popup (no real camera/barcode) that flips `scanned` and
    backfills `scanIn`/`scanOut` display strings.
  - **Gotcha:** `EventPage.jsx`'s own per-event "Status" form field still has its
    own hardcoded copy of the 9 status label strings, unrelated to
    `eventStatuses.js` — renaming/adding/removing an Event Status row silently
    desyncs that dropdown. Pre-existing, not fixed here.
- **Packaging ("Grouping")** — the box-icon button (first stage only) groups several
  items so they scan together as one unit, because in the real workflow several
  items go in one physical box with one QR code stuck on it. A dedicated **Grouped**
  tab (see Round 7 above for its latest tweak) shows each box as its own card with a
  single Scan Box action.
- **Stock Opname** moved to its own page (`/stock-opname`), reachable only via a
  "Start Stock Opname" trigger on Warehouse Inventory's Opname History tab. Flow:
  pick one warehouse → record actual stock + condition (Good/Poor, with a manual
  note if Poor) per item → submits as **Pending** (no stock change yet) → an Admin
  Approves (applies the diffs) or Rejects (no-op) from Opname History. Only one
  opname can be in flight at a time. Shared live state (`src/lib/stockOpnameStore.js`)
  is what lets Warehouse Inventory and Stock Opname — two separate pages, no
  Context/Redux in this app — agree on current stock without a backend.
- **Warehouse Inventory: View/Edit/Delete actually work now** (the buttons existed,
  had no handlers). Edit reuses the Add-Item modal with the item name fixed instead
  of the item-catalog picker (renaming isn't supported, only numbers/location).
- **Moving Order** (new "Moving Order" tab on Warehouse Inventory) — pick a source
  **warehouse** first, then a searchable checkbox list of every item with stock
  there (multi-select, one quantity field per selected item), then a destination
  warehouse. Applies immediately, no Pending/Approve step (unlike Stock Opname —
  that asymmetry is deliberate, flagged in `docs/context.md` in case symmetry is
  wanted later). One history row per item moved, not one row per batch.
- **Event Inventory rows** got a "View Event" action linking to
  `/event-detail?name=<event>`. Known gap: most Event Inventory rows are synthetic
  placeholders (`Event 43`, etc.) that don't match a real `src/data/events.js`
  record, and Event Detail's item list is one generic dataset regardless of which
  event name is passed in — the link always works, it just won't show anything
  event-specific for those placeholder rows.
- **`SearchableSelect.jsx`** (new shared component) replaced **every** native
  `<select>` in the tenant app (not the SaaS Owner Panel — out of scope, flagged in
  `docs/context.md`). Custom trigger + type-to-filter search box + option list,
  rendered through a React portal to `document.body` so it isn't clipped by a
  modal's `overflow: hidden` (a plain absolutely-positioned dropdown would be —
  this is why it's a portal and not just a styled `<div>`). Supports `inline` (compact,
  for toolbar filters) and a full-width default (for form fields), plus an optional
  `meta` per option for a right-aligned secondary label (stock counts, item counts).
  Fixed a real, pre-existing bug for free: Event Detail's Area filter was a
  hand-rolled dropdown with no outside-click-to-close handler — replacing it with
  `SearchableSelect` fixed that as a side effect.

---

## Round 5 — Event Detail: stage tabs, searchable area filter, stepper numbering

**Files:** `src/pages/EventDetailPage.jsx`, `src/components/Stepper.jsx`, `src/style.css`

Three targeted fixes/refinements on top of Round 4's stepper/dropdown work, requested
after reviewing it live:

1. **Area filter is now a searchable combobox with item counts.** The old "All Place"
   dropdown was a plain static list of ~15+ areas with no way to search and no
   indication of how many items were in each. It's now `dropdown-search` (a text
   input pinned to the top of the menu) + `dropdown-list` (scrollable, max-height
   260px) + a count badge (`dropdown-item-count`) per row, computed live from the
   current `items` array. Typing filters the area list by substring match
   (case-insensitive).
   - **Known data quirk found while building this:** a few item records in
     `initialItems` use area names (`RECEPTION`, `PHOTOBOOTH`) that **do not exist**
     in the master area list (`src/data/areas.js` → `initialAreas`). This is a
     pre-existing seed-data inconsistency, not something introduced here — those
     areas simply never show up as selectable options in the dropdown (old or new),
     even though items are tagged with them. If you're asked to "fix filtering by
     RECEPTION", the real fix is adding it to `initialAreas`, not the dropdown code.

2. **Stepper no longer swaps to a checkmark icon on completed steps.** Round 4 had
   completed steps (e.g. "Preparation" after moving to "During Event") render a
   checkmark SVG instead of their number. Product direction was to always show the
   step number regardless of state — only the color/fill (`.stepper-dot.done` /
   `.active`) should change. `Stepper.jsx` now always renders `{idx + 1}`.

3. **New "stage" tracking + tabs to distinguish carried-over vs. newly-added items.**
   This is the biggest change of the three. Every item now has a `stage` field —
   the event status (`Preparation` / `During Event` / `After Event`) that was active
   **at the moment the item was added**:
   - The 12 seed items in `initialItems` are all `stage: 'Preparation'`.
   - `checkout()` (the cart → event-items flow) now stamps new items with
     `stage: eventStatus` (whatever the stepper is currently set to).
   - A new tab row (`.stage-tabs`) sits above the item grid with three options:
     **Semua** (everyone, respects the area/keyword filters only), **Dari Tahap
     Sebelumnya** (items whose `stage` is earlier than the current stepper position),
     and **Baru di "{stage}"** (items added exactly in the current stage). Each tab
     shows a live count.
   - Moving the header stepper (`changeEventStatus()`) automatically resets the tab
     back to "Semua" — otherwise a user could get stuck looking at an empty "Baru"
     tab after advancing the event and be confused about where their items went.
   - This is purely a **viewing/filtering aid**. It does not hide or lock items —
     you can still see everything via "Semua" regardless of what stage the event is
     in now, including items added in a stage *after* the one currently selected
     (an edge case if someone moves the stepper backwards).

---

## Round 4 — SaaS-level Dashboard redesign, Owner Panel access, status-dropdown removal

**Files:** `src/pages/DashboardPage.jsx`, `src/components/Sidebar.jsx`,
`src/pages/EventDetailPage.jsx`, `src/style.css`

Three independent requests landed together:

1. **Owner Panel is now discoverable from the tenant UI.** Added a small
   "Owner Panel" link (shield icon) to the bottom of the sidebar, above the version
   tag, linking to `/superadmin/login`. Previously the only way in was knowing the
   URL. See "Context every dev should know" above for credentials.

2. **Dashboard rebuilt to be "SaaS-level" rather than a plain KPI-and-table page.**
   The old dashboard was 4 KPI cards + 2 charts + 1 table, all inventory/event-only.
   The new one deliberately pulls from **every** data module to act as a connective
   home page:
   - Hero greeting line with a computed one-sentence business insight (next event
     countdown + restock count) and today's date (`TODAY`, not `new Date()`).
   - 6 KPI cards (was 4): Total Events, Inventory SKU, Low Stock, **Sedang Dipinjam**
     and **Peminjaman Terlambat** (new — sourced from `src/data/itemLoans.js`,
     "overdue" = `dueDate < TODAY` and no `returnDate`), and Warehouses. Each card
     has a small delta/trend indicator (`.kpi-delta`) — for the loan/warehouse
     figures these deltas are illustrative dummy text (`+3 bulan ini`, `stabil`,
     etc.), **not** computed from historical snapshots, because no historical data
     exists yet. Don't wire real logic to them without first deciding what
     "previous period" should mean.
   - Quick Actions row: 4 shortcut buttons that just `navigate()` to the page where
     that action's modal lives (`/event`, `/inventory`, `/item-loan`,
     `/warehouse-inventory`). They don't open a modal directly from the dashboard.
   - New "Distribusi Stok per Gudang" horizontal bar chart (top 5 warehouses by
     stock, reusing the existing `.viz-bar-chart` classes) and a new "Aktivitas
     Terbaru" feed (last 5 entries from `src/data/activityLogs.js`, sorted by
     timestamp, with a colored dot per module via `MODULE_DOT` in
     `DashboardPage.jsx`).
   - Kept as-is: Upcoming Events list, Kesehatan Stok stacked bar, Stok per
     Kategori bar chart, Perlu Perhatian table.

3. **Removed the per-item "All Status" dropdown filter in Event Detail.** Item-level
   status filtering (`selectedStatus`, a `<select>` in `.filter-row`) was made
   redundant by the event-level header stepper introduced earlier (see Round 3) —
   the product decision was that *all* status-related filtering should now go
   through that single stepper, not a second independent per-item control.
   - Removed `selectedStatus` state, its `<select>`, and its clause in the
     `filtered` `useMemo`.
   - Removed the now-dead `status` field from `initialItems` and from the object
     `checkout()` builds for new items (it was being set but never read anywhere
     once the dropdown was gone).
   - The summary sentence above the item grid ("`X` pcs item …") now reads off
     `eventStatus` (the stepper's value) instead of the removed dropdown's label.
   - **Note:** Round 5 later reintroduced a *different* per-item field, `stage` —
     don't confuse the two. `status` (removed here) was meant to represent an
     item's current state and duplicated the event-level stepper. `stage` (added in
     Round 5) is a write-once historical marker of *which event stage the item was
     added in*, used only to power the "carried over vs. new" tabs.

---

## Round 3 — Event-level status stepper (corrected from an earlier per-item attempt)

**Files:** `src/pages/EventDetailPage.jsx`, `src/components/Stepper.jsx`, `src/style.css`

Product intent: an event has an overall lifecycle — **Preparation → During Event →
After Event** — and the UI needed a stepper to represent *that*, in the page header,
not per inventory item. An earlier pass had misread the request and built a stepper
on every item card instead; that was reverted:

- Removed per-item stepper, `onStatusChange`, and `updateItemStatus` from `ItemCard`.
- Added page-level `eventStatus` state and a `.event-status-section` block in the
  header (between the action buttons row and the filter row) containing the
  `Stepper` component, driven by `STATUSES = ['Preparation','During Event','After Event']`.
- `Stepper.jsx` renders a row of numbered/labelled dots with connecting lines;
  `done`/`active` styling comes from comparing each step's index to `currentIndex`.

---

## Round 2 — Reporting, Dashboard v1, pricing-as-formula, Item Loan, Stock Opname

**Files:** `src/pages/DashboardPage.jsx` (v1), `src/pages/*` (various new pages),
`src/data/pricingCatalog.js`, `src/lib/pricingCalc.js`, `src/data/itemLoans.js`

Several features landed in this stretch:

- **Report menu** added with **Inventory Report** and **Overview Report** pages.
- **Dashboard menu** added for the first time (dummy-data KPI cards + basic charts;
  later fully redesigned in Round 4 above).
- **Stock Opname** feature added inside the **Warehouse Inventory** page.
- **Item Loan** module added (`src/data/itemLoans.js` + `/item-loan` page) —
  tracks borrower, loan/due/return dates, used later by the Round 4 dashboard KPIs.
- **Pricing changed from manual entry to a formula**, in the SaaS Owner Panel's
  Pricing page: price is now derived from selected Modules + an AI Feature toggle +
  a Storage tier, via `computePlanPrice(plan)` / `planFeatureList(plan)` in
  `src/lib/pricingCalc.js`, reading catalog constants
  (`BASE_PLATFORM_FEE`, `AI_FEATURE_FEE`, `MODULE_CATALOG`, `STORAGE_TIERS`) from
  `src/data/pricingCatalog.js`. Don't let a plan's `price` field be hand-edited
  again without also updating this formula — it will silently drift from what the
  module/storage selection implies.
- **Global Search** (`src/components/GlobalSearch.jsx`) added — searches across
  Events, Inventory, Warehouses, Warehouse Inventory, Areas, Categories, Units, and
  Item Loans, with grouped dropdown results; Event results deep-link to
  `/event-detail?name=...`.
- **Log and Users pages** completed (`src/data/activityLogs.js`, `src/data/users.js`).
- Category/Unit master data extracted from inline consts in `CategoryPage.jsx` /
  `UnitPage.jsx` into shared `src/data/categories.js` / `src/data/units.js` so
  Global Search could reach them.

---

## Round 1 — Inventory Picker + Cart UX, Modal size bug

**Files:** `src/components/Modal.jsx`, `src/pages/EventDetailPage.jsx`

- **Modal size bug fix.** `size="3xl"` / `"4xl"` never visually changed anything
  because the base `.modal` CSS had a hardcoded `width: 460px` that beat the
  `maxWidth` the `size` prop was setting. Fixed by having the `sizeStyles` map set
  `width` directly instead of `maxWidth` — if you add a new size preset, make sure
  it does the same, or it'll silently do nothing at that width.
- **"Tambah Barang dari Inventory" redesigned as a two-panel picker + cart.**
  Originally this was a single-panel modal you had to close and reopen to check
  what you'd already added. It's now a persistent two-panel layout
  (`.inv-pick-split` → `.inv-pick-left` browse list / `.inv-pick-right` cart) so
  users add and review without the modal popping in and out.
- **Cart merge/split-by-warehouse logic.** Adding the same inventory item from the
  *same* warehouse accumulates quantity on one cart line; adding it from a
  *different* warehouse creates a separate cart line. See `addToCart()`'s
  `find(x => x.inventoryId === inv.id && x.warehouse === warehouse)` check.
- **Iterated toolbar layout:** "Tambah Barang" became the single primary button;
  Cart and Packaging became icon-only buttons with a badge count; a "⋮" more-menu
  button was added for future actions; title and the action buttons were aligned
  onto one row (`.event-header-row`). Area assignment was moved out of the cart
  panel and into a bulk-assign step that only appears when trying to check out
  items with no area set (`hasMissingArea`, `applyBulkAssign()`).

---

## How to extend this file

Add new entries at the **top** (right below "Context every dev should know", above
the current newest round), numbered one higher than the current top entry (the next
one after this file's Round 16 is "Round 17"). Each entry should say **what**
changed, **why** (the product reason, not just "user asked"), which **files** were
touched, and any **gotcha** a future dev would otherwise have to rediscover the hard
way. As of Round 6, this is a standing rule for every change, not just the big ones —
write technically enough that the code makes sense, but plainly enough that someone
skimming doesn't need to already know the codebase to follow it.
