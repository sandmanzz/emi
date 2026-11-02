import { useState } from 'react';
import Modal from './Modal';
import SearchableSelect from './SearchableSelect';
import { IconClose, IconCheck } from './icons';
import { CatalogItemPicker, VendorPicker } from './QuickPickers';
import { LOAN_STATUSES, LOAN_BADGE, loanDisplayStatus, loanTotalCost, kindText, statusLabels } from '../lib/eventLoans';
import { formatIDR } from '../lib/superAdminUtils';
import { TODAY } from '../data/events';
import { fmtNum } from '../lib/format';
import { initialUnits } from '../data/units';

const UNITS = initialUnits.map(u => u.abbr);

function fmt(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Event Detail → "Rented" / "Outsourced" tab: the event's Rent Item or Outsource Item records.
// Requested → Mark Received (adds the item to the event as Outsource) → Mark Returned / Completed.
// kind = 'loan' (Rent) | 'outsource' — only the words differ (lib/eventLoans.js KIND_TEXT).
export function EventLoansPanel({ kind = 'loan', loans, loanEnabled, locked, onAdvance, onCancel, onOpenVendor }) {
  const t = kindText(kind);
  const LABEL = statusLabels(kind);
  const totalCost = loans.reduce((s, l) => s + loanTotalCost(l), 0);
  return (
    <>
      <p className="summary-text">
        <strong>{loans.length}</strong> {t.tab.toLowerCase()} item{loans.length === 1 ? '' : 's'}
        {totalCost > 0 && <> · {t.cost.toLowerCase()} <strong>{formatIDR(totalCost)}</strong></>}
        {loanEnabled ? '' : ` · new requests can only be made at a stage with ${t.action} enabled`}
      </p>
      {loans.length === 0
        ? <div className="no-data">Nothing {t.tab.toLowerCase()} yet. Use &ldquo;{t.action}&rdquo; above to order items from a {t.vendor.toLowerCase()}.</div>
        : (
          <div className="production-list">
            {loans.map(l => {
              const status = loanDisplayStatus(l, TODAY);
              const next = LOAN_STATUSES[LOAN_STATUSES.indexOf(l.status) + 1];
              return (
                <div key={l.id} className="production-card">
                  <div className="production-card-main">
                    <div className="production-card-title">
                      <span className={`badge ${kind === 'outsource' ? 'badge-purple' : 'badge-blue'}`} style={{ fontSize: 10.5 }}>{t.badge}</span>
                      {l.itemName}
                      <span className={`badge ${LOAN_BADGE[status]}`} style={{ fontSize: 10.5 }}>{LABEL[status]}</span>
                    </div>
                    <div className="production-card-meta">
                      <span>Qty {fmtNum(l.qty)} {l.unit}</span>
                      <span>{l.area}{l.subArea ? ` · ${l.subArea}` : ''}</span>
                      <span>From <button type="button" className="link-btn" style={{ fontSize: 12 }} onClick={() => onOpenVendor(l.vendorId)}>{l.vendorName}</button></span>
                      <span>{fmt(l.startDate)} → {fmt(l.dueDate)}</span>
                      {l.rentalCost > 0 && <span>{formatIDR(l.rentalCost)} / {l.unit} · total {formatIDR(loanTotalCost(l))}</span>}
                      <span>Requested by {l.requestedBy} on {l.requestedAt}</span>
                    </div>
                    {l.note && <div className="production-card-note">{l.note}</div>}
                    <div className={`production-card-note ${status === 'Overdue' ? 'warn' : 'info'}`}>
                      {l.status === 'Requested' && 'When the item arrives, mark it received: it is added to this event’s items as Outsource.'}
                      {l.status === 'Borrowed' && (status === 'Overdue' ? `Past due (${fmt(l.dueDate)}). ${kind === 'outsource' ? 'Mark it completed.' : 'Return it to the vendor.'}` : `Received ${fmt(l.borrowedAt)}. ${kind === 'outsource' ? 'Ends' : 'Return it by'} ${fmt(l.dueDate)}.`)}
                      {l.status === 'Returned' && `${t.done} on ${fmt(l.returnedAt)}.`}
                    </div>
                  </div>
                  <div className="production-card-actions">
                    {!locked && l.status === 'Requested' && (
                      <button type="button" className="btn btn-ghost" onClick={() => onCancel(l)}>Cancel</button>
                    )}
                    {next && (
                      <button type="button" className="btn-save-modal" onClick={() => onAdvance(l)} disabled={locked && next === 'Borrowed'}>
                        {next === 'Borrowed' ? 'Mark Received' : t.markDone}
                      </button>
                    )}
                    {!next && <span className="production-done-note">{t.done}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
    </>
  );
}

// Rent Item / Outsource Item form (kind = 'loan' | 'outsource'). `areas` / `subAreas` from Area master data.
// target = 'event' (Event Detail: Area / Sub Area) or 'warehouse' (Rent → New Rental: which of
// our warehouses keeps it + purpose; `warehouses` required).
// Item: picked from Inventory master data, or added to it right here (CatalogItemPicker).
// Vendor: only vendors of this kind (Master Data → Rent / Outsource), or added right here (VendorPicker).
export function BorrowItemModal({ kind = 'loan', target = 'event', areas = [], subAreas = {}, warehouses = [], by = 'Admin', defaultDate, onClose, onSubmit }) {
  const forEvent = target === 'event';
  const t = kindText(kind);
  const [form, setForm] = useState({
    itemName: '', qty: 1, unit: 'pcs', area: '', vendorName: '', subArea: '', warehouse: '', purpose: '', vendorId: '',
    startDate: defaultDate, dueDate: '', rentalCost: '', note: '',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const valid = form.itemName.trim() && Number(form.qty) >= 1 && (forEvent ? form.area : form.warehouse) && form.vendorId
    && form.startDate && form.dueDate && form.dueDate >= form.startDate;
  const total = (Number(form.qty) || 0) * (Number(form.rentalCost) || 0);

  function submit() {
    if (!valid) return;
    onSubmit({
      itemName: form.itemName.trim(), qty: Math.floor(Number(form.qty)), unit: form.unit,
      ...(forEvent ? { area: form.area, subArea: form.subArea } : { warehouse: form.warehouse, purpose: form.purpose.trim() }),
      vendorId: Number(form.vendorId), vendorName: form.vendorName,
      startDate: form.startDate, dueDate: form.dueDate, rentalCost: Math.max(0, Math.floor(Number(form.rentalCost) || 0)),
      note: form.note.trim(),
    });
  }

  return (
    <Modal
      open
      title={forEvent ? t.action : `New ${t.name === 'Rent' ? 'Rental' : t.name}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn-cancel-modal" onClick={onClose}><IconClose /> Cancel</button>
          <button className="btn-save-modal" onClick={submit} disabled={!valid}><IconCheck /> Submit</button>
        </>
      }
    >
      <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: '0 0 14px' }}>
        {forEvent
          ? (kind === 'outsource'
            ? <>Order an item or work from an outsource vendor for this event. It is added to this event&rsquo;s items (as Outsource) when you mark it received.</>
            : <>Rent an item we don&rsquo;t have (enough of) from a rent vendor. It is added to this event when you mark it received.</>)
          : <>Rent items from a rent vendor and keep them in one of our warehouses (not for a specific event). Rented items are not our assets, so our stock and asset value don&rsquo;t change.</>}
      </p>
      <div className="form-group">
        <label>Item <span style={{ color: 'var(--red)' }}>*</span></label>
        <CatalogItemPicker
          value={form.itemName}
          by={by}
          extra={{ source: kind === 'outsource' ? 'outsource' : 'rent' }}
          onChange={(name, item) => setForm(f => ({ ...f, itemName: name, unit: item?.unit || f.unit }))}
        />
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>Quantity <span style={{ color: 'var(--red)' }}>*</span></label>
          <input type="number" min="1" value={form.qty} onChange={e => set('qty', e.target.value)} />
        </div>
        <div className="form-group">
          <label>Unit</label>
          <SearchableSelect value={form.unit} onChange={v => set('unit', v)} options={UNITS.map(u => ({ value: u, label: u }))} />
        </div>
      </div>
      {forEvent ? (
      <div className="form-row">
        <div className="form-group">
          <label>Area <span style={{ color: 'var(--red)' }}>*</span></label>
          <SearchableSelect value={form.area} onChange={v => setForm(f => ({ ...f, area: v, subArea: '' }))} placeholder="Select area"
            options={areas.map(a => ({ value: a, label: a }))} />
        </div>
        <div className="form-group">
          <label>Sub Area</label>
          <SearchableSelect value={form.subArea} onChange={v => set('subArea', v)} disabled={!(subAreas[form.area] || []).length}
            placeholder={(subAreas[form.area] || []).length ? 'Select sub area' : '(No sub area)'}
            options={(subAreas[form.area] || []).map(s => ({ value: s, label: s }))} />
        </div>
      </div>
      ) : (
      <div className="form-row">
        <div className="form-group">
          <label>Kept in warehouse <span style={{ color: 'var(--red)' }}>*</span></label>
          <SearchableSelect value={form.warehouse} onChange={v => set('warehouse', v)} placeholder="Select warehouse"
            options={warehouses.map(w => ({ value: w, label: w }))} />
        </div>
        <div className="form-group">
          <label>Purpose</label>
          <input type="text" placeholder="e.g. Buffer for wedding season" value={form.purpose} onChange={e => set('purpose', e.target.value)} />
        </div>
      </div>
      )}
      <div className="form-group">
        <label>{t.vendor.replace(' vendor', ' Vendor')} <span style={{ color: 'var(--red)' }}>*</span></label>
        <VendorPicker kind={kind} value={form.vendorId} by={by}
          onChange={(id, v) => setForm(f => ({ ...f, vendorId: id, vendorName: v?.name || '' }))} />
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>{t.from} <span style={{ color: 'var(--red)' }}>*</span></label>
          <input type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} />
        </div>
        <div className="form-group">
          <label>{t.until} <span style={{ color: 'var(--red)' }}>*</span></label>
          <input type="date" min={form.startDate} value={form.dueDate} onChange={e => set('dueDate', e.target.value)} />
        </div>
      </div>
      <div className="form-group">
        <label>{t.cost} per unit (Rp)</label>
        <input type="number" min="0" placeholder="Optional" value={form.rentalCost} onChange={e => set('rentalCost', e.target.value)} />
        {total > 0 && <p style={{ fontSize: 11.5, color: 'var(--text-muted)', margin: '5px 0 0' }}>Total: {formatIDR(total)}</p>}
      </div>
      <div className="form-group">
        <label>Note</label>
        <textarea rows={2} placeholder="Optional" value={form.note} onChange={e => set('note', e.target.value)} />
      </div>
    </Modal>
  );
}
