import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { TODAY } from '../data/events';
import { computeClashes, isoDay } from '../lib/eventClashes';
import { IconChevronLeft, IconChevronRight } from '../components/icons';

// Event Calendar (/event-calendar): every event on a month grid, by its booking window
// (load-in date → finish), and the ITEM CLASHES between events booked on the same days
// (lib/eventClashes.js): "shared" = same item booked by ≥ 2 events but total stock is enough,
// "shortage" = combined qty is more than our total stock. Click a day for its events + clashes.
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const COLORS = ['#4f46e5', '#059669', '#d97706', '#7c3aed', '#0891b2', '#db2777', '#65a30d', '#dc2626'];

function colorFor(key) {
  let h = 0;
  for (const c of key) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return COLORS[h % COLORS.length];
}
function fmtShort(iso) {
  const [, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[m - 1].slice(0, 3)}`;
}
function rangeLabel(from, to) {
  return from === to ? fmtShort(from) : `${fmtShort(from)} – ${fmtShort(to)}`;
}

export default function EventCalendarPage() {
  const navigate = useNavigate();
  const [cursor, setCursor] = useState(() => new Date(TODAY.getFullYear(), TODAY.getMonth(), 1));
  const [selected, setSelected] = useState(null);
  const [shortageOnly, setShortageOnly] = useState(false);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = isoDay(new Date(year, month, 1));
  const last = isoDay(new Date(year, month + 1, 0));
  const { byDay, list, events } = useMemo(() => computeClashes(first, last), [first, last]);

  // Grid: Monday-first weeks covering the month.
  const cells = useMemo(() => {
    const start = new Date(year, month, 1);
    const lead = (start.getDay() + 6) % 7;
    const total = Math.ceil((lead + new Date(year, month + 1, 0).getDate()) / 7) * 7;
    return Array.from({ length: total }, (_, i) => {
      const d = new Date(year, month, 1 - lead + i);
      return { iso: isoDay(d), day: d.getDate(), inMonth: d.getMonth() === month };
    });
  }, [year, month]);

  const shownList = shortageOnly ? list.filter(c => c.shortage) : list;
  const clashDays = [...byDay.values()].filter(d => d.clashes.length > 0).length;
  const shortageItems = new Set(list.filter(c => c.shortage).map(c => c.item)).size;
  const clashItems = new Set(list.map(c => c.item)).size;
  const todayIso = isoDay(TODAY);
  const sel = selected && byDay.get(selected);
  const selClashes = sel ? (shortageOnly ? sel.clashes.filter(c => c.shortage) : sel.clashes) : [];

  function move(delta) {
    setCursor(c => new Date(c.getFullYear(), c.getMonth() + delta, 1));
    setSelected(null);
  }
  const openEvent = key => navigate(`/event-detail?name=${encodeURIComponent(key)}`);

  return (
    <>
      <div className="cal-head">
        <h1 className="page-title" style={{ margin: 0 }}>Event Calendar</h1>
        <div className="cal-nav">
          <button type="button" className="cal-nav-btn" onClick={() => move(-1)} aria-label="Previous month"><IconChevronLeft /></button>
          <span className="cal-month">{MONTHS[month]} {year}</span>
          <button type="button" className="cal-nav-btn" onClick={() => move(1)} aria-label="Next month"><IconChevronRight /></button>
          <button type="button" className="btn btn-ghost" onClick={() => { setCursor(new Date(TODAY.getFullYear(), TODAY.getMonth(), 1)); setSelected(todayIso); }}>Today</button>
          <label className="pp-check"><input type="checkbox" checked={shortageOnly} onChange={() => setShortageOnly(s => !s)} /> Shortages only</label>
        </div>
      </div>
      <p className="cal-intro">
        Events are shown over their booking window (load-in date &rarr; finish). An item booked by two or more events on the same
        day is a <span className="cal-chip-key shared">clash</span>; it becomes a <span className="cal-chip-key shortage">shortage</span> when
        their combined quantity is more than our total stock. Outsourced and rented items don&rsquo;t count.
      </p>

      <div className="stats-bar" style={{ gridTemplateColumns: 'repeat(4,minmax(0,1fr))' }}>
        {[
          { label: 'Events this month', value: events.length, color: 'var(--brand)', bg: 'var(--brand-bg)' },
          { label: 'Days with clashes', value: clashDays, color: 'var(--orange)', bg: 'var(--orange-bg)' },
          { label: 'Items clashing', value: clashItems, color: 'var(--purple)', bg: 'var(--purple-bg)' },
          { label: 'Items short', value: shortageItems, color: 'var(--red)', bg: 'var(--red-bg)' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon" style={{ background: s.bg }}><span className="stat-value" style={{ color: s.color }}>{s.value}</span></div>
            <span className="stat-label">{s.label}</span>
          </div>
        ))}
      </div>

      <div className="cal-layout">
        <div className="card cal-card">
          <div className="cal-grid">
            {WEEKDAYS.map(w => <div key={w} className="cal-weekday">{w}</div>)}
            {cells.map(c => {
              const info = byDay.get(c.iso);
              const dayEvents = info?.events || [];
              const clashes = info ? (shortageOnly ? info.clashes.filter(x => x.shortage) : info.clashes) : [];
              const short = clashes.some(x => x.shortage);
              return (
                <button
                  type="button"
                  key={c.iso}
                  className={`cal-cell${c.inMonth ? '' : ' out'}${c.iso === todayIso ? ' today' : ''}${selected === c.iso ? ' selected' : ''}${clashes.length ? (short ? ' has-shortage' : ' has-clash') : ''}`}
                  onClick={() => c.inMonth && setSelected(c.iso)}
                  disabled={!c.inMonth}
                >
                  <span className="cal-day">{c.day}</span>
                  {c.inMonth && dayEvents.slice(0, 3).map(e => (
                    <span key={e.key} className="cal-event" style={{ borderLeftColor: colorFor(e.key), background: `${colorFor(e.key)}14` }} title={`${e.name} (${rangeLabel(e.from, e.to)})`}>
                      {e.name}
                    </span>
                  ))}
                  {c.inMonth && dayEvents.length > 3 && <span className="cal-more">+{dayEvents.length - 3} more</span>}
                  {c.inMonth && clashes.length > 0 && (
                    <span className={`cal-clash ${short ? 'shortage' : 'shared'}`}>⚠ {clashes.length} item{clashes.length === 1 ? '' : 's'}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="card cal-side">
          {!sel ? (
            <div className="cal-side-empty">Click a day to see its events and item clashes.</div>
          ) : (
            <>
              <div className="rep-section-title">{fmtShort(selected)} {year} <span className="rep-muted">{sel.events.length} event{sel.events.length === 1 ? '' : 's'}</span></div>
              {sel.events.length === 0 && <p className="rep-muted" style={{ margin: 0 }}>No events.</p>}
              <ul className="cal-side-events">
                {sel.events.map(e => (
                  <li key={e.key}>
                    <span className="cal-dot" style={{ background: colorFor(e.key) }} />
                    <div>
                      <button type="button" className="link-btn" onClick={() => openEvent(e.key)}>{e.name}</button>
                      <div className="rep-muted">{rangeLabel(e.from, e.to)} · {e.location} · {e.demand.size} items</div>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="rep-section-title" style={{ marginTop: 14 }}>
                Item clashes <span className="rep-muted">{selClashes.length}</span>
              </div>
              {selClashes.length === 0
                ? <p className="rep-muted" style={{ margin: 0 }}>No item is booked by two events on this day.</p>
                : (
                  <div className="cal-clash-list">
                    {selClashes.map(c => (
                      <div key={c.item} className={`cal-clash-row ${c.shortage ? 'shortage' : 'shared'}`}>
                        <div className="cal-clash-item">
                          <strong>{c.item}</strong>
                          <span className={`badge ${c.shortage ? 'badge-red' : 'badge-orange'}`} style={{ fontSize: 10.5 }}>
                            {c.shortage ? `Short ${c.demand - c.stock}` : 'Shared'}
                          </span>
                        </div>
                        <div className="rep-muted">{c.entries.map(x => `${x.name}: ${x.qty}`).join(' · ')}</div>
                        <div className="cal-clash-bar" title={`Needed ${c.demand}, in stock ${c.stock}`}>
                          <div style={{ width: `${Math.min(100, c.stock ? (c.demand / c.stock) * 100 : 100)}%` }} />
                        </div>
                        <div className="rep-muted">Needed {c.demand} · in stock {c.stock}</div>
                      </div>
                    ))}
                  </div>
                )}
            </>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="rep-section-title">
          Clashes in {MONTHS[month]} <span className="rep-muted">{shownList.length} item clash{shownList.length === 1 ? '' : 'es'} · shortages first</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th style={{ width: 130 }}>Dates</th>
                <th>Booked by</th>
                <th style={{ width: 90, textAlign: 'right' }}>Needed</th>
                <th style={{ width: 90, textAlign: 'right' }}>In stock</th>
                <th style={{ width: 110 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {shownList.length === 0
                ? <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 28 }}>No item clashes this month.</td></tr>
                : shownList.map(c => (
                  <tr key={`${c.item}-${c.from}-${c.entries.map(e => e.key).join()}`}>
                    <td className="name-cell">{c.item}</td>
                    <td style={{ whiteSpace: 'nowrap', fontSize: 12.5 }}>{rangeLabel(c.from, c.to)}</td>
                    <td style={{ fontSize: 12.5 }}>
                      {c.entries.map((x, i) => (
                        <span key={x.key}>
                          {i > 0 && ' · '}
                          <button type="button" className="link-btn" style={{ fontSize: 12.5 }} onClick={() => openEvent(x.key)}>{x.name}</button> ({x.qty})
                        </span>
                      ))}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{c.demand}</td>
                    <td style={{ textAlign: 'right' }}>{c.stock}</td>
                    <td>
                      <span className={`badge ${c.shortage ? 'badge-red' : 'badge-orange'}`} style={{ fontSize: 11 }}>
                        {c.shortage ? `Short ${c.demand - c.stock}` : 'Shared, enough stock'}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
