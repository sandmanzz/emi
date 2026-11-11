import { useState, useMemo, useRef } from 'react';
import { imageFileToDataUrl } from '../lib/imageUtils';
import Modal from './Modal';
import SearchableSelect from './SearchableSelect';
import { IconClose, IconCheck } from './icons';
import { initialCategories } from '../data/categories';
import { initialUnits } from '../data/units';
import { initialWarehouses } from '../data/warehouses';
import { addCatalogItem, updateCatalogItem, isNameTaken, isSkuTaken, suggestSku } from '../lib/catalogStore';
import { formatIDR } from '../lib/superAdminUtils';
import { fmtNum } from '../lib/format';

// New / Edit Inventory item (catalog master data). Render it only while open; it fills itself once.
// - Stock is NOT edited here: it lives in Warehouse Inventory rows (the single stock source).
//   A new item can get its opening stock in one warehouse (logged as 'Opening stock').
// - Item Value (Rp per unit) drives the asset value and is copied to the rows' valuation.
// - A "Needs setup" draft is cleared automatically once category and unit are filled in.
// - Quick add from another form (2026-11-02: Event Detail → Rent / Outsource / Request Production):
//   `initialName` pre-fills the name (and a free SKU), `extra` is merged into the new item
//   (e.g. { source: 'production', needsSetup: true }) and `hideStock` hides the opening stock.
export default function ItemFormModal({ item = null, by = 'Admin', initialName = '', extra = null, hideStock = false, title, onClose, onSaved }) {
  const warehouses = useMemo(() => [...new Set(initialWarehouses.map(w => w.name))].filter(w => w !== 'Buy').sort(), []);
  const [form, setForm] = useState(() => ({
    name: item?.name || initialName, sku: item?.sku || (initialName ? suggestSku(initialName) : ''), category: item?.category || '', unit: item?.unit || '',
    itemValue: item?.itemValue ? String(item.itemValue) : '', desc: item?.desc || '',
    homeWarehouse: item?.homeWarehouse || item?.warehouse || '', openingQty: '', openingWarehouse: '',
    image: item?.image || '',
  }));
  const [touched, setTouched] = useState(false);
  const photoRef = useRef(null);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const nameTaken = form.name.trim() && isNameTaken(form.name, item?.id ?? null);
  const skuTaken = form.sku.trim() && isSkuTaken(form.sku, item?.id ?? null);
  const value = Math.max(0, Math.floor(Number(form.itemValue) || 0));
  const openingQty = Math.max(0, Math.floor(Number(form.openingQty) || 0));
  const errors = {
    name: !form.name.trim() ? 'Required' : nameTaken ? 'Another item already has this name' : '',
    sku: !form.sku.trim() ? 'Required' : skuTaken ? 'SKU already used' : '',
    category: !form.category ? 'Required' : '',
    unit: !form.unit ? 'Required' : '',
    opening: !item && openingQty > 0 && !(form.openingWarehouse || form.homeWarehouse) ? 'Pick a warehouse' : '',
  };
  const valid = !Object.values(errors).some(Boolean);
  const renamed = item && form.name.trim() !== item.name;

  function save() {
    setTouched(true);
    if (!valid) return;
    const data = {
      name: form.name.trim(), sku: form.sku.trim().toUpperCase(), category: form.category, unit: form.unit,
      itemValue: value, desc: form.desc.trim(), homeWarehouse: form.homeWarehouse, image: form.image,
      // completing category + unit finishes a production draft
      needsSetup: item?.needsSetup ? !(form.category && form.unit) : false,
      ...(!item && extra ? extra : {}),
    };
    const saved = item
      ? updateCatalogItem(item.id, data)
      : addCatalogItem(data, openingQty > 0 ? { warehouse: form.openingWarehouse || form.homeWarehouse, qty: openingQty } : null, by);
    onSaved(saved, !!item);
  }

  const err = k => touched && errors[k] ? <p className="field-error">{errors[k]}</p> : null;

  return (
    <Modal
      open
      size="lg"
      title={title || (item ? `Edit Item — ${item.name}` : 'New Item')}
      onClose={onClose}
      footer={
        <>
          <button className="btn-cancel-modal" onClick={onClose}><IconClose /> Cancel</button>
          <button className="btn-save-modal" onClick={save} disabled={touched && !valid}><IconCheck /> Save</button>
        </>
      }
    >
      {item?.needsSetup && (
        <div className="setup-banner" style={{ marginBottom: 14 }}>
          <div><strong>Created by a production.</strong> Fill in category, unit and Item Value. Saving with a category and unit marks it as set up.</div>
        </div>
      )}
      <div className="form-row">
        <div className="form-group">
          <label>Item Name <span style={{ color: 'var(--red)' }}>*</span></label>
          <input type="text" placeholder="e.g. Gold Rim Dining Chair" value={form.name} onChange={e => set('name', e.target.value)} />
          {err('name')}
          {renamed && <p className="field-hint">Warehouse stock rows are renamed too. Items already on events keep the old name.</p>}
        </div>
        <div className="form-group">
          <label>SKU <span style={{ color: 'var(--red)' }}>*</span></label>
          <input type="text" placeholder="e.g. GDC-040" value={form.sku} onChange={e => set('sku', e.target.value)} />
          {err('sku')}
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>Category <span style={{ color: 'var(--red)' }}>*</span></label>
          <SearchableSelect value={form.category} onChange={v => set('category', v)} placeholder="Select category"
            options={initialCategories.map(c => ({ value: c.name, label: c.name }))} />
          {err('category')}
        </div>
        <div className="form-group">
          <label>Unit <span style={{ color: 'var(--red)' }}>*</span></label>
          <SearchableSelect value={form.unit} onChange={v => set('unit', v)} placeholder="Select unit"
            options={initialUnits.map(u => ({ value: u.abbr, label: `${u.name} (${u.abbr})` }))} />
          {err('unit')}
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>Item Value (Rp per unit)</label>
          <input type="number" min="0" step="1000" placeholder="e.g. 350000" value={form.itemValue} onChange={e => set('itemValue', e.target.value)} />
          <p className="field-hint">
            {value ? `${formatIDR(value)} per ${form.unit || 'unit'}` : 'Used for the asset value. Leave empty if unknown.'}
            {item && value ? ` · asset value ${formatIDR(value * (item.totalStock || 0))} (${item.totalStock || 0} in stock)` : ''}
          </p>
        </div>
        <div className="form-group">
          <label>Home Warehouse</label>
          <SearchableSelect value={form.homeWarehouse} onChange={v => set('homeWarehouse', v)} placeholder="Where it is usually kept"
            options={[{ value: '', label: '— None —' }, ...warehouses.map(w => ({ value: w, label: w }))]} />
        </div>
      </div>
      <div className="form-group">
        <label>Photo</label>
        <div className="item-form-photo">
          {form.image
            ? <img src={form.image} alt="" />
            : <div className="item-form-photo-empty">No photo</div>}
          <div>
            <input ref={photoRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (f) imageFileToDataUrl(f).then(img => set('image', img)).catch(() => window.alert('This file could not be read as an image.'));
              }} />
            <button type="button" className="btn btn-ghost" onClick={() => photoRef.current?.click()}>{form.image ? 'Change photo' : 'Upload photo'}</button>
            {form.image && <button type="button" className="link-btn" style={{ marginLeft: 10, color: 'var(--red)' }} onClick={() => set('image', '')}>Remove</button>}
            <p className="field-hint">Shown on Event Detail cards and the item drawer. Resized automatically.</p>
          </div>
        </div>
      </div>
      <div className="form-group">
        <label>Description</label>
        <textarea rows={2} placeholder="Optional" value={form.desc} onChange={e => set('desc', e.target.value)} />
      </div>

      {hideStock ? null : !item ? (
        <div className="item-form-stock">
          <div className="item-form-stock-title">Opening stock <span>(optional)</span></div>
          <div className="form-row">
            <div className="form-group">
              <label>Quantity</label>
              <input type="number" min="0" placeholder="0" value={form.openingQty} onChange={e => set('openingQty', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Warehouse</label>
              <SearchableSelect value={form.openingWarehouse} onChange={v => set('openingWarehouse', v)}
                placeholder={form.homeWarehouse ? `${form.homeWarehouse} (home)` : 'Select warehouse'}
                options={warehouses.map(w => ({ value: w, label: w }))} />
              {err('opening')}
            </div>
          </div>
          <p className="field-hint">Added to Warehouse Inventory and logged in Stock History as &ldquo;Opening stock&rdquo;.</p>
        </div>
      ) : (
        <div className="item-form-stock">
          <div className="item-form-stock-title">Stock <span>(read-only: managed in Warehouse Inventory)</span></div>
          {(item.warehouses || []).length === 0
            ? <p className="field-hint" style={{ marginTop: 0 }}>No stock in any warehouse.</p>
            : (
              <ul className="item-form-wh">
                {item.warehouses.map(w => <li key={w.name}><span>{w.name}</span><strong>{fmtNum(w.stock)} {item.unit}</strong></li>)}
                <li className="total"><span>Total</span><strong>{fmtNum(item.totalStock)} {item.unit}</strong></li>
              </ul>
            )}
        </div>
      )}
    </Modal>
  );
}
