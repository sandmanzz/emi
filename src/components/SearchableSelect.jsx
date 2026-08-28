import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { IconSearch, IconChevronDown } from './icons';

export default function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  emptyText = 'No results found',
  disabled = false,
  inline = false,
  style,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [pos, setPos] = useState(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  const selected = options.find(o => String(o.value) === String(value ?? ''));

  useEffect(() => {
    if (!open) return;
    function updatePos() {
      const r = triggerRef.current.getBoundingClientRect();
      const maxHeight = Math.min(320, window.innerHeight - r.bottom - 12);
      const openUp = maxHeight < 160 && r.top > window.innerHeight - r.bottom;
      const menuWidth = inline ? Math.max(r.width, 240) : r.width;
      const left = inline
        ? Math.min(r.left, Math.max(12, window.innerWidth - menuWidth - 12))
        : r.left;
      setPos({
        left,
        width: inline ? undefined : r.width,
        minWidth: inline ? menuWidth : undefined,
        ...(openUp
          ? { bottom: window.innerHeight - r.top + 4, maxHeight: Math.min(320, r.top - 12) }
          : { top: r.bottom + 4, maxHeight: Math.max(120, maxHeight) }),
      });
    }
    updatePos();
    window.addEventListener('scroll', updatePos, true);
    window.addEventListener('resize', updatePos);
    return () => {
      window.removeEventListener('scroll', updatePos, true);
      window.removeEventListener('resize', updatePos);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onDocMouseDown(e) {
      if (triggerRef.current?.contains(e.target)) return;
      if (menuRef.current?.contains(e.target)) return;
      setOpen(false);
    }
    function onKeyDown(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  const filtered = query.trim()
    ? options.filter(o => o.label.toLowerCase().includes(query.trim().toLowerCase()))
    : options;

  function pick(opt) {
    if (opt.disabled) return;
    onChange(opt.value);
    setOpen(false);
  }

  return (
    <div className={`ss-wrap${inline ? ' ss-inline' : ''}`} style={style}>
      <button
        type="button"
        ref={triggerRef}
        disabled={disabled}
        className={`ss-trigger${open ? ' open' : ''}${!selected ? ' placeholder' : ''}`}
        onClick={() => !disabled && setOpen(o => !o)}
      >
        <span className="ss-trigger-label">{selected ? selected.label : placeholder}</span>
        <IconChevronDown />
      </button>
      {open && createPortal(
        <div
          ref={menuRef}
          className="ss-menu"
          style={{ left: pos?.left, width: pos?.width, minWidth: pos?.minWidth, top: pos?.top, bottom: pos?.bottom }}
        >
          <div className="ss-search">
            <IconSearch />
            <input
              autoFocus type="text" placeholder={searchPlaceholder}
              value={query} onChange={e => setQuery(e.target.value)}
            />
          </div>
          <div className="ss-list" style={{ maxHeight: pos?.maxHeight }}>
            {filtered.length === 0
              ? <div className="ss-empty">{emptyText}</div>
              : filtered.map(o => (
                <div
                  key={o.value}
                  className={`ss-item${String(o.value) === String(value ?? '') ? ' selected' : ''}${o.disabled ? ' disabled' : ''}`}
                  onClick={() => pick(o)}
                >
                  <span className="ss-item-label">{o.label}</span>
                  {o.meta && <span className="ss-item-meta">{o.meta}</span>}
                </div>
              ))
            }
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
