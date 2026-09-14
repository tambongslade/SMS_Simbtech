'use client';

import { useParams } from 'next/navigation';
import TeacherProfileView from '@/components/teachers/TeacherProfileView';
import { useLanguage } from '@/components/context/LanguageContext';

export default function PrincipalTeacherProfilePage() {
    const { t } = useLanguage();
    const params = useParams();
    const teacherId = Number(params?.teacherId);

    if (!teacherId || Number.isNaN(teacherId)) {
        return (
            <div className="max-w-4xl mx-auto p-6 text-center text-gray-600">{t('Invalid teacher ID.')}</div>
        );
    }

    return (
        <TeacherProfileView
            teacherId={teacherId}
            backHref="/dashboard/principal/teacher-management"
            backLabel={t('Back to Teacher Management')}
        />
    );
}
