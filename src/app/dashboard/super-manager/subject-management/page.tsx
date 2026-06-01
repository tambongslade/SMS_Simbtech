'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
    PlusIcon,
    PencilIcon,
    TrashIcon,
    BookOpenIcon,
    AcademicCapIcon,
    ListBulletIcon,
    TableCellsIcon,
    EyeIcon
} from '@heroicons/react/24/outline';
import { Subject, SubjectCategory, SubjectAssignment } from './types/subject';
import { SubjectForm } from './components/SubjectForm';
import { AssignSubjectModal } from './components/AssignSubjectModal';
import { AssignmentsView } from './components/AssignmentsView';

// --- API Configuration ---
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://192.168.1.103:4000/api/v1';
const getAuthToken = () => typeof window !== 'undefined' ? localStorage.getItem('token') : null;

// --- Helper Component: Modal (assuming similar Modal structure as in classes/page.tsx) ---
const Modal: React.FC<{ isOpen: boolean; onClose: () => void; children: React.ReactNode }> = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
      <div className="relative mx-auto p-6 border w-full max-w-lg shadow-lg rounded-md bg-white">
        <button onClick={onClose} className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-2xl font-bold">&times;</button>
        {children}
      </div>
    </div>
  );
};

// Add type for classes needed in this component
type ClassInfo = {
    id: number;
    name: string;
  subClasses: { id: number; name: string }[];
};

// --- Main Page Component ---
export default function SubjectManagementPage() {
    const [subjects, setSubjects] = useState<Subject[]>([]);
  const [allClasses, setAllClasses] = useState<ClassInfo[]>([]); // State for classes list
    const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [subjectToAssign, setSubjectToAssign] = useState<Subject | null>(null);
  const [viewMode, setViewMode] = useState<'subjects' | 'assignments'>('subjects');
  const [filterSubjectId, setFilterSubjectId] = useState<number | null>(null); // State for filtering assignments view

  // --- Data Fetching ---
  const fetchSubjectsAndClasses = async () => { // Rename fetch function
        setIsLoading(true);
        const token = getAuthToken();
        if (!token) {
            toast.error("Authentication token not found.");
            setIsLoading(false);
            return;
        }
    try {
      // Fetch subjects (includes assignments/teachers via query params)
      const subjectsUrl = `${API_BASE_URL}/subjects?include_sub_classes=true&include_teachers=true`;
      const subjectsPromise = fetch(subjectsUrl, { headers: { 'Authorization': `Bearer ${token}` } });

      // Fetch classes (includes subclasses)
      const classesUrl = `${API_BASE_URL}/classes`;
      const classesPromise = fetch(classesUrl, { headers: { 'Authorization': `Bearer ${token}` } });

      const [subjectsResponse, classesResponse] = await Promise.all([subjectsPromise, classesPromise]);

      // Process Subjects
      if (!subjectsResponse.ok) {
         let errorMessage = `Failed to fetch subjects (${subjectsResponse.status})`;
         try {
           const errorData = await subjectsResponse.json();
           errorMessage = errorData.error || errorData.message || errorMessage;
         } catch (e) { /* Ignore JSON parse error */ }
         throw new Error(errorMessage);
      }
      const subjectsResult = await subjectsResponse.json();
      const mappedSubjects: Subject[] = (subjectsResult.data || []).map((s: any) => ({
                id: s.id,
                name: s.name,
          category: s.category,
          assignments: (s.subClasses || []).map((a: any) => ({
             subClassId: a.id,
             subClassName: a.name,
             classId: a.classId,
             className: a.class?.name || 'N/A',
             coefficient: a.coefficient,
          })),
          teachers: (s.teachers || []).map((t: any) => ({
             teacherId: t.id,
             teacherName: t.name || 'N/A',
          })),
      }));
      setSubjects(mappedSubjects);
      console.log("Mapped Subjects (Corrected):", mappedSubjects);

      // Process Classes
       if (!classesResponse.ok) {
           let errorMessage = `Failed to fetch classes (${classesResponse.status})`;
           try {
             const errorData = await classesResponse.json();
             errorMessage = errorData.error || errorData.message || errorMessage;
           } catch (e) { /* Ignore JSON parse error */ }
           throw new Error(errorMessage);
       }
       const classesResult = await classesResponse.json();
       const mappedClasses: ClassInfo[] = (classesResult.data || []).map((cls: any) => ({
           id: cls.id,
           name: cls.name,
           subClasses: (cls.subClasses || cls.sub_classes || []).map((sub: any) => ({ // Handle potential variations
               id: sub.id,
               name: sub.name,
           })) || [],
       }));
       setAllClasses(mappedClasses);
       console.log("Mapped Classes:", mappedClasses);


        } catch (error: any) {
      toast.error(`Error fetching data: ${error.message}`);
      setSubjects([]);
      setAllClasses([]); // Reset classes on error too
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
    fetchSubjectsAndClasses(); // Call the combined fetch function
    }, []);

  // --- Modal Handlers ---
  const openAddModal = () => {
    setEditingSubject(null);
    setIsModalOpen(true);
  };

  const openEditModal = (subject: Subject) => {
    setEditingSubject(subject);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingSubject(null);
  };

  // --- New Modal Handlers for Assignment ---
  const openAssignModal = (subject: Subject) => {
    setSubjectToAssign(subject);
    setIsAssignModalOpen(true);
  };

  const closeAssignModal = () => {
    setIsAssignModalOpen(false);
    setSubjectToAssign(null);
  };

  // --- Handler for View Subject Assignments Button ---
  const handleViewSubjectAssignments = (subjectId: number) => {
    setFilterSubjectId(subjectId);
    setViewMode('assignments'); // Switch to assignments view
  };

  // --- Handler for View Mode Toggle Button ---
  const handleToggleViewMode = () => {
    if (viewMode === 'subjects') {
      setViewMode('assignments');
      setFilterSubjectId(null); // Clear subject filter when viewing all assignments
    } else {
      setViewMode('subjects');
      setFilterSubjectId(null); // Always clear filter when going back to subjects list
    }
  };

  // --- CRUD Handlers ---
  const handleCreateSubject = async (formData: Omit<Subject, 'id'>) => {
    setIsLoading(true);
    const token = getAuthToken();
    try {
        const response = await fetch(`${API_BASE_URL}/subjects`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(formData)
        });
        if (!response.ok) {
             let errorMessage = `Failed to create subject (${response.status})`;
             try {
                const errorData = await response.json();
                errorMessage = errorData.error || errorData.message || errorMessage;
             } catch (e) { /* Ignore */ }
             throw new Error(errorMessage);
        }
        toast.success('Subject created successfully.');
        closeModal();
        fetchSubjectsAndClasses(); // Refresh list
    } catch (error: any) {
        toast.error(`Subject creation failed: ${error.message}`);
    } finally {
        setIsLoading(false);
    }
  };

  const handleUpdateSubject = async (formData: Omit<Subject, 'id'>) => {
    if (!editingSubject?.id) {
        toast.error("Cannot update subject without ID.");
        return;
    }
    setIsLoading(true);
    const token = getAuthToken();
    try {
        const response = await fetch(`${API_BASE_URL}/subjects/${editingSubject.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(formData)
        });
        if (!response.ok) {
             let errorMessage = `Failed to update subject (${response.status})`;
             try {
                const errorData = await response.json();
                errorMessage = errorData.error || errorData.message || errorMessage;
             } catch (e) { /* Ignore */ }
             throw new Error(errorMessage);
        }
        toast.success('Subject updated successfully.');
        closeModal();
        fetchSubjectsAndClasses(); // Refresh list
    } catch (error: any) {
        toast.error(`Subject update failed: ${error.message}`);
    } finally {
        setIsLoading(false);
    }
  };

  const handleDeleteSubject = async (subject: Subject) => {
      if (!subject.id) {
          toast.error("Cannot delete subject without ID.");
          return;
      }

      // Confirmation Toast
      const toastId = toast((t) => (
          <div className="flex flex-col items-start">
              <p className="font-medium mb-2">
                  Are you sure you want to delete the subject "{subject.name}"?
              </p>
              <p className="text-sm text-gray-600 mb-4">
                  This action cannot be undone.
              </p>
              <div className="flex w-full justify-end space-x-3">
                  <button
                      onClick={() => toast.dismiss(t.id)}
                      className="px-3 py-1.5 text-sm bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                  >
                      Cancel
                  </button>
                  <button
                      onClick={() => {
                          toast.dismiss(t.id);
                          executeDeleteSubject(subject.id);
                      }}
                      className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
                  >
                      Confirm Delete
                  </button>
              </div>
          </div>
      ), {
          duration: Infinity,
      });
  };

  const executeDeleteSubject = async (id: number) => {
    setIsLoading(true);
    const token = getAuthToken();
    try {
        const response = await fetch(`${API_BASE_URL}/subjects/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
             let errorMessage = `Failed to delete subject (${response.status})`;
             try {
                const errorData = await response.json();
                errorMessage = errorData.error || errorData.message || errorMessage;
             } catch (e) { /* Ignore */ }
             throw new Error(errorMessage);
        }
        toast.success('Subject deleted successfully.');
        fetchSubjectsAndClasses(); // Refresh list
    } catch (error: any) {
        toast.error(`Subject deletion failed: ${error.message}`);
    } finally {
        setIsLoading(false);
    }
  };

  // --- New Handler for Subject Assignment ---
  const handleAssignSubject = async (subjectId: number, subClassId: number, coefficient: number) => {
        setIsLoading(true);
        const token = getAuthToken();
    const payload = { sub_class_id: subClassId, coefficient };
    console.log(`Assigning Subject ${subjectId} to Subclass ${subClassId} with Coeff ${coefficient}`);
    try {
        const response = await fetch(`${API_BASE_URL}/subjects/${subjectId}/sub-classes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });
        if (!response.ok) {
             let errorMessage = `Failed to assign subject (${response.status})`;
             try {
                const errorData = await response.json();
                errorMessage = errorData.error || errorData.message || errorMessage;
             } catch (e) { /* Ignore */ }
             // Check for specific duplicate assignment error message from backend (adjust if needed)
             if (errorMessage.includes('already assigned')) {
                 errorMessage = "This subject is already assigned to this subclass.";
             }
             throw new Error(errorMessage);
        }
        toast.success('Subject assigned successfully to subclass.');
        closeAssignModal();
        // Refresh subjects list to potentially update assignment view
        fetchSubjectsAndClasses();
    } catch (error: any) {
        toast.error(`Assignment failed: ${error.message}`);
    } finally {
        setIsLoading(false);
    }
  };

  // --- New Handler for Removing an Assignment ---
  const handleRemoveAssignment = async (subjectId: number, subClassId: number) => {
    // Confirmation Toast
    const toastId = toast((t) => (
        <div className="flex flex-col items-start">
            <p className="font-medium mb-2">
                Remove assignment?
            </p>
            <p className="text-sm text-gray-600 mb-4">
                Are you sure you want to remove this subject assignment from the subclass?
            </p>
            <div className="flex w-full justify-end space-x-3">
                <button onClick={() => toast.dismiss(t.id)} className="px-3 py-1.5 text-sm bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">
                    Cancel
                </button>
                <button
                    onClick={() => {
                        toast.dismiss(t.id);
                        executeRemoveAssignment(subjectId, subClassId);
                    }}
                    className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                    Confirm Remove
                </button>
            </div>
        </div>
    ), { duration: Infinity });
  };

  const executeRemoveAssignment = async (subjectId: number, subClassId: number) => {
    setIsLoading(true);
    const token = getAuthToken();
    // IMPORTANT: Verify this endpoint structure with the backend API documentation.
    // Assuming DELETE /subjects/{subjectId}/sub-classes/{subClassId} pattern.
    const url = `${API_BASE_URL}/subjects/${subjectId}/sub-classes/${subClassId}`;
    console.log(`Attempting to remove assignment: DELETE ${url}`);

    try {
      const response = await fetch(url, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        let errorMessage = `Failed to remove assignment (${response.status})`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (e) { /* Ignore */ }
        throw new Error(errorMessage);
      }

      toast.success('Assignment removed successfully.');
      fetchSubjectsAndClasses(); // Refresh the subjects list to update assignments
    } catch (error: any) {
      console.error("Assignment removal failed:", error);
      toast.error(`Assignment removal failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCategory = (categoryKey: string) => {
    return categoryKey.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  // --- JSX Rendering ---
    return (
        <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
                {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 bg-white p-4 rounded-lg shadow-sm gap-3">
                            <h1 className="text-2xl font-bold text-gray-900">Subject Management</h1>
          <div className="flex items-center space-x-2">
            {/* View Toggle Button */}
                        <button
              onClick={handleToggleViewMode}
              className="flex items-center px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-1 disabled:opacity-50"
                            disabled={isLoading}
                        >
              {viewMode === 'subjects' ? (
                <>
                  <ListBulletIcon className="h-4 w-4 mr-1.5" />
                  Manage Assignments
                </>
              ) : (
                <>
                  <TableCellsIcon className="h-4 w-4 mr-1.5" />
                  View Subjects
                </>
              )}
            </button>
            {/* Add Subject Button (only shown in subjects view) */}
            {viewMode === 'subjects' && (
                <button
                  onClick={openAddModal}
                  disabled={isLoading}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  <PlusIcon className="h-5 w-5 mr-1.5" />
                            Add Subject
                        </button>
            )}
                    </div>
                </div>

        {/* Loading State */}
        {isLoading && <p className="text-center text-gray-500 py-4">Loading data...</p>}

        {/* Conditional View Rendering */}
        {!isLoading && viewMode === 'subjects' && (
          <>
            {!subjects.length ? (
                <p className="text-center text-gray-500 py-4 bg-white rounded-lg shadow-sm">No subjects found. Add one to get started.</p>
            ) : (
              <div className="bg-white shadow-md rounded-lg overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                  {/* Table Head */}
                            <thead className="bg-gray-50">
                                <tr>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assignments</th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th> {/* Wider Actions Column */}
                                </tr>
                            </thead>
                  {/* Table Body */}
                            <tbody className="bg-white divide-y divide-gray-200">
                    {subjects.map((subject) => (
                      <tr key={subject.id}>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{subject.name}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{formatCategory(subject.category)}</td>
                        {/* Assignments Column */}
                        <td className="px-4 py-4 text-sm text-gray-500">
                          {subject.assignments && subject.assignments.length > 0 ? (
                            <ul className="list-disc list-inside space-y-1 max-w-xs"> {/* Added max-width */}
                              {subject.assignments.slice(0, 2).map(a => ( // Show first 2
                                <li key={a.subClassId} className="truncate" title={`${a.className} - ${a.subClassName} (Coeff: ${a.coefficient})`}>
                                  <span className="font-medium">{a.subClassName}</span> (Coeff: {a.coefficient})
                                </li>
                              ))}
                              {subject.assignments.length > 2 && (
                                <li className="text-xs italic text-gray-400">+ {subject.assignments.length - 2} more...</li>
                              )}
                            </ul>
                          ) : (
                            <span className="text-gray-400 italic">Not assigned</span>
                          )}
                        </td>
                        {/* Actions Column - Enabled View button */}
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                           <button
                              onClick={() => handleViewSubjectAssignments(subject.id)}
                              disabled={isLoading}
                              title="View Subject Assignments"
                              className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-purple-700 bg-purple-100 hover:bg-purple-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
                            >
                              <EyeIcon className="h-4 w-4 mr-1" /> View
                            </button>
                                            <button
                             onClick={() => openEditModal(subject)}
                                                disabled={isLoading}
                                                title="Edit Subject"
                             className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                                            >
                             <PencilIcon className="h-4 w-4 mr-1" /> Edit
                                            </button>
                                            <button
                             onClick={() => handleDeleteSubject(subject)}
                                                disabled={isLoading}
                                                title="Delete Subject"
                             className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                                            >
                             <TrashIcon className="h-4 w-4 mr-1" /> Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
            )}
          </>
        )}

        {!isLoading && viewMode === 'assignments' && (
            <AssignmentsView
                subjectsWithAssignments={subjects.filter(s => s.assignments && s.assignments.length > 0)}
                allClasses={allClasses}
                isLoading={isLoading}
                onRemoveAssignment={handleRemoveAssignment}
                filterSubjectId={filterSubjectId}
                allSubjects={subjects}
                onAssignSubject={handleAssignSubject}
                apiBaseUrl={API_BASE_URL}
                getAuthToken={getAuthToken}
            />
        )}

            </div>

      {/* Add/Edit Subject Modal */}
      <Modal isOpen={isModalOpen} onClose={closeModal}>
        <SubjectForm
          key={editingSubject?.id || 'new'}
          initialData={editingSubject || undefined}
          onSubmit={editingSubject ? handleUpdateSubject : handleCreateSubject}
          onCancel={closeModal}
          isLoading={isLoading}
        />
      </Modal>

      {/* Assign Subject Modal (for Subject List view) */}
      <AssignSubjectModal
        isOpen={isAssignModalOpen}
        onClose={closeAssignModal}
        onSubmit={handleAssignSubject}
        subject={subjectToAssign}
        allSubjects={subjects}
        allClasses={allClasses}
        isLoading={isLoading}
        apiBaseUrl={API_BASE_URL}
        getAuthToken={getAuthToken}
      />
        </div>
    );
} 