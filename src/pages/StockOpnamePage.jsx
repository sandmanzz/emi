import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/Modal';
import SearchableSelect from '../components/SearchableSelect';
import { IconSearch, IconCheck } from '../components/icons';
import { initialWarehouses } from '../data/warehouses';
import { getInventoryRows, addOpnameHistory, hasPendingOpname } from '../lib/stockOpnameStore';
import { getCurrentTenantUser } from '../lib/tenantAuth';

function formatToday() {
  const date = new Date();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${String(date.getDate()).padStart(2, '0')} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

export default function StockOpnamePage() {
  const navigate = useNavigate();
  const currentUser = getCurrentTenantUser();
  const [inventoryRows] = useState(() => getInventoryRows());
  const [pending] = useState(() => hasPendingOpname());

  const warehouseNames = useMemo(() => {
    const names = new Set([...inventoryRows.map(r => r.warehouseName), ...initialWarehouses.map(w => w.name)]);
    return [...names].filter(Boolean).sort();
  }, [inventoryRows]);

  const warehouseItemCounts = useMemo(() => {
    const counts = {};
    inventoryRows.forEach(r => { counts[r.warehouseName] = (counts[r.warehouseName] || 0) + 1; });
    return counts;
  }, [inventoryRows]);

  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [started, setStarted] = useState(false);
  const [query, setQuery] = useState('');
  const [actualStock, setActualStock] = useState({});
  const [condition, setCondition] = useState({});
  const [conditionNote, setConditionNote] = useState({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const warehouseRows = useMemo(
    () => inventoryRows.filter(r =>
      r.warehouseName === selectedWarehouse &&
      (!query || r.name.toLowerCase().includes(query.toLowerCase()))
    ),
    [inventoryRows, selectedWarehouse, query]
  );

  function getActual(row) {
    const v = actualStock[row.id];
    return v === undefined || v === '' ? row.itemStock : v;
  }
  function variance(row) {
    return getActual(row) - row.itemStock;
  }
  function getCondition(row) {
    return condition[row.id] || 'Good';
  }
  function setActual(rowId, value) {
    setActualStock(s => ({ ...s, [rowId]: value === '' ? '' : Number(value) }));
  }
  function setRowCondition(rowId, value) {
    setCondition(c => ({ ...c, [rowId]: value }));
  }

  const changedRows = useMemo(
    () => warehouseRows.filter(r => variance(r) !== 0 || getCondition(r) === 'Poor'),
    [warehouseRows, actualStock, condition]
  );

  function startOpname() {
    if (!selectedWarehouse || pending) return;
    setStarted(true);
  }

  function openConfirm() {
    if (changedRows.length === 0) return;
    setConfirmOpen(true);
  }

  function submitOpname() {
    const items = changedRows.map(r => ({
      rowId: r.id,
      name: r.name,
      warehouseName: r.warehouseName,
      before: r.itemStock,
      after: getActual(r),
      diff: variance(r),
      condition: getCondition(r),
      note: getCondition(r) === 'Poor' ? (conditionNote[r.id] || '') : '',
    }));
    addOpnameHistory({
      appliedAt: formatToday(),
      appliedBy: currentUser?.name || 'Admin',
      warehouse: selectedWarehouse,
      status: 'Pending',
      resolvedAt: null,
      resolvedBy: null,
      items,
    });
    setConfirmOpen(false);
    setSubmitted(true);
  }

  if (pending) {
    return (
      <>
        <h1 className="page-title">Stock Opname</h1>
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <p style={{ fontSize: 13.5, color: 'var(--text-2)', marginBottom: 16 }}>
            There&rsquo;s a stock opname awaiting approval. A new one can&rsquo;t be
            started until it&rsquo;s been approved or rejected.
          </p>
          <button className="btn btn-ghost" onClick={() => navigate('/warehouse-inventory')}>
            View Opname History
          </button>
        </div>
      </>
    );
  }

  if (submitted) {
    return (
      <>
        <h1 className="page-title">Stock Opname</h1>
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <p style={{ fontSize: 13.5, color: 'var(--green)', fontWeight: 700, marginBottom: 8 }}>
            Submitted for approval.
          </p>
          <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 16 }}>
            This opname is now Pending in Opname History until an Admin reviews it.
            No stock has been changed yet.
          </p>
          <button className="btn-save-modal" onClick={() => navigate('/warehouse-inventory')}>
            Go to Opname History
          </button>
        </div>
      </>
    );
  }

  if (!started) {
    return (
      <>
        <h1 className="page-title">Stock Opname</h1>
        <div className="card" style={{ maxWidth: 480 }}>
          <div className="section-title">Select Warehouse</div>
          <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: -6, marginBottom: 16 }}>
            Stock opname is counted one warehouse at a time.
          </p>
          <div style={{ marginBottom: 16 }}>
            <SearchableSelect
              value={selectedWarehouse}
              onChange={setSelectedWarehouse}
              placeholder="Choose a warehouse…"
              searchPlaceholder="Search warehouse…"
              options={warehouseNames.map(n => ({
                value: n,
                label: n,
                meta: `${warehouseItemCounts[n] || 0} item${(warehouseItemCounts[n] || 0) === 1 ? '' : 's'}`,
              }))}
            />
          </div>
          <button className="btn-save-modal" disabled={!selectedWarehouse} onClick={startOpname}>
            <IconCheck /> Start Counting
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <h1 className="page-title">Stock Opname — {selectedWarehouse}</h1>

      <div className="card">
        <div className="toolbar">
          <div className="toolbar-left">
            <div className="search-wrap">
              <IconSearch />
              <input
                className="search-input" type="text" placeholder="Search item name…"
                value={query} onChange={e => setQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="toolbar-right">
            <button className="btn-save-modal" disabled={changedRows.length === 0} onClick={openConfirm}>
              <IconCheck /> Submit for Approval ({changedRows.length})
            </button>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Item Name</th>
                <th style={{ width: 100, textAlign: 'right' }}>System Stock</th>
                <th style={{ width: 110, textAlign: 'right' }}>Actual Stock</th>
                <th style={{ width: 80, textAlign: 'right' }}>Variance</th>
                <th style={{ width: 150 }}>Condition</th>
                <th>Condition Notes</th>
              </tr>
            </thead>
            <tbody>
              {warehouseRows.length === 0
                ? <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>No items found.</td></tr>
                : warehouseRows.map(r => {
                  const actual = getActual(r);
                  const diff = variance(r);
                  const cond = getCondition(r);
                  return (
                    <tr key={r.id}>
                      <td className="name-cell">{r.name}</td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{r.itemStock}</td>
                      <td style={{ textAlign: 'right' }}>
                        <input
                          type="number" min="0" className="inv-pick-qty" style={{ width: 76 }}
                          value={actual} onChange={e => setActual(r.id, e.target.value)}
                        />
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: diff === 0 ? 'var(--text-muted)' : diff > 0 ? 'var(--brand)' : 'var(--red)' }}>
                        {diff > 0 ? `+${diff}` : diff}
                      </td>
                      <td>
                        <div className="condition-toggle">
                          <button
                            type="button"
                            className={`condition-btn good${cond === 'Good' ? ' active' : ''}`}
                            onClick={() => setRowCondition(r.id, 'Good')}
                          >
                            Good
                          </button>
                          <button
                            type="button"
                            className={`condition-btn poor${cond === 'Poor' ? ' active' : ''}`}
                            onClick={() => setRowCondition(r.id, 'Poor')}
                          >
                            Poor
                          </button>
                        </div>
                      </td>
                      <td>
                        {cond === 'Poor' && (
                          <input
                            type="text" placeholder="Describe the issue…"
                            style={{ width: '100%', padding: '5px 8px', border: '1px solid var(--border)', borderRadius: 'var(--r)', fontSize: 12.5, fontFamily: 'inherit', color: 'var(--text)' }}
                            value={conditionNote[r.id] || ''} onChange={e => setConditionNote(n => ({ ...n, [r.id]: e.target.value }))}
                          />
                        )}
                      </td>
                    </tr>
                  );
                })
              }
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={confirmOpen}
        title="Submit Stock Opname for Approval"
        onClose={() => setConfirmOpen(false)}
        footer={
          <>
            <button className="btn-cancel-modal" onClick={() => setConfirmOpen(false)}>Cancel</button>
            <button className="btn-save-modal" onClick={submitOpname}><IconCheck /> Submit</button>
          </>
        }
      >
        <p className="confirm-msg" style={{ marginBottom: 12 }}>
          <strong>{changedRows.length}</strong> item{changedRows.length === 1 ? '' : 's'} will be sent to Opname History as
          Pending — no stock changes take effect until an Admin approves it.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 240, overflowY: 'auto' }}>
          {changedRows.map(r => {
            const diff = variance(r);
            const cond = getCondition(r);
            return (
              <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 12.5, padding: '6px 0', borderBottom: '1px solid var(--border-2)' }}>
                <span>
                  {r.name}
                  {cond === 'Poor' && <span className="badge badge-red" style={{ marginLeft: 6, fontSize: 10 }}>Poor</span>}
                </span>
                <span style={{ fontWeight: 700, color: diff > 0 ? 'var(--brand)' : diff < 0 ? 'var(--red)' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  {r.itemStock} → {getActual(r)} ({diff > 0 ? '+' : ''}{diff})
                </span>
              </div>
            );
          })}
        </div>
      </Modal>
    </>
  );
}
