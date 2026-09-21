'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { Language, translate } from '@/lib/i18n/translations';

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

const STORAGE_KEY = 'app-language';

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'en' || stored === 'fr') {
        setLanguageState(stored);
        document.documentElement.lang = stored;
      }
    } catch { /* ignore */ }
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
      document.documentElement.lang = lang;
    } catch { /* ignore */ }
  }, []);

  const t = useCallback((key: string) => translate(key, language), [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

// Fallback used during static prerendering of leaf routes (e.g. /not-found)
// that render outside the root layout's provider tree. Returning defaults
// lets those pages render in English rather than crashing the build.
const FALLBACK_VALUE: LanguageContextValue = {
  language: 'en',
  setLanguage: () => { /* no-op */ },
  t: (key: string) => translate(key, 'en'),
};

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  return ctx ?? FALLBACK_VALUE;
}
