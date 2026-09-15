'use client';

import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

// Minimal pass-through i18n: every call site does `t('English sentence')` and
// treats the English text itself as the key (see the ~37 dashboard pages that
// already call useLanguage() this way). There's no translation table yet, so
// `t` is the identity function -- it hands back whatever it was given. Swap
// TRANSLATIONS below for real dictionaries per language and `t` starts
// translating without touching a single call site.
export type Language = 'en' | 'fr';

const TRANSLATIONS: Partial<Record<Language, Record<string, string>>> = {
    // fr: { 'Students': 'Élèves', ... }
};

interface LanguageContextType {
    language: Language;
    setLanguage: (language: Language) => void;
    t: (text: string) => string;
}

const defaultContext: LanguageContextType = {
    language: 'en',
    setLanguage: () => { },
    t: (text: string) => text,
};

const LanguageContext = createContext<LanguageContextType>(defaultContext);

const LANGUAGE_STORAGE_KEY = 'sms_language';

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [language, setLanguageState] = useState<Language>(() => {
        if (typeof window === 'undefined') return 'en';
        try {
            const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
            return stored === 'fr' ? 'fr' : 'en';
        } catch {
            return 'en';
        }
    });

    const setLanguage = useCallback((next: Language) => {
        setLanguageState(next);
        try {
            window.localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
        } catch {
            // localStorage unavailable (private mode, etc.) - language still
            // switches for this session, just doesn't persist.
        }
    }, []);

    const t = useCallback((text: string) => {
        return TRANSLATIONS[language]?.[text] ?? text;
    }, [language]);

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

// No provider required: the context's default value already does identity
// translation, so every existing call site works whether or not the tree is
// wrapped in <LanguageProvider>. Wrap the root layout in it only once real
// language switching is wanted.
export const useLanguage = (): LanguageContextType => useContext(LanguageContext);
