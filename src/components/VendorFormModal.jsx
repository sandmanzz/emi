import { useState } from 'react';
import Modal from './Modal';
import { IconClose, IconCheck } from './icons';
import { VENDOR_ORIGINS } from '../lib/vendorStore';

const EMPTY_FORM = { name: '', origin: 'External', description: '', phone: '', address: '' };

// New / Edit vendor form, shared by the Vendor list and Vendor detail pages.
// `vendor` = the record being edited, or null for a new one. onSave gets trimmed fields.
// The form is filled once on mount, so render it only while open ({open && <VendorFormModal … />}).
// `defaultKind` = the CMS the form was opened from ('production' | 'loan' = Rent); a new vendor starts in it.
// There is no "Vendor type" choice (removed 2026-10-19): the menu decides the kind, and an edit keeps the
// vendor's kinds. Rent vendors have no Internal / External choice either (we always rent from outside).
export default function VendorFormModal({ vendor, defaultKind = 'production', onClose, onSave }) {
  const [form, setForm] = useState(() => vendor
    ? { name: vendor.name, origin: vendor.origin, description: vendor.description || '', phone: vendor.phone || '', address: vendor.address || '', kinds: vendor.kinds || [defaultKind] }
    : { ...EMPTY_FORM, kinds: [defaultKind] });
  const isRent = defaultKind === 'loan';

  const set = (key, value) => setForm(f => ({ ...f, [key]: value }));

  function save() {
    if (!form.name.trim()) return;
    onSave({
      name: form.name.trim(), origin: form.origin, kinds: form.kinds, description: form.description.trim(),
      phone: form.phone.trim(), address: form.address.trim(),
    });
  }

  return (
    <Modal
      open
      title={`${vendor ? 'Edit' : 'New'} ${isRent ? 'Rent' : 'Production'} Vendor`}
      onClose={onClose}
      footer={
        <>
          <button className="btn-cancel-modal" onClick={onClose}><IconClose /> Cancel</button>
          <button className="btn-save-modal" onClick={save} disabled={!form.name.trim()}><IconCheck /> Save</button>
        </>
      }
    >
      <div className="form-group">
        <label>Vendor Name <span style={{ color: 'var(--red)' }}>*</span></label>
        <input type="text" placeholder="e.g. Bengkel Kayu Jaya" value={form.name} onChange={e => set('name', e.target.value)} />
      </div>
      {!isRent && (
        <div className="form-group">
          <label>Internal / External <span style={{ color: 'var(--red)' }}>*</span></label>
          <div className="seg-choice" role="radiogroup" aria-label="Vendor origin">
            {VENDOR_ORIGINS.map(o => (
              <button key={o} type="button" role="radio" aria-checked={form.origin === o} className={form.origin === o ? 'active' : ''}
                onClick={() => set('origin', o)}>{o}</button>
            ))}
          </div>
          <p style={{ fontSize: 11.5, color: 'var(--text-muted)', margin: '5px 0 0' }}>Internal = our own team or workshop. External = outside company or freelancer.</p>
        </div>
      )}
      <div className="form-group">
        <label>Description</label>
        <textarea rows={3} placeholder="What this vendor does, e.g. Iron workshop for arches and stands" value={form.description} onChange={e => set('description', e.target.value)} />
      </div>
      <div className="form-group">
        <label>Phone</label>
        <input type="text" placeholder="e.g. 0812-3456-7890 or Ext. 221" value={form.phone} onChange={e => set('phone', e.target.value)} />
      </div>
      <div className="form-group">
        <label>Address</label>
        <textarea rows={2} placeholder="Street, city" value={form.address} onChange={e => set('address', e.target.value)} />
      </div>
    </Modal>
  );
}
