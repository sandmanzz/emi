import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import SearchableSelect from '../components/SearchableSelect';
import { IconSearch, IconPlus, IconClose, IconCheck, IconEye } from '../components/icons';
import { TODAY } from '../data/events';
import { getLoans, setLoans as saveLoans } from '../lib/itemLoanStore';
import { getInventoryRows, setInventoryRows as saveInventoryRows } from '../lib/stockOpnameStore';
import { getVendors, addVendor } from '../lib/vendorStore';
import { addActivityLog } from '../lib/activityLogStore';
import { getCurrentTenantUser } from '../lib/tenantAuth';

const PAGE_SIZE = 8;
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function fmtDate(d) {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${parseInt(day)} ${MONTHS_SHORT[parseInt(m) - 1]} ${y}`;
}

function todayIso() {
  return TODAY.toISOString().slice(0, 10);
}

export function loanOrderStatus(loan) {
  const allReturned = loan.items.every(it => it.returnDate);
  if (allReturned) return 'Returned';
  const someReturned = loan.items.some(it => it.returnDate);
  if (someReturned) return 'Partially Returned';
  return new Date(loan.dueDate) < TODAY ? 'Overdue' : 'Borrowed';
}

function statusBadgeClass(status) {
  if (status === 'Returned') return 'badge-green';
  if (status === 'Partially Returned') return 'badge-orange';
  if (status === 'Overdue') return 'badge-red';
  return 'badge-blue';
}

function deriveStatus(stock, minimum) {
  if (!minimum) return 'Not Set';
  if (stock <= minimum) return 'Critical';
  if (stock <= minimum * 1.5) return 'Warning';
  return 'Safe';
}

function emptyHeaderForm() {
  return { vendorId: '', contactPerson: '', contactPhone: '', purpose: '', loanDate: todayIso(), dueDate: '' };
}

export default function ItemLoanPage() {
  const navigate = useNavigate();
  const currentUser = getCurrentTenantUser();
  const [loans,          setLoansState]     = useState(() => getLoans());
  const [inventoryRows,  setInventoryRowsState] = useState(() => getInventoryRows());
  const [vendors,        setVendors]        = useState(() => getVendors());
  const [query,          setQuery]          = useState('');
  const [statusFilter,   setStatusFilter]   = useState('');
  const [page,           setPage]           = useState(1);

  const [modalOpen,      setModalOpen]      = useState(false);
  const [headerForm,     setHeaderForm]     = useState(emptyHeaderForm());
  const [pendingItems,   setPendingItems]   = useState([]); // items staged for the new loan
  const [addMode,        setAddMode]        = useState('warehouse'); // 'warehouse' | 'new'
  const [addRowId,       setAddRowId]       = useState('');
  const [addQty,         setAddQty]         = useState(1);
  const [addNewName,     setAddNewName]     = useState('');
  const [addNewUnit,     setAddNewUnit]     = useState('pcs');

  const [vendorModalOpen, setVendorModalOpen] = useState(false);
  const [vendorForm,     setVendorForm]     = useState({ name: '', contact: '', type: '' });

  function setInventoryRows(rows) {
    setInventoryRowsState(rows);
    saveInventoryRows(rows);
  }

  function setLoans(next) {
    setLoansState(next);
    saveLoans(typeof next === 'function' ? next(loans) : next);
  }

  const withStatus = useMemo(() => loans.map(l => ({ ...l, computedStatus: loanOrderStatus(l) })), [loans]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return withStatus.filter(l =>
      (!q || l.vendorName.toLowerCase().includes(q) || l.items.some(it => it.itemName.toLowerCase().includes(q))) &&
      (!statusFilter || l.computedStatus === statusFilter)
    );
  }, [withStatus, query, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageData = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const totalItemsOut = withStatus.reduce((sum, l) => sum + l.items.filter(it => !it.returnDate).length, 0);
  const borrowedCount = withStatus.filter(l => l.computedStatus === 'Borrowed' || l.computedStatus === 'Partially Returned').length;
  const overdueCount = withStatus.filter(l => l.computedStatus === 'Overdue').length;
  const returnedCount = withStatus.filter(l => l.computedStatus === 'Returned').length;

  const availableRows = useMemo(() => inventoryRows.filter(r => r.itemStock > 0), [inventoryRows]);
  const addSelectedRow = inventoryRows.find(r => r.id === Number(addRowId)) || null;

  function openNew() {
    setHeaderForm(emptyHeaderForm());
    setPendingItems([]);
    setAddMode('warehouse');
    setAddRowId('');
    setAddQty(1);
    setAddNewName('');
    setAddNewUnit('pcs');
    setModalOpen(true);
  }

  function openAddVendor() {
    setVendorForm({ name: '', contact: '', type: '' });
    setVendorModalOpen(true);
  }

  function saveVendor() {
    if (!vendorForm.name.trim()) return;
    const created = addVendor({ name: vendorForm.name.trim(), contact: vendorForm.contact.trim(), type: vendorForm.type.trim() });
    setVendors(getVendors());
    setHeaderForm(f => ({ ...f, vendorId: String(created.id) }));
    setVendorModalOpen(false);
  }

  function addPendingItem() {
    if (addMode === 'warehouse') {
      if (!addSelectedRow) return;
      const qty = Math.max(1, Math.min(addSelectedRow.itemStock, Number(addQty) || 1));
      setPendingItems(items => [...items, {
        key: `w-${addSelectedRow.id}-${Date.now()}`, source: 'warehouse',
        itemName: addSelectedRow.name, warehouse: addSelectedRow.warehouseName,
        inventoryRowId: addSelectedRow.id, unit: 'pcs', qty,
      }]);
      setAddRowId('');
      setAddQty(1);
    } else {
      if (!addNewName.trim()) return;
      setPendingItems(items => [...items, {
        key: `n-${Date.now()}`, source: 'new',
        itemName: addNewName.trim(), warehouse: '', inventoryRowId: null,
        unit: addNewUnit.trim() || 'pcs', qty: Math.max(1, Number(addQty) || 1),
      }]);
      setAddNewName('');
      setAddQty(1);
    }
  }

  function removePendingItem(key) {
    setPendingItems(items => items.filter(it => it.key !== key));
  }

  function saveLoan() {
    const vendor = vendors.find(v => v.id === Number(headerForm.vendorId));
    if (!vendor || !headerForm.dueDate || pendingItems.length === 0) return;

    const now = fmtDate(todayIso());
    let newRows = inventoryRows;
    pendingItems.forEach(it => {
      if (it.source !== 'warehouse') return;
      newRows = newRows.map(r => {
        if (r.id !== it.inventoryRowId) return r;
        const newStock = r.itemStock - it.qty;
        return { ...r, itemStock: newStock, warehouseStock: newStock, totalValuation: r.valuation * newStock, minStatus: deriveStatus(newStock, r.stokMin), updatedAt: now };
      });
    });
    setInventoryRows(newRows);

    const loan = {
      id: Math.max(0, ...loans.map(l => l.id)) + 1,
      vendorId: vendor.id, vendorName: vendor.name,
      contactPerson: headerForm.contactPerson.trim() || vendor.name,
      contactPhone: headerForm.contactPhone.trim() || vendor.contact,
      purpose: headerForm.purpose.trim(), loanDate: headerForm.loanDate, dueDate: headerForm.dueDate,
      items: pendingItems.map((it, idx) => ({
        id: idx + 1, itemName: it.itemName, source: it.source, warehouse: it.warehouse,
        inventoryRowId: it.inventoryRowId, unit: it.unit, qty: it.qty,
        returnDate: null, returnCondition: null, returnNote: '',
      })),
    };
    setLoans(ls => [loan, ...ls]);

    const itemSummary = pendingItems.length === 1
      ? `"${pendingItems[0].itemName}" (qty ${pendingItems[0].qty})`
      : `${pendingItems.length} items`;
    addActivityLog({
      userName: currentUser?.name || 'Admin', action: 'Create', module: 'Item Loan',
      description: `Loaned ${itemSummary} to ${vendor.name}`,
    });

    setModalOpen(false);
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
        <h1 className="page-title" style={{ margin: 0 }}>Item Loan</h1>
        <button className="btn-new" onClick={openNew}><IconPlus /> New Loan</button>
      </div>

      <div className="stats-bar" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
        {[
          { label: 'Items Currently Out', value: totalItemsOut,  color: 'var(--brand)',  bg: 'var(--brand-bg)' },
          { label: 'Loans Borrowed',      value: borrowedCount,   color: 'var(--brand)',  bg: 'var(--brand-bg)' },
          { label: 'Overdue',             value: overdueCount,    color: 'var(--red)',    bg: 'var(--red-bg)' },
          { label: 'Fully Returned',      value: returnedCount,   color: 'var(--green)',  bg: 'var(--green-bg)' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon" style={{ background: s.bg }}>
              <span className="stat-value" style={{ color: s.color }}>{s.value}</span>
            </div>
            <span className="stat-label">{s.label}</span>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="toolbar">
          <div className="toolbar-left">
            <div className="search-wrap">
              <IconSearch />
              <input
                className="search-input" type="text" placeholder="Search vendor or item…"
                value={query} onChange={e => { setQuery(e.target.value); setPage(1); }}
              />
            </div>
            <SearchableSelect
              inline
              value={statusFilter}
              onChange={v => { setStatusFilter(v); setPage(1); }}
              options={[
                { value: '', label: 'All Statuses' },
                { value: 'Borrowed', label: 'Borrowed' },
                { value: 'Partially Returned', label: 'Partially Returned' },
                { value: 'Overdue', label: 'Overdue' },
                { value: 'Returned', label: 'Returned' },
              ]}
              placeholder="All Statuses"
            />
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Vendor</th>
                <th>Items</th>
                <th style={{ width: 110 }}>Loan Date</th>
                <th style={{ width: 110 }}>Due Date</th>
                <th style={{ width: 140 }}>Status</th>
                <th style={{ width: 90, textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {pageData.length === 0
                ? <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>No loans found.</td></tr>
                : pageData.map(l => (
                  <tr key={l.id}>
                    <td className="name-cell">{l.vendorName}<div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{l.contactPerson} · {l.contactPhone}</div></td>
                    <td>
                      {l.items[0].itemName}{l.items.length > 1 ? ` +${l.items.length - 1} more` : ''}
                      <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{l.items.length} item{l.items.length === 1 ? '' : 's'} · {l.purpose}</div>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '12.5px' }}>{fmtDate(l.loanDate)}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '12.5px' }}>{fmtDate(l.dueDate)}</td>
                    <td><span className={`badge ${statusBadgeClass(l.computedStatus)}`}>{l.computedStatus}</span></td>
                    <td style={{ textAlign: 'center' }}>
                      <button className="btn-icon" title="View Detail" style={{ color: 'var(--brand)' }} onClick={() => navigate(`/item-loan-detail?id=${l.id}`)}>
                        <IconEye />
                      </button>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
        <Pagination currentPage={safePage} total={filtered.length} pageSize={PAGE_SIZE} onPage={p => setPage(p)} label="loans" />
      </div>

      <Modal
        open={modalOpen}
        title="New Loan"
        onClose={() => setModalOpen(false)}
        size="lg"
        footer={
          <>
            <button className="btn-cancel-modal" onClick={() => setModalOpen(false)}><IconClose /> Cancel</button>
            <button className="btn-save-modal" onClick={saveLoan}><IconCheck /> Save Loan{pendingItems.length > 1 ? ` (${pendingItems.length} items)` : ''}</button>
          </>
        }
      >
        <div className="form-row" style={{ alignItems: 'flex-end' }}>
          <div className="form-group">
            <label>Vendor <span style={{ color: 'var(--red)' }}>*</span></label>
            <SearchableSelect
              value={headerForm.vendorId}
              onChange={v => setHeaderForm(f => ({ ...f, vendorId: v }))}
              options={vendors.map(v => ({ value: String(v.id), label: v.name, meta: v.type }))}
              placeholder="Select vendor…"
              searchPlaceholder="Search vendors…"
            />
          </div>
          <button type="button" className="btn-cancel-modal" style={{ marginBottom: 14 }} onClick={openAddVendor}>
            <IconPlus /> New Vendor
          </button>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Contact Person</label>
            <input type="text" placeholder="Who to contact for this loan" value={headerForm.contactPerson} onChange={e => setHeaderForm(f => ({ ...f, contactPerson: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Contact Phone</label>
            <input type="text" placeholder="Phone number / email" value={headerForm.contactPhone} onChange={e => setHeaderForm(f => ({ ...f, contactPhone: e.target.value }))} />
          </div>
        </div>
        <div className="form-group">
          <label>Purpose</label>
          <input type="text" placeholder="What the items are being borrowed for" value={headerForm.purpose} onChange={e => setHeaderForm(f => ({ ...f, purpose: e.target.value }))} />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Loan Date</label>
            <input type="date" value={headerForm.loanDate} onChange={e => setHeaderForm(f => ({ ...f, loanDate: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Due Date <span style={{ color: 'var(--red)' }}>*</span></label>
            <input type="date" value={headerForm.dueDate} onChange={e => setHeaderForm(f => ({ ...f, dueDate: e.target.value }))} />
          </div>
        </div>

        <div className="form-group">
          <label>Items to Loan <span style={{ color: 'var(--red)' }}>*</span></label>
          <div className="wi-tabs" style={{ marginBottom: 10 }}>
            <button type="button" className={`wi-tab-btn${addMode === 'warehouse' ? ' active' : ''}`} onClick={() => setAddMode('warehouse')}>From Warehouse</button>
            <button type="button" className={`wi-tab-btn${addMode === 'new' ? ' active' : ''}`} onClick={() => setAddMode('new')}>New / External Item</button>
          </div>

          {addMode === 'warehouse' ? (
            <div className="form-row" style={{ alignItems: 'flex-end' }}>
              <div className="form-group" style={{ flex: 2 }}>
                <SearchableSelect
                  value={addRowId}
                  onChange={setAddRowId}
                  options={availableRows.map(r => ({ value: String(r.id), label: `${r.name} — ${r.warehouseName}`, meta: `stock: ${r.itemStock}` }))}
                  placeholder="Choose an item already in our warehouse…"
                  searchPlaceholder="Search items…"
                  emptyText="No items with stock"
                />
              </div>
              <div className="form-group" style={{ flex: '0 0 90px' }}>
                <input type="number" min={1} max={addSelectedRow?.itemStock || undefined} disabled={!addSelectedRow} value={addQty} onChange={e => setAddQty(e.target.value)} />
              </div>
              <button type="button" className="btn-save-modal" style={{ marginBottom: 14 }} disabled={!addSelectedRow} onClick={addPendingItem}><IconPlus /> Add</button>
            </div>
          ) : (
            <div className="form-row" style={{ alignItems: 'flex-end' }}>
              <div className="form-group" style={{ flex: 2 }}>
                <input type="text" placeholder="Item name (not in our warehouse)" value={addNewName} onChange={e => setAddNewName(e.target.value)} />
              </div>
              <div className="form-group" style={{ flex: '0 0 90px' }}>
                <input type="number" min={1} value={addQty} onChange={e => setAddQty(e.target.value)} />
              </div>
              <div className="form-group" style={{ flex: '0 0 80px' }}>
                <input type="text" placeholder="unit" value={addNewUnit} onChange={e => setAddNewUnit(e.target.value)} />
              </div>
              <button type="button" className="btn-save-modal" style={{ marginBottom: 14 }} disabled={!addNewName.trim()} onClick={addPendingItem}><IconPlus /> Add</button>
            </div>
          )}

          {pendingItems.length === 0
            ? <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>No items added yet.</p>
            : (
              <div className="mo-item-list">
                {pendingItems.map(it => (
                  <div key={it.key} className="mo-item-row">
                    <div>
                      <span className="mo-item-name">{it.itemName}</span>
                      <span className="mo-item-stock">{it.source === 'warehouse' ? it.warehouse : 'New / external item'} · qty {it.qty} {it.unit}</span>
                    </div>
                    <button type="button" className="btn-icon delete" title="Remove" onClick={() => removePendingItem(it.key)}><IconClose /></button>
                  </div>
                ))}
              </div>
            )
          }
        </div>
      </Modal>

      <Modal
        open={vendorModalOpen}
        title="New Vendor"
        onClose={() => setVendorModalOpen(false)}
        footer={
          <>
            <button className="btn-cancel-modal" onClick={() => setVendorModalOpen(false)}><IconClose /> Cancel</button>
            <button className="btn-save-modal" onClick={saveVendor}><IconCheck /> Save Vendor</button>
          </>
        }
      >
        <div className="form-group">
          <label>Vendor Name <span style={{ color: 'var(--red)' }}>*</span></label>
          <input type="text" value={vendorForm.name} onChange={e => setVendorForm(f => ({ ...f, name: e.target.value }))} />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Contact</label>
            <input type="text" placeholder="Phone number / email" value={vendorForm.contact} onChange={e => setVendorForm(f => ({ ...f, contact: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Type</label>
            <input type="text" placeholder="e.g. Event Organizer, Individual" value={vendorForm.type} onChange={e => setVendorForm(f => ({ ...f, type: e.target.value }))} />
          </div>
        </div>
      </Modal>
    </>
  );
}
