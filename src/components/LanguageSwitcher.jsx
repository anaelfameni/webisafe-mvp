import { useEffect, useState } from 'react';
import { Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES, getLanguage, setLanguage } from '../lib/i18n';

/**
 * Q.3 — Sélecteur de langue (FR / EN) avec persistance localStorage.
 * Utilisé dans le Header (desktop + mobile).
 */
export default function LanguageSwitcher({ compact = false }) {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(getLanguage());

  useEffect(() => {
    const handler = (lng) => setCurrent(lng);
    i18n.on('languageChanged', handler);
    return () => i18n.off('languageChanged', handler);
  }, [i18n]);

  useEffect(() => {
    if (!open) return undefined;
    const handleClick = (event) => {
      if (!event.target.closest('[data-lang-switcher]')) setOpen(false);
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [open]);

  const handleSelect = (lang) => {
    setLanguage(lang);
    setOpen(false);
  };

  return (
    <div className="relative" data-lang-switcher>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 rounded-lg border border-border-color hover:border-primary/40 text-text-secondary hover:text-white transition-all ${
          compact ? 'px-2 py-1.5 text-xs' : 'px-3 py-2 text-xs'
        }`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Sélectionner la langue"
      >
        <Globe size={compact ? 12 : 14} aria-hidden="true" />
        <span className="font-semibold uppercase">{current}</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-32 bg-card-bg border border-border-color rounded-xl shadow-lg overflow-hidden z-50"
        >
          {SUPPORTED_LANGUAGES.map((lang) => (
            <button
              key={lang}
              type="button"
              role="menuitem"
              onClick={() => handleSelect(lang)}
              className={`w-full text-left px-3 py-2 text-xs font-medium transition-colors ${
                current === lang
                  ? 'bg-primary/10 text-primary'
                  : 'text-text-secondary hover:bg-white/5 hover:text-white'
              }`}
            >
              {lang === 'fr' ? '🇫🇷 Français' : '🇬🇧 English'}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
