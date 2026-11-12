import { fmtNum } from '../lib/format';

// Big, illustrated explanation of a stock movement that a stage change will cause (2026-11-12, owner:
// "sebelum klik next di event detail harus ada penjelasan yang jelas dan ada ilustrasi atau icon agar user notice").
// mode 'cut'    — Warehouse → Event: stock is deducted and reserved for this event (Cutting Stock stage).
// mode 'return' — Event → Warehouse: reserved stock goes back (Stock Return stage).
// `compact` = the one-line banner shown above the stepper before Next is clicked.

function WarehouseIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M6 20 24 9l18 11v19a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V20Z" fill="currentColor" opacity=".14" />
      <path d="M6 20 24 9l18 11v19a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V20Z" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
      <rect x="15" y="27" width="18" height="14" rx="1.5" fill="none" stroke="currentColor" strokeWidth="2.4" />
      <path d="M15 32h18M15 37h18" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
function EventIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <rect x="7" y="11" width="34" height="30" rx="4" fill="currentColor" opacity=".14" />
      <rect x="7" y="11" width="34" height="30" rx="4" fill="none" stroke="currentColor" strokeWidth="2.4" />
      <path d="M7 19h34M16 7v8M32 7v8" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d="m19 30 4 4 8-8" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function BoxesIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}

export default function StockMoveNotice({ mode = 'cut', stages = [], lines = 0, qty = 0, byWarehouse = [], short = 0, lost = 0, returnStage = '', compact = false, onDetails }) {
  const cut = mode === 'cut';
  const stageText = stages.map(s => `“${s}”`).join(', ');
  if (compact) {
    return (
      <div className={`stock-move-banner ${mode}`} role="note">
        <span className="stock-move-banner-icon"><BoxesIcon /></span>
        <div>
          <strong>{cut ? 'Next stage cuts stock' : 'Next stage returns stock'}</strong>
          {' — '}
          {cut
            ? <>moving to {stageText} deducts <b>{fmtNum(qty)} pcs</b> ({fmtNum(lines)} items) from the warehouses and reserves them for this event.</>
            : <>moving to {stageText} puts <b>{fmtNum(qty)} pcs</b> back into the warehouses.</>}
        </div>
        {onDetails && <button type="button" className="link-btn" onClick={onDetails}>What happens?</button>}
      </div>
    );
  }
  return (
    <div className={`stock-move ${mode}`}>
      <div className="stock-move-art" aria-hidden="true">
        <div className="stock-move-node"><span className="stock-move-icon">{cut ? <WarehouseIcon /> : <EventIcon />}</span><small>{cut ? 'Warehouse' : 'This event'}</small></div>
        <div className="stock-move-flow">
          <span className="stock-move-qty">{cut ? '−' : '+'}{fmtNum(qty)} pcs</span>
          <span className="stock-move-line"><i /><i /><i /></span>
        </div>
        <div className="stock-move-node"><span className="stock-move-icon">{cut ? <EventIcon /> : <WarehouseIcon />}</span><small>{cut ? 'This event' : 'Warehouse'}</small></div>
      </div>
      <div className="stock-move-text">
        <div className="stock-move-title">
          {cut ? 'Stock will be cut and reserved for this event' : 'Reserved stock goes back to the warehouses'}
        </div>
        <p>
          {cut
            ? <>{stageText} has <b>Cutting Stock</b> on. When you confirm, <b>{fmtNum(lines)} items ({fmtNum(qty)} pcs)</b> are
              deducted from Warehouse Inventory and counted as <b>used by this event</b>. Other events can no longer book them.</>
            : <>{stageText} has <b>Stock Return</b> on. When you confirm, <b>{fmtNum(lines)} items ({fmtNum(qty)} pcs)</b> go back into
              the warehouses they came from and can be booked again.</>}
        </p>
        {byWarehouse.length > 0 && (
          <ul className="stock-move-wh">
            {byWarehouse.slice(0, 5).map(w => <li key={w.name}><span>{w.name}</span><b>{cut ? '−' : '+'}{fmtNum(w.qty)}</b></li>)}
            {byWarehouse.length > 5 && <li><span>+{byWarehouse.length - 5} more warehouses</span></li>}
          </ul>
        )}
        {short > 0 && <p className="stock-move-warn">⚠ {fmtNum(short)} pcs are not in stock and can&rsquo;t be reserved. Check the items or request production / rent first.</p>}
        {lost > 0 && <p className="stock-move-warn">⚠ {fmtNum(lost)} pcs were written off as broken and do not come back.</p>}
        <p className="stock-move-foot">
          {cut
            ? <>Going back to an earlier stage does not restore it.{returnStage ? <> The stock comes back at &ldquo;{returnStage}&rdquo; (Stock Return).</> : <> It comes back when the event is closed with &ldquo;For Return&rdquo; (after Ready for Checking).</>} Rented and outsourced items are not cut.</>
            : <>Every movement is logged in Warehouse Inventory &rarr; Stock History.</>}
        </p>
      </div>
    </div>
  );
}
