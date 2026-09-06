const SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'lifecycle', label: 'Event Lifecycle' },
  { id: 'scan-gate', label: 'Scan Gate & Next' },
  { id: 'packaging', label: 'Packaging (Grouping)' },
  { id: 'summary', label: 'Event Summary' },
  { id: 'auth', label: 'Authentication & Roles' },
  { id: 'settings', label: 'Event Settings' },
  { id: 'opname', label: 'Stock Opname & Approval' },
  { id: 'warehouse-crud', label: 'Warehouse Item CRUD' },
  { id: 'moving-order', label: 'Moving Order' },
  { id: 'event-inventory-link', label: 'Event Inventory Link' },
  { id: 'searchable-dropdown', label: 'Searchable Dropdown' },
  { id: 'activity-log', label: 'Activity Log' },
  { id: 'item-loan', label: 'Item Loan & Vendors' },
  { id: 'data', label: 'Mock Data' },
  { id: 'assumptions', label: 'Open Assumptions' },
];

function Section({ id, title, children }) {
  return (
    <div className="card" id={id} style={{ marginBottom: 18, scrollMarginTop: 70 }}>
      <div className="section-title">{title}</div>
      {children}
    </div>
  );
}

function P({ children }) {
  return <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.7, marginBottom: 12 }}>{children}</p>;
}

function Ul({ children }) {
  return <ul style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.7, marginBottom: 12, paddingLeft: 20 }}>{children}</ul>;
}

export default function PRDPage() {
  return (
    <>
      <h1 className="page-title">Product Knowledge</h1>
      <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: -14, marginBottom: 20 }}>
        A running reference for how EMI Inventory is meant to work — decisions,
        current behavior, and open questions. Kept in sync with{' '}
        <code style={{ fontSize: 12 }}>docs/context.md</code> in the codebase.
      </p>

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="section-title" style={{ marginBottom: 10 }}>On this page</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {SECTIONS.map(s => (
            <a key={s.id} href={`#${s.id}`} className="badge badge-blue" style={{ textDecoration: 'none' }}>
              {s.label}
            </a>
          ))}
        </div>
      </div>

      <Section id="overview" title="Overview">
        <P>
          EMI Inventory is an event &amp; inventory management SaaS demo. It has two
          areas: the <strong>tenant app</strong> (this app — event planners and their
          teams manage events, inventory, and warehouses) and the{' '}
          <strong>SaaS Owner Panel</strong> at <code>/superadmin</code> (managing
          customers, payments, and pricing for the SaaS business itself). Everything
          runs on mock data — there is no backend, so refreshing the browser resets
          any in-session changes. An <strong>&ldquo;Upgrade&rdquo;</strong> button
          in the top navbar is a monetization hook for later — it opens a plan
          comparison (reusing the SaaS Owner Panel&rsquo;s real plan catalog) but
          isn&rsquo;t wired to real billing yet.
        </P>
      </Section>

      <Section id="lifecycle" title="Event Lifecycle">
        <P>
          Every event moves through a stepper shown in its header, on the Event
          Detail page. The stages come <strong>directly from the Event Status master
          data</strong> (Master Data → Event Status, <code>/event-status</code>) —
          whatever rows exist there, in their configured order, become the stepper.
          Whatever stage an event is currently at is <strong>remembered</strong> —
          leaving and reopening the event (even a full page reload) picks up right
          where it was, instead of resetting to the first stage every time. Before
          any progress has ever been saved for an event, it now opens at a
          plausible mock status (from Event Inventory&rsquo;s data) instead of
          always the first stage.
          The default seed is:
        </P>
        <Ul>
          <li>Created by admin up</li>
          <li>On preparing items</li>
          <li>Finish setup</li>
          <li>Waiting scan in <em>(Scan)</em></li>
          <li>Event running</li>
          <li>Waiting scan out <em>(Scan)</em></li>
          <li>Finished</li>
          <li>Postphone</li>
          <li>Disable</li>
        </Ul>
        <P>
          Add, rename, reorder, or remove a row on Event Status and every event&rsquo;s
          stepper reflects it immediately. Every item added to an event records which
          stage was active when it was added, which powers the item-list tabs on
          Event Detail: <strong>Waiting Scan</strong> (only shown when the current
          stage has scan enabled — items still needing a scan), <strong>Grouped</strong>
          (packaging boxes, see below), <strong>All</strong> (every item added up
          through the current stage — not stages still ahead of it), and{' '}
          <strong>Added New</strong> (items added exactly at the current stage).
        </P>
        <P>
          <strong>History note:</strong> an earlier pass built a separate,
          admin-only stage editor (a 6-stage list: Requirement → Preparation →
          Purchasing → Push to Truck → During Event → After Event) before realizing
          Event Status already existed and did this job. That separate system was
          deleted — don&rsquo;t rebuild it.
        </P>
      </Section>

      <Section id="scan-gate" title="Scan Gate & Next">
        <P>
          Each row on Event Status has a <strong>Scan</strong> field — &ldquo;Scan&rdquo;
          or &ldquo;None.&rdquo; Whether items can be scanned on Event Detail depends
          entirely on which status the event is <em>currently</em> at:
        </P>
        <Ul>
          <li>
            <strong>Current status has Scan = &ldquo;Scan&rdquo;</strong> (e.g.
            &ldquo;Waiting scan in&rdquo;) — every item card shows a Scan button, and
            the event can&rsquo;t move to a <em>later</em> stage until every item is
            scanned. A dedicated <strong>Next</strong> button appears next to the
            stepper — disabled (greyed out) until all items are scanned, then enabled
            to advance exactly one stage forward. Trying to jump ahead by clicking a
            stepper dot directly is blocked the same way, with an inline error
            banner; Next is just the guided path. Moving backward is never blocked.
          </li>
          <li>
            <strong>Current status has Scan = &ldquo;None&rdquo;</strong> — no Scan
            button appears on any item card, no Next button, and the stepper advances
            freely.
          </li>
        </Ul>
        <P>
          The Scan button opens a scanning popup — currently a dummy/mock flow (no
          real barcode or camera integration) that simulates a short scan and then
          marks the item &ldquo;Scanned.&rdquo; This is a distinct flag from the
          existing Scan In / Scan Out timestamps, which the popup still advances too
          so that display keeps working. If the item belongs to a Packaging group
          (see below), scanning it scans the whole group at once.
        </P>
      </Section>

      <Section id="packaging" title="Packaging (Grouping)">
        <P>
          The real-world reason this exists: several items get physically put into
          one box, and a single QR code goes on that box — so scanning it once
          checks in everything inside instead of scanning each item one at a time.
          The box-icon button in the Event Detail header groups items together to
          match that.
        </P>
        <Ul>
          <li>Only enabled at the event&rsquo;s <strong>first stage</strong> (whatever Event Status row has the lowest order — &ldquo;Created by admin up&rdquo; by default). Disabled everywhere else, with a tooltip explaining why.</li>
          <li>Clicking it opens a picker limited to first-stage items that aren&rsquo;t already in a group; you name the group (the box) and select which items belong to it.</li>
          <li>Grouped items show a purple group badge on their card, everywhere they appear.</li>
          <li>A dedicated <strong>&ldquo;Grouped&rdquo; tab</strong> (alongside Waiting Scan / All / Added New) shows every box as its own card — name, item count, and (only when the current stage has scan enabled) a single <strong>Scan Box</strong> button that scans every item inside at once. Individual items don&rsquo;t get their own Scan button inside a box card — scanning is a box-level action there, matching the one-QR-per-box reality. Outside the Grouped tab, an item card still shows its group badge and can still be scanned individually, which scans the whole group the same way.</li>
          <li>There&rsquo;s no &ldquo;remove from group&rdquo; UI yet, and groups are scoped to a single event — not reusable across events.</li>
        </Ul>
      </Section>

      <Section id="summary" title="Event Summary">
        <P>
          The Summary action on Event Detail opens a <strong>popup</strong> with a
          condensed live snapshot (total items, checked, scanned in, scanned out) of
          the event you&rsquo;re currently viewing. From there, &ldquo;View Full
          Detail&rdquo; navigates to the full analytics page, which now shows a{' '}
          <strong>breadcrumb</strong> (Event → event name → Summary) since it&rsquo;s
          no longer the primary entry point.
        </P>
        <P>
          Known gap: the full detail page&rsquo;s analytics (area breakdown, item
          table) run on a small separate demo dataset of four sample events, not the
          live per-event item data used elsewhere in the app. If the event name
          matches one of those four, it selects it; otherwise it falls back to the
          first sample event. Fully connecting the two would mean building the same
          analytics pipeline over live event data — a bigger piece of work than what
          was asked for a popup + breadcrumb.
        </P>
      </Section>

      <Section id="auth" title="Authentication & Roles">
        <P>
          The tenant app is behind mock, no-backend authentication —{' '}
          <code>/login</code>, <code>/register</code>, <code>/forgot-password</code>.
          Two roles: <strong>Admin</strong> and <strong>Employee</strong>. The demo
          roster is the same list used by the Users management page:
        </P>
        <Ul>
          <li>Admin demo login: <strong>dewi@emi.id</strong> / <strong>Admin@123</strong></li>
          <li>Employee demo login: <strong>anto@emi.id</strong> / <strong>Staff@123</strong></li>
        </Ul>
        <P>
          Registering a new account creates an Employee-role session for the current
          tab only (lost on refresh, like all mutable state in this app). Forgot
          Password shows a generic &ldquo;if that email exists, instructions were
          sent&rdquo; confirmation without actually sending anything.
        </P>
      </Section>

      <Section id="settings" title="Event Settings">
        <P>
          The Admin-only &ldquo;Event Settings&rdquo; entry under the sidebar&rsquo;s
          Events section is a shortcut, not a separate page — it links straight to{' '}
          <strong>Event Status</strong> (<code>/event-status</code>, under Master
          Data), since that's where stage list and scan configuration actually live
          now. Note that Event Status itself is <strong>not</strong> Admin-gated —
          anyone can view and edit it via Master Data; only this sidebar shortcut is
          Admin-only. See &ldquo;Open Assumptions&rdquo; below.
        </P>
        <P>
          Reordering statuses is <strong>edit-mode + explicit Save</strong>, not
          instant-apply: click &ldquo;Edit Order&rdquo; to reveal the up/down
          arrows (everything else locks while reordering), then{' '}
          <strong>Save Order</strong> to commit or <strong>Cancel</strong> to
          discard.
        </P>
      </Section>

      <Section id="opname" title="Stock Opname & Approval">
        <P>
          Stock Opname lives on its own page (<code>/stock-opname</code>), not inside
          Warehouse Inventory. Warehouse Inventory&rsquo;s Opname History tab only
          <strong> triggers</strong> it via a &ldquo;Start Stock Opname&rdquo; button.
        </P>
        <Ul>
          <li>On the Stock Opname page, you first pick <strong>one warehouse</strong> — counting is always scoped to a single warehouse, not &ldquo;All Warehouses,&rdquo; and each option shows how many items that warehouse has.</li>
          <li>For each item you record the <strong>actual stock</strong> and a <strong>condition</strong> (Good / Poor). Choosing Poor reveals a manual text field to describe the issue.</li>
          <li>Submitting does <strong>not</strong> change stock immediately — it creates a <strong>Pending</strong> entry in Opname History instead.</li>
          <li>An Admin reviews Pending entries there and <strong>Approves</strong> (applies the stock changes for real) or <strong>Rejects</strong> (no change). Both require a confirmation prompt.</li>
          <li>While any entry is Pending, &ldquo;Start Stock Opname&rdquo; is disabled — only one opname can be in flight at a time.</li>
        </Ul>
        <P>
          Since Warehouse Inventory and Stock Opname are separate pages with no
          Context/Redux in this app, the live inventory rows and opname history are
          held in a small shared module (<code>src/lib/stockOpnameStore.js</code>)
          instead of page-local state, so both pages see the same data. It resets on
          a full page reload, like everything else here.
        </P>
      </Section>

      <Section id="warehouse-crud" title="Warehouse Item CRUD">
        <P>
          On Warehouse Inventory&rsquo;s Inventory tab, the row actions now work:
        </P>
        <Ul>
          <li><strong>Detail</strong> opens a read-only modal with every field for that row &mdash; stock figures, status, flags, aisle/rack/level/floor/lane, and last updated.</li>
          <li><strong>Edit</strong> reopens the Add Item modal in edit mode: the item name is fixed (renaming isn&rsquo;t supported), but stock, minimum stock, valuation, warehouse, and location fields are all editable.</li>
          <li><strong>Delete</strong> asks for confirmation, then removes the row entirely.</li>
        </Ul>
        <P>
          All three read and write through the same shared store Stock Opname
          uses (<code>src/lib/stockOpnameStore.js</code>), so an edit or delete made
          here is immediately visible from Stock Opname too.
        </P>
      </Section>

      <Section id="moving-order" title="Moving Order">
        <P>
          A new tab on Warehouse Inventory, alongside Inventory and Opname History,
          for moving stock of one or more items from one warehouse to another in a
          single order.
        </P>
        <Ul>
          <li>Pick a <strong>source warehouse</strong> first; a searchable, checkbox list of every item with stock there appears, each with its own quantity field (capped at that item&rsquo;s stock) &mdash; check as many items as needed in one order.</li>
          <li>Pick a <strong>destination warehouse</strong> (can&rsquo;t match the source).</li>
          <li>On create, the transfer applies <strong>immediately</strong> &mdash; no Pending/Approve step, unlike Stock Opname. Per item: the source row&rsquo;s stock decreases; if a row for that item already exists at the destination it increases, otherwise a new row is created there.</li>
          <li>Every item moved is logged as its own row in a table on the same tab (item, from, to, qty, moved by/at) as a paper trail &mdash; a 3-item order produces 3 rows sharing one timestamp.</li>
        </Ul>
      </Section>

      <Section id="event-inventory-link" title="Event Inventory Link">
        <P>
          Every row on Event Inventory now has a &ldquo;View Event&rdquo; action
          that opens that row&rsquo;s event on the Event Detail page.
        </P>
        <P>
          Known gap: Event Inventory&rsquo;s dataset is mostly synthetic padding
          (hundreds of rows like &ldquo;Event 43,&rdquo; &ldquo;Event 44&rdquo;)
          that don&rsquo;t correspond to real records, and Event Detail shows the
          same generic demo item list regardless of which event name is passed in
          &mdash; so the link always works, but clicking through from a synthetic
          row won&rsquo;t show anything event-specific. Pre-existing limitation,
          not introduced by this link.
        </P>
      </Section>

      <Section id="searchable-dropdown" title="Searchable Dropdown">
        <P>
          Every dropdown/filter in the tenant app is now a custom searchable
          component instead of the browser&rsquo;s native <code>&lt;select&gt;</code>
          &mdash; a plain click-to-type search box plus a filterable list, styled to
          match the rest of the app. This replaced native selects everywhere,
          including long, unfiltered lists like the Moving Order item picker (~40
          items) that were hard to scan before.
        </P>
        <P>
          Known gap: the SaaS Owner Panel (<code>/superadmin</code>) still uses
          native selects &mdash; it&rsquo;s a separate area that wasn&rsquo;t part
          of this conversion. See &ldquo;Open Assumptions&rdquo; below.
        </P>
      </Section>

      <Section id="activity-log" title="Activity Log">
        <P>
          The Log page (and Dashboard&rsquo;s &ldquo;Recent Activity&rdquo;) now
          reflect a <strong>real, live log</strong> instead of a static seed list
          nothing ever wrote to. Logging in, logging out, registering, loaning an
          item, and returning an item all append a real entry with the actual
          current time.
        </P>
        <P>
          Not everything logs yet — only authentication and Item Loan actions do.
          Extending this to other modules (events, warehouse edits, stock opname,
          etc.) follows the same small pattern (<code>addActivityLog(...)</code>
          from <code>src/lib/activityLogStore.js</code>) but hasn&rsquo;t been done
          everywhere.
        </P>
      </Section>

      <Section id="item-loan" title="Item Loan & Vendors">
        <P>
          Item Loan now has a proper <strong>Vendor</strong> list instead of
          free-text borrower fields &mdash; pick an existing vendor or add a new
          one on the fly from the same modal. Contact person/phone stay editable
          per loan, since who you dealt with can differ from the vendor&rsquo;s
          own listed contact.
        </P>
        <P>
          A loan is now an <strong>order that can cover multiple items at once</strong>,
          each added either <strong>From Warehouse</strong> (real, live stock —
          borrowing decreases it, returning restores it) or as a{' '}
          <strong>New / External Item</strong> (something the business doesn&rsquo;t
          stock itself — no inventory impact at all). The page is split like every
          other list+detail pair in the app: <strong>/item-loan</strong> lists
          loan orders (vendor, item count, overall status), and{' '}
          <strong>/item-loan-detail</strong> shows one order&rsquo;s individual
          items, each with its own <strong>Return Item</strong> action (date,
          Good/Poor condition, notes if Poor) &mdash; so a 3-item loan can be{' '}
          <strong>Partially Returned</strong> instead of all-or-nothing.
        </P>
        <Ul>
          <li>The 6 seed loans&rsquo; warehouse-sourced items aren&rsquo;t tied to a real inventory row, so returning one of them doesn&rsquo;t restore any stock &mdash; only loans created through the app do.</li>
          <li>Global Search&rsquo;s Item Loan results deep-link straight to a matching item&rsquo;s loan detail page.</li>
        </Ul>
      </Section>

      <Section id="data" title="Mock Data">
        <P>
          All data lives in <code>src/data/*.js</code> as plain arrays, seeded into
          component state. Item and warehouse/location catalogs were substantially
          expanded to feel populated rather than sparse — including filling in the
          previously-empty &ldquo;Lighting&rdquo; category and giving events items
          across every configured area and stage, not just Preparation.
        </P>
      </Section>

      <Section id="assumptions" title="Open Assumptions">
        <P>These were inferred rather than explicitly specified — flagged here so they&rsquo;re easy to revisit:</P>
        <Ul>
          <li>Employee role = everything an Admin can do, except the Event Settings sidebar shortcut — the only access difference actually specified. Event Status itself (the real settings page) is open to everyone, not Admin-gated, since it predates this session and its visibility wasn't part of what was asked to change.</li>
          <li><code>EventPage.jsx</code>'s own event-status dropdown still has a separate hardcoded copy of the status label strings, unrelated to Event Status master data — a pre-existing inconsistency, not fixed here.</li>
          <li>The scan requirement's scope is "all items in the event," not "just items at the current stage" — only whether scanning is required changed (now per-status), not which items count toward it.</li>
          <li>Event Summary&rsquo;s full-detail analytics dataset is not yet connected to live per-event item data (see &ldquo;Event Summary&rdquo; above).</li>
          <li>&ldquo;Owner&rdquo; (who approves stock opname) is treated as the tenant Admin role, not the separate SaaS Owner Panel.</li>
          <li>Rejected opname entries are terminal — there&rsquo;s no edit-and-resubmit flow, just Pending → Rejected (closed) or Pending → Approved (stock applied).</li>
          <li>Moving Order has no approval step, unlike Stock Opname — the request didn&rsquo;t ask for one. Extending it to a Pending → Approve/Reject flow would follow the same pattern already built for Stock Opname if symmetry is wanted.</li>
          <li>Event Inventory&rsquo;s &ldquo;View Event&rdquo; link doesn&rsquo;t guarantee a meaningful Event Detail page for the many synthetic placeholder rows — see &ldquo;Event Inventory Link&rdquo; above.</li>
        </Ul>
      </Section>
    </>
  );
}
