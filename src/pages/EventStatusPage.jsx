import { useState, useMemo } from 'react';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import SortTh from '../components/SortTh';
import { IconSearch, IconPlus, IconEdit, IconDelete, IconClose, IconCheck } from '../components/icons';
import { getEventStatuses, saveEventStatuses } from '../lib/eventStatuses';

const PAGE_SIZE = 10;
// Outsource Item flag (2026-11-02). Rows saved before it existed follow their Rent Item flag
// (same rule as isOutsourceStage in lib/eventStatuses.js).
const isOutsourceFlag = r => (r.outsourceItem === undefined ? r.loanItem === true : r.outsourceItem === true);

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function fmtDate(d) {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${parseInt(day)} ${MONTHS_SHORT[parseInt(m) - 1]} ${y}`;
}

// One definition of every stage rule (2026-11-12 redesign: the table had 12 True/False columns).
// The table shows a stage's rules as chips (only what is ON, plus red "No …" chips for the two rules that
// default to allowed), the form groups them as switches, and the legend explains each one.
//  key   — field on the status record;  on(r) — is the rule active;  def — default for a new status
//  restrictive — default-true rules: the chip is shown when the rule is OFF ("No adding" / "No deleting").
const RULE_GROUPS = [
  { id: 'scan', label: 'Scanning', color: 'green' },
  { id: 'stock', label: 'Stock', color: 'orange' },
  { id: 'items', label: 'Items', color: 'blue' },
  { id: 'requests', label: 'Requests', color: 'purple' },
  { id: 'closing', label: 'Closing', color: 'blue' },
];
const RULES = [
  { key: 'scan', group: 'scan', label: 'Scan items', chip: 'Scan', on: r => r.scan === 'Scan',
    desc: 'Every item must be scanned before the event can move on. The first scan stage is Scan In, the next one Scan Out.' },
  { key: 'cuttingStock', group: 'stock', label: 'Cutting Stock', chip: 'Cut stock', on: r => r.cuttingStock === true, unique: true,
    desc: 'Entering this stage deducts the event’s items from warehouse stock and reserves them for the event. One stage only.' },
  { key: 'stockReturn', group: 'stock', label: 'Stock Return', chip: 'Return stock', on: r => r.stockReturn === true, unique: true,
    desc: 'Optional: put the cut stock back already when entering this stage. Normally stock comes back at “For Return” after checking. One stage only.' },
  { key: 'allowAddItem', group: 'items', label: 'Allow adding items', chip: 'No adding', restrictive: true, on: r => r.allowAddItem !== false,
    desc: 'Off = nothing can be added at this stage (Add Item, Rent, Outsource, Production). Use it for late stages.' },
  { key: 'allowDelete', group: 'items', label: 'Allow deleting items', chip: 'No deleting', restrictive: true, on: r => r.allowDelete !== false,
    desc: 'Off = items can’t be deleted from the event at this stage.' },
  { key: 'checkItem', group: 'items', label: 'Checking Item', chip: 'Checking', on: r => r.checkItem === true,
    desc: 'The crew ticks “Checking” on each item here. The field is hidden before the first stage with this on.' },
  { key: 'checkOwnership', group: 'items', label: 'Check ownership', chip: 'Ownership check', on: r => r.checkOwnership === true,
    desc: 'Before leaving this stage, ask whether any item needs an ownership change (IHC / IHP / Outsource).' },
  { key: 'productionItem', group: 'requests', label: 'Production Item', chip: 'Production', on: r => r.productionItem === true,
    desc: 'Users can request items to be produced (they become our assets).' },
  { key: 'loanItem', group: 'requests', label: 'Rent Item', chip: 'Rent', on: r => r.loanItem === true,
    desc: 'Users can rent items from a rent vendor (returned after the event).' },
  { key: 'outsourceItem', group: 'requests', label: 'Outsource Item', chip: 'Outsource', on: isOutsourceFlag,
    desc: 'Users can order items or work from an outsource vendor.' },
  { key: 'closeStage', group: 'closing', label: 'Ready for checking', chip: 'Ready for checking', on: r => r.closeStage === true, unique: true,
    desc: 'The event is finished here: the main action becomes “Start Checking” (then For Return). One stage only; stages after it (Postphone, Disable) are not part of the normal flow.' },
];
const groupColor = id => RULE_GROUPS.find(g => g.id === id)?.color || 'gray';

function RuleChips({ r }) {
  const chips = RULES.filter(rule => (rule.restrictive ? !rule.on(r) : rule.on(r)));
  if (chips.length === 0) return <span className="es-none">No special rules</span>;
  return (
    <div className="es-chips">
      {chips.map(rule => (
        <span key={rule.key} className={`es-chip ${rule.restrictive ? 'red' : groupColor(rule.group)}`} title={rule.desc}>{rule.chip}</span>
      ))}
    </div>
  );
}

function Switch({ checked, onChange, disabled, label, desc, note }) {
  return (
    <label className={`es-switch-row${disabled ? ' disabled' : ''}`}>
      <span className="es-switch-text">
        <strong>{label}</strong>
        <span>{desc}</span>
        {note && <em>{note}</em>}
      </span>
      <input type="checkbox" className="es-switch" role="switch" checked={checked} disabled={disabled} onChange={e => onChange(e.target.checked)} />
    </label>
  );
}

export default function EventStatusPage() {
  const [statuses,     setStatusesState] = useState(() => getEventStatuses());
  const [nextId,       setNextId]       = useState(() => Math.max(0, ...getEventStatuses().map(s => s.id)) + 1);
  const [query,        setQuery]        = useState('');
  const [sortCol,      setSortCol]      = useState(-1);
  const [sortAsc,      setSortAsc]      = useState(true);
  const [page,         setPage]         = useState(1);

  const [statusModal,  setStatusModal]  = useState(false);
  const [deleteModal,  setDeleteModal]  = useState(false);
  const [editingId,    setEditingId]    = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState({ status: '', code: '', scan: 'None', productionItem: false, checkOwnership: false, allowDelete: true, allowAddItem: true, loanItem: false, outsourceItem: false, checkItem: false, cuttingStock: false, stockReturn: false, closeStage: false, order: '' });

  // Reordering is edit-mode + explicit Save, not instant-apply-per-click.
  const [reorderMode,    setReorderMode]    = useState(false);
  const [draftStatuses,  setDraftStatuses]  = useState(null);
  const displayStatuses = reorderMode ? draftStatuses : statuses;

  function setStatuses(updater) {
    setStatusesState(current => {
      const next = typeof updater === 'function' ? updater(current) : updater;
      saveEventStatuses(next);
      return next;
    });
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let data = displayStatuses.filter(r => !q || r.status.toLowerCase().includes(q));
    if (sortCol >= 0) {
      data.sort((a, b) => {
        let va, vb;
        if (sortCol === 0)      { va = String(a.order);       vb = String(b.order); }
        else if (sortCol === 1) { va = a.status;              vb = b.status; }
        else if (sortCol === 4) { va = String(a.eventRunning);vb = String(b.eventRunning); }
        else if (sortCol === 5) { va = a.updatedAt;           vb = b.updatedAt; }
        else return 0;
        return sortAsc ? va.localeCompare(vb, undefined, { numeric:true }) : vb.localeCompare(va, undefined, { numeric:true });
      });
    }
    return data;
  }, [displayStatuses, query, sortCol, sortAsc]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const safePage   = Math.min(page, Math.max(1, totalPages));
  const pageData   = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function handleSort(col) {
    if (sortCol === col) setSortAsc(a => !a);
    else { setSortCol(col); setSortAsc(true); }
    setPage(1);
  }

  function openNew() {
    setEditingId(null);
    setForm({ status: '', code: '', scan: 'None', productionItem: false, checkOwnership: false, allowDelete: true, allowAddItem: true, loanItem: false, outsourceItem: false, checkItem: false, cuttingStock: false, stockReturn: false, closeStage: false, order: String(statuses.length + 1) });
    setStatusModal(true);
  }

  function openEdit(id) {
    const r = statuses.find(x => x.id === id);
    if (!r) return;
    setEditingId(id);
    setForm({ status: r.status, code: r.code || '', scan: r.scan, productionItem: r.productionItem === true, checkOwnership: r.checkOwnership === true, allowDelete: r.allowDelete !== false, allowAddItem: r.allowAddItem !== false, loanItem: r.loanItem === true, outsourceItem: isOutsourceFlag(r), checkItem: r.checkItem === true, cuttingStock: r.cuttingStock === true, stockReturn: r.stockReturn === true, closeStage: r.closeStage === true, order: String(r.order) });
    setStatusModal(true);
  }

  function save() {
    if (!form.status.trim()) return;
    // Exclusivity guard (the form already disables these options).
    const now = new Date().toISOString().slice(0, 10);
    if (editingId) {
      setStatuses(ss => ss.map(s => s.id === editingId
        ? { ...s, status: form.status, code: form.code, scan: form.scan, productionItem: form.productionItem, checkOwnership: form.checkOwnership, allowDelete: form.allowDelete, allowAddItem: form.allowAddItem, loanItem: form.loanItem, outsourceItem: form.outsourceItem, checkItem: form.checkItem, cuttingStock: form.cuttingStock, stockReturn: form.stockReturn, closeStage: form.closeStage, order: parseInt(form.order) || s.order, updatedAt: now }
        : s
      ));
    } else {
      setStatuses(ss => [...ss, { id: nextId, order: parseInt(form.order) || ss.length + 1, status: form.status, code: form.code, scan: form.scan, productionItem: form.productionItem, checkOwnership: form.checkOwnership, allowDelete: form.allowDelete, allowAddItem: form.allowAddItem, loanItem: form.loanItem, outsourceItem: form.outsourceItem, checkItem: form.checkItem, cuttingStock: form.cuttingStock, stockReturn: form.stockReturn, closeStage: form.closeStage, eventRunning: 0, updatedAt: now }]);
      setNextId(n => n + 1);
    }
    setStatusModal(false);
  }

  function startReorder() {
    setDraftStatuses([...statuses]);
    setReorderMode(true);
    setSortCol(0);
    setSortAsc(true);
  }

  function cancelReorder() {
    setReorderMode(false);
    setDraftStatuses(null);
  }

  function saveReorder() {
    setStatuses(() => draftStatuses);
    setReorderMode(false);
    setDraftStatuses(null);
  }

  function moveOrder(id, dir) {
    setDraftStatuses(ss => {
      const sorted = [...ss].sort((a, b) => a.order - b.order);
      const idx = sorted.findIndex(s => s.id === id);
      const swapIdx = idx + dir;
      if (swapIdx < 0 || swapIdx >= sorted.length) return ss;
      const aOrder = sorted[idx].order;
      const bOrder = sorted[swapIdx].order;
      return ss.map(s => {
        if (s.id === sorted[idx].id)   return { ...s, order: bOrder };
        if (s.id === sorted[swapIdx].id) return { ...s, order: aOrder };
        return s;
      });
    });
  }

  function openDelete(id) { setDeleteTarget(id); setDeleteModal(true); }
  function confirmDelete() { setStatuses(ss => ss.filter(s => s.id !== deleteTarget)); setDeleteModal(false); }

  const deleteRecord   = statuses.find(x => x.id === deleteTarget);
  const runningTotal   = statuses.reduce((a, s) => a + s.eventRunning, 0);
  const scanEnabled    = statuses.filter(s => s.scan === 'Scan').length;
  // Cutting Stock / Stock Return: one status each, never the same status (2026-11-12).
  const cutOwner = statuses.find(st => st.cuttingStock === true && st.id !== editingId);
  const returnOwner = statuses.find(st => st.stockReturn === true && st.id !== editingId);
  const closeOwner = statuses.find(st => st.closeStage === true && st.id !== editingId);

  const [legendOpen, setLegendOpen] = useState(false);
  // Form value for a rule (scan is stored as 'Scan' / 'None').
  const ruleValue = rule => (rule.key === 'scan' ? form.scan === 'Scan' : form[rule.key]);
  function setRule(rule, v) {
    if (rule.key === 'scan') { setForm(f => ({ ...f, scan: v ? 'Scan' : 'None' })); return; }
    setForm(f => ({
      ...f, [rule.key]: v,
      // Cutting Stock and Stock Return can't be on the same stage.
      ...(rule.key === 'cuttingStock' && v ? { stockReturn: false } : {}),
      ...(rule.key === 'stockReturn' && v ? { cuttingStock: false } : {}),
    }));
  }
  const cutStage = statuses.find(st => st.cuttingStock === true);
  const returnStage = statuses.find(st => st.stockReturn === true);
  const ordered = [...statuses].sort((x, y) => x.order - y.order);

  return (
    <>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:22, gap:12 }}>
        <div>
          <h1 className="page-title" style={{ margin:0 }}>Event Status</h1>
          <p className="es-intro">
            The stages every event goes through, in order. Each stage has rules (scan, stock, items, requests).{' '}
            <button type="button" className="link-btn" onClick={() => setLegendOpen(o => !o)}>{legendOpen ? 'Hide' : 'What do the rules mean?'}</button>
          </p>
        </div>
        <button className="btn-new" onClick={openNew}><IconPlus /> New Status</button>
      </div>

      {legendOpen && (
        <div className="card es-legend">
          {RULE_GROUPS.map(g => (
            <div key={g.id} className="es-legend-group">
              <div className="es-legend-title"><span className={`es-dot ${g.color}`} />{g.label}</div>
              {RULES.filter(rule => rule.group === g.id).map(rule => (
                <div key={rule.key} className="es-legend-row">
                  <span className={`es-chip ${rule.restrictive ? 'red' : g.color}`}>{rule.chip}</span>
                  <span>{rule.desc}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Summary: 4 key numbers + the pipeline at a glance (replaces 11 KPI cards). */}
      <div className="es-summary">
        <div className="es-kpis">
          {[
            { label:'Stages', value:statuses.length, color:'var(--brand)' },
            { label:'Scan stages', value:scanEnabled, color:'var(--green)' },
            { label:'Events running', value:runningTotal, color:'var(--orange)' },
          ].map(k => (
            <div key={k.label} className="es-kpi"><b style={{ color:k.color }}>{k.value}</b><span>{k.label}</span></div>
          ))}
          <div className="es-kpi wide">
            <span>Stock</span>
            <b className="es-kpi-text">
              {cutStage ? <>Cut at <em>{cutStage.status}</em></> : 'No cutting stage'}
              {' · '}
              {returnStage ? <>Return at <em>{returnStage.status}</em></> : <>Return at <em>For Return</em></>}
            </b>
          </div>
        </div>
        <ol className="es-pipeline" aria-label="Stage order">
          {ordered.map(st => (
            <li key={st.id} title={RULES.filter(rule => (rule.restrictive ? !rule.on(st) : rule.on(st))).map(rule => rule.chip).join(', ') || 'No special rules'}>
              <span className="es-pipe-num">{st.order}</span>
              <span className="es-pipe-name">{st.status}</span>
              <span className="es-pipe-icons">
                {st.scan === 'Scan' && <i className="green" />}
                {(st.cuttingStock || st.stockReturn) && <i className="orange" />}
                {st.allowAddItem === false && <i className="red" />}
              </span>
            </li>
          ))}
        </ol>
      </div>

      <div className="card">
        <div className="toolbar">
          <div className="toolbar-left">
            <div className="search-wrap">
              <IconSearch />
              <input
                className="search-input" type="text" placeholder="Search status…"
                value={query} onChange={e => { setQuery(e.target.value); setPage(1); }}
              />
            </div>
          </div>
          <div className="toolbar-right">
            {reorderMode ? (
              <>
                <button className="btn-cancel-modal" onClick={cancelReorder}><IconClose /> Cancel</button>
                <button className="btn-save-modal" onClick={saveReorder}><IconCheck /> Save Order</button>
              </>
            ) : (
              <button className="btn btn-ghost" onClick={startReorder}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width:14, height:14 }}><polyline points="8 7 12 3 16 7"/><polyline points="16 17 12 21 8 17"/><line x1="12" y1="3" x2="12" y2="21"/></svg>
                Edit Order
              </button>
            )}
          </div>
        </div>

        {reorderMode && (
          <p style={{ fontSize: 12.5, color: 'var(--brand)', background: 'var(--brand-bg)', padding: '9px 14px', borderRadius: 'var(--r-lg)', margin: '0 0 14px' }}>
            Reordering — use the arrows next to each number, then <strong>Save Order</strong> to apply, or <strong>Cancel</strong> to discard.
          </p>
        )}

        <div className="table-wrap">
          <table className="es-table">
            <thead>
              <tr>
                <SortTh label="Order"   colIndex={0} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} style={{ width:90 }} />
                <SortTh label="Status"  colIndex={1} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} style={{ minWidth:200 }} />
                <th style={{ minWidth:280 }}>Rules</th>
                <SortTh label="Events"  colIndex={4} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} style={{ width:90, textAlign:'right' }} />
                <SortTh label="Updated" colIndex={5} sortCol={sortCol} sortAsc={sortAsc} onSort={handleSort} style={{ width:110 }} />
                <th className="col-action" style={{ width:90, textAlign:'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {pageData.length === 0
                ? <tr><td colSpan={6} style={{ textAlign:'center', padding:40, color:'var(--text-muted)' }}>No statuses found.</td></tr>
                : pageData.map((r, idx) => (
                  <tr key={r.id}>
                    <td>
                      <div className="es-order">
                        <span className="es-order-num">{r.order}</span>
                        {reorderMode && (
                          <span className="es-order-arrows">
                            <button className="btn-icon" title="Move up" disabled={idx === 0} onClick={() => moveOrder(r.id, -1)}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
                            </button>
                            <button className="btn-icon" title="Move down" disabled={idx === pageData.length - 1} onClick={() => moveOrder(r.id, 1)}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                            </button>
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="es-name">{r.status}</div>
                      {r.code && <span className="es-code">{r.code}</span>}
                    </td>
                    <td><RuleChips r={r} /></td>
                    <td style={{ textAlign:'right', fontVariantNumeric:'tabular-nums', fontWeight:600 }}>
                      <span style={{ color: r.eventRunning > 0 ? 'var(--orange)' : 'var(--text-muted)' }}>{r.eventRunning}</span>
                    </td>
                    <td style={{ color:'var(--text-muted)', fontSize:'12.5px', whiteSpace:'nowrap' }}>{fmtDate(r.updatedAt)}</td>
                    <td>
                      <div className="action-btns" style={{ justifyContent:'center' }}>
                        <button className="btn-icon edit"   title="Edit"   disabled={reorderMode} onClick={() => openEdit(r.id)}><IconEdit /></button>
                        <button className="btn-icon delete" title="Delete" disabled={reorderMode} onClick={() => openDelete(r.id)}><IconDelete /></button>
                      </div>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
        <Pagination currentPage={safePage} total={filtered.length} pageSize={PAGE_SIZE} onPage={setPage} label="statuses" />
      </div>

      <Modal
        open={statusModal}
        size="lg"
        title={editingId ? 'Edit Event Status' : 'New Event Status'}
        onClose={() => setStatusModal(false)}
        footer={
          <>
            <button className="btn-cancel-modal" onClick={() => setStatusModal(false)}><IconClose /> Cancel</button>
            <button className="btn-save-modal"   onClick={save}><IconCheck /> Save</button>
          </>
        }
      >
        <div className="es-form-basics">
          <div className="form-group">
            <label>Order <span style={{ color:'var(--red)' }}>*</span></label>
            <input type="number" min="1" placeholder="e.g. 1" value={form.order} onChange={e => setForm(f => ({ ...f, order: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Status Name <span style={{ color:'var(--red)' }}>*</span></label>
            <input type="text" placeholder="e.g. Event running" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Code</label>
            <input type="text" placeholder="e.g. ER" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} />
          </div>
        </div>
        {RULE_GROUPS.map(g => (
          <div key={g.id} className="es-form-group">
            <div className="es-legend-title"><span className={`es-dot ${g.color}`} />{g.label}</div>
            {RULES.filter(rule => rule.group === g.id).map(rule => {
              const owner = rule.key === 'cuttingStock' ? cutOwner : rule.key === 'stockReturn' ? returnOwner : rule.key === 'closeStage' ? closeOwner : null;
              return (
                <Switch
                  key={rule.key}
                  label={rule.label}
                  desc={rule.desc}
                  checked={!!ruleValue(rule)}
                  disabled={!!owner && !ruleValue(rule)}
                  note={owner && !ruleValue(rule) ? `Already used by “${owner.status}”. Turn it off there first.` : null}
                  onChange={v => setRule(rule, v)}
                />
              );
            })}
          </div>
        ))}
      </Modal>

      <Modal
        open={deleteModal}
        title="Delete Event Status"
        onClose={() => setDeleteModal(false)}
        footer={
          <>
            <button className="btn-cancel-modal" onClick={() => setDeleteModal(false)}>Cancel</button>
            <button className="btn-del-ok"        onClick={confirmDelete}>Delete</button>
          </>
        }
      >
        <p className="confirm-msg">
          Are you sure you want to delete <strong>&ldquo;{deleteRecord?.status}&rdquo;</strong>? This action cannot be undone.
        </p>
      </Modal>
    </>
  );
}
