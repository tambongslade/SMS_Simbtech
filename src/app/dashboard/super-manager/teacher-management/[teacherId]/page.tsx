'use client';

import { useParams } from 'next/navigation';
import TeacherProfileView from '@/components/teachers/TeacherProfileView';

export default function SuperManagerTeacherProfilePage() {
    const params = useParams();
    const teacherId = Number(params?.teacherId);

    if (!teacherId || Number.isNaN(teacherId)) {
        return (
            <div className="max-w-4xl mx-auto p-6 text-center text-gray-600">Invalid teacher ID.</div>
        );
    }

    return (
        <TeacherProfileView
            teacherId={teacherId}
            backHref="/dashboard/super-manager/teacher-management"
            backLabel="Back to Teacher Management"
        />
    );
}
