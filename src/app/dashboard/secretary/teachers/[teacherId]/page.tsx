'use client';

import { useParams } from 'next/navigation';
import { useLanguage } from '@/components/context/LanguageContext';
import TeacherProfileView from '@/components/teachers/TeacherProfileView';

export default function SecretaryTeacherProfilePage() {
    const params = useParams();
    const { t } = useLanguage();
    const teacherId = Number(params?.teacherId);

    if (!teacherId || Number.isNaN(teacherId)) {
        return (
            <div className="max-w-4xl mx-auto p-6 text-center text-gray-600">{t('Invalid teacher ID.')}</div>
        );
    }

    return (
        <TeacherProfileView
            teacherId={teacherId}
            backHref="/dashboard/secretary/teachers"
            backLabel={t('Back to Teachers')}
        />
    );
}
