import { useState, useRef, useEffect } from 'react';
import { IconGlobe } from './icons';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'id', label: 'Bahasa Indonesia' },
];

export default function LanguageSwitcher() {
  const [open, setOpen] = useState(false);
  const [language, setLanguage] = useState('en');
  const current = LANGUAGES.find(l => l.code === language) || LANGUAGES[0];
  const wrapRef = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="lang-switcher" ref={wrapRef}>
      <button
        type="button"
        className="header-btn lang-switcher-trigger"
        onClick={() => setOpen(o => !o)}
        title="Language"
      >
        <IconGlobe />
        <span className="lang-switcher-code">{current.code.toUpperCase()}</span>
      </button>
      {open && (
        <div className="lang-switcher-menu">
          {LANGUAGES.map(l => (
            <div
              key={l.code}
              className={`lang-switcher-item${l.code === language ? ' selected' : ''}`}
              onClick={() => { setLanguage(l.code); setOpen(false); }}
            >
              {l.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
