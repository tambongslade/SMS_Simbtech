'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import useSWR, { useSWRConfig } from 'swr';
import { Class, SubClass } from '../types/class';
import apiService from '../../../../../lib/apiService'; // Import apiService

// Define Teacher type locally for selection
type Teacher = {
    id: number;
    name: string;
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

    // --- Process SWR Data --- 
    const classes = useMemo((): Class[] => {
        // Assuming apiService.get returns { data: [...] } structure matching ApiResponse
        if (!classesApiResult?.data) return [];
        return classesApiResult.data.map((cls: any): Class => ({
            id: cls.id,
            name: cls.name,
            level: cls.level,
            firstTermFee: cls.first_term_fee ?? cls.firstTermFee ?? cls.first_installment ?? cls.firstInstallment ?? cls.base_fee ?? cls.baseFee ?? 0,
            secondTermFee: cls.second_term_fee ?? cls.secondTermFee ?? cls.second_installment ?? cls.secondInstallment ?? 0,
            thirdTermFee: cls.third_term_fee ?? cls.thirdTermFee ?? cls.third_installment ?? cls.thirdInstallment,
            newStudentAddFee: cls.new_student_add_fee ?? cls.newStudentAddFee ?? 0,
            oldStudentAddFee: cls.old_student_add_fee ?? cls.oldStudentAddFee ?? 0,
            miscellaneousFee: cls.miscellaneous_fee ?? cls.miscellaneousFee ?? 0,
            studentCount: cls.student_count ?? cls.studentCount,
            subClasses: (cls.sub_classes || cls.subClasses)?.map((sub: any): SubClass => ({
                id: sub.id,
                name: sub.name,
                classId: sub.class_id || sub.classId || cls.id,
                studentCount: sub.student_count ?? sub.studentCount ?? 0,
                classMasterId: sub.class_master_id ?? sub.classMasterId ?? null,
                classMasterName: sub.classMaster?.name ?? sub.class_master?.name ?? null,
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
        setEditingClass(null);
        setClassForSubclass(null);
        setEditingSubclass(null);
        setClassToDelete(null);
        setSubClassToDelete(null);
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

    // --- CRUD Handlers --- 
    const handleCreateClass = async (formData: Omit<Class, 'id' | 'subClasses' | 'studentCount'>) => {
        setIsLoadingMutation(true);
        // Ensure formData keys match API expectations (e.g., snake_case or camelCase)
        const payload = {
            name: formData.name,
            level: formData.level,
            first_term_fee: formData.firstTermFee,
            second_term_fee: formData.secondTermFee,
            third_term_fee: formData.thirdTermFee,
            new_student_add_fee: formData.newStudentAddFee,
            old_student_add_fee: formData.oldStudentAddFee,
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
            level: formData.level,
            first_term_fee: formData.firstTermFee,
            second_term_fee: formData.secondTermFee,
            third_term_fee: formData.thirdTermFee,
            new_student_add_fee: formData.newStudentAddFee,
            old_student_add_fee: formData.oldStudentAddFee,
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
        let newSubclassId: number | null = null;

        try {
            const createResponse = await apiService.post<{ data?: { id: number } }>(`/classes/${classForSubclass.id}/sub-classes`, payload);
            newSubclassId = createResponse?.data?.id ?? null;
            if (!newSubclassId) throw new Error("Subclass created but ID not returned.");
            toast.success('Subclass created.');

            if (formData.classMasterId && newSubclassId) {
                await assignClassMaster(newSubclassId, formData.classMasterId);
            }
            closeModals();
            mutateClasses();
        } catch (error: any) {
            console.error("Subclass creation failed:", error);
        } finally {
            setIsLoadingMutation(false);
        }
    };

    const handleUpdateSubclass = async (formData: { name: string; classMasterId: number | null }) => {
        if (!editingSubclass?.id || !editingSubclass.classId) return;
        setIsLoadingMutation(true);
        const payload = { name: formData.name };
        const subId = editingSubclass.id;
        const currentMasterId = editingSubclass.classMasterId;
        const newMasterId = formData.classMasterId;

        try {
            // 1. Update Subclass Name (if changed)
            if (formData.name !== editingSubclass.name) {
                await apiService.put(`/classes/${editingSubclass.classId}/sub-classes/${subId}`, payload);
                toast.success('Subclass name updated.');
            }

            // 2. Update Class Master (if changed)
            if (newMasterId !== currentMasterId) {
                if (newMasterId) {
                    await assignClassMaster(subId, newMasterId);
                } else if (currentMasterId) { // Only remove if there was one
                    await removeClassMaster(subId);
                }
            }
            closeModals();
            mutateClasses();
        } catch (error: any) {
            console.error("Subclass update failed:", error);
        } finally {
            setIsLoadingMutation(false);
        }
    };

    const executeDeleteSubclass = async (subClass: SubClass) => {
        if (!subClass?.id || !subClass.classId) return;
        setIsLoadingMutation(true);
        try {
            await apiService.delete(`/classes/${subClass.classId}/sub-classes/${subClass.id}`);
            toast.success('Subclass deleted successfully.');
            closeModals();
            mutateClasses();
        } catch (error: any) {
            console.error("Subclass deletion failed:", error);
        } finally {
            setIsLoadingMutation(false);
        }
    };

    // Combined delete handler for modal
    const handleDeleteClassOrSubclass = () => {
        if (classToDelete && classToDelete.id) {
            executeDeleteClass(classToDelete.id);
        } else if (subClassToDelete && subClassToDelete.id) {
            executeDeleteSubclass(subClassToDelete);
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
        handleDeleteSubclass: handleDeleteClassOrSubclass, // Can be the same if context is clear or rename if needed
    };
}; 