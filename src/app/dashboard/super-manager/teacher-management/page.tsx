'use client';
import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { PlusIcon, PencilIcon, TrashIcon, BookOpenIcon } from '@heroicons/react/24/outline'; // Added BookOpenIcon
import { Teacher, SubjectBrief } from './types/teacher';
import { AssignSubjectsToTeacherModal } from './components/AssignSubjectsToTeacherModal';

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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://192.168.1.103:4000/api/v1';
const getAuthToken = () => typeof window !== 'undefined' ? localStorage.getItem('token') : null;

export default function TeacherManagementPage() {
    const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [allSubjects, setAllSubjects] = useState<SubjectBrief[]>([]); // State for all subjects
    const [isLoading, setIsLoading] = useState(false);
  const [isAssignSubjectsModalOpen, setIsAssignSubjectsModalOpen] = useState(false);
  const [teacherToAssignSubjects, setTeacherToAssignSubjects] = useState<Teacher | null>(null);
  // Add states for Add/Edit Teacher modal if implementing that later

    const fetchData = async () => {
        setIsLoading(true);
        const token = getAuthToken();
        if (!token) { 
      toast.error("Authentication failed");
            setIsLoading(false); 
            return; 
        }
    try {
      // Fetch Teachers (requesting subject info)
      // *** IMPORTANT: Verify '/users?role=TEACHER&include_subjects=true' endpoint exists ***
      const teachersUrl = `${API_BASE_URL}/users?role=TEACHER&include_subjects=true`;
      const teachersPromise = fetch(teachersUrl, { headers: { 'Authorization': `Bearer ${token}` } });

      // Fetch Subjects
      const subjectsUrl = `${API_BASE_URL}/subjects`;
      const subjectsPromise = fetch(subjectsUrl, { headers: { 'Authorization': `Bearer ${token}` } });

      const [teachersResponse, subjectsResponse] = await Promise.all([teachersPromise, subjectsPromise]);

      // Process Teachers
      if (!teachersResponse.ok) throw new Error('Failed to fetch teachers');
      const teachersResult = await teachersResponse.json();
      const mappedTeachers: Teacher[] = (teachersResult.data || []).map((t: any) => ({
        id: t.id,
        name: t.name,
        email: t.email,
        gender: t.gender,
        phone: t.phone,
        address: t.address,
        photo: t.photo,
        // Map assigned subjects (assuming API returns 'subjects' array on teacher)
        subjects: (t.subjects || []).map((s: any) => ({ id: s.id, name: s.name }))
      }));
      setTeachers(mappedTeachers);

      // Process Subjects
      if (!subjectsResponse.ok) throw new Error('Failed to fetch subjects');
      const subjectsResult = await subjectsResponse.json();
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

    useEffect(() => {
        fetchData();
    }, []);

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
    const token = getAuthToken();
    const teacher = teachers.find(t => t.id === teacherId);
    if (!teacher || !token) {
        toast.error("Error preparing assignment update.");
        setIsLoading(false);
        return;
    }

    const originalSubjectIds = new Set(teacher.subjects?.map(s => s.id) || []);
    const newSubjectIds = new Set(selectedSubjectIds);

    const assignmentsToAdd = selectedSubjectIds.filter(id => !originalSubjectIds.has(id));
    const assignmentsToRemove = Array.from(originalSubjectIds).filter(id => !newSubjectIds.has(id));

    console.log("Assigning:", assignmentsToAdd);
    console.log("Removing:", assignmentsToRemove);

    let success = true;
    const errors: string[] = [];

    // Process removals first
    for (const subjectId of assignmentsToRemove) {
        try {
            const url = `${API_BASE_URL}/subjects/${subjectId}/teachers/${teacherId}`;
            const response = await fetch(url, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (!response.ok && response.status !== 404) { // Ignore 404 if assignment didn't exist
                 const errorData = await response.json().catch(() => ({}));
                 throw new Error(errorData.message || `Failed to remove assignment (${response.status})`);
            }
            console.log(`Removed assignment: Teacher ${teacherId} from Subject ${subjectId}`);
        } catch (error: any) {
            success = false;
            errors.push(`Failed to remove subject ID ${subjectId}: ${error.message}`);
            console.error(`Removal failed for subject ${subjectId}:`, error);
        }
    }

    // Process additions
    for (const subjectId of assignmentsToAdd) {
        try {
             const url = `${API_BASE_URL}/subjects/${subjectId}/teachers`;
             const payload = { teacher_id: teacherId };
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });
             if (!response.ok) {
                 const errorData = await response.json().catch(() => ({}));
                 throw new Error(errorData.message || `Failed to add assignment (${response.status})`);
            }
             console.log(`Added assignment: Teacher ${teacherId} to Subject ${subjectId}`);
        } catch (error: any) {
            success = false;
            errors.push(`Failed to assign subject ID ${subjectId}: ${error.message}`);
             console.error(`Assignment failed for subject ${subjectId}:`, error);
        }
    }

    setIsLoading(false);
    if (success) {
        toast.success('Teacher subject assignments updated successfully.');
        closeAssignSubjectsModal();
        fetchData(); // Refresh data
    } else {
        toast.error(`Failed to update some assignments:\n${errors.join('\n')}`);
        // Optionally refresh data even on partial failure
        fetchData();
    }
  };


    return (
    <div className="p-6 bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-lg shadow-sm">
                    <h1 className="text-2xl font-bold text-gray-900">Teacher Management</h1>
          {/* TODO: Add "Add Teacher" button here */}
                </div>

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
                            {teachers.map((teacher) => (
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
                            ))}
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