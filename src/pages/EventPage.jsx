import { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/Modal';
import Pagination from '../components/Pagination';
import SearchableSelect from '../components/SearchableSelect';
import {
  IconSearch, IconPlus, IconPrint, IconEdit, IconDelete,
  IconCart, IconHistory, IconBarChart, IconClose, IconCheck,
} from '../components/icons';
import { initialEvents, TODAY } from '../data/events';
import { getEventClosing, isReadyToClose, isOnGoingByItems } from '../lib/eventClosing';
import { CLOSING_LABELS } from '../lib/eventClosingLabels';
import { getEventStageNames } from '../lib/eventStatuses';
import { saveEventProgress } from '../lib/eventProgress';

const PAGE_SIZE = 8;
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function fmtRange(start, finish) {
  if (!start || start === '-') return '—';
  const [sy, sm, sd] = start.split('-');
  const s = `${parseInt(sd)} ${MONTHS_SHORT[parseInt(sm)-1]} ${sy}`;
  if (!finish || finish === start || finish === '-') return s;
  const [fy, fm, fd] = finish.split('-');
  if (sy === fy && sm === fm) return `${parseInt(sd)}–${parseInt(fd)} ${MONTHS_SHORT[parseInt(sm)-1]} ${sy}`;
  return `${parseInt(sd)} ${MONTHS_SHORT[parseInt(sm)-1]} – ${parseInt(fd)} ${MONTHS_SHORT[parseInt(fm)-1]} ${fy}`;
}

function fmtDateShort(d) {
  if (!d || d === '-') return '—';
  const [y, m, day] = d.split('-');
  return `${parseInt(day)} ${MONTHS_SHORT[parseInt(m)-1]} ${y}`;
}

function fmtUpdatedLabel(updatedAt) {
  if (!updatedAt || updatedAt === '-') return 'Updated: -';
  if (updatedAt.includes(',')) return `Updated: ${updatedAt}`;
  return `Updated: ${fmtDateShort(updatedAt)}`;
}

function daysUntil(start) {
  if (!start) return null;
  return Math.ceil((new Date(start) - TODAY) / 86400000);
}

// Matches the "<date> | <NAME>" key EventDetailPage.jsx reads its ?name= from,
// so closing status set there is found here without a real backend join.
function closingKeyFor(e) {
  return `${e.date} | ${(e.name || '').toUpperCase()}`;
}
function closingOf(e) {
  return getEventClosing(closingKeyFor(e));
}
function readyToCloseOf(e) {
  return isReadyToClose(closingKeyFor(e));
}
function onGoingByItemsOf(e) {
  return isOnGoingByItems(closingKeyFor(e), e.itemCount);
}
// Distinguishes a Returned & Completed event from a plain seed `type: 'past'`
// event (folded into the same tab), which has no closing badge of its own.
function returnedExtraBadge(e) {
  if (closingOf(e) !== 'returned-completed') return null;
  return (
    <span className={`badge ${CLOSING_LABELS['returned-completed'].badgeClass}`} style={{ fontSize:10.5, flexShrink:0 }}>
      {CLOSING_LABELS['returned-completed'].label}
    </span>
  );
}
function applySearch(data, q) {
  if (!q) return data;
  const query = q.toLowerCase();
  return data.filter(e =>
    e.name.toLowerCase().includes(query) || e.code.toLowerCase().includes(query) ||
    e.location.toLowerCase().includes(query) || e.desc.toLowerCase().includes(query)
  );
}

function IconPin() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  );
}

function IconCal() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  );
}

function CountdownChip({ days }) {
  if (days === null) return null;
  const isUrgent   = days <= 7;
  const isModerate = days <= 30;
  const color = isUrgent ? 'var(--red)' : isModerate ? 'var(--orange)' : 'var(--green)';
  const bg    = isUrgent ? 'var(--red-bg)' : isModerate ? 'var(--orange-bg)' : 'var(--green-bg)';
  const label = days === 0 ? 'Today!' : days === 1 ? 'Tomorrow' : `${days}d away`;
  return (
    <span style={{ fontSize:11, fontWeight:700, color, background:bg, padding:'2px 8px', borderRadius:20, whiteSpace:'nowrap' }}>
      {label}
    </span>
  );
}

function EventCard({ r, onEdit, onDelete, navigate, readyToClose, onGoingByItems }) {
  const days = daysUntil(r.start);
  const accent = days !== null && days <= 7 ? 'var(--red)'
               : days !== null && days <= 30 ? 'var(--orange)'
               : 'var(--brand)';
  const itemCount = Number.isFinite(r.itemCount) ? r.itemCount : 0;

  return (
    <div style={{
      background: '#fff', border: '1px solid var(--border)', borderRadius: 10,
      borderTop: `3px solid ${accent}`, display: 'flex', flexDirection: 'column',
      transition: 'box-shadow .15s, transform .15s',
    }}
    onMouseEnter={e => { e.currentTarget.style.boxShadow='0 6px 20px rgba(0,0,0,.08)'; e.currentTarget.style.transform='translateY(-1px)'; }}
    onMouseLeave={e => { e.currentTarget.style.boxShadow='none'; e.currentTarget.style.transform='none'; }}
    >
      <div style={{ padding: '16px 18px 14px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 10, gap: 6 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <span className="badge badge-gray" style={{ fontSize:10.5 }}>{r.code}</span>
            {readyToClose ? (
              <span className={`badge ${CLOSING_LABELS['ready-to-close'].badgeClass}`} style={{ fontSize:10.5 }}>
                {CLOSING_LABELS['ready-to-close'].label}
              </span>
            ) : (
              <span className={`badge ${CLOSING_LABELS[onGoingByItems ? 'on-going' : 'upcoming'].badgeClass}`} style={{ fontSize:10.5 }}>
                {CLOSING_LABELS[onGoingByItems ? 'on-going' : 'upcoming'].label}
              </span>
            )}
          </div>
          <CountdownChip days={days} />
        </div>

        <div style={{ fontWeight:700, fontSize:14, color:'var(--text)', lineHeight:1.3, marginBottom:5 }}>
          {r.name}
        </div>
        <div style={{
          fontSize:12, color:'var(--text-muted)', marginBottom:14,
          display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden',
          minHeight: 32,
        }}>
          {r.desc || '—'}
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
          <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, color:'var(--text-muted)' }}>
            <IconCal />
            <span>{fmtRange(r.start, r.finish)}</span>
          </div>
          {r.location && r.location !== '-' && (
            <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, color:'var(--text-muted)' }}>
              <IconPin />
              <span>{r.location}</span>
            </div>
          )}
          <div style={{ fontSize:11.5, color:'var(--text-muted)', marginTop:2 }}>
            {fmtUpdatedLabel(r.updatedAt)}
          </div>
        </div>
      </div>

      <div style={{ marginTop:'auto', borderTop:'1px solid var(--border)', padding:'10px 14px', display:'flex', alignItems:'center', background:'#fafbfc', borderRadius:'0 0 10px 10px', gap:2 }}>
        <div style={{ display:'inline-flex', alignItems:'center', gap:4, marginRight:2 }}>
          <button className="btn-icon cart" title="Detail / Cart"
            onClick={() => navigate(`/event-detail?name=${encodeURIComponent(r.date + ' | ' + r.name.toUpperCase())}`)}>
            <IconCart />
          </button>
          <span className="badge badge-gray" style={{ fontSize:10.5, padding:'2px 7px' }} title="Item count">
            {itemCount}
          </span>
        </div>
        <button className="btn-icon" title="Summary" style={{ color:'var(--purple)' }}
          onClick={() => navigate(`/event-summary?name=${encodeURIComponent(r.name.toUpperCase())}`)}>
          <IconBarChart />
        </button>
        <div style={{ flex:1 }} />
        <button className="btn-icon edit"    title="Edit"    onClick={() => onEdit(r.id)}><IconEdit /></button>
        <button className="btn-icon delete"  title="Delete"  onClick={() => onDelete(r.id)}><IconDelete /></button>
        <button className="btn-icon history" title="History"><IconHistory /></button>
      </div>
    </div>
  );
}

function PastEventRow({ r, onEdit, onDelete, navigate, extraBadge }) {
  const day   = r.date && r.date !== '-' ? parseInt(r.date.split('-')[2]) : '—';
  const month = r.date && r.date !== '-' ? MONTHS_SHORT[parseInt(r.date.split('-')[1]) - 1] : '';

  return (
    <div style={{
      background:'#fff', border:'1px solid var(--border)', borderRadius:8,
      padding:'12px 16px', display:'flex', alignItems:'center', gap:14,
      transition:'box-shadow .12s',
    }}
    onMouseEnter={e => e.currentTarget.style.boxShadow='0 2px 10px rgba(0,0,0,.07)'}
    onMouseLeave={e => e.currentTarget.style.boxShadow='none'}
    >
      <div style={{
        minWidth:48, textAlign:'center', padding:'6px 4px', background:'var(--bg)',
        borderRadius:8, flexShrink:0,
      }}>
        <div style={{ fontSize:19, fontWeight:700, color:'var(--text)', lineHeight:1 }}>{day}</div>
        <div style={{ fontSize:10.5, color:'var(--text-muted)', marginTop:2, fontWeight:600 }}>{month}</div>
      </div>

      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:3, flexWrap:'wrap' }}>
          <span style={{ fontWeight:600, fontSize:13.5, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {r.name}
          </span>
          <span className="badge badge-gray" style={{ fontSize:10.5, flexShrink:0 }}>{r.code}</span>
          {extraBadge}
        </div>
        <div style={{ display:'flex', gap:14, fontSize:12, color:'var(--text-muted)', flexWrap:'wrap' }}>
          {r.desc && (
            <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:220 }}>
              {r.desc}
            </span>
          )}
          <span style={{ display:'flex', alignItems:'center', gap:4, flexShrink:0 }}>
            <IconCal />{fmtRange(r.start, r.finish)}
          </span>
          {r.location && r.location !== '-' && (
            <span style={{ display:'flex', alignItems:'center', gap:4, flexShrink:0 }}>
              <IconPin />{r.location}
            </span>
          )}
        </div>
      </div>

      <div style={{ display:'flex', gap:3, flexShrink:0 }}>
        <button className="btn-icon cart" title="Detail / Cart"
          onClick={() => navigate(`/event-detail?name=${encodeURIComponent(r.date + ' | ' + r.name.toUpperCase())}`)}>
          <IconCart />
        </button>
        <button className="btn-icon" title="Summary" style={{ color:'var(--purple)' }}
          onClick={() => navigate(`/event-summary?name=${encodeURIComponent(r.name.toUpperCase())}`)}>
          <IconBarChart />
        </button>
        <button className="btn-icon edit"    title="Edit"    onClick={() => onEdit(r.id)}><IconEdit /></button>
        <button className="btn-icon delete"  title="Delete"  onClick={() => onDelete(r.id)}><IconDelete /></button>
        <button className="btn-icon history" title="History"><IconHistory /></button>
      </div>
    </div>
  );
}

export default function EventPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('upcoming');
  const [events, setEvents] = useState(() => initialEvents.map(e => ({
    ...e,
    itemCount: Number.isFinite(e.itemCount) ? e.itemCount : 0,
    updatedAt: e.updatedAt || e.date || e.start || '-',
  })));
  const [nextId, setNextId] = useState(90);

  // One shared search query + page, reset whenever the active tab changes —
  // simpler than a separate pair per tab now that there are 6 of them.
  const [tabQuery, setTabQuery] = useState('');
  const [tabPage,  setTabPage]  = useState(1);

  const [modalOpen,  setModalOpen]  = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingId,  setEditingId]  = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [form, setForm] = useState({ name:'', code:'', desc:'', start:'', finish:'', date:'', location:'', pic:'', status:'', address:'', qrType:'', note:'', image:'' });
  const imgInputRef = useRef(null);

  function selectTab(id) {
    setActiveTab(id);
    setTabQuery('');
    setTabPage(1);
  }

  // Raw buckets — one per status the event's own flag can show, mirroring the
  // status flag 1:1 (Upcoming / On Going / Ready to Close / Checking Inventory /
  // Returned & Completed / Transferred) so the tab bar matches it exactly. Not
  // query-filtered, since tab badge counts should stay stable while typing in
  // the search box — only the rendered list below is.
  const rawUpcoming = useMemo(() =>
    events.filter(e => e.type === 'upcoming' && closingOf(e) === 'on-going' && !readyToCloseOf(e) && !onGoingByItemsOf(e)),
  [events]);
  const rawOnGoing = useMemo(() =>
    events.filter(e => e.type === 'upcoming' && closingOf(e) === 'on-going' && !readyToCloseOf(e) && onGoingByItemsOf(e)),
  [events]);
  const rawReadyToClose = useMemo(() =>
    events.filter(e => e.type === 'upcoming' && readyToCloseOf(e)),
  [events]);
  const rawChecking = useMemo(() =>
    events.filter(e => closingOf(e) === 'checking-inventory'),
  [events]);
  // Legacy seed `type: 'past'` events (which predate the status flag entirely)
  // are folded into Returned & Completed — the closest equivalent, since both
  // mean "this event is done."
  const rawReturned = useMemo(() =>
    events.filter(e => e.type === 'past' || closingOf(e) === 'returned-completed'),
  [events]);
  const rawTransferred = useMemo(() =>
    events.filter(e => closingOf(e) === 'transferred'),
  [events]);

  const upcomingEvents = useMemo(() =>
    applySearch(rawUpcoming, tabQuery).sort((a, b) => (a.start || '').localeCompare(b.start || '')),
  [rawUpcoming, tabQuery]);
  const onGoingEvents = useMemo(() =>
    applySearch(rawOnGoing, tabQuery).sort((a, b) => (a.start || '').localeCompare(b.start || '')),
  [rawOnGoing, tabQuery]);
  const readyToCloseEvents = useMemo(() =>
    applySearch(rawReadyToClose, tabQuery).sort((a, b) => (a.start || '').localeCompare(b.start || '')),
  [rawReadyToClose, tabQuery]);
  const checkingEvents = useMemo(() =>
    applySearch(rawChecking, tabQuery).sort((a, b) => (b.start || '').localeCompare(a.start || '')),
  [rawChecking, tabQuery]);
  const returnedEvents = useMemo(() =>
    applySearch(rawReturned, tabQuery).sort((a, b) => (b.start || '').localeCompare(a.start || '')),
  [rawReturned, tabQuery]);
  const transferredEvents = useMemo(() =>
    applySearch(rawTransferred, tabQuery).sort((a, b) => (b.start || '').localeCompare(a.start || '')),
  [rawTransferred, tabQuery]);

  const groupedReturned = useMemo(() => {
    if (tabQuery) return null;
    const map = {};
    returnedEvents.forEach(e => {
      const [y, m] = (e.start || '').split('-');
      const key = `${y}-${m}`;
      if (!map[key]) map[key] = { label: `${MONTHS[parseInt(m)-1]} ${y}`, items: [] };
      map[key].items.push(e);
    });
    return Object.values(map);
  }, [returnedEvents, tabQuery]);

  const returnedFlat = useMemo(() =>
    returnedEvents.slice((tabPage-1)*PAGE_SIZE, tabPage*PAGE_SIZE),
  [returnedEvents, tabPage]);

  function setF(field) { return e => setForm(f => ({ ...f, [field]: e.target.value })); }

  function openNew() {
    setEditingId(null);
    const today = new Date().toISOString().slice(0, 10);
    setForm({ name:'', code:'', desc:'', start:today, finish:'', date:'', location:'', pic:'', status:'', address:'', qrType:'', note:'', image:'' });
    setModalOpen(true);
  }
  function openEdit(id) {
    const r = events.find(e => e.id === id);
    if (!r) return;
    setEditingId(id);
    setForm({ name:r.name, code:r.code, desc:r.desc, start:r.start, finish:r.finish, date:r.date, location:r.location, pic:r.pic||'', status:r.status||'', address:r.address||'', qrType:r.qrType||'', note:r.note||'', image:r.image||'' });
    setModalOpen(true);
  }
  function saveEvent() {
    if (!form.name.trim()) return;
    const updatedAt = todayIsoDate();
    if (editingId) {
      setEvents(es => es.map(e => e.id === editingId ? { ...e, ...form, updatedAt } : e));
    } else {
      const type = form.start && new Date(form.start) < TODAY ? 'past' : 'upcoming';
      // The Status field is hidden — a new event always starts at the first
      // Event Status stage, written to the same store Event Detail's stepper reads.
      const firstStage = getEventStageNames()[0];
      if (firstStage) saveEventProgress(closingKeyFor(form), firstStage);
      setEvents(es => [{ id:nextId, ...form, type, itemCount:0, updatedAt }, ...es]);
      setNextId(n => n+1);
    }
    setModalOpen(false);
  }
  function openDelete(id) { setDeletingId(id); setDeleteOpen(true); }
  function confirmDelete() { setEvents(es => es.filter(e => e.id !== deletingId)); setDeleteOpen(false); }

  const delTarget = events.find(e => e.id === deletingId);
  const totalActive    = rawUpcoming.length + rawOnGoing.length + rawReadyToClose.length;
  const totalCompleted = rawReturned.length + rawTransferred.length;

  const TABS = [
    { id:'upcoming',       label:CLOSING_LABELS['upcoming'].label,           count:rawUpcoming.length },
    { id:'on-going',       label:CLOSING_LABELS['on-going'].label,           count:rawOnGoing.length },
    { id:'ready-to-close', label:CLOSING_LABELS['ready-to-close'].label,     count:rawReadyToClose.length },
    { id:'checking',       label:CLOSING_LABELS['checking-inventory'].label, count:rawChecking.length },
    { id:'returned',       label:CLOSING_LABELS['returned-completed'].label, count:rawReturned.length },
    { id:'transferred',    label:CLOSING_LABELS['transferred'].label,        count:rawTransferred.length },
    { id:'invite',         label:'Invite User',                              count:null },
  ];

  const statusBadge = key => (
    <span className={`badge ${CLOSING_LABELS[key].badgeClass}`} style={{ fontSize:10.5, flexShrink:0 }}>
      {CLOSING_LABELS[key].label}
    </span>
  );

  const searchBar = placeholder => (
    <div style={{ display:'flex', gap:8, marginBottom:18, alignItems:'center' }}>
      <div className="search-wrap" style={{ flex:1, maxWidth:320 }}>
        <IconSearch />
        <input className="search-input" type="text" placeholder={placeholder}
          value={tabQuery} onChange={e => { setTabQuery(e.target.value); setTabPage(1); }} />
      </div>
      <button className="btn-print" onClick={() => window.print()}><IconPrint /> Print</button>
    </div>
  );

  const hint = text => (
    <p style={{ fontSize:12.5, color:'var(--text-muted)', marginTop:-10, marginBottom:16 }}>{text}</p>
  );

  const emptyState = text => (
    <div className="card" style={{ padding:'56px 32px', textAlign:'center' }}>
      <p style={{ fontSize:14, color:'var(--text-muted)' }}>
        {tabQuery ? 'No events match your search.' : text}
      </p>
    </div>
  );

  const cardGrid = (list, emptyText) => list.length === 0 ? emptyState(emptyText) : (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(270px,1fr))', gap:14 }}>
      {list.map(r => (
        <EventCard key={r.id} r={r} onEdit={openEdit} onDelete={openDelete} navigate={navigate} readyToClose={readyToCloseOf(r)} onGoingByItems={onGoingByItemsOf(r)} />
      ))}
    </div>
  );

  const rowList = (list, emptyText, badgeKey) => list.length === 0 ? emptyState(emptyText) : (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      {list.map(r => (
        <PastEventRow key={r.id} r={r} onEdit={openEdit} onDelete={openDelete} navigate={navigate} extraBadge={statusBadge(badgeKey)} />
      ))}
    </div>
  );

  return (
    <>
      {/* Page header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:22 }}>
        <h1 className="page-title" style={{ margin:0 }}>Event</h1>
        <button className="btn-new" onClick={openNew}><IconPlus /> New Event</button>
      </div>

      {/* Stats row */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:22 }}>
        {[
          { label:'Total Events',       value:events.length,      color:'var(--brand)',      bg:'var(--brand-bg)' },
          { label:'Active',             value:totalActive,        color:'var(--green)',      bg:'var(--green-bg)' },
          { label:'Checking Inventory', value:rawChecking.length, color:'var(--orange)',     bg:'var(--orange-bg)' },
          { label:'Completed',          value:totalCompleted,     color:'var(--text-muted)', bg:'var(--bg)' },
        ].map(s => (
          <div key={s.label} style={{
            background:'#fff', border:'1px solid var(--border)', borderRadius:10,
            padding:'14px 18px', display:'flex', alignItems:'center', gap:14,
          }}>
            <div style={{
              width:44, height:44, borderRadius:10, background:s.bg,
              display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
            }}>
              <span style={{ fontSize:20, fontWeight:700, color:s.color, lineHeight:1 }}>{s.value}</span>
            </div>
            <span style={{ fontSize:13, color:'var(--text-muted)', fontWeight:500 }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Tab bar — one tab per event status flag value */}
      <div style={{ display:'flex', borderBottom:'2px solid var(--border)', marginBottom:20, gap:0, overflowX:'auto' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => selectTab(t.id)} style={{
            border:'none', background:'none', cursor:'pointer', padding:'10px 16px',
            fontSize:13.5, fontWeight:600, display:'flex', alignItems:'center', gap:7, whiteSpace:'nowrap',
            color: activeTab===t.id ? 'var(--brand)' : 'var(--text-muted)',
            borderBottom: activeTab===t.id ? '2px solid var(--brand)' : '2px solid transparent',
            marginBottom:-2, transition:'color .15s',
          }}>
            {t.label}
            {t.count !== null && (
              <span style={{
                fontSize:11, fontWeight:700, padding:'1px 7px', borderRadius:20,
                background: activeTab===t.id ? 'var(--brand-bg)' : '#f1f5f9',
                color: activeTab===t.id ? 'var(--brand)' : '#64748b',
              }}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'upcoming' && (
        <div>
          {searchBar('Search upcoming events…')}
          {hint('Events with no items added yet. Adding items on Event Detail moves an event to On Going.')}
          {cardGrid(upcomingEvents, 'No upcoming events.')}
        </div>
      )}

      {activeTab === 'on-going' && (
        <div>
          {searchBar('Search on-going events…')}
          {hint('Events that already have items, at any Event Status stage before the last one.')}
          {cardGrid(onGoingEvents, 'No on-going events.')}
        </div>
      )}

      {activeTab === 'ready-to-close' && (
        <div>
          {searchBar('Search events ready to close…')}
          {hint('Events at their last Event Status stage. Open one and press “Close & Start Checking” to begin checking inventory.')}
          {cardGrid(readyToCloseEvents, 'No events are ready to close.')}
        </div>
      )}

      {activeTab === 'checking' && (
        <div>
          {searchBar('Search events in checking…')}
          {hint('Closed events whose items are being cross-checked, then returned or transferred item by item.')}
          {rowList(checkingEvents, 'No events currently in Checking Inventory.', 'checking-inventory')}
        </div>
      )}

      {activeTab === 'returned' && (
        <div>
          {searchBar('Search completed events…')}
          {rawReturned.length === 0 || returnedEvents.length === 0 ? emptyState('No returned & completed events.') : tabQuery ? (
            <>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {returnedFlat.map(r => (
                  <PastEventRow key={r.id} r={r} onEdit={openEdit} onDelete={openDelete} navigate={navigate} extraBadge={returnedExtraBadge(r)} />
                ))}
              </div>
              <Pagination currentPage={tabPage} total={returnedEvents.length} pageSize={PAGE_SIZE} onPage={setTabPage} label="events" />
            </>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
              {groupedReturned.map(group => (
                <div key={group.label}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                    <span style={{ fontSize:11.5, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.07em' }}>
                      {group.label}
                    </span>
                    <span style={{ fontSize:11, padding:'1px 7px', borderRadius:20, background:'#f1f5f9', color:'#64748b', fontWeight:600 }}>
                      {group.items.length}
                    </span>
                    <div style={{ flex:1, height:1, background:'var(--border)' }} />
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {group.items.map(r => (
                      <PastEventRow key={r.id} r={r} onEdit={openEdit} onDelete={openDelete} navigate={navigate} extraBadge={returnedExtraBadge(r)} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'transferred' && (
        <div>
          {searchBar('Search transferred events…')}
          {hint('Closed events where every item was moved to another event instead of returned.')}
          {rowList(transferredEvents, 'No transferred events.', 'transferred')}
        </div>
      )}

      {/* ── INVITE ── */}
      {activeTab === 'invite' && (
        <div className="card" style={{ padding:'56px 32px', textAlign:'center' }}>
          <p style={{ fontSize:14, fontWeight:600, color:'var(--text)', marginBottom:6 }}>Invite User</p>
          <p style={{ fontSize:13, color:'var(--text-muted)' }}>This feature is coming soon.</p>
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal
        open={modalOpen}
        title={editingId ? 'Edit Event' : 'New Event'}
        onClose={() => setModalOpen(false)}
        size="xl"
        footer={
          <>
            <button className="btn-cancel-modal" onClick={() => setModalOpen(false)}><IconClose /> Cancel</button>
            <button className="btn-save-modal"   onClick={saveEvent}><IconCheck /> Save Event</button>
          </>
        }
      >
        {/* GENERAL */}
        <div className="form-row">
          <div className="form-group">
            <label>Event Name <span style={{ color:'var(--red)' }}>*</span></label>
            <input type="text" placeholder="Enter event name" value={form.name} onChange={setF('name')} />
          </div>
          <div className="form-group" style={{ maxWidth:120 }}>
            <label>Code</label>
            <input type="text" placeholder="e.g. WB" value={form.code} onChange={setF('code')} />
          </div>
        </div>
        <div className="form-group">
          <label>Description</label>
          <textarea placeholder="Short event description" value={form.desc} onChange={setF('desc')} rows={2} />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Start Date</label>
            <input type="date" value={form.start} onChange={setF('start')} />
          </div>
          <div className="form-group">
            <label>Finish Date</label>
            <input type="date" value={form.finish} onChange={setF('finish')} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Event Date</label>
            <input type="date" value={form.date} onChange={setF('date')} />
          </div>
          <div className="form-group">
            <label>Location</label>
            <input type="text" placeholder="City or venue" value={form.location} onChange={setF('location')} />
          </div>
        </div>

        {/* DETAILS */}
        <div style={{ display:'flex', alignItems:'center', gap:8, margin:'20px 0 16px' }}>
          <span style={{ width:8, height:8, borderRadius:'50%', background:'var(--green)', flexShrink:0 }} />
          <span style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:'.07em', textTransform:'uppercase' }}>Details</span>
          <div style={{ flex:1, height:1, background:'var(--border)' }} />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>PIC</label>
            <input type="text" placeholder="Person in charge" value={form.pic} onChange={setF('pic')} />
          </div>
          <div className="form-group">
            <label>QR Type</label>
            <SearchableSelect
              value={form.qrType}
              onChange={v => setForm(f => ({ ...f, qrType: v }))}
              options={[
                { value: '', label: 'Select QR Type' },
                { value: 'scan_in', label: 'Scan In' },
                { value: 'scan_out', label: 'Scan Out' },
                { value: 'scan_both', label: 'Scan In & Out' },
                { value: 'none', label: 'No Scan' },
              ]}
              placeholder="Select QR Type"
            />
          </div>
        </div>
        <div className="form-group">
          <label>Address</label>
          <input type="text" placeholder="Event location / address" value={form.address} onChange={setF('address')} />
        </div>

        {/* ADDITIONAL */}
        <div style={{ display:'flex', alignItems:'center', gap:8, margin:'20px 0 16px' }}>
          <span style={{ width:8, height:8, borderRadius:'50%', background:'var(--red)', flexShrink:0 }} />
          <span style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:'.07em', textTransform:'uppercase' }}>Additional</span>
          <div style={{ flex:1, height:1, background:'var(--border)' }} />
        </div>
        <div className="form-row" style={{ alignItems:'flex-start' }}>
          <div className="form-group">
            <label>Note</label>
            <textarea placeholder="Any additional notes…" value={form.note} onChange={setF('note')} rows={4} />
          </div>
          <div className="form-group">
            <label>Image</label>
            <input ref={imgInputRef} type="file" accept="image/png,image/jpeg,image/gif" style={{ display:'none' }}
              onChange={e => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = ev => setForm(f => ({ ...f, image: ev.target.result }));
                reader.readAsDataURL(file);
              }}
            />
            <div
              onClick={() => imgInputRef.current?.click()}
              style={{
                border:'2px dashed var(--border)', borderRadius:10, padding:'20px 16px',
                display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                cursor:'pointer', background:'var(--bg)', gap:8, minHeight:130,
                transition:'border-color .15s',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor='var(--brand)'}
              onMouseLeave={e => e.currentTarget.style.borderColor='var(--border)'}
            >
              {form.image
                ? <img src={form.image} alt="preview" style={{ maxWidth:'100%', maxHeight:120, borderRadius:6, objectFit:'contain' }} />
                : <>
                    <div style={{ width:44, height:44, background:'var(--brand-bg)', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width:22, height:22 }}>
                        <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
                        <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
                      </svg>
                    </div>
                    <span style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>Click to upload image</span>
                    <span style={{ fontSize:11.5, color:'var(--text-muted)' }}>PNG, JPG, GIF up to 10MB</span>
                  </>
              }
            </div>
            {form.image && (
              <button
                onClick={() => setForm(f => ({ ...f, image: '' }))}
                style={{ marginTop:6, fontSize:12, color:'var(--red)', background:'none', border:'none', cursor:'pointer', padding:0 }}
              >Remove image</button>
            )}
          </div>
        </div>
      </Modal>

      {/* Delete confirm modal */}
      <Modal
        open={deleteOpen}
        title="Delete Event"
        onClose={() => setDeleteOpen(false)}
        footer={
          <>
            <button className="btn-cancel-modal" onClick={() => setDeleteOpen(false)}>Cancel</button>
            <button className="btn-del-ok"        onClick={confirmDelete}>Delete</button>
          </>
        }
      >
        <p className="confirm-msg">Are you sure you want to delete &ldquo;{delTarget?.name}&rdquo;?</p>
      </Modal>
    </>
  );
}
