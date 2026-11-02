import { useState } from 'react';
import SearchableSelect from './SearchableSelect';
import ItemFormModal from './ItemFormModal';
import VendorFormModal from './VendorFormModal';
import { getCatalog } from '../lib/catalogStore';
import { addVendor, getVendorsOfKind, VENDOR_KIND_LABELS } from '../lib/vendorStore';
import { addActivityLog } from '../lib/activityLogStore';
import { fmtNum } from '../lib/format';

// Pickers used by the Event Detail request forms (Rent Item, Outsource Item, Request Production)
// and the Rent / Production lists (2026-11-02, owner: "user bisa langsung menambahkan barang dari
// situ … jadi user tidak perlu mengisi dulu di master data").
//  - CatalogItemPicker: pick an item from Inventory master data, or "+ Add … as new item", which
//    opens the normal New Item form on top and saves the item to master data right away. Typing
//    first shows the items that already exist, and the form refuses a name that is already used.
//  - VendorPicker: vendors of one kind only (production / loan = rent / outsource), with
//    "+ Add … as new vendor" that saves the vendor into that menu's list.

export function CatalogItemPicker({ value, onChange, by = 'Admin', extra = null, placeholder = 'Search master data…' }) {
  const [catalog, setCatalog] = useState(() => getCatalog());
  const [newName, setNewName] = useState(null); // null = closed
  const picked = catalog.find(i => i.name === value);

  return (
    <>
      <SearchableSelect
        value={value}
        onChange={name => onChange(name, catalog.find(i => i.name === name) || null)}
        placeholder={placeholder}
        searchPlaceholder="Type to search; not there? add it below"
        emptyText="Not in master data yet"
        options={catalog.map(i => ({ value: i.name, label: i.name, meta: `${i.sku ? i.sku + ' · ' : ''}${fmtNum(i.totalStock)} ${i.unit || ''} in stock`.trim() }))}
        onCreate={q => setNewName(q)}
        createLabel={q => (q ? `Add “${q}” as new item` : 'Add new item to master data')}
      />
      {picked && (
        <p className="field-hint">
          In master data · {picked.category || 'no category'} · {fmtNum(picked.totalStock)} {picked.unit} in stock
          {picked.needsSetup ? ' · needs setup' : ''}
        </p>
      )}
      {newName !== null && (
        <ItemFormModal
          title="New Item (master data)"
          initialName={newName}
          extra={extra}
          hideStock
          by={by}
          onClose={() => setNewName(null)}
          onSaved={item => {
            addActivityLog({ userName: by, action: 'Create', module: 'Inventory', description: `Added item "${item.name}" (${item.sku}) from a request form` });
            setCatalog(getCatalog());
            setNewName(null);
            onChange(item.name, getCatalog().find(i => i.id === item.id) || item);
          }}
        />
      )}
    </>
  );
}

export function VendorPicker({ kind, value, onChange, origin, placeholder, by = 'Admin' }) {
  const [, setVersion] = useState(0); // bumped after a quick add so the list is re-read
  const [newName, setNewName] = useState(null);
  const all = getVendorsOfKind(kind);
  const list = origin ? all.filter(v => v.origin === origin) : all;
  const label = VENDOR_KIND_LABELS[kind];

  return (
    <>
      <SearchableSelect
        value={value}
        onChange={id => onChange(id, all.find(v => String(v.id) === String(id)) || null)}
        placeholder={placeholder || `Select ${label.toLowerCase()} vendor`}
        emptyText={`No ${label.toLowerCase()} vendor found`}
        options={list.map(v => ({ value: String(v.id), label: v.name, meta: v.phone || '' }))}
        onCreate={q => setNewName(q)}
        createLabel={q => (q ? `Add “${q}” as new ${label.toLowerCase()} vendor` : `Add new ${label.toLowerCase()} vendor`)}
      />
      <p className="field-hint">From Master Data &rarr; {label}{origin ? ` (${origin.toLowerCase()} only)` : ''}.</p>
      {newName !== null && (
        <VendorFormModal
          vendor={null}
          defaultKind={kind}
          initialName={newName}
          initialOrigin={origin}
          onClose={() => setNewName(null)}
          onSave={data => {
            const v = addVendor({ ...data, kinds: [kind] });
            addActivityLog({ userName: by, action: 'Create', module: label, description: `Added ${label.toLowerCase()} vendor "${v.name}" from a request form` });
            setVersion(n => n + 1);
            setNewName(null);
            onChange(String(v.id), v);
          }}
        />
      )}
    </>
  );
}
