'use client';

import ClassMarksheetView from '@/components/results/ClassMarksheetView';
import { useLanguage } from '@/components/context/LanguageContext';

export default function MarksheetPage() {
  const { t } = useLanguage();
  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('Mark Sheet')}</h1>
        <p className="text-sm text-gray-500">{t('Class marks analysis and student rankings for a sequence, term or year, with a printable PDF')}</p>
      </div>
      <ClassMarksheetView />
    </div>
  );
}
