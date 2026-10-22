'use client';

import ClassResultsView from '@/components/results/ClassResultsView';
import { useLanguage } from '@/components/context/LanguageContext';

export default function ResultsPage() {
  const { t } = useLanguage();
  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('Results')}</h1>
        <p className="text-sm text-gray-500">{t('Class ranking, subject averages and Excel export by sequence, term or year')}</p>
      </div>
      <ClassResultsView />
    </div>
  );
}
