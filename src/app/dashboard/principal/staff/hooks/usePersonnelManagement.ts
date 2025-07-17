'use client'
import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import useSWR, { useSWRConfig } from 'swr';
import apiService from '../../../../../lib/apiService';
import { useAuth } from '../../../../../components/context/AuthContext';

// Define types locally or import them
const roles = [
  { value: 'SUPER_MANAGER', label: 'Super Manager' },
  { value: 'MANAGER', label: 'Manager' },
  { value: 'PRINCIPAL', label: 'Principal' },
  { value: 'VICE_PRINCIPAL', label: 'Vice Principal' },
  { value: 'TEACHER', label: 'Teacher' },
  { value: 'BURSAR', label: 'Bursar' },
  { value: 'DISCIPLINE_MASTER', label: 'Discipline Master' },
  { value: 'GUIDANCE_COUNSELOR', label: 'Guidance Counselor' },
  { value: 'PARENT', label: 'Parent' },
];

export type Personnel = {
  id: number;
  name: string;
  roles: string[];
  email: string;
  phone?: string;
  matricule?: string;
  status: 'active' | 'inactive';
  avatar?: string;
  department?: string;
  dateJoined?: string;
  gender: string;
  date_of_birth: string;
  address: string;
};

// Define form data type explicitly
export type PersonnelFormData = Partial<Personnel & { gender: string; date_of_birth: string; address: string }>;

// Define StudentLinkInfo type for fetching students list
export type StudentLinkInfo = {
  id: number;
  name: string;
  matricule?: string;
};

export const usePersonnelManagement = () => {
  const { selectedAcademicYear } = useAuth(); // Get selected academic year from AuthContext
  
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingPersonnel, setEditingPersonnel] = useState<Personnel | null>(null);
  const [userForRoleAssignment, setUserForRoleAssignment] = useState<{ id: number; name: string } | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [isConfirmDeleteModalOpen, setIsConfirmDeleteModalOpen] = useState(false);
  const [personnelToDelete, setPersonnelToDelete] = useState<{ id: number; name: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [formData, setFormData] = useState<PersonnelFormData>({
    name: '',
    email: '',
    phone: '',
    status: 'active',
    department: '',
    dateJoined: '',
    gender: '',
    date_of_birth: '',
    address: '',
  });

  const [isMutating, setIsMutating] = useState(false);

  // Use the selected academic year from AuthContext in the API endpoint
  const academicYearId = selectedAcademicYear?.id || '';
  const API_ENDPOINT = `/users?page=${currentPage}&limit=${itemsPerPage}&role=${selectedRoleFilter === 'all' ? '' : selectedRoleFilter}&search=${searchTerm}&academicYearId=${academicYearId}`;

  const {
    data: apiResult,
    error: fetchError,
    isLoading: isSWRLoading,
    mutate
  } = useSWR(API_ENDPOINT, (url) => apiService.get(url));

  const { personnel, totalPages, totalItems } = useMemo(() => {
    if (!apiResult?.data) {
      return { personnel: [], totalPages: 0, totalItems: 0 };
    }
    const personnelList = apiResult.data.map((user: any): Personnel => ({
      id: user.id,
      name: user.name,
      email: user.email,
      roles: user.userRoles?.map((roleObj: any) => roleObj.role) || [],
      phone: user.phone,
      matricule: user.matricule,
      status: typeof user.status === 'string' && user.status.toLowerCase() === 'active' ? 'active' : 'inactive',
      department: user.department,
      dateJoined: typeof user.date_joined === 'string' ? user.date_joined :
        user.createdAt ? (
          typeof user.createdAt === 'string' ?
            user.createdAt.split('T')[0] :
            (() => {
              try {
                const date = new Date(user.createdAt);
                return !isNaN(date.getTime()) ? date.toISOString().split('T')[0] : undefined;
              } catch (e) {
                return undefined;
              }
            })()
        ) : undefined,
      gender: user.gender,
      date_of_birth: user.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split('T')[0] : '',
      address: user.address,
    }));

    const total = apiResult.meta?.total || 0;
    const calculatedTotalPages = Math.ceil(total / itemsPerPage);

    return { personnel: personnelList, totalPages: calculatedTotalPages, totalItems: total };
  }, [apiResult, itemsPerPage]);

  useEffect(() => {
    if (fetchError) {
      console.error("SWR Fetch Error:", fetchError);
      toast.error(`Failed to load personnel: ${fetchError.message}`);
    }
  }, [fetchError]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedRoleFilter, searchTerm]);

  const openAddModal = () => {
    setEditingPersonnel(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      status: 'active',
      department: '',
      dateJoined: '',
      gender: '',
      date_of_birth: '',
      address: '',
    });
    setIsAddEditModalOpen(true);
  };

  const openEditModal = (person: Personnel) => {
    setEditingPersonnel(person);
    setFormData({
      ...person,
      gender: (person as any).gender || '',
      date_of_birth: (person as any).date_of_birth || '',
      address: (person as any).address || '',
    });
    setIsAddEditModalOpen(true);
  };

  const openRoleAssignmentModal = (person: { id: number; name: string; roles: string[] }) => {
    setUserForRoleAssignment({ id: person.id, name: person.name });
    setSelectedRoles(person.roles || []);
    setIsRoleModalOpen(true);
  };

  const closeModal = () => {
    setIsAddEditModalOpen(false);
    setIsRoleModalOpen(false);
    setIsConfirmDeleteModalOpen(false);
    setEditingPersonnel(null);
    setUserForRoleAssignment(null);
    setSelectedRoles([]);
    setFormData({});
    setPersonnelToDelete(null);
  };

  const openDeleteConfirmationModal = (person: { id: number; name: string }) => {
    setPersonnelToDelete(person);
    setIsConfirmDeleteModalOpen(true);
  };

  const handleCreateUser = async () => {
    if (!formData.name || !formData.email || !formData.gender || !formData.date_of_birth) {
      toast.error("Name, Email, Gender, and Date of Birth are required.");
      return;
    }
    setIsMutating(true);

    const userData = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone || undefined,
      matricule: formData.matricule || undefined,
      gender: formData.gender,
      date_of_birth: formData.date_of_birth,
      address: formData.address || undefined,
    };

    console.log("Creating user via /auth/register:", userData);

    try {
      const result = await apiService.post<any>(`/auth/register`, userData);
      const newUser = result.data;
      console.log("User created via register endpoint:", newUser);
      toast.success("User created successfully! Now assign roles.");
      mutate();
      setIsAddEditModalOpen(false);
      setUserForRoleAssignment({ id: newUser.id, name: newUser.name });
      setSelectedRoles(newUser.userRoles?.map((r: any) => r.role) || []);
      setIsRoleModalOpen(true);
    } catch (error: any) {
      console.error("User creation via /auth/register failed:", error);
    } finally {
      setIsMutating(false);
    }
  };

  const handleAssignRoles = async () => {
    if (!userForRoleAssignment || selectedRoles.length === 0) {
      toast.error("Please select at least one role.");
      return;
    }
    setIsMutating(true);
    const userId = userForRoleAssignment.id;
    const rolesToAssign = selectedRoles;

    console.log(`Setting roles [${rolesToAssign.join(', ')}] for user ID ${userId} for the current academic year`);

    try {
      await apiService.put(`/users/${userId}/roles/academic-year`, { roles: rolesToAssign });
      toast.success(`Roles updated successfully for ${userForRoleAssignment.name}!`);
      closeModal();
      mutate();
    } catch (error: any) {
      console.error("Role assignment failed:", error);
    } finally {
      setIsMutating(false);
    }
  };

  const handleUpdatePersonnel = async () => {
    if (!editingPersonnel) return;
    setIsMutating(true);

    const userId = editingPersonnel.id;
    const updateData: Partial<PersonnelFormData> = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone || undefined,
      matricule: formData.matricule || undefined,
      status: formData.status,
    };

    console.log(`Updating personnel ID ${userId}:`, updateData);

    try {
      await apiService.put(`/users/${userId}`, updateData);
      toast.success("Personnel updated successfully!");
      closeModal();
      mutate();
    } catch (error: any) {
      console.error("Update failed:", error);
    } finally {
      setIsMutating(false);
    }
  };

  const confirmAndDeletePersonnel = async () => {
    if (!personnelToDelete) return;
    setIsMutating(true);
    const { id, name } = personnelToDelete;
    console.log("Attempting to delete personnel with ID:", id);

    try {
      await apiService.delete(`/users/${id}`);
      toast.success(`Personnel '${name}' deleted successfully!`);
      closeModal();
      mutate();
    } catch (error: any) {
      console.error("Failed to delete personnel:", error);
    } finally {
      setIsMutating(false);
    }
  };

  const handleRoleSelectionChange = (roleValue: string) => {
    setSelectedRoles(prev =>
      prev.includes(roleValue)
        ? prev.filter(r => r !== roleValue)
        : [...prev, roleValue]
    );
  };

  const filteredPersonnel = personnel.filter((person) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = person.name.toLowerCase().includes(searchLower) ||
      person.email.toLowerCase().includes(searchLower);
    const matchesRole = selectedRoleFilter === 'all' || person.roles.includes(selectedRoleFilter);
    return matchesSearch && matchesRole;
  });

  // Ensure all state and functions used by the page are returned here
  return {
    personnel,
    isLoading: isSWRLoading,
    isMutating,
    fetchError,
    searchTerm,
    setSearchTerm,
    selectedRoleFilter,
    setSelectedRoleFilter,
    roles,
    isAddEditModalOpen,
    editingPersonnel,
    formData,
    setFormData,
    openAddModal,
    openEditModal,
    handleCreateUser,
    handleUpdatePersonnel,
    isRoleModalOpen,
    userForRoleAssignment,
    selectedRoles,
    setSelectedRoles,
    openRoleAssignmentModal,
    handleAssignRoles,
    handleRoleSelectionChange,
    isConfirmDeleteModalOpen,
    personnelToDelete,
    openDeleteConfirmationModal,
    confirmAndDeletePersonnel,
    closeModal,
    mutate,
    // Pagination
    currentPage,
    setCurrentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    setItemsPerPage,
    // Academic year (for display purposes)
    selectedAcademicYear,
  };
};