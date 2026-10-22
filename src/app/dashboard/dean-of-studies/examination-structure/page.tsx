'use client';

import ExamStructureView from '@/components/results/ExamStructureView';
import { useLanguage } from '@/components/context/LanguageContext';

export default function DeanExaminationStructurePage() {
  const { t } = useLanguage();
  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('Examination Structure')}</h1>
        <p className="text-sm text-gray-500">{t('Terms and sequences of the academic year')}</p>
      </div>
      <ExamStructureView />
    </div>
  );
}
