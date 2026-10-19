import { useState } from 'react';
import Modal from './Modal';
import SearchableSelect from './SearchableSelect';
import { IconClose, IconCheck } from './icons';
import { LOAN_STATUSES, LOAN_BADGE, LOAN_LABEL, loanDisplayStatus, loanTotalCost } from '../lib/eventLoans';
import { formatIDR } from '../lib/superAdminUtils';
import { TODAY } from '../data/events';
import { fmtNum } from '../lib/format';

const UNITS = ['pcs', 'unit', 'set', 'roll', 'meter'];

function fmt(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Event Detail → "Borrowed" tab: the event's Borrow Item records with their actions.
// Requested → Mark Received (adds the item to the event) → Mark Returned.
export function EventLoansPanel({ loans, loanEnabled, locked, onAdvance, onCancel, onOpenVendor }) {
  const totalCost = loans.reduce((s, l) => s + loanTotalCost(l), 0);
  return (
    <>
      <p className="summary-text">
        <strong>{loans.length}</strong> rented item{loans.length === 1 ? '' : 's'}
        {totalCost > 0 && <> · rental cost <strong>{formatIDR(totalCost)}</strong></>}
        {loanEnabled ? '' : ' · new rentals can only be made at a stage with Rent Item enabled'}
      </p>
      {loans.length === 0
        ? <div className="no-data">Nothing rented yet. Use &ldquo;Rent Item&rdquo; above to rent items from a rent vendor.</div>
        : (
          <div className="production-list">
            {loans.map(l => {
              const status = loanDisplayStatus(l, TODAY);
              const next = LOAN_STATUSES[LOAN_STATUSES.indexOf(l.status) + 1];
              return (
                <div key={l.id} className="production-card">
                  <div className="production-card-main">
                    <div className="production-card-title">
                      <span className="badge badge-blue" style={{ fontSize: 10.5 }}>Rent</span>
                      {l.itemName}
                      <span className={`badge ${LOAN_BADGE[status]}`} style={{ fontSize: 10.5 }}>{LOAN_LABEL[status]}</span>
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
                      {l.status === 'Borrowed' && (status === 'Overdue' ? `Past due (${fmt(l.dueDate)}). Return it to the vendor.` : `Received ${fmt(l.borrowedAt)}. Return it by ${fmt(l.dueDate)}.`)}
                      {l.status === 'Returned' && `Returned to the vendor on ${fmt(l.returnedAt)}.`}
                    </div>
                  </div>
                  <div className="production-card-actions">
                    {!locked && l.status === 'Requested' && (
                      <button type="button" className="btn btn-ghost" onClick={() => onCancel(l)}>Cancel</button>
                    )}
                    {next && (
                      <button type="button" className="btn-save-modal" onClick={() => onAdvance(l)} disabled={locked && next === 'Borrowed'}>
                        {next === 'Borrowed' ? 'Mark Received' : 'Mark Returned'}
                      </button>
                    )}
                    {!next && <span className="production-done-note">Returned</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
    </>
  );
}

// Borrow Item form. `vendors` = loan vendors; `areas` / `subAreas` from Area master data;
// `catalogNames` = suggestions (a borrowed item doesn't have to be in our catalog).
// target = 'event' (Event Detail → Borrow Item: Area / Sub Area) or 'warehouse'
// (Loan → New Rental: which of our warehouses keeps it + purpose; `warehouses` required).
export function BorrowItemModal({ target = 'event', vendors, areas = [], subAreas = {}, warehouses = [], catalogNames, defaultDate, onClose, onSubmit }) {
  const forEvent = target === 'event';
  const [form, setForm] = useState({
    itemName: '', qty: 1, unit: 'pcs', area: '', subArea: '', warehouse: '', purpose: '', vendorId: '',
    startDate: defaultDate, dueDate: '', rentalCost: '', note: '',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const valid = form.itemName.trim() && Number(form.qty) >= 1 && (forEvent ? form.area : form.warehouse) && form.vendorId
    && form.startDate && form.dueDate && form.dueDate >= form.startDate;
  const total = (Number(form.qty) || 0) * (Number(form.rentalCost) || 0);

  function submit() {
    if (!valid) return;
    const vendor = vendors.find(v => String(v.id) === String(form.vendorId));
    onSubmit({
      itemName: form.itemName.trim(), qty: Math.floor(Number(form.qty)), unit: form.unit,
      ...(forEvent ? { area: form.area, subArea: form.subArea } : { warehouse: form.warehouse, purpose: form.purpose.trim() }),
      vendorId: vendor?.id ?? null, vendorName: vendor?.name || '',
      startDate: form.startDate, dueDate: form.dueDate, rentalCost: Math.max(0, Math.floor(Number(form.rentalCost) || 0)),
      note: form.note.trim(),
    });
  }

  return (
    <Modal
      open
      title={forEvent ? 'Rent Item' : 'New Rental'}
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
          ? <>Rent an item we don&rsquo;t have (enough of) from a rent vendor. It is added to this event when you mark it received.</>
          : <>Rent items from a rent vendor and keep them in one of our warehouses (not for a specific event). Rented items are not our assets, so our stock and asset value don&rsquo;t change.</>}
      </p>
      <div className="form-group">
        <label>Item <span style={{ color: 'var(--red)' }}>*</span></label>
        <input type="text" list="borrow-item-names" placeholder="e.g. Champagne Glass Coupe" value={form.itemName} onChange={e => set('itemName', e.target.value)} />
        <datalist id="borrow-item-names">{catalogNames.map(n => <option key={n} value={n} />)}</datalist>
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
        <label>Rent Vendor <span style={{ color: 'var(--red)' }}>*</span></label>
        <SearchableSelect value={form.vendorId} onChange={v => set('vendorId', v)} placeholder="Who do we rent from?"
          options={vendors.map(v => ({ value: String(v.id), label: v.name, meta: v.phone || '' }))} />
        {vendors.length === 0 && <p style={{ fontSize: 11.5, color: 'var(--orange)', margin: '5px 0 0' }}>No rent vendors yet. Add one in Master Data &rarr; Rent.</p>}
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>Rent from <span style={{ color: 'var(--red)' }}>*</span></label>
          <input type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} />
        </div>
        <div className="form-group">
          <label>Return by <span style={{ color: 'var(--red)' }}>*</span></label>
          <input type="date" min={form.startDate} value={form.dueDate} onChange={e => set('dueDate', e.target.value)} />
        </div>
      </div>
      <div className="form-group">
        <label>Rental cost per unit (Rp)</label>
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
