'use client';
import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { PencilSquareIcon } from '@heroicons/react/24/outline';
import { EditVicePrincipalModal, VicePrincipalEditableFields } from './components/EditVicePrincipalModal';
import { RoleManagementFilters } from './components/RoleManagementFilters';
import apiService from '../../../../lib/apiService';

// TODO: Define necessary types (VicePrincipal, Class, SubClass, Assignment)

type VicePrincipal = {
    id: number;
    name: string;
    email?: string;
    phone?: string;
    username?: string;
    matricule?: string;
    // Store the IDs of currently assigned subclasses
    assignedSubClassIds?: number[];
};

type ClassInfo = {
    id: number;
    name: string;
};

type SubClassInfo = {
    id: number;
    name: string;
    classId: number;
    className?: string;
};

type AcademicYear = {
    id: number;
    name: string;
};

export default function VicePrincipalManagement() {
    const [vicePrincipals, setVicePrincipals] = useState<VicePrincipal[]>([]);
    const [classes, setClasses] = useState<ClassInfo[]>([]);
    const [subClasses, setSubClasses] = useState<SubClassInfo[]>([]);
    const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
    const [selectedVp, setSelectedVp] = useState<VicePrincipal | null>(null);
    // Only need state for selected subclass IDs in the modal
    const [selectedSubClassIdsInModal, setSelectedSubClassIdsInModal] = useState<number[]>([]);

    // --- State for Edit VP Modal ---
    const [isEditVpModalOpen, setIsEditVpModalOpen] = useState(false);
    const [editingVp, setEditingVp] = useState<VicePrincipal | null>(null);
    const [editVpFormData, setEditVpFormData] = useState<VicePrincipalEditableFields>({});

    // Filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedAcademicYear, setSelectedAcademicYear] = useState('');

    // --- Fetch Data ---
    const fetchData = async () => {
        setIsLoading(true);
        try {
            // Build API parameters
            const params = new URLSearchParams();
            params.append('role', 'VICE_PRINCIPAL');
            if (searchTerm.trim()) {
                params.append('search', searchTerm.trim());
            }
            if (selectedAcademicYear) {
                params.append('academicYearId', selectedAcademicYear);
            }

            // Fetch VPs - **CRITICAL**: Ensure response includes VP's current assignments
            const vpResult = await apiService.get(`/users?${params.toString()}`);
            const fetchedVps = vpResult.data?.map((vp: any) => ({
                id: vp.id,
                name: vp.name,
                email: vp.email,
                phone: vp.phone,
                username: vp.username,
                matricule: vp.matricule,
                // Map from the specific assignment array
                assignedSubClassIds: vp.vicePrincipalAssignments?.map((a: any) => a.subClassId) || []
            })) || [];
            setVicePrincipals(fetchedVps);

            // Fetch Classes
            const classResult = await apiService.get('/classes');
            setClasses(classResult.data || []);

            // Fetch SubClasses
            const subClassResult = await apiService.get('/classes/sub-classes');
            setSubClasses(subClassResult.data || []);

        } catch (error: any) {
            toast.error(`Failed to load data: ${error.message}`);
            console.error("Data fetch error:", error);
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

    // --- Assignment Modal Handlers ---
    const openAssignmentModal = (vp: VicePrincipal) => {
        setSelectedVp(vp);
        setSelectedSubClassIdsInModal(vp.assignedSubClassIds || []);
        setIsAssignmentModalOpen(true);
    };

    const closeAssignmentModal = () => {
        setIsAssignmentModalOpen(false);
        setSelectedVp(null);
        setSelectedSubClassIdsInModal([]);
    };

    const handleSubClassToggle = (subClassId: number) => {
        setSelectedSubClassIdsInModal(prev =>
            prev.includes(subClassId)
                ? prev.filter(id => id !== subClassId)
                : [...prev, subClassId]
        );
    };

    const saveAssignments = async () => {
        if (!selectedVp) return;

        setIsLoading(true);
        try {
            // Call the assignment API with selected subclass IDs
            const assignmentData = { subclassIds: selectedSubClassIdsInModal };
            await apiService.post(`/users/${selectedVp.id}/assignments/VICE_PRINCIPAL`, assignmentData);

            toast.success(`Vice Principal assignments updated successfully.`);
            closeAssignmentModal();
            fetchData(); // Refresh data
        } catch (error: any) {
            toast.error(`Failed to update assignments: ${error.message}`);
            console.error("Assignment save error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    // --- Edit VP Modal Handlers ---
    const openEditVpModal = (vp: VicePrincipal) => {
        setEditingVp(vp);
        setEditVpFormData({
            name: vp.name,
            email: vp.email,
            phone: vp.phone,
            username: vp.username,
            matricule: vp.matricule,
        });
        setIsEditVpModalOpen(true);
    };

    const closeEditVpModal = () => {
        setIsEditVpModalOpen(false);
        setEditingVp(null);
        setEditVpFormData({});
    };

    const handleUpdateVp = async () => {
        if (!editingVp) return;

        setIsLoading(true);
        try {
            await apiService.put(`/users/${editingVp.id}`, editVpFormData);
            toast.success(`Vice Principal updated successfully.`);
            closeEditVpModal();
            fetchData(); // Refresh data
        } catch (error: any) {
            toast.error(`Failed to update VP: ${error.message}`);
            console.error("VP update error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-lg shadow-sm">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Vice Principal Management</h1>
                        <p className="text-gray-600 mt-1">Manage vice principal assignments and class allocations.</p>
                        {selectedAcademicYear && (
                            <div className="mt-2 text-sm text-gray-500">
                                Academic Year: {academicYears.find(ay => String(ay.id) === selectedAcademicYear)?.name || 'Unknown'}
                            </div>
                        )}
                    </div>
                </div>

                {/* Filters Section */}
                <RoleManagementFilters
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    academicYears={academicYears}
                    selectedAcademicYear={selectedAcademicYear}
                    setSelectedAcademicYear={setSelectedAcademicYear}
                    isLoading={isLoading}
                    resultCount={vicePrincipals.length}
                    roleName="Vice Principals"
                    searchPlaceholder="Search by name, email, matricule..."
                />

                {isLoading && <p className="text-center text-gray-500 py-4">Loading vice principals...</p>}

                {!isLoading && (
                    <div className="bg-white shadow-md rounded-lg overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned Subclasses</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {vicePrincipals.length === 0 && !isLoading ? (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                                            No vice principals found matching your criteria
                                        </td>
                                    </tr>
                                ) : (
                                    vicePrincipals.map((vp) => (
                                        <tr key={vp.id}>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{vp.name}</td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{vp.email || '-'}</td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{vp.phone || '-'}</td>
                                            <td className="px-4 py-4 text-sm text-gray-500">
                                                {vp.assignedSubClassIds && vp.assignedSubClassIds.length > 0 ? (
                                                    <ul className="space-y-1 max-w-xs">
                                                        {vp.assignedSubClassIds.map(subClassId => {
                                                            const subClass = subClasses.find(sc => sc.id === subClassId);
                                                            return (
                                                                <li key={subClassId} className="truncate text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full inline-block mr-1 mb-1" title={subClass ? `${subClass.name} (${subClass.className})` : `SubClass ${subClassId}`}>
                                                                    {subClass ? `${subClass.name} (${subClass.className})` : `SubClass ${subClassId}`}
                                                                </li>
                                                            );
                                                        })}
                                                    </ul>
                                                ) : (
                                                    <span className="text-gray-400 italic">None</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                                <button
                                                    onClick={() => openAssignmentModal(vp)}
                                                    disabled={isLoading}
                                                    title="Manage Subclass Assignments"
                                                    className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                                                >
                                                    Manage Assignments
                                                </button>
                                                <button
                                                    onClick={() => openEditVpModal(vp)}
                                                    disabled={isLoading}
                                                    title="Edit Vice Principal Details"
                                                    className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
                                                >
                                                    <PencilSquareIcon className="h-4 w-4 mr-1" />
                                                    Edit
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Assignment Modal */}
            {isAssignmentModalOpen && selectedVp && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
                    <div className="relative bg-white p-6 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-medium text-gray-900">
                                Manage Assignments: {selectedVp.name}
                            </h3>
                            <button onClick={closeAssignmentModal} className="text-gray-400 hover:text-gray-600">
                                <span className="sr-only">Close</span>
                                &#x2715;
                            </button>
                        </div>

                        <div className="space-y-4">
                            <p className="text-sm text-gray-600">
                                Select the subclasses that {selectedVp.name} should oversee:
                            </p>

                            <div className="max-h-60 overflow-y-auto border border-gray-200 rounded p-3">
                                {subClasses.map((subClass) => (
                                    <label key={subClass.id} className="flex items-center space-x-3 py-2">
                                        <input
                                            type="checkbox"
                                            checked={selectedSubClassIdsInModal.includes(subClass.id)}
                                            onChange={() => handleSubClassToggle(subClass.id)}
                                            className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                        />
                                        <span className="text-sm text-gray-700">
                                            {subClass.name} ({subClass.className})
                                        </span>
                                    </label>
                                ))}
                            </div>

                            <div className="flex justify-end space-x-3 pt-4">
                                <button
                                    onClick={closeAssignmentModal}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
                                    disabled={isLoading}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={saveAssignments}
                                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                                    disabled={isLoading}
                                >
                                    {isLoading ? 'Saving...' : 'Save Assignments'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit VP Modal */}
            {isEditVpModalOpen && editingVp && (
                <EditVicePrincipalModal
                    isOpen={isEditVpModalOpen}
                    onClose={closeEditVpModal}
                    onSubmit={handleUpdateVp}
                    vicePrincipalData={editVpFormData}
                    onInputChange={(e) => {
                        const { name, value } = e.target;
                        setEditVpFormData(prev => ({ ...prev, [name]: value }));
                    }}
                    editingVicePrincipalName={editingVp.name}
                    isLoading={isLoading}
                />
            )}
        </div>
    );
} 