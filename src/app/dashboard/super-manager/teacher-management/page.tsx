'use client';
import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { PlusIcon, PencilIcon, TrashIcon, BookOpenIcon } from '@heroicons/react/24/outline';
import { Teacher, SubjectBrief } from './types/teacher';
import { AssignSubjectsToTeacherModal } from './components/AssignSubjectsToTeacherModal';
import { RoleManagementFilters } from './components/RoleManagementFilters';
import apiService from '../../../../lib/apiService';

// Types for academic year
type AcademicYear = {
  id: number;
  name: string;
};

// Basic Modal Component (assuming it exists or copy from another page)
const Modal: React.FC<{ isOpen: boolean; onClose: () => void; children: React.ReactNode }> = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="relative bg-white p-6 rounded-lg shadow-xl max-w-lg w-full">
        <button onClick={onClose} className="absolute top-2 right-2 text-gray-400 hover:text-gray-600">&times;</button>
        {children}
      </div>
    </div>
  );
};

export default function TeacherManagementPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [allSubjects, setAllSubjects] = useState<SubjectBrief[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAssignSubjectsModalOpen, setIsAssignSubjectsModalOpen] = useState(false);
  const [teacherToAssignSubjects, setTeacherToAssignSubjects] = useState<Teacher | null>(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAcademicYear, setSelectedAcademicYear] = useState('');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Build API parameters
      const params = new URLSearchParams();
      params.append('role', 'TEACHER');
      if (searchTerm.trim()) {
        params.append('search', searchTerm.trim());
      }
      if (selectedAcademicYear) {
        params.append('academicYearId', selectedAcademicYear);
      }

      // Fetch Teachers with filtering
      const teachersResult = await apiService.get(`/users?${params.toString()}`);
      const mappedTeachers: Teacher[] = (teachersResult.data || []).map((t: any) => ({
        id: t.id,
        name: t.name,
        email: t.email,
        gender: t.gender,
        phone: t.phone,
        address: t.address,
        photo: t.photo,
        subjects: (t.subjects || []).map((s: any) => ({ id: s.id, name: s.name }))
      }));
      setTeachers(mappedTeachers);

      // Fetch Subjects
      const subjectsResult = await apiService.get('/subjects');
      const mappedSubjects: SubjectBrief[] = (subjectsResult.data || []).map((s: any) => ({ id: s.id, name: s.name }));
      setAllSubjects(mappedSubjects);

    } catch (error: any) {
      toast.error(`Error fetching data: ${error.message}`);
      setTeachers([]);
      setAllSubjects([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAcademicYears = async () => {
    try {
      const result = await apiService.get('/academic-years');
      const mappedYears: AcademicYear[] = (result.data || []).map((ay: any) => ({
        id: ay.id,
        name: ay.name
      }));
      setAcademicYears(mappedYears);

      // Auto-select current academic year
      const currentYear = mappedYears.find(year => year.name.includes('Current') || year.name.includes('2024')); // Adjust logic as needed
      if (currentYear && !selectedAcademicYear) {
        setSelectedAcademicYear(String(currentYear.id));
      }
    } catch (error: any) {
      console.error('Failed to fetch academic years:', error);
      setAcademicYears([]);
    }
  };

  useEffect(() => {
    fetchAcademicYears();
  }, []);

  useEffect(() => {
    fetchData();
  }, [searchTerm, selectedAcademicYear]);

  // --- Modal Handlers ---
  const openAssignSubjectsModal = (teacher: Teacher) => {
    setTeacherToAssignSubjects(teacher);
    setIsAssignSubjectsModalOpen(true);
  };

  const closeAssignSubjectsModal = () => {
    setIsAssignSubjectsModalOpen(false);
    setTeacherToAssignSubjects(null);
  };

  // --- Subject Assignment Logic ---
  const handleManageTeacherSubjects = async (teacherId: number, selectedSubjectIds: number[]) => {
    setIsLoading(true);

    if (!teacherToAssignSubjects) {
      toast.error('No teacher selected for subject assignment.');
      setIsLoading(false);
      return;
    }

    // Get current subject IDs for this teacher
    const currentSubjectIds = teacherToAssignSubjects.subjects.map(s => s.id);

    // Find subjects to remove (in current but not in selected)
    const subjectsToRemove = currentSubjectIds.filter(id => !selectedSubjectIds.includes(id));

    // Find subjects to add (in selected but not in current)
    const subjectsToAdd = selectedSubjectIds.filter(id => !currentSubjectIds.includes(id));

    let success = true;
    const errors: string[] = [];

    try {
      // Remove unselected subjects
      for (const subjectId of subjectsToRemove) {
        try {
          await apiService.delete(`/users/${teacherId}/assignments/TEACHER/${subjectId}`);
          console.log(`Removed assignment: Teacher ${teacherId} from Subject ${subjectId}`);
        } catch (error: any) {
          success = false;
          errors.push(`Failed to remove subject ID ${subjectId}: ${error.message}`);
          console.error(`Removal failed for subject ${subjectId}:`, error);
        }
      }

      // Add newly selected subjects
      for (const subjectId of subjectsToAdd) {
        try {
          const payload = { subjectId };
          await apiService.post(`/users/${teacherId}/assignments/TEACHER`, payload);
          console.log(`Added assignment: Teacher ${teacherId} to Subject ${subjectId}`);
        } catch (error: any) {
          success = false;
          errors.push(`Failed to assign subject ID ${subjectId}: ${error.message}`);
          console.error(`Assignment failed for subject ${subjectId}:`, error);
        }
      }
    } catch (error: any) {
      success = false;
      errors.push(`Unexpected error: ${error.message}`);
    }

    setIsLoading(false);
    if (success) {
      toast.success('Teacher subject assignments updated successfully.');
      closeAssignSubjectsModal();
      fetchData(); // Refresh data
    } else {
      toast.error(`Failed to update some assignments:\n${errors.join('\n')}`);
      fetchData();
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-lg shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Teacher Management</h1>
            <p className="text-gray-600 mt-1">Manage teacher assignments and subject allocations.</p>
            {selectedAcademicYear && (
              <div className="mt-2 text-sm text-gray-500">
                Academic Year: {academicYears.find(ay => String(ay.id) === selectedAcademicYear)?.name || 'Unknown'}
              </div>
            )}
          </div>
          {/* TODO: Add "Add Teacher" button here */}
        </div>

        {/* Filters Section */}
        <RoleManagementFilters
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          academicYears={academicYears}
          selectedAcademicYear={selectedAcademicYear}
          setSelectedAcademicYear={setSelectedAcademicYear}
          isLoading={isLoading}
          resultCount={teachers.length}
          roleName="Teachers"
          searchPlaceholder="Search by name, email, phone..."
        />

        {isLoading && <p className="text-center text-gray-500 py-4">Loading teachers...</p>}

        {!isLoading && (
          <div className="bg-white shadow-md rounded-lg overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned Subjects</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {teachers.length === 0 && !isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      No teachers found matching your criteria
                    </td>
                  </tr>
                ) : (
                  teachers.map((teacher) => (
                    <tr key={teacher.id}>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 flex items-center">
                        {/* Display photo or placeholder */}
                        <span className="inline-block h-8 w-8 rounded-full overflow-hidden bg-gray-100 mr-3">
                          {teacher.photo ? (
                            <img className="h-full w-full object-cover" src={teacher.photo} alt="" />
                          ) : (
                            <svg className="h-full w-full text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                          )}
                        </span>
                        {teacher.name}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{teacher.email}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{teacher.phone || '-'}</td>
                      <td className="px-4 py-4 text-sm text-gray-500">
                        {teacher.subjects && teacher.subjects.length > 0 ? (
                          <ul className="space-y-1 max-w-xs">
                            {teacher.subjects.map(s => (
                              <li key={s.id} className="truncate text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full inline-block mr-1 mb-1" title={s.name}>
                                {s.name}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <span className="text-gray-400 italic">None</span>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() => openAssignSubjectsModal(teacher)}
                          disabled={isLoading}
                          title="Manage Assigned Subjects"
                          className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                        >
                          <BookOpenIcon className="h-4 w-4 mr-1" /> Manage Subjects
                        </button>
                        {/* TODO: Add Edit/Delete Teacher buttons */}
                      </td>
                    </tr>
                  )))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Assign Subjects Modal */}
      <AssignSubjectsToTeacherModal
        isOpen={isAssignSubjectsModalOpen}
        onClose={closeAssignSubjectsModal}
        onSubmit={handleManageTeacherSubjects}
        teacher={teacherToAssignSubjects}
        allSubjects={allSubjects}
        isLoading={isLoading}
      />

      {/* TODO: Add Modals for Add/Edit Teacher */}
    </div>
  );
} 