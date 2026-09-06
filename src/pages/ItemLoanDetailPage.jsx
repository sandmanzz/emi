import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Modal from '../components/Modal';
import { IconClose, IconCheck } from '../components/icons';
import { TODAY } from '../data/events';
import { getInventoryRows, setInventoryRows as saveInventoryRows } from '../lib/stockOpnameStore';
import { getLoans, setLoans as saveLoans } from '../lib/itemLoanStore';
import { addActivityLog } from '../lib/activityLogStore';
import { getCurrentTenantUser } from '../lib/tenantAuth';
import { loanOrderStatus } from './ItemLoanPage';

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function fmtDate(d) {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${parseInt(day)} ${MONTHS_SHORT[parseInt(m) - 1]} ${y}`;
}

function todayIso() {
  return TODAY.toISOString().slice(0, 10);
}

function itemStatus(item, loan) {
  if (item.returnDate) return 'Returned';
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

export default function ItemLoanDetailPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const currentUser = getCurrentTenantUser();
  const id = parseInt(params.get('id'));

  const [loans, setLoansState] = useState(() => getLoans());
  const [inventoryRows, setInventoryRowsState] = useState(() => getInventoryRows());
  const [returnTarget, setReturnTarget] = useState(null);
  const [returnDate, setReturnDate] = useState('');
  const [returnCondition, setReturnCondition] = useState('Good');
  const [returnNote, setReturnNote] = useState('');

  function setLoans(next) {
    setLoansState(next);
    saveLoans(typeof next === 'function' ? next(loans) : next);
  }

  function setInventoryRows(rows) {
    setInventoryRowsState(rows);
    saveInventoryRows(rows);
  }

  const loan = loans.find(l => l.id === id);

  if (!loan) {
    return (
      <>
        <h1 className="page-title">Item Loan</h1>
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <p style={{ fontSize: 13.5, color: 'var(--text-muted)', marginBottom: 16 }}>Loan not found.</p>
          <button className="btn btn-ghost" onClick={() => navigate('/item-loan')}>Back to Item Loan</button>
        </div>
      </>
    );
  }

  const overallStatus = loanOrderStatus(loan);

  function openReturn(item) {
    setReturnTarget(item);
    setReturnDate(todayIso());
    setReturnCondition('Good');
    setReturnNote('');
  }

  function confirmReturn() {
    if (!returnTarget) return;

    if (returnTarget.inventoryRowId) {
      setInventoryRows(inventoryRows.map(r => {
        if (r.id !== returnTarget.inventoryRowId) return r;
        const newStock = r.itemStock + returnTarget.qty;
        return { ...r, itemStock: newStock, warehouseStock: newStock, totalValuation: r.valuation * newStock, minStatus: deriveStatus(newStock, r.stokMin), updatedAt: fmtDate(todayIso()) };
      }));
    }

    setLoans(ls => ls.map(l => l.id !== loan.id ? l : {
      ...l,
      items: l.items.map(it => it.id === returnTarget.id
        ? { ...it, returnDate, returnCondition, returnNote: returnCondition === 'Poor' ? returnNote.trim() : '' }
        : it
      ),
    }));

    addActivityLog({
      userName: currentUser?.name || 'Admin', action: 'Update', module: 'Item Loan',
      description: `Returned "${returnTarget.itemName}" from ${loan.vendorName}${returnCondition === 'Poor' ? ' (poor condition)' : ''}`,
    });

    setReturnTarget(null);
  }

  return (
    <>
      <div style={{ marginBottom: 14 }}>
        <button onClick={() => navigate('/item-loan')} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '12.5px', color: 'var(--brand)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}><polyline points="15 18 9 12 15 6"/></svg>
          Back to Item Loan
        </button>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>{loan.vendorName}</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{loan.contactPerson} · {loan.contactPhone}</div>
          </div>
          <span className={`badge ${statusBadgeClass(overallStatus)}`} style={{ fontSize: 12.5 }}>{overallStatus}</span>
        </div>
        <div className="item-detail-grid">
          <div className="item-detail-row"><span>Purpose</span><strong>{loan.purpose || '—'}</strong></div>
          <div className="item-detail-row"><span>Loan Date</span><strong>{fmtDate(loan.loanDate)}</strong></div>
          <div className="item-detail-row"><span>Due Date</span><strong>{fmtDate(loan.dueDate)}</strong></div>
          <div className="item-detail-row"><span>Total Items</span><strong>{loan.items.length}</strong></div>
        </div>
      </div>

      <div className="card">
        <div className="section-title">Items in This Loan</div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Source</th>
                <th style={{ width: 90, textAlign: 'right' }}>Qty</th>
                <th style={{ width: 120 }}>Status</th>
                <th style={{ width: 110 }}>Return Date</th>
                <th style={{ width: 100 }}>Condition</th>
                <th style={{ width: 90, textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loan.items.map(it => {
                const status = itemStatus(it, loan);
                return (
                  <tr key={it.id}>
                    <td className="name-cell">{it.itemName}</td>
                    <td style={{ color: 'var(--text-muted)' }}>
                      {it.source === 'warehouse' ? it.warehouse : <span className="badge badge-purple" style={{ fontSize: 10.5 }}>New / External</span>}
                    </td>
                    <td style={{ textAlign: 'right' }}>{it.qty} {it.unit}</td>
                    <td>
                      <span className={`badge ${statusBadgeClass(status)}`}>{status}</span>
                      {status === 'Returned' && it.returnCondition === 'Poor' && (
                        <span className="badge badge-red" style={{ marginLeft: 5, fontSize: 10 }}>Poor</span>
                      )}
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '12.5px' }}>{it.returnDate ? fmtDate(it.returnDate) : '—'}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '12.5px' }}>
                      {it.returnCondition || '—'}
                      {it.returnNote && <div style={{ fontSize: 11, color: 'var(--orange)' }}>{it.returnNote}</div>}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {status === 'Returned'
                        ? <span style={{ color: 'var(--green)', display: 'inline-flex' }}><IconCheck /></span>
                        : <button className="btn-icon" title="Return Item" style={{ color: 'var(--green)' }} onClick={() => openReturn(it)}><IconCheck /></button>
                      }
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={!!returnTarget}
        title="Return Item"
        onClose={() => setReturnTarget(null)}
        footer={
          <>
            <button className="btn-cancel-modal" onClick={() => setReturnTarget(null)}><IconClose /> Cancel</button>
            <button className="btn-save-modal" onClick={confirmReturn}><IconCheck /> Confirm Return</button>
          </>
        }
      >
        {returnTarget && (
          <>
            <p className="confirm-msg" style={{ marginBottom: 14 }}>
              Returning <strong>{returnTarget.qty} {returnTarget.unit}</strong> of{' '}
              <strong>&ldquo;{returnTarget.itemName}&rdquo;</strong> from <strong>{loan.vendorName}</strong>.
            </p>
            <div className="form-group">
              <label>Return Date</label>
              <input type="date" value={returnDate} onChange={e => setReturnDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Item Condition</label>
              <div className="condition-toggle">
                <button type="button" className={`condition-btn good${returnCondition === 'Good' ? ' active' : ''}`} onClick={() => setReturnCondition('Good')}>Good</button>
                <button type="button" className={`condition-btn poor${returnCondition === 'Poor' ? ' active' : ''}`} onClick={() => setReturnCondition('Poor')}>Poor</button>
              </div>
            </div>
            {returnCondition === 'Poor' && (
              <div className="form-group">
                <label>Condition Notes</label>
                <input type="text" placeholder="Describe the issue…" value={returnNote} onChange={e => setReturnNote(e.target.value)} />
              </div>
            )}
          </>
        )}
      </Modal>
    </>
  );
}
