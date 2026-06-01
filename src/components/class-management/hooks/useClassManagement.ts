'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import useSWR, { useSWRConfig } from 'swr';
import { Class, SubClass } from '../types/class';
import apiService from '../../../lib/apiService'; // Import apiService

// Define Teacher type locally for selection
type Teacher = {
    id: number;
    name: string;
};

type Subject = {
    id: number;
    name: string;
};

type AssignedSubject = Subject & {
    coefficient: number;
};

// API Configuration - REMOVED
// const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://192.168.1.103:4000/api/v1';
// const getAuthToken = () => typeof window !== 'undefined' ? localStorage.getItem('token') : null;

// Interface for API responses (adjust based on actual structure)
interface ApiResponse<T> {
    data?: T[]; // Assuming SWR fetcher expects this structure
    // If apiService returns T directly, then use SWR<T> and adjust access in useMemo
}

export const useClassManagement = () => {
    // --- UI State --- 
    const [isLoadingMutation, setIsLoadingMutation] = useState(false);
    const [editingClass, setEditingClass] = useState<Class | null>(null);
    const [isClassModalOpen, setIsClassModalOpen] = useState(false);
    const [isSubClassModalOpen, setIsSubClassModalOpen] = useState(false);
    const [classForSubclass, setClassForSubclass] = useState<{ id: string | number; name: string } | null>(null);
    const [editingSubclass, setEditingSubclass] = useState<SubClass | null>(null);
    const [classToDelete, setClassToDelete] = useState<Class | null>(null);
    const [subClassToDelete, setSubClassToDelete] = useState<SubClass | null>(null);
    const [isConfirmDeleteModalOpen, setIsConfirmDeleteModalOpen] = useState(false);

    // State for subject management
    const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
    const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
    const [assignedSubjects, setAssignedSubjects] = useState<AssignedSubject[]>([]);
    const [subjectManagementTarget, setSubjectManagementTarget] = useState<{ type: 'class' | 'subclass'; id: number | string; name: string } | null>(null);

    // State for subclass details modal
    const [isSubclassDetailsModalOpen, setIsSubclassDetailsModalOpen] = useState(false);
    const [selectedSubclassForDetails, setSelectedSubclassForDetails] = useState<SubClass | null>(null);
    const [isLoadingSubclassDetails, setIsLoadingSubclassDetails] = useState(false);


    // --- SWR Data Fetching --- 
    const CLASSES_ENDPOINT = '/classes'; // Relative path
    const TEACHERS_ENDPOINT = '/users?role=TEACHER'; // Relative path

    const {
        data: classesApiResult,
        error: classesError,
        isLoading: isLoadingClassesData,
        mutate: mutateClasses
    } = useSWR<ApiResponse<any>>(CLASSES_ENDPOINT, (url: string) => apiService.get(url));

    const {
        data: teachersApiResult,
        error: teachersError,
        isLoading: isLoadingTeachersData
    } = useSWR<ApiResponse<any>>(TEACHERS_ENDPOINT, (url: string) => apiService.get(url));

    // Fetch all subjects once
    useEffect(() => {
        const fetchSubjects = async () => {
            try {
                const response = await apiService.get('/subjects');
                setAllSubjects(response.data || []);
            } catch (error) {
                console.error("Failed to fetch subjects:", error);
                toast.error("Could not load subjects.");
            }
        };
        fetchSubjects();
    }, []);

    // --- Process SWR Data --- 
    const classes = useMemo((): Class[] => {
        // Assuming apiService.get returns { data: [...] } structure matching ApiResponse
        if (!classesApiResult?.data) return [];
        return classesApiResult.data.map((cls: any): Class => ({
            id: cls.id,
            name: cls.name,
            firstTermFee: cls.first_term_fee ?? cls.firstTermFee ?? cls.first_installment ?? cls.firstInstallment ?? cls.base_fee ?? cls.baseFee ?? 0,
            secondTermFee: cls.second_term_fee ?? cls.secondTermFee ?? cls.second_installment ?? cls.secondInstallment ?? 0,
            thirdTermFee: cls.third_term_fee ?? cls.thirdTermFee ?? cls.third_installment ?? cls.thirdInstallment,
            newStudentAddFee: cls.newStudentFee ?? cls.new_student_fee ?? cls.newStudentAddFee ?? 0,
            oldStudentAddFee: cls.oldStudentFee ?? cls.old_student_fee ?? cls.oldStudentAddFee ?? 0,
            miscellaneousFee: cls.miscellaneous_fee ?? cls.miscellaneousFee ?? 0,
            studentCount: cls.student_count ?? cls.studentCount,
            subClasses: (cls.sub_classes || cls.subClasses)?.map((sub: any): SubClass => ({
                id: sub.id,
                name: sub.name,
                classId: sub.class_id || sub.classId || cls.id,
                studentCount: sub.student_count ?? sub.studentCount ?? 0,
                classMasterId: sub.class_master_id ?? sub.classMasterId ?? null,
                classMasterName: sub.classMaster?.name ?? sub.class_master?.name ?? null,
                subjects: sub.subjects || [], // Initialize subjects array
            })) || [],
        }));
    }, [classesApiResult]);

    const teachers = useMemo((): Teacher[] => {
        if (!teachersApiResult?.data) return [];
        return teachersApiResult.data.map((t: any) => ({ id: t.id, name: t.name }));
    }, [teachersApiResult]);

    // --- Consolidated Loading & Error --- 
    const isLoading = isLoadingClassesData || isLoadingTeachersData;
    const error = useMemo(() => {
        // apiService handles toasts for errors, this is for UI display if needed
        if (classesError && classesError.message !== 'Unauthorized') return `Failed to load classes: ${classesError.message}`;
        if (teachersError && teachersError.message !== 'Unauthorized') return `Failed to load teachers: ${teachersError.message}`;
        return null;
    }, [classesError, teachersError]);

    useEffect(() => {
        // Toasting is handled by apiService. This effect is for potential UI changes based on error.
        if (error) {
            console.error("Data fetching error:", error);
        }
    }, [error]);

    // --- Modal Handlers (remain largely the same) --- 
    const openAddClassModal = () => {
        setEditingClass(null);
        setIsClassModalOpen(true);
    };

    const openEditClassModal = (cls: Class) => {
        setEditingClass(cls);
        setIsClassModalOpen(true);
    };

    const openAddSubclassModal = (cls: Class) => {
        if (!cls.id) {
            toast.error("Cannot add subclass to a class without an ID.");
            return;
        }
        setEditingSubclass(null);
        setClassForSubclass({ id: cls.id, name: cls.name });
        setIsSubClassModalOpen(true);
    };

    const openEditSubclassModal = (subClass: SubClass, parentClassName: string) => {
        if (!subClass.classId) {
            toast.error("Subclass is missing parent class information.");
            return;
        }
        setEditingSubclass(subClass);
        setClassForSubclass({ id: subClass.classId, name: parentClassName });
        setIsSubClassModalOpen(true);
    };

    const closeModals = () => {
        setIsClassModalOpen(false);
        setIsSubClassModalOpen(false);
        setIsConfirmDeleteModalOpen(false);
        setIsSubclassDetailsModalOpen(false);
        setEditingClass(null);
        setClassForSubclass(null);
        setEditingSubclass(null);
        setClassToDelete(null);
        setSubClassToDelete(null);
        setSelectedSubclassForDetails(null);
        setIsLoadingSubclassDetails(false);
    };

    const openDeleteConfirmation = (item: Class | SubClass) => {
        if ('subClasses' in item) {
            setClassToDelete(item);
            setSubClassToDelete(null);
        } else {
            setSubClassToDelete(item);
            setClassToDelete(null);
        }
        setIsConfirmDeleteModalOpen(true);
    };

    // --- Subject Modal Handlers ---
    const openSubjectManagementModal = async (target: { type: 'class' | 'subclass'; id: number | string; name: string }) => {
        setSubjectManagementTarget(target);
        setIsLoadingMutation(true);
        try {
            let currentSubjects: AssignedSubject[] = [];
            if (target.type === 'subclass') {
                const response = await apiService.get(`/classes/sub-classes/${target.id}/subjects`);
                currentSubjects = response.data || [];
            }
            // For a class, we could fetch subjects for all its subclasses and find the common ones,
            // but for now, we'll start with an empty list and let the user decide.
            // A more advanced implementation could pre-select subjects common to all subclasses.
            setAssignedSubjects(currentSubjects);
            setIsSubjectModalOpen(true);
        } catch (error) {
            console.error(`Failed to fetch subjects for ${target.name}:`, error);
            toast.error(`Could not load subject data for ${target.name}.`);
        } finally {
            setIsLoadingMutation(false);
        }
    };

    const closeSubjectManagementModal = () => {
        setIsSubjectModalOpen(false);
        setAssignedSubjects([]);
        setSubjectManagementTarget(null);
    };

    // --- Subclass Details Modal Handlers ---
    const openSubclassDetailsModal = async (subclass: SubClass) => {
        setSelectedSubclassForDetails(subclass);
        setIsSubclassDetailsModalOpen(true);
        setIsLoadingSubclassDetails(true);

        // Fetch current subjects for this subclass
        if (subclass.id) {
            try {
                const response = await apiService.get(`/classes/sub-classes/${subclass.id}/subjects`);
                const subjectsWithCoefficients = response.data || [];

                // Update the subclass object with the fetched subjects
                setSelectedSubclassForDetails({
                    ...subclass,
                    subjects: subjectsWithCoefficients
                });
            } catch (error) {
                console.error(`Failed to fetch subjects for subclass ${subclass.name}:`, error);
                // Still show the modal, but without subjects
                toast.error(`Could not load subjects for ${subclass.name}`);
            } finally {
                setIsLoadingSubclassDetails(false);
            }
        } else {
            setIsLoadingSubclassDetails(false);
        }
    };

    const closeSubclassDetailsModal = () => {
        setIsSubclassDetailsModalOpen(false);
        setSelectedSubclassForDetails(null);
        setIsLoadingSubclassDetails(false);
    };

    const handleAssignSubjects = async (subjectsToAssign: { subjectId: number; coefficient: number }[]) => {
        if (!subjectManagementTarget) return;
        setIsLoadingMutation(true);

        const payload = {
            classId: subjectManagementTarget.type === 'class' ? subjectManagementTarget.id : undefined,
            subClassId: subjectManagementTarget.type === 'subclass' ? subjectManagementTarget.id : undefined,
            assignments: subjectsToAssign,
        };

        try {
            // The API docs suggest bulk assignment/update and bulk removal endpoints.
            // A single 'set' endpoint is often more efficient. Assuming a single endpoint for simplicity.
            // If API requires separate add/update and remove calls, this logic would need to be more complex.
            await apiService.post('/subjects/assignments/bulk', payload);

            toast.success(`Subjects for ${subjectManagementTarget.name} updated successfully.`);
            closeSubjectManagementModal();
            mutateClasses(); // Re-fetch classes to update UI
        } catch (error) {
            console.error("Failed to assign subjects:", error);
        } finally {
            setIsLoadingMutation(false);
        }
    };


    // --- CRUD Handlers --- 
    const handleCreateClass = async (formData: Omit<Class, 'id' | 'subClasses' | 'studentCount'>) => {
        setIsLoadingMutation(true);
        // Ensure formData keys match API expectations (e.g., snake_case or camelCase)
        const payload = {
            name: formData.name,
            first_term_fee: formData.firstTermFee,
            second_term_fee: formData.secondTermFee,
            third_term_fee: formData.thirdTermFee,
            new_student_fee: formData.newStudentAddFee,
            old_student_fee: formData.oldStudentAddFee,
            miscellaneous_fee: formData.miscellaneousFee
        };
        try {
            await apiService.post(CLASSES_ENDPOINT, payload);
            toast.success('Class created successfully.');
            closeModals();
            mutateClasses();
        } catch (error: any) {
            console.error("Class creation failed:", error);
        } finally {
            setIsLoadingMutation(false);
        }
    };

    const handleUpdateClass = async (formData: Omit<Class, 'id' | 'subClasses' | 'studentCount'>) => {
        if (!editingClass?.id) return;
        setIsLoadingMutation(true);
        const payload = {
            name: formData.name,
            first_term_fee: formData.firstTermFee,
            second_term_fee: formData.secondTermFee,
            third_term_fee: formData.thirdTermFee,
            new_student_fee: formData.newStudentAddFee,
            old_student_fee: formData.oldStudentAddFee,
            miscellaneous_fee: formData.miscellaneousFee
        };
        try {
            await apiService.put(`${CLASSES_ENDPOINT}/${editingClass.id}`, payload);
            toast.success('Class updated successfully.');
            closeModals();
            mutateClasses();
        } catch (error: any) {
            console.error("Class update failed:", error);
        } finally {
            setIsLoadingMutation(false);
        }
    };

    const executeDeleteClass = async (id: string | number) => {
        setIsLoadingMutation(true);
        try {
            await apiService.delete(`${CLASSES_ENDPOINT}/${id}`);
            toast.success('Class deleted successfully.');
            closeModals();
            mutateClasses();
        } catch (error: any) {
            console.error("Class deletion failed:", error);
        } finally {
            setIsLoadingMutation(false);
        }
    };

    // --- Subclass Handlers --- 
    const assignClassMaster = async (subclassId: number | string, teacherId: number) => {
        // This is a helper, not directly called by UI, so it can throw for the caller to handle
        await apiService.post(`/classes/sub-classes/${subclassId}/class-master`, { userId: teacherId });
        toast.success('Class master assigned.');
    };

    const removeClassMaster = async (subclassId: number | string) => {
        // This is a helper
        await apiService.delete(`/classes/sub-classes/${subclassId}/class-master`);
        toast.success('Class master removed.');
    };

    const handleCreateSubclass = async (formData: { name: string; classMasterId: number | null }) => {
        if (!classForSubclass?.id) return;
        setIsLoadingMutation(true);
        const payload = { name: formData.name };

        try {
            // Step 1: Create the subclass
            const createResponse = await apiService.post<{ data: { id: number } }>(`/classes/${classForSubclass.id}/sub-classes`, payload);
            const newSubclassId = createResponse.data.id;

            if (!newSubclassId) {
                throw new Error("Subclass created, but no ID was returned from the server.");
            }
            toast.success('Subclass created successfully.');

            // Step 2: If a class master is selected, assign them
            if (formData.classMasterId) {
                await assignClassMaster(newSubclassId, formData.classMasterId);
            }

            closeModals();
            mutateClasses();
        } catch (error: any) {
            console.error("Subclass creation process failed:", error);
            // The apiService should already be showing a toast on failure
        } finally {
            setIsLoadingMutation(false);
        }
    };

    const handleUpdateSubclass = async (formData: { name: string; classMasterId: number | null }) => {
        if (!editingSubclass?.id || !editingSubclass.classId) return;

        setIsLoadingMutation(true);
        const { id: subClassId, name: originalName, classMasterId: originalMasterId } = editingSubclass;
        const { name: newName, classMasterId: newMasterId } = formData;

        try {
            // Step 1: Update the subclass name if it has changed
            if (newName !== originalName) {
                await apiService.put(`/sub-classes/${subClassId}`, { name: newName });
                toast.success('Subclass name updated successfully.');
            }

            // Step 2: Handle Class Master assignment logic
            const masterHasChanged = newMasterId !== originalMasterId;

            if (masterHasChanged) {
                // If a new master is selected (and it's not null)
                if (newMasterId) {
                    await assignClassMaster(subClassId, newMasterId);
                }
                // If the master is being removed (set to null) and there was an original master
                else if (originalMasterId) {
                    await removeClassMaster(subClassId);
                }
            }

            closeModals();
            mutateClasses(); // Re-fetch all data to ensure UI is consistent
        } catch (error: any) {
            console.error("Subclass update process failed:", error);
        } finally {
            setIsLoadingMutation(false);
        }
    };

    const handleDeleteClass = () => {
        if (classToDelete?.id) {
            executeDeleteClass(classToDelete.id);
        }
    };

    const handleDeleteSubclass = () => {
        if (subClassToDelete) {
            executeDeleteSubclass(subClassToDelete);
        }
    };

    const executeDeleteSubclass = async (subClass: SubClass) => {
        setIsLoadingMutation(true);
        try {
            await apiService.delete(`/sub-classes/${subClass.id}`);
            toast.success('Subclass deleted successfully.');
            closeModals();
            mutateClasses();
        } catch (error: any) {
            console.error("Subclass deletion failed:", error);
        } finally {
            setIsLoadingMutation(false);
        }
    };

    // This single handler is called by the confirmation modal
    const handleDeleteClassOrSubclass = () => {
        if (classToDelete) {
            handleDeleteClass();
        } else if (subClassToDelete) {
            handleDeleteSubclass();
        }
    };

    return {
        classes,
        teachers,
        isLoading: isLoading || isLoadingMutation, // Combined loading state for UI
        isLoadingMutation, // Specific mutation loading for finer control if needed
        error,
        editingClass,
        isClassModalOpen,
        isSubClassModalOpen,
        classForSubclass,
        editingSubclass,
        isConfirmDeleteModalOpen,
        classToDelete,
        subClassToDelete,
        openAddClassModal,
        openEditClassModal,
        openAddSubclassModal,
        openEditSubclassModal,
        closeModals,
        openDeleteConfirmation,
        handleCreateClass,
        handleUpdateClass,
        // Pass the combined delete handler to the page
        handleDeleteClass: handleDeleteClassOrSubclass, // Renamed for clarity in page.tsx
        handleCreateSubclass,
        handleUpdateSubclass,
        handleDeleteSubclass: handleDeleteClassOrSubclass, // Connect modal's delete action

        // Subject management
        isSubjectModalOpen,
        openSubjectManagementModal,
        closeSubjectManagementModal,
        handleAssignSubjects,
        allSubjects,
        assignedSubjects,
        subjectManagementTarget,

        // Subclass details modal
        isSubclassDetailsModalOpen,
        selectedSubclassForDetails,
        openSubclassDetailsModal,
        closeSubclassDetailsModal,
        isLoadingSubclassDetails,
    };
}; 