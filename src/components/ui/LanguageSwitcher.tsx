'use client';

import { useLanguage } from '@/components/context/LanguageContext';

// Sits in the dashboard header toolbar next to ChatIndicator/NotificationIndicator
// (same size/shape), so it matches their p-2 hover-pill style rather than the
// general-purpose Button. Toggles the only two languages LanguageContext
// currently knows; add a real picker if a third ever shows up.
export function LanguageSwitcher({ className = '' }: { className?: string }) {
    const { language, setLanguage } = useLanguage();
    const next = language === 'en' ? 'fr' : 'en';

    return (
        <button
            type="button"
            onClick={() => setLanguage(next)}
            title={next === 'fr' ? 'Passer en français' : 'Switch to English'}
            className={`px-2 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors ${className}`}
        >
            {language.toUpperCase()}
        </button>
    );
}
