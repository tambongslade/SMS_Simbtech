'use client'
import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import useSWR, { useSWRConfig } from 'swr';

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

type Personnel = {
  id: number;
  name: string;
  roles: string[];
  username?: string;
  password?: string; // Only used for creation form
  email: string;
  phone?: string;
  status: 'active' | 'inactive';
  avatar?: string;
  department?: string;
  dateJoined?: string;
};

// Define form data type explicitly
type PersonnelFormData = Partial<Personnel & { gender: string; date_of_birth: string; address: string }>;

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://192.168.1.103:4000/api/v1';

export const usePersonnelManagement = () => {
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingPersonnel, setEditingPersonnel] = useState<Personnel | null>(null);
  const [userForRoleAssignment, setUserForRoleAssignment] = useState<{ id: number; name: string } | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [isConfirmDeleteModalOpen, setIsConfirmDeleteModalOpen] = useState(false);
  const [personnelToDelete, setPersonnelToDelete] = useState<{ id: number; name: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('all');
  const [formData, setFormData] = useState<PersonnelFormData>({
    name: '',
    username: '',
    password: '',
    email: '',
    phone: '',
    status: 'active',
    department: '',
    dateJoined: '',
    gender: '',
    date_of_birth: '',
    address: '',
  });

  const API_ENDPOINT = `${API_BASE_URL}/users`;

  const { 
    data: apiResult,
    error: fetchError,
    isLoading,
    mutate
  } = useSWR(API_ENDPOINT);

  const personnel = useMemo((): Personnel[] => {
    if (!apiResult?.data) {
      return [];
    }
    return apiResult.data.map((user: any): Personnel => ({
      id: user.id,
      name: user.name,
      email: user.email,
      roles: user.userRoles?.map((roleObj: any) => roleObj.role) || [],
      username: user.username,
      phone: user.phone,
      status: user.status === 'active' ? 'active' : 'inactive',
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
    }));
  }, [apiResult]);

  useEffect(() => {
    if (fetchError) {
      console.error("SWR Fetch Error:", fetchError);
      toast.error(`Failed to load personnel: ${fetchError.message}`);
    }
  }, [fetchError]);

  const openAddModal = () => {
    setEditingPersonnel(null);
    setFormData({
      name: '',
      username: '',
      password: '',
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
       password: '',
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
    if (!formData.name || !formData.email || !formData.password || !formData.gender || !formData.date_of_birth) {
       toast.error("Name, Email, Password, Gender, and Date of Birth are required.");
       return;
    }
    setIsLoading(true);

    const userData = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone || null,
        username: formData.username || null,
        gender: formData.gender,
        date_of_birth: formData.date_of_birth,
        address: formData.address || null,
    };

    console.log("Creating user:", userData);

    try {
       const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'Failed to create user');
        }

        const newUser = result.data;
        console.log("User created:", newUser);

        toast.success("User created successfully! Now assign roles.");
        mutate();
        setIsAddEditModalOpen(false);
        setUserForRoleAssignment({ id: newUser.id, name: newUser.name });
        setSelectedRoles([]);
        setIsRoleModalOpen(true);

    } catch (error: any) {
        console.error("User creation failed:", error);
        toast.error(`User creation failed: ${error.message}`);
    } finally {
        setIsLoading(false);
    }
  };

  const handleAssignRoles = async () => {
    if (!userForRoleAssignment || selectedRoles.length === 0) {
      toast.error("Please select at least one role.");
      return;
    }
    setIsLoading(true);
    const userId = userForRoleAssignment.id;
    const rolesToAssign = selectedRoles;

    console.log(`Setting roles [${rolesToAssign.join(', ')}] for user ID ${userId} for the current academic year`);

    try {
      const response = await fetch(`${API_BASE_URL}/users/${userId}/roles/academic-year`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ roles: rolesToAssign }),
      });

      if (!response.ok) {
         const errorData = await response.json().catch(() => ({ message: response.statusText }));
         throw new Error(errorData.message || `Failed to set roles (${response.status})`);
      }

      toast.success(`Roles updated successfully for ${userForRoleAssignment.name}!`);
      closeModal();
      mutate();

    } catch (error: any) {
      console.error("Role assignment failed:", error);
      toast.error(`Role assignment failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePersonnel = async () => {
    if (!editingPersonnel) return;
    setIsLoading(true);

    const userId = editingPersonnel.id;
    const updateData: Partial<PersonnelFormData> = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone || null,
      username: formData.username || null,
      status: formData.status,
    };

    console.log(`Updating personnel ID ${userId}:`, updateData);

    try {
        const response = await fetch(`${API_BASE_URL}/users/${userId}`, { 
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updateData),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: response.statusText }));
            throw new Error(errorData.message || `Failed to update personnel (${response.status})`);
        }

        toast.success("Personnel updated successfully!");
        closeModal();
        mutate();
    } catch (error: any) {
        console.error("Update failed:", error);
        toast.error(`Update failed: ${error.message}`);
    } finally {
        setIsLoading(false);
    }
  };

  const confirmAndDeletePersonnel = async () => {
    if (!personnelToDelete) return;
    setIsLoading(true);
    const { id, name } = personnelToDelete;
    console.log("Attempting to delete personnel with ID:", id);

    try {
        const response = await fetch(`${API_BASE_URL}/users/${id}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            let errorMessage = `Failed to delete ${name} (${response.status})`;
            try {
                const errorData = await response.json();
                errorMessage = errorData.error || errorData.message || errorMessage;
            } catch (e) {}
            throw new Error(errorMessage);
        }

        toast.success(`Personnel '${name}' deleted successfully!`);
        closeModal();
        mutate();
    } catch (error: any) {
        console.error("Failed to delete personnel:", error);
        toast.error(`Failed to delete personnel: ${error.message}`);
    } finally {
        setIsLoading(false);
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
                         person.email.toLowerCase().includes(searchLower) ||
                         (person.username && person.username.toLowerCase().includes(searchLower));
    const matchesRole = selectedRoleFilter === 'all' || person.roles.includes(selectedRoleFilter);
    return matchesSearch && matchesRole;
  });

  return {
    personnel,
    filteredPersonnel,
    isLoading,
    fetchError,
    isAddEditModalOpen,
    isRoleModalOpen,
    isConfirmDeleteModalOpen,
    editingPersonnel,
    userForRoleAssignment,
    selectedRoles,
    personnelToDelete,
    searchTerm,
    selectedRoleFilter,
    formData,
    roles,
    setSearchTerm,
    setSelectedRoleFilter,
    setFormData,
    setSelectedRoles,
    openAddModal,
    openEditModal,
    openRoleAssignmentModal,
    closeModal,
    openDeleteConfirmationModal,
    handleCreateUser,
    handleAssignRoles,
    handleUpdatePersonnel,
    confirmAndDeletePersonnel,
    handleRoleSelectionChange,
  };
}; 