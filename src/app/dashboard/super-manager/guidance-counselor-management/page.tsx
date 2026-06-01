'use client';
import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { PencilSquareIcon } from '@heroicons/react/24/outline';
import { EditGuidanceCounselorModal, GuidanceCounselorEditableFields } from './components/EditGuidanceCounselorModal';

// --- Types --- 
type GuidanceCounselor = {
    id: number;
    name: string;
    email?: string;
    phone?: string;
    username?: string;
    matricule?: string;
    // Store the IDs of currently assigned subclasses (Assumption)
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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://192.168.1.103:4000/api/v1';
const getAuthToken = () => localStorage.getItem('token');

export default function GuidanceCounselorManagement() {
    const [counselors, setCounselors] = useState<GuidanceCounselor[]>([]);
    const [classes, setClasses] = useState<ClassInfo[]>([]);
    const [subClasses, setSubClasses] = useState<SubClassInfo[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
    const [selectedCounselor, setSelectedCounselor] = useState<GuidanceCounselor | null>(null);
    const [selectedSubClassIdsInModal, setSelectedSubClassIdsInModal] = useState<number[]>([]);

    // --- State for Edit Counselor Modal ---
    const [isEditCounselorModalOpen, setIsEditCounselorModalOpen] = useState(false);
    const [editingCounselor, setEditingCounselor] = useState<GuidanceCounselor | null>(null);
    const [editCounselorFormData, setEditCounselorFormData] = useState<GuidanceCounselorEditableFields>({});

    // --- Fetch Data ---
    const fetchData = async () => {
        setIsLoading(true);
        const token = getAuthToken();
        if (!token) { /* ... */ return; }

        try {
            // Fetch Counselors
            // TODO: Verify endpoint and response structure (incl. assignments)
            const counselorResponse = await fetch(`${API_BASE_URL}/users?role=GUIDANCE_COUNSELOR`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!counselorResponse.ok) throw new Error('Failed to fetch Guidance Counselors');
            const counselorResult = await counselorResponse.json();
            const fetchedCounselors = counselorResult.data?.map((gc: any) => ({
                id: gc.id,
                name: gc.name,
                email: gc.email,
                phone: gc.phone,
                username: gc.username,
                matricule: gc.matricule,
                // TODO: Adjust mapping based on API response structure for assignments
                assignedSubClassIds: gc.guidanceCounselorAssignments?.map((a: any) => a.subClassId) || gc.assignments?.filter((a: any) => a.subClassId).map((a: any) => a.subClassId) || []
            })) || [];
            setCounselors(fetchedCounselors);

            // Fetch Classes & SubClasses
            const classResponse = await fetch(`${API_BASE_URL}/classes`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!classResponse.ok) throw new Error('Failed to fetch classes');
            const classResult = await classResponse.json();
            setClasses(classResult.data || []);

            const subClassResponse = await fetch(`${API_BASE_URL}/classes/sub-classes?limit=40`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!subClassResponse.ok) throw new Error('Failed to fetch subclasses');
            const subClassResult = await subClassResponse.json();
            setSubClasses(subClassResult.data || []);

        } catch (error: any) {
            toast.error(`Failed to load data: ${error.message}`);
            console.error("Data fetch error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // --- Modal Control ---
    const openAssignmentModal = (counselor: GuidanceCounselor) => {
        setSelectedCounselor(counselor);
        setSelectedSubClassIdsInModal(counselor.assignedSubClassIds || []);
        setIsAssignmentModalOpen(true);
    };

    const closeAssignmentModal = () => {
        setIsAssignmentModalOpen(false);
        setSelectedCounselor(null);
        setSelectedSubClassIdsInModal([]);
    };

    // --- Edit Counselor Modal Control ---
    const openEditCounselorModal = (counselor: GuidanceCounselor) => {
        setEditingCounselor(counselor);
        setEditCounselorFormData({
            name: counselor.name,
            email: counselor.email || '',
            phone: counselor.phone || '',
            username: counselor.username || '',
        });
        setIsEditCounselorModalOpen(true);
    };

    const closeEditCounselorModal = () => {
        setIsEditCounselorModalOpen(false);
        setEditingCounselor(null);
        setEditCounselorFormData({});
    };

    const handleEditCounselorInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setEditCounselorFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleUpdateCounselor = async () => {
        if (!editingCounselor || !editCounselorFormData) {
            toast.error("No Guidance Counselor selected for editing or form data is missing.");
            return;
        }
        if (!editCounselorFormData.name || !editCounselorFormData.email) {
            toast.error("Name and Email are required.");
            return;
        }

        setIsLoading(true);
        const token = getAuthToken();
        if (!token) {
            toast.error("Authentication required.");
            setIsLoading(false);
            return;
        }

        const payload = {
            name: editCounselorFormData.name,
            email: editCounselorFormData.email,
            phone: editCounselorFormData.phone || null,
            username: editCounselorFormData.username || null,
        };

        try {
            const response = await fetch(`${API_BASE_URL}/users/${editingCounselor.id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Failed to update Guidance Counselor' }));
                throw new Error(errorData.message);
            }

            toast.success(`Guidance Counselor ${editingCounselor.name} updated successfully.`);
            closeEditCounselorModal();
            fetchData();

        } catch (error: any) {
            toast.error(`Failed to update Guidance Counselor: ${error.message}`);
            console.error("Counselor update error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    // --- Assignment Handling ---
    const handleUpdateAssignments = async () => {
        if (!selectedCounselor) return;

        const originalAssignments = new Set(selectedCounselor.assignedSubClassIds || []);
        const newAssignments = new Set(selectedSubClassIdsInModal);

        const assignmentsToAdd = selectedSubClassIdsInModal.filter(id => !originalAssignments.has(id));
        const assignmentsToRemove = (selectedCounselor.assignedSubClassIds || []).filter(id => !newAssignments.has(id));

        if (assignmentsToAdd.length === 0 && assignmentsToRemove.length === 0) {
            toast("No changes in assignments detected.");
            closeAssignmentModal();
            return;
        }

        setIsLoading(true);
        const token = getAuthToken();
        if (!token) { /* ... */ return; }

        const counselorId = selectedCounselor.id;
        const promises = [];

        // !!! IMPORTANT: Verify these API endpoints for Guidance Counselors !!!
        const assignEndpoint = `${API_BASE_URL}/users/${counselorId}/assignments/guidance-counselor`; // Placeholder
        const removeEndpointBase = `${API_BASE_URL}/users/${counselorId}/assignments/guidance-counselor`; // Placeholder

        // Additions
        for (const subClassId of assignmentsToAdd) {
            console.log(`Assigning Counselor ${counselorId} to Subclass ${subClassId}`);
            promises.push(
                fetch(assignEndpoint, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ subClassId: subClassId }),
                })
            );
        }

        // Removals
        for (const subClassId of assignmentsToRemove) {
            console.log(`Removing Counselor ${counselorId} from Subclass ${subClassId}`);
            promises.push(
                fetch(`${removeEndpointBase}/${subClassId}`, { // Assumes DELETE {base}/{subClassId}
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` },
                })
            );
        }

        try {
            const results = await Promise.allSettled(promises);
            // ... (Error checking and reporting logic - same as DM/VP) ...
            let successCount = 0;
            let failureCount = 0;
            const errors: string[] = [];

            results.forEach((result, index) => {
                const isAdd = index < assignmentsToAdd.length;
                const subClassId = isAdd ? assignmentsToAdd[index] : assignmentsToRemove[index - assignmentsToAdd.length];
                const action = isAdd ? 'assign' : 'remove';

                if (result.status === 'fulfilled') {
                    if (result.value.ok) {
                        successCount++;
                    } else {
                        failureCount++;
                        result.value.json().then(err => errors.push(`Failed to ${action} subclass ${subClassId}: ${err.message || result.value.statusText}`)).catch(() => errors.push(`Failed to ${action} subclass ${subClassId}: ${result.value.statusText}`));
                    }
                } else {
                    failureCount++;
                    errors.push(`Failed to ${action} subclass ${subClassId}: ${result.reason?.message || 'Network error'}`);
                }
            });

            if (failureCount === 0) {
                toast.success(`Assignments updated successfully for ${selectedCounselor.name}.`);
            } else if (successCount > 0) {
                toast(`Assignments partially updated for ${selectedCounselor.name}. ${failureCount} errors occurred.`);
                console.error("Partial assignment errors:", errors);
            } else {
                toast.error(`Failed to update assignments for ${selectedCounselor.name}.`);
                console.error("Assignment errors:", errors);
            }

            closeAssignmentModal();
            fetchData();

        } catch (error: any) {
            toast.error(`An unexpected error occurred: ${error.message}`);
            console.error("Unexpected assignment error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    // --- JSX --- 
    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Updated Title */}
                <h1 className="text-2xl font-bold text-gray-900 mb-6">Guidance Counselor Management</h1>

                {/* Counselor List/Table */}
                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Matricule</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subclasses Assigned</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {isLoading && (
                                <tr><td colSpan={4} className="text-center py-4 text-gray-500 italic">Loading...</td></tr>
                            )}
                            {!isLoading && counselors.length === 0 && (
                                <tr><td colSpan={4} className="text-center py-4 text-gray-500">No Guidance Counselors found.</td></tr>
                            )}
                            {counselors.map((counselor) => (
                                <tr key={counselor.id}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">{counselor.name}</div>
                                        <div className="text-sm text-gray-500">{counselor.email || '-'}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {counselor.matricule ? (
                                            <span className="text-gray-700">{counselor.matricule}</span>
                                        ) : (
                                            <span className="text-gray-500 italic">empty</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-gray-700">
                                            {counselor.assignedSubClassIds?.length || 0} subclasses
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <button
                                            onClick={() => openAssignmentModal(counselor)}
                                            className="px-3 py-1 text-xs font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 mr-2"
                                            disabled={isLoading}
                                        >
                                            Manage Assignments
                                        </button>
                                        <button
                                            onClick={() => openEditCounselorModal(counselor)}
                                            className="px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                                            disabled={isLoading}
                                            title="Edit Guidance Counselor"
                                        >
                                            <PencilSquareIcon className="h-4 w-4 inline mr-1" /> Edit
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Assignment Modal */}
            {isAssignmentModalOpen && selectedCounselor && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
                    <div className="relative mx-auto p-8 border w-full max-w-2xl shadow-lg rounded-md bg-white">
                        {/* Updated Title */}
                        <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Assign Subclasses to: {selectedCounselor.name}</h3>

                        {/* Subclass Selection UI (Same as VP/DM) */}
                        <div className="max-h-96 overflow-y-auto space-y-4 p-4 border rounded-md mb-4">
                            {/* ... Same checkbox mapping logic ... */}
                            {classes.map(cls => {
                                const relevantSubClasses = subClasses.filter(sc => sc.classId === cls.id);
                                if (relevantSubClasses.length === 0) return null;
                                return (
                                    <div key={cls.id} className="mb-2">
                                        <h4 className="font-semibold text-gray-800 border-b pb-1 mb-2">{cls.name}</h4>
                                        <div className="pl-4 mt-1 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                                            {relevantSubClasses.map(subCls => (
                                                <div key={subCls.id} className="flex items-center">
                                                    <input
                                                        type="checkbox"
                                                        id={`subclass-${subCls.id}`}
                                                        checked={selectedSubClassIdsInModal.includes(subCls.id)}
                                                        onChange={(e) => {
                                                            const id = subCls.id;
                                                            setSelectedSubClassIdsInModal(prev =>
                                                                e.target.checked ? [...prev, id] : prev.filter(sid => sid !== id)
                                                            );
                                                        }}
                                                        className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                                    />
                                                    <label htmlFor={`subclass-${subCls.id}`} className="ml-2 text-sm text-gray-700">
                                                        {subCls.name}
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end space-x-3 pt-4 border-t">
                            {/* ... Cancel/Save buttons (call handleUpdateAssignments) ... */}
                            <button type="button" onClick={closeAssignmentModal} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300" disabled={isLoading}>
                                Cancel
                            </button>
                            <button type="button" onClick={handleUpdateAssignments} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50" disabled={isLoading}>
                                {isLoading ? 'Saving...' : 'Save Assignments'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Counselor Modal */}
            {isEditCounselorModalOpen && editingCounselor && (
                <EditGuidanceCounselorModal
                    isOpen={isEditCounselorModalOpen}
                    onClose={closeEditCounselorModal}
                    counselorData={editCounselorFormData}
                    onInputChange={handleEditCounselorInputChange}
                    onSubmit={handleUpdateCounselor}
                    isLoading={isLoading}
                    editingCounselorName={editingCounselor.name}
                />
            )}
        </div>
    );
} 