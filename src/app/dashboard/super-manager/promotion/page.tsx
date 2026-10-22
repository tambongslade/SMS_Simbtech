'use client';

import PromotionView from '@/components/results/PromotionView';
import { useLanguage } from '@/components/context/LanguageContext';

export default function PromotionPage() {
  const { t } = useLanguage();
  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('End-of-Year Promotion')}</h1>
        <p className="text-sm text-gray-500">{t('Promote, repeat or dismiss a whole class at once and create next year\'s enrolments')}</p>
      </div>
      <PromotionView />
    </div>
  );
}
