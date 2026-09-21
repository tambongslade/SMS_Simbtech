'use client';

import { useParams } from 'next/navigation';
import StudentProfile from '@/components/students/StudentProfile';

// Canonical discipline-side student profile. discipline-coordinator,
// discipline-master, principal, senior-discipline-master and
// vice-principal each keep a one-line re-export of this file (same pattern
// as their absences/overview pages) so the URL's role segment always
// matches the signed-in selectedRole -- see SHARED_SECTIONS / roleFromPath
// in dashboard/layout.tsx for why that matters (mismatched segments trigger
// a redirect away). super-manager has its own pre-existing profile page at
// student-management/[id] and links there directly instead.
export default function DeanOfDisciplineStudentProfilePage() {
  const params = useParams();
  return (
    <StudentProfile
      studentId={Number(params?.id)}
      backHref="/dashboard/dean-of-discipline/absences"
    />
  );
}
