import { useEffect } from 'react';
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
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
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
