'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import useSWR, { useSWRConfig } from 'swr';
import { Class, SubClass } from '../types/class'; // Adjust import path as needed

// Define Teacher type locally for selection
type Teacher = {
    id: number;
    name: string;
};

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://192.168.1.103:4000/api/v1';
const getAuthToken = () => typeof window !== 'undefined' ? localStorage.getItem('token') : null; // Still need for mutations

// Interface for API responses (adjust based on actual structure)
interface ApiResponse<T> {
    data?: T[];
}

export const useClassManagement = () => {
    // --- UI State --- 
    const [isLoadingMutation, setIsLoadingMutation] = useState(false);
    const [editingClass, setEditingClass] = useState<Class | null>(null);
    const [isClassModalOpen, setIsClassModalOpen] = useState(false);
    const [isSubClassModalOpen, setIsSubClassModalOpen] = useState(false);
    const [classForSubclass, setClassForSubclass] = useState<{ id: string | number; name: string } | null>(null);
    const [editingSubclass, setEditingSubclass] = useState<SubClass | null>(null);
    const [classToDelete, setClassToDelete] = useState<Class | null>(null); // For delete confirmation
    const [subClassToDelete, setSubClassToDelete] = useState<SubClass | null>(null); // For delete confirmation
    const [isConfirmDeleteModalOpen, setIsConfirmDeleteModalOpen] = useState(false);

    // --- SWR Data Fetching --- 
    const CLASSES_ENDPOINT = `${API_BASE_URL}/classes`;
    const TEACHERS_ENDPOINT = `${API_BASE_URL}/users?role=TEACHER`;

    const { 
        data: classesApiResult, 
        error: classesError, 
        isLoading: isLoadingClassesData, 
        mutate: mutateClasses 
    } = useSWR<ApiResponse<any>>(CLASSES_ENDPOINT);

    const { 
        data: teachersApiResult, 
        error: teachersError, 
        isLoading: isLoadingTeachersData 
        // No need for mutateTeachers here unless we modify teachers via this hook
    } = useSWR<ApiResponse<any>>(TEACHERS_ENDPOINT);

    // --- Process SWR Data --- 
    const classes = useMemo((): Class[] => {
        if (!classesApiResult?.data) return [];
        // Use existing mapping logic
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
        if (classesError) return `Failed to load classes: ${classesError.message}`;
        if (teachersError) return `Failed to load teachers: ${teachersError.message}`;
        return null;
    }, [classesError, teachersError]);

    useEffect(() => {
        if (error) {
            toast.error(error);
        }
    }, [error]);

    // --- Modal Handlers --- 
    const openAddClassModal = () => {
        setEditingClass(null);
        setIsClassModalOpen(true);
    };
    
    const openEditClassModal = (cls: Class) => {
        setEditingClass(cls);
        setIsClassModalOpen(true);
    };
    
    const openAddSubclassModal = (cls: Class) => {
        if(!cls.id) {
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
        if ('subClasses' in item) { // Check if it's a Class object
            setClassToDelete(item);
            setSubClassToDelete(null);
        } else { // It's a SubClass object
            setSubClassToDelete(item);
            setClassToDelete(null);
        }
        setIsConfirmDeleteModalOpen(true);
    };

    // --- CRUD Handlers --- 
    const handleCreateClass = async (formData: Omit<Class, 'id' | 'subClasses' | 'studentCount'>) => {
        setIsLoadingMutation(true);
        const token = getAuthToken();
        const payload = { /* ... map formData to snake_case if needed ... */ };
        try {
            const response = await fetch(CLASSES_ENDPOINT, { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, 
                body: JSON.stringify(payload) 
            });
            if (!response.ok) throw new Error((await response.json()).message || 'Failed to create');
            toast.success('Class created successfully.');
            closeModals();
            mutateClasses(); // Revalidate classes list
        } catch (error: any) {
            toast.error(`Creation failed: ${error.message}`);
        } finally {
            setIsLoadingMutation(false);
        }
    };

    const handleUpdateClass = async (formData: Omit<Class, 'id' | 'subClasses' | 'studentCount'>) => {
        if (!editingClass?.id) return;
        setIsLoadingMutation(true);
        const token = getAuthToken();
        const payload = { /* ... map formData ... */ };
        try {
            const response = await fetch(`${CLASSES_ENDPOINT}/${editingClass.id}`, { 
                method: 'PUT', 
                headers: { /* ... */ 'Authorization': `Bearer ${token}` }, 
                body: JSON.stringify(payload) 
            });
            if (!response.ok) throw new Error((await response.json()).message || 'Failed to update');
            toast.success('Class updated successfully.');
            closeModals();
            mutateClasses(); // Revalidate
        } catch (error: any) {
            toast.error(`Update failed: ${error.message}`);
        } finally {
            setIsLoadingMutation(false);
        }
    };
    
    const executeDeleteClass = async (id: string | number) => {
        setIsLoadingMutation(true);
        const token = getAuthToken();
        try {
            const response = await fetch(`${CLASSES_ENDPOINT}/${id}`, { 
                method: 'DELETE', 
                headers: { 'Authorization': `Bearer ${token}` } 
            });
            if (!response.ok) throw new Error((await response.json()).message || 'Failed to delete');
            toast.success('Class deleted successfully.');
            closeModals(); // Close confirmation modal too
            mutateClasses(); // Revalidate
        } catch (error: any) {
            toast.error(`Deletion failed: ${error.message}`);
        } finally {
            setIsLoadingMutation(false);
        }
    };

    // --- Subclass Handlers --- 
    const handleCreateSubclass = async (formData: { name: string; classMasterId: number | null }) => {
        if (!classForSubclass?.id) return;
        setIsLoadingMutation(true);
        const token = getAuthToken();
        const payload = { name: formData.name }; // Initial create only sets name
        let newSubclassId: number | null = null;

        try {
             // 1. Create Subclass (POST /classes/{classId}/subclasses)
            const response = await fetch(`${API_BASE_URL}/classes/${classForSubclass.id}/subclasses`, { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, 
                body: JSON.stringify(payload) 
            });
            if (!response.ok) throw new Error((await response.json()).message || 'Failed to create subclass');
            const newSubclass = await response.json();
            newSubclassId = newSubclass?.data?.id;
            toast.success('Subclass created.');

             // 2. Assign Class Master if selected and ID exists
            if (formData.classMasterId && newSubclassId) {
                await assignClassMaster(newSubclassId, formData.classMasterId, token);
            }

            closeModals();
            mutateClasses(); // Revalidate the main classes list
        } catch (error: any) {
            toast.error(`Subclass creation failed: ${error.message}`);
        } finally {
            setIsLoadingMutation(false);
        }
    };

    const handleUpdateSubclass = async (formData: { name: string; classMasterId: number | null }) => {
        if (!editingSubclass?.id) return;
        setIsLoadingMutation(true);
        const token = getAuthToken();
        let nameUpdateError: string | null = null;
        let masterUpdateError: string | null = null;

        try {
            // Logic: Update name first, then handle master change separately
            // 1. Update Name (if changed)
            if (formData.name !== editingSubclass.name) {
                 const namePayload = { name: formData.name };
                 const nameResponse = await fetch(`${API_BASE_URL}/subclasses/${editingSubclass.id}`, { 
                    method: 'PUT', 
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, 
                    body: JSON.stringify(namePayload) 
                });
                if (!nameResponse.ok) {
                    nameUpdateError = (await nameResponse.json()).message || 'Failed to update subclass name';
                }
            }

             // 2. Update Class Master (if changed)
            const currentMasterId = editingSubclass.classMasterId;
            const newMasterId = formData.classMasterId;
            if (newMasterId !== currentMasterId) {
                if (newMasterId) { // Assign or change master
                    await assignClassMaster(editingSubclass.id, newMasterId, token);
                } else { // Remove master
                    await removeClassMaster(editingSubclass.id, token);
                }
            }

            // Combine results
            if (nameUpdateError || masterUpdateError) {
                throw new Error([nameUpdateError, masterUpdateError].filter(Boolean).join('; '));
            }
            
            toast.success('Subclass updated successfully.');
            closeModals();
            mutateClasses(); // Revalidate the main classes list
        } catch (error: any) {
             // If master update fails, assignClassMaster/removeClassMaster should toast
            if (!masterUpdateError) { // Avoid double toast if master failed
                 toast.error(`Subclass update failed: ${error.message}`);
            }
        } finally {
            setIsLoadingMutation(false);
        }
    };

    const executeDeleteSubclass = async (subClass: SubClass) => {
        if (!subClass?.id) return;
        setIsLoadingMutation(true);
        const token = getAuthToken();
        try {
            const response = await fetch(`${API_BASE_URL}/subclasses/${subClass.id}`, { 
                method: 'DELETE', 
                headers: { 'Authorization': `Bearer ${token}` } 
            });
            if (!response.ok) throw new Error((await response.json()).message || 'Failed to delete subclass');
            toast.success('Subclass deleted successfully.');
            closeModals(); // Close confirmation modal too
            mutateClasses(); // Revalidate
        } catch (error: any) {
            toast.error(`Subclass deletion failed: ${error.message}`);
        } finally {
            setIsLoadingMutation(false);
        }
    };

    // Helper for assigning class master
    const assignClassMaster = async (subclassId: number | string, teacherId: number, token: string | null) => {
         try {
            const response = await fetch(`${API_BASE_URL}/classes/sub-classes/${subclassId}/class-master`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ userId: teacherId })
            });
            if (!response.ok) throw new Error((await response.json()).message || 'Failed to assign class master');
            toast.success('Class Master assigned.');
         } catch (error: any) {
             toast.error(`Assign Master failed: ${error.message}`);
             throw error; // Re-throw to indicate failure in calling function
         }
    };

    // Helper for removing class master
    const removeClassMaster = async (subclassId: number | string, token: string | null) => {
        try {
            const response = await fetch(`${API_BASE_URL}/classes/sub-classes/${subclassId}/class-master`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error((await response.json()).message || 'Failed to remove class master');
            toast.success('Class Master removed.');
        } catch (error: any) {
            toast.error(`Remove Master failed: ${error.message}`);
            throw error; // Re-throw to indicate failure in calling function
        }
    };

    const confirmAndDelete = () => {
        if (classToDelete) {
            executeDeleteClass(classToDelete.id!);
        } else if (subClassToDelete) {
            executeDeleteSubclass(subClassToDelete);
        }
    };

    // --- Return Values --- 
    return {
        classes,
        teachers,
        isLoading, // Combined SWR loading state
        isLoadingMutation, // Separate mutation loading state
        error, // Combined SWR error state
        editingClass,
        isClassModalOpen,
        isSubClassModalOpen,
        classForSubclass,
        editingSubclass,
        classToDelete,
        subClassToDelete,
        isConfirmDeleteModalOpen,
        // Handlers
        openAddClassModal,
        openEditClassModal,
        openAddSubclassModal,
        openEditSubclassModal,
        closeModals,
        openDeleteConfirmation,
        handleCreateClass,
        handleUpdateClass,
        handleDeleteClass: confirmAndDelete,
        handleCreateSubclass,
        handleUpdateSubclass,
        handleDeleteSubclass: confirmAndDelete, // Renamed for clarity
    };
}; 