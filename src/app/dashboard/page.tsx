'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/context/AuthContext';

const ROLE_ROUTES: Record<string, string> = {
  SUPER_MANAGER: '/dashboard/super-manager',
  PRINCIPAL: '/dashboard/principal',
  VICE_PRINCIPAL: '/dashboard/vice-principal',
  TEACHER: '/dashboard/teacher',
  HOD: '/dashboard/hod',
  BURSAR: '/dashboard/bursar',
  DISCIPLINE_MASTER: '/dashboard/discipline-master',
  SENIOR_DISCIPLINE_MASTER: '/dashboard/senior-discipline-master',
  DEAN_OF_DISCIPLINE: '/dashboard/dean-of-discipline',
  DEAN_OF_STUDIES: '/dashboard/dean-of-studies',
  GUIDANCE_COUNSELOR: '/dashboard/guidance-counselor',
  FEE_AUDITOR: '/dashboard/fee-auditor',
  SECRETARY: '/dashboard/secretary',
  NURSE: '/dashboard/nurse',
  PARENT: '/dashboard/parent-student',
  STUDENT: '/dashboard/parent-student',
  MANAGER: '/dashboard/manager',
  CONTROLLER: '/dashboard/controller',
};

export default function DashboardIndexPage() {
  const router = useRouter();
  const { selectedRole, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace('/');
      return;
    }
    const destination = (selectedRole && ROLE_ROUTES[selectedRole]) || '/';
    router.replace(destination);
  }, [isLoading, isAuthenticated, selectedRole, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500">Redirecting…</p>
      </div>
    </div>
  );
}
