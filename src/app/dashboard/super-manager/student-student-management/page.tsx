'use client';

import { useLanguage } from '@/components/context/LanguageContext';

export default function StudentStudentManagementPage() {
  const { t } = useLanguage();
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">{t('Student Management')}</h1>
      <p className="text-gray-600 mt-2">{t('This page is under construction.')}</p>
    </div>
  );
}