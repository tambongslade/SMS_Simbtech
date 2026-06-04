'use client';

import { useParams } from 'next/navigation';
import StudentProfile from '@/components/students/StudentProfile';

export default function SecretaryStudentProfilePage() {
  const params = useParams();
  return (
    <StudentProfile
      studentId={Number(params?.id)}
      backHref="/dashboard/secretary/students"
    />
  );
}
