'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { BookOpenIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/components/context/AuthContext';
import { apiService } from '@/lib/apiService';
import { useTeacherSearch, useTeacherFilterOptions } from '@/hooks/useTeacherSearch';
import { TeacherSearchFilters } from '@/components/teachers/TeacherSearchFilters';
import { TeacherTable } from '@/components/teachers/TeacherTable';
import { TeacherPagination } from '@/components/teachers/TeacherPagination';
import { AssignSubjectsModal } from '@/components/teachers/AssignSubjectsModal';
import type { TeacherSearchItem, TeacherSubjectBrief } from '@/lib/teacherSearchApi';

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'Unexpected error';

export default function TeacherManagementPage() {
  const { selectedAcademicYear } = useAuth();
  const search = useTeacherSearch({
    academicYearId: selectedAcademicYear?.id,
    initialFilters: { sortBy: 'name', sortOrder: 'asc' },
  });
  const { subjects, subClasses } = useTeacherFilterOptions();

  const [allSubjects, setAllSubjects] = useState<TeacherSubjectBrief[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [teacherToAssign, setTeacherToAssign] = useState<TeacherSearchItem | null>(null);

  useEffect(() => {
    apiService
      .get('/subjects?limit=200')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((result) => setAllSubjects((result?.data ?? []).map((s: any) => ({ id: s.id, name: s.name }))))
      .catch(() => setAllSubjects([]));
  }, []);

  const closeAssignModal = useCallback(() => setTeacherToAssign(null), []);

  const handleManageTeacherSubjects = async (teacherId: number, selectedSubjectIds: number[]) => {
    if (!teacherToAssign) return;
    setIsSaving(true);

    const currentSubjectIds = teacherToAssign.subjects.map((s) => s.id);
    const subjectsToRemove = currentSubjectIds.filter((id) => !selectedSubjectIds.includes(id));
    const subjectsToAdd = selectedSubjectIds.filter((id) => !currentSubjectIds.includes(id));
    const errors: string[] = [];

    for (const subjectId of subjectsToRemove) {
      try {
        await apiService.delete(`/users/${teacherId}/assignments/TEACHER/${subjectId}`);
      } catch (error: unknown) {
        errors.push(`Failed to remove subject ID ${subjectId}: ${errorMessage(error)}`);
      }
    }

    for (const subjectId of subjectsToAdd) {
      try {
        await apiService.post(`/users/${teacherId}/assignments/TEACHER`, { subjectId });
      } catch (error: unknown) {
        errors.push(`Failed to assign subject ID ${subjectId}: ${errorMessage(error)}`);
      }
    }

    setIsSaving(false);
    if (errors.length === 0) {
      toast.success('Teacher subject assignments updated successfully.');
      closeAssignModal();
    } else {
      toast.error(`Failed to update some assignments:\n${errors.join('\n')}`);
    }
    search.refresh();
  };

  return (
    <div className="p-4 sm:p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 bg-white p-4 rounded-lg shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900">Teacher Management</h1>
          <p className="text-gray-600 mt-1">Search teachers and manage their subject allocations.</p>
          {selectedAcademicYear && (
            <div className="mt-2 text-sm text-gray-500">Academic Year: {selectedAcademicYear.name}</div>
          )}
        </div>

        <TeacherSearchFilters search={search} subjects={subjects} subClasses={subClasses} />

        <TeacherTable
          teachers={search.teachers}
          isLoading={search.isLoading}
          getTeacherHref={(teacher) => `/dashboard/vice-principal/teachers/${teacher.id}`}
          renderActions={(teacher) => (
            <button
              onClick={() => setTeacherToAssign(teacher)}
              disabled={isSaving}
              title="Manage Assigned Subjects"
              className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              <BookOpenIcon className="h-4 w-4 mr-1" /> Manage Subjects
            </button>
          )}
        />

        <TeacherPagination meta={search.meta} onPageChange={search.setPage} isLoading={search.isLoading} />
      </div>

      <AssignSubjectsModal
        isOpen={teacherToAssign !== null}
        onClose={closeAssignModal}
        onSubmit={handleManageTeacherSubjects}
        teacher={teacherToAssign}
        allSubjects={allSubjects}
        isLoading={isSaving}
      />
    </div>
  );
}
