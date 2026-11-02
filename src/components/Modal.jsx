import { useEffect, useRef } from 'react';
import { IconClose } from './icons';

const sizeStyles = {
  md: undefined,
  lg: { width: 680 },
  xl: { width: 760 },
  '2xl': { width: 880 },
  '3xl': { width: 1080 },
  '4xl': { width: 1320 },
};

export default function Modal({
  open,
  title,
  onClose,
  footer,
  children,
  size,
  className = '',
  bodyClassName = '',
  footerClassName = '',
}) {
  const overlayRef = useRef(null);
  useEffect(() => {
    if (!open) return;
    // Escape closes only the top-most modal (a form can open another form on top of it),
    // and never while a SearchableSelect dropdown is open.
    const handler = (e) => {
      if (e.key !== 'Escape') return;
      if (document.querySelector('.ss-menu')) return; // Escape closes an open dropdown first
      const overlays = document.querySelectorAll('.modal-overlay.open');
      if (overlays[overlays.length - 1] === overlayRef.current) onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="modal-overlay open"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={`modal ${className}`.trim()} style={sizeStyles[size] || sizeStyles.md}>
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button className="modal-close" onClick={onClose}><IconClose /></button>
        </div>
        <div className={`modal-body ${bodyClassName}`.trim()}>{children}</div>
        {footer && <div className={`modal-footer ${footerClassName}`.trim()}>{footer}</div>}
      </div>
    </div>
  );
}
