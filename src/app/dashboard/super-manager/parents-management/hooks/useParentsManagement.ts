'use client'
import { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import useSWR from 'swr';

// Types (can be shared or defined locally)
export type ParentUser = {
    id: number;
    name: string;
    email: string;
    phone?: string;
    username?: string;
    // Add other relevant fields from your User model if needed for display
};

export type StudentLinkInfo = {
    id: number;
    name: string;
    matricule?: string;
};

export type SubClassFilterInfo = {
    id: number;
    name: string;
    className?: string; // Name of the parent class (e.g., Form 1)
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://192.168.1.103:4000/api/v1';
const getAuthToken = () => localStorage.getItem('token'); // Ensure this is accessible

const fetcher = async (url: string) => {
    const token = getAuthToken();
    const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) {
        const error = new Error('An error occurred while fetching the data.') as any;
        try {
            error.info = await res.json();
        } catch (e) {
            error.info = { message: res.statusText }; // Fallback if res.json() fails
        }
        error.status = res.status;
        throw error;
    }
    return res.json();
};

export const useParentsManagement = () => {
    const { data: apiResult, error: fetchError, isLoading: parentsLoading, mutate: mutateParents } =
        useSWR(`${API_BASE_URL}/users?role=PARENT`, fetcher);

    const [allStudents, setAllStudents] = useState<StudentLinkInfo[]>([]);
    const [isLinkStudentModalOpen, setIsLinkStudentModalOpen] = useState(false);
    const [linkingParentUser, setLinkingParentUser] = useState<ParentUser | null>(null);
    const [selectedStudentToLink, setSelectedStudentToLink] = useState<string>('');
    const [actionLoading, setActionLoading] = useState(false);
    const [studentsLoading, setStudentsLoading] = useState(false); // For student list in modal

    // --- State for Student Filters in Modal ---
    const [studentNameFilter, setStudentNameFilter] = useState('');
    const [studentSubClassFilter, setStudentSubClassFilter] = useState<string>('all'); // 'all' or subclass ID
    const [subClassesForFilter, setSubClassesForFilter] = useState<SubClassFilterInfo[]>([]);

    // --- State for View Students Modal (on Parents Management page) ---
    const [isViewStudentsModalOpen, setIsViewStudentsModalOpen] = useState(false);
    const [viewingStudentsForParent, setViewingStudentsForParent] = useState<ParentUser | null>(null);
    const [linkedStudentsList, setLinkedStudentsList] = useState<StudentLinkInfo[]>([]); // Students linked to the specific parent
    const [viewStudentsLoading, setViewStudentsLoading] = useState(false);

    // --- State for Edit Parent Modal ---
    const [isEditParentModalOpen, setIsEditParentModalOpen] = useState(false);
    const [editingParentUser, setEditingParentUser] = useState<ParentUser | null>(null);
    // Define a more specific type for edit form data if needed, or reuse ParentUser fields
    const [editParentFormData, setEditParentFormData] = useState<Partial<ParentUser>>({});

    const parents: ParentUser[] = useMemo(() => {
        return apiResult?.data?.map((user: any) => ({
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            username: user.username,
        })) || [];
    }, [apiResult]);

    useEffect(() => {
        if (fetchError) {
            console.error("SWR Fetch Error (Parents):", fetchError);
            toast.error(`Failed to load parents: ${fetchError.info?.message || fetchError.message}`);
        }
    }, [fetchError]);

    // --- Fetch SubClasses for the filter dropdown ---
    const fetchSubClassesForFilter = async () => {
        console.log("Fetching subclasses for filter...");
        const token = getAuthToken();
        if (!token) return;
        // Consider adding a loading state for subclasses if needed
        try {
            const response = await fetch(`${API_BASE_URL}/classes/sub-classes?limit=40`, {
                headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
            });
            if (!response.ok) throw new Error('Failed to fetch subclasses for filter');
            const result = await response.json();
            const fetchedSubClasses = result.data?.map((sc: any) => ({
                id: sc.id,
                name: sc.name,
                className: sc.class?.name,
            })) || [];
            setSubClassesForFilter(fetchedSubClasses);
            console.log("Subclasses for filter fetched:", fetchedSubClasses.length);
        } catch (error: any) {
            console.error("Failed to fetch subclasses for filter:", error);
            toast.error(`Failed to load subclasses for filter: ${error.message}`);
            setSubClassesForFilter([]);
        }
    };

    // --- Fetch Students for Linking (with filters) ---
    const fetchAllStudentsForLinking = useCallback(async (nameSearch = studentNameFilter, subClassIdFilter = studentSubClassFilter) => {
        console.log(`Fetching students for linking... Name: '${nameSearch}', SubClassID: '${subClassIdFilter}'`);
        const token = getAuthToken();
        if (!token) {
            toast.error("Authentication required to fetch students.");
            return;
        }
        setStudentsLoading(true);
        try {
            const params = new URLSearchParams();
            params.append('limit', '50'); // Fetch a reasonable number, or make it dynamic
            if (nameSearch) {
                params.append('name', nameSearch); // Assuming API supports partial name search
            }
            if (subClassIdFilter && subClassIdFilter !== 'all') {
                params.append('subClassId', subClassIdFilter);
            }

            const response = await fetch(`${API_BASE_URL}/students?${params.toString()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Failed to fetch students' }));
                throw new Error(errorData.message);
            }
            const result = await response.json();
            const fetchedStudents = result.data?.map((s: any) => ({
                id: s.id,
                name: s.name,
                matricule: s.matricule,
            })) || [];
            setAllStudents(fetchedStudents);
            console.log("Students for linking fetched:", fetchedStudents.length);
        } catch (error: any) {
            console.error("Failed to fetch students for linking:", error);
            toast.error(`Failed to load students: ${error.message}`);
            setAllStudents([]);
        } finally {
            setStudentsLoading(false);
        }
    }, [studentNameFilter, studentSubClassFilter]); // Dependencies for useCallback

    const openLinkStudentModal = (parent: ParentUser) => {
        setLinkingParentUser(parent);
        setSelectedStudentToLink('');
        setStudentNameFilter(''); // Reset filters
        setStudentSubClassFilter('all'); // Reset filters

        if (subClassesForFilter.length === 0) {
            fetchSubClassesForFilter();
        }
        // Fetch initial student list (or fetch when user types/selects filter)
        fetchAllStudentsForLinking('', 'all'); // Fetch with no filters initially or based on preference
        setIsLinkStudentModalOpen(true);
    };

    const closeLinkStudentModal = () => {
        setIsLinkStudentModalOpen(false);
        setLinkingParentUser(null);
        setSelectedStudentToLink('');
        setAllStudents([]); // Clear student list on modal close
    };

    // --- Debounced search for student name filter ---
    useEffect(() => {
        // Only trigger search if modal is open and name filter has content
        if (isLinkStudentModalOpen) {
            const handler = setTimeout(() => {
                if (studentNameFilter) { // Fetch only if there's a name to search
                    fetchAllStudentsForLinking(studentNameFilter, studentSubClassFilter);
                } else if (studentSubClassFilter !== 'all') { // Or if only subclass filter is active
                    fetchAllStudentsForLinking('', studentSubClassFilter);
                } else if (!studentNameFilter && studentSubClassFilter === 'all') {
                    setAllStudents([]); // Clear if no filters and no name
                }
            }, 500); // 500ms debounce

            return () => {
                clearTimeout(handler);
            };
        }
    }, [studentNameFilter, studentSubClassFilter, isLinkStudentModalOpen, fetchAllStudentsForLinking]);

    const handleLinkToStudent = async () => {
        if (!linkingParentUser || !selectedStudentToLink) {
            toast.error("Parent and Student must be selected.");
            return;
        }
        setActionLoading(true);
        const token = getAuthToken();
        if (!token) {
            toast.error("Authentication required.");
            setActionLoading(false);
            return;
        }

        const parentId = linkingParentUser.id;
        const studentId = selectedStudentToLink;
        console.log(`Linking parent ID ${parentId} to student ID ${studentId}`);

        try {
            const response = await fetch(`${API_BASE_URL}/students/${studentId}/parents`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ parentId: parentId }), // Use parentId directly
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'Failed to link parent to student');
            toast.success(`Parent ${linkingParentUser.name} linked successfully to student!`);
            closeLinkStudentModal();
            // Consider re-fetching parent's details if the parent page shows linked students.
        } catch (error: any) {
            console.error("Parent to student linking failed:", error);
            toast.error(`Linking failed: ${error.message}`);
        } finally {
            setActionLoading(false);
        }
    };

    // --- Fetch Students for a Specific Parent (for ViewStudentsModal) ---
    const fetchStudentsForParent = async (parentId: number) => {
        console.log(`Fetching students linked to parent ID ${parentId}...`);
        const token = getAuthToken();
        if (!token) {
            toast.error("Authentication required.");
            return;
        }
        setViewStudentsLoading(true);
        setLinkedStudentsList([]); // Clear previous list
        try {
            const response = await fetch(`${API_BASE_URL}/users/${parentId}/students`, {
                headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Failed to fetch students for parent' }));
                throw new Error(errorData.message);
            }
            const result = await response.json();
            // Assuming result.data is an array of students linked to the parent
            const fetchedLinkedStudents = result.data?.map((s: any) => ({
                id: s.id,
                name: s.name,
                matricule: s.matricule, // Include matricule if available and useful
                // Add other student details if needed for display in the modal
            })) || [];
            setLinkedStudentsList(fetchedLinkedStudents);
            console.log("Linked students fetched:", fetchedLinkedStudents.length);
        } catch (error: any) {
            console.error("Failed to fetch students for parent:", error);
            toast.error(`Failed to load linked students: ${error.message}`);
            setLinkedStudentsList([]);
        } finally {
            setViewStudentsLoading(false);
        }
    };

    // --- Modal Control for ViewStudentsModal ---
    const openViewStudentsModal = (parent: ParentUser) => {
        setViewingStudentsForParent(parent);
        fetchStudentsForParent(parent.id);
        setIsViewStudentsModalOpen(true);
    };

    const closeViewStudentsModal = () => {
        setIsViewStudentsModalOpen(false);
        setViewingStudentsForParent(null);
        setLinkedStudentsList([]); // Clear the list when modal closes
    };

    // --- Unlink Student from Parent (called from ViewStudentsModal) ---
    const handleUnlinkStudentFromParent = async (studentIdToUnlink: number, parentToUpdate: ParentUser) => {
        console.log(`Unlinking student ID ${studentIdToUnlink} from parent ID ${parentToUpdate.id}`);
        toast.loading('Unlinking student...', { id: 'unlink-student-toast' });
        setActionLoading(true); // General action loading for this operation
        const token = getAuthToken();
        if (!token) {
            toast.error("Authentication required.", { id: 'unlink-student-toast' });
            setActionLoading(false);
            return;
        }

        try {
            // API: DELETE /students/:studentId/parents/:parentId
            const response = await fetch(`${API_BASE_URL}/students/${studentIdToUnlink}/parents/${parentToUpdate.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Failed to unlink student' }));
                throw new Error(errorData.message);
            }

            toast.success('Student unlinked successfully!', { id: 'unlink-student-toast' });
            // Refresh the list of students in the modal
            setLinkedStudentsList(prev => prev.filter(student => student.id !== studentIdToUnlink));
            // If the parent page itself shows a count of linked students, you might need to mutateParents() or re-fetch parent data.

        } catch (error: any) {
            console.error("Student unlinking failed:", error);
            toast.error(`Unlinking failed: ${error.message}`, { id: 'unlink-student-toast' });
        } finally {
            setActionLoading(false);
        }
    };

    // --- Modal Control for EditParentModal ---
    const openEditParentModal = (parent: ParentUser) => {
        setEditingParentUser(parent);
        setEditParentFormData({
            name: parent.name,
            email: parent.email,
            phone: parent.phone || '',
            username: parent.username || '',
            // Do not spread parent here if it contains non-editable fields like id
        });
        setIsEditParentModalOpen(true);
    };

    const closeEditParentModal = () => {
        setIsEditParentModalOpen(false);
        setEditingParentUser(null);
        setEditParentFormData({});
    };

    const handleEditParentInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setEditParentFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleUpdateParent = async () => {
        if (!editingParentUser || !editParentFormData) {
            toast.error("No parent selected for editing or form data is missing.");
            return;
        }

        // Basic validation (e.g., name and email are required)
        if (!editParentFormData.name || !editParentFormData.email) {
            toast.error("Parent name and email are required.");
            return;
        }

        console.log(`Updating parent ID ${editingParentUser.id} with data:`, editParentFormData);
        toast.loading('Updating parent...', { id: 'update-parent-toast' });
        setActionLoading(true);
        const token = getAuthToken();
        if (!token) {
            toast.error("Authentication required.", { id: 'update-parent-toast' });
            setActionLoading(false);
            return;
        }

        // Construct payload: only send fields that are meant to be updated.
        // API should ignore `id` in payload or handle it appropriately.
        const payload = {
            name: editParentFormData.name,
            email: editParentFormData.email,
            phone: editParentFormData.phone || null, // Send null if empty
            username: editParentFormData.username || null, // Send null if empty
            // Add any other editable fields here
        };

        try {
            const response = await fetch(`${API_BASE_URL}/users/${editingParentUser.id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Failed to update parent' }));
                throw new Error(errorData.message);
            }

            toast.success('Parent updated successfully!', { id: 'update-parent-toast' });
            mutateParents(); // Re-fetch/re-validate the parents list with SWR
            closeEditParentModal();

        } catch (error: any) {
            console.error("Parent update failed:", error);
            toast.error(`Update failed: ${error.message}`, { id: 'update-parent-toast' });
        } finally {
            setActionLoading(false);
        }
    };

    return {
        parents,
        isLoading: parentsLoading || actionLoading, // Combine loading states for simplicity in page
        fetchError,
        allStudents,
        studentsLoading, // Specific loading for student list in modal
        isLinkStudentModalOpen,
        linkingParentUser,
        selectedStudentToLink,
        // Filters and Setters for Modal
        studentNameFilter,
        setStudentNameFilter,
        studentSubClassFilter,
        setStudentSubClassFilter,
        subClassesForFilter,
        // Modal Actions
        setSelectedStudentToLink,
        openLinkStudentModal,
        closeLinkStudentModal,
        handleLinkToStudent,
        mutateParents,
        fetchAllStudentsForLinking, // Expose if manual refresh needed

        // For View Students Modal
        isViewStudentsModalOpen,
        viewingStudentsForParent,
        linkedStudentsList,
        viewStudentsLoading,
        openViewStudentsModal,
        closeViewStudentsModal,
        handleUnlinkStudentFromParent,

        // For Edit Parent Modal
        isEditParentModalOpen,
        editingParentUser,
        editParentFormData,
        openEditParentModal,
        closeEditParentModal,
        handleEditParentInputChange,
        handleUpdateParent,
    };
}; 