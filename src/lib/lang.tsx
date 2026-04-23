'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  nl, en, de, sv, da, no, fr, it, es, pt, ro, ca,
  ru, uk, pl, cs, sk, hr, ja, ko, zh, th, vi, id,
  ms, hi, ar, he, el, hu, fi, tr,
} from './translations/index';
export type { Translation } from './translations/types';

export type Lang =
  | 'nl' | 'en' | 'de' | 'sv' | 'da' | 'no'
  | 'fr' | 'it' | 'es' | 'pt' | 'ro' | 'ca'
  | 'ru' | 'uk' | 'pl' | 'cs' | 'sk' | 'hr'
  | 'ja' | 'ko' | 'zh' | 'th' | 'vi' | 'id'
  | 'ms' | 'hi' | 'ar' | 'he' | 'el' | 'hu' | 'fi' | 'tr';

export const LANGUAGES: { code: Lang; label: string; nativeLabel: string }[] = [
  { code: 'nl', label: 'Dutch',       nativeLabel: 'Nederlands' },
  { code: 'en', label: 'English',     nativeLabel: 'English' },
  { code: 'de', label: 'German',      nativeLabel: 'Deutsch' },
  { code: 'sv', label: 'Swedish',     nativeLabel: 'Svenska' },
  { code: 'da', label: 'Danish',      nativeLabel: 'Dansk' },
  { code: 'no', label: 'Norwegian',   nativeLabel: 'Norsk' },
  { code: 'fr', label: 'French',      nativeLabel: 'Français' },
  { code: 'it', label: 'Italian',     nativeLabel: 'Italiano' },
  { code: 'es', label: 'Spanish',     nativeLabel: 'Español' },
  { code: 'pt', label: 'Portuguese',  nativeLabel: 'Português' },
  { code: 'ro', label: 'Romanian',    nativeLabel: 'Română' },
  { code: 'ca', label: 'Catalan',     nativeLabel: 'Català' },
  { code: 'ru', label: 'Russian',     nativeLabel: 'Русский' },
  { code: 'uk', label: 'Ukrainian',   nativeLabel: 'Українська' },
  { code: 'pl', label: 'Polish',      nativeLabel: 'Polski' },
  { code: 'cs', label: 'Czech',       nativeLabel: 'Čeština' },
  { code: 'sk', label: 'Slovak',      nativeLabel: 'Slovenčina' },
  { code: 'hr', label: 'Croatian',    nativeLabel: 'Hrvatski' },
  { code: 'ja', label: 'Japanese',    nativeLabel: '日本語' },
  { code: 'ko', label: 'Korean',      nativeLabel: '한국어' },
  { code: 'zh', label: 'Chinese',     nativeLabel: '中文' },
  { code: 'th', label: 'Thai',        nativeLabel: 'ภาษาไทย' },
  { code: 'vi', label: 'Vietnamese',  nativeLabel: 'Tiếng Việt' },
  { code: 'id', label: 'Indonesian',  nativeLabel: 'Bahasa Indonesia' },
  { code: 'ms', label: 'Malay',       nativeLabel: 'Bahasa Melayu' },
  { code: 'hi', label: 'Hindi',       nativeLabel: 'हिन्दी' },
  { code: 'ar', label: 'Arabic',      nativeLabel: 'العربية' },
  { code: 'he', label: 'Hebrew',      nativeLabel: 'עברית' },
  { code: 'el', label: 'Greek',       nativeLabel: 'Ελληνικά' },
  { code: 'hu', label: 'Hungarian',   nativeLabel: 'Magyar' },
  { code: 'fi', label: 'Finnish',     nativeLabel: 'Suomi' },
  { code: 'tr', label: 'Turkish',     nativeLabel: 'Türkçe' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Translation map
// ─────────────────────────────────────────────────────────────────────────────

export const T = {
  nl, en, de, sv, da, no, fr, it, es, pt, ro, ca,
  ru, uk, pl, cs, sk, hr, ja, ko, zh, th, vi, id,
  ms, hi, ar, he, el, hu, fi, tr,
};

// ─────────────────────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────────────────────

export type Translations = typeof T.nl;
type LangCtx = { lang: Lang; setLang: (l: Lang) => void; t: Translations };
const Ctx = createContext<LangCtx>({ lang: 'nl', setLang: () => {}, t: T.nl });

const ALL_LANG_CODES = LANGUAGES.map(l => l.code);

function detectDeviceLang(): Lang {
  const candidates = typeof navigator !== 'undefined'
    ? [...(navigator.languages ?? []), navigator.language].filter(Boolean)
    : [];
  for (const locale of candidates) {
    const code = locale.split('-')[0].toLowerCase();
    if ((ALL_LANG_CODES as string[]).includes(code)) return code as Lang;
  }
  return 'en';
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en');

  useEffect(() => {
    const saved = localStorage.getItem('ludoryn-lang') as Lang | null;
    if (saved && (ALL_LANG_CODES as string[]).includes(saved)) {
      setLangState(saved);
    } else {
      setLangState(detectDeviceLang());
    }
  }, []);

  function setLang(l: Lang) {
    setLangState(l);
    localStorage.setItem('ludoryn-lang', l);
  }

  return (
    <Ctx.Provider value={{ lang, setLang, t: T[lang] }}>
      {children}
    </Ctx.Provider>
  );
}

export function useLang() {
  return useContext(Ctx);
}
