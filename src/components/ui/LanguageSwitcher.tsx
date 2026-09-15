'use client';

import { useLanguage } from '@/components/context/LanguageContext';
import type { Language } from '@/lib/i18n/translations';

interface LanguageSwitcherProps {
  className?: string;
}

const OPTIONS: { code: Language; label: string; aria: string }[] = [
  { code: 'en', label: 'EN', aria: 'Switch to English' },
  { code: 'fr', label: 'FR', aria: 'Passer au français' },
];

export default function LanguageSwitcher({ className = '' }: LanguageSwitcherProps) {
  const { language, setLanguage } = useLanguage();

  return (
    <div
      role="group"
      aria-label="Language"
      className={`inline-flex items-center rounded-md border border-gray-200 bg-gray-50 p-0.5 ${className}`}
    >
      {OPTIONS.map(opt => {
        const active = language === opt.code;
        return (
          <button
            key={opt.code}
            type="button"
            onClick={() => setLanguage(opt.code)}
            aria-pressed={active}
            aria-label={opt.aria}
            className={`px-2 py-1 text-xs font-semibold rounded transition-colors ${
              active
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
