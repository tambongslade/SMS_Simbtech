'use client';
import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { PencilSquareIcon } from '@heroicons/react/24/outline';
import { EditDisciplineMasterModal, DisciplineMasterEditableFields } from './components/EditDisciplineMasterModal';
import apiService from '../../../../lib/apiService';

// --- Types --- 
type DisciplineMaster = {
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

export default function DisciplineMasterManagement() {
    const [disciplineMasters, setDisciplineMasters] = useState<DisciplineMaster[]>([]);
    const [classes, setClasses] = useState<ClassInfo[]>([]);
    const [subClasses, setSubClasses] = useState<SubClassInfo[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
    const [selectedDm, setSelectedDm] = useState<DisciplineMaster | null>(null);
    const [selectedSubClassIdsInModal, setSelectedSubClassIdsInModal] = useState<number[]>([]);

    // --- State for Edit DM Modal ---
    const [isEditDmModalOpen, setIsEditDmModalOpen] = useState(false);
    const [editingDm, setEditingDm] = useState<DisciplineMaster | null>(null);
    const [editDmFormData, setEditDmFormData] = useState<DisciplineMasterEditableFields>({});

    const DM_ENDPOINT = '/users?role=DISCIPLINE_MASTER';
    const CLASSES_ENDPOINT = '/classes';
    const SUBCLASSES_ENDPOINT = '/classes/sub-classes';

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [dmResult, classResult, subClassResult] = await Promise.all([
                apiService.get<{ data: any[] }>(DM_ENDPOINT),
                apiService.get<{ data: ClassInfo[] }>(CLASSES_ENDPOINT),
                apiService.get<{ data: SubClassInfo[] }>(SUBCLASSES_ENDPOINT)
            ]);

            console.log("DM API Response:", JSON.stringify(dmResult, null, 2));
            const fetchedDms = dmResult.data?.map((dm: any) => ({
                id: dm.id,
                name: dm.name,
                email: dm.email,
                phone: dm.phone,
                username: dm.username,
                matricule: dm.matricule,
                assignedSubClassIds: (dm.disciplineMasterAssignments || []).map((a: any) => a.subClassId)
            })) || [];
            setDisciplineMasters(fetchedDms);
            setClasses(classResult.data || []);
            setSubClasses(subClassResult.data || []);

        } catch (error: any) {
            console.error("Data fetch error:", error);
            // apiService handles toasting for auth errors, specific UI error for others
            if (error.message !== 'Unauthorized') {
                toast.error(`Failed to load data: ${error.message}`);
            }
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // --- Modal Control ---
    const openAssignmentModal = (dm: DisciplineMaster) => {
        setSelectedDm(dm);
        setSelectedSubClassIdsInModal(dm.assignedSubClassIds || []);
        setIsAssignmentModalOpen(true);
    };

    const closeAssignmentModal = () => {
        setIsAssignmentModalOpen(false);
        setSelectedDm(null);
        setSelectedSubClassIdsInModal([]);
    };

    // --- Edit DM Modal Control ---
    const openEditDmModal = (dm: DisciplineMaster) => {
        setEditingDm(dm);
        setEditDmFormData({
            name: dm.name,
            email: dm.email || '',
            phone: dm.phone || '',
            username: dm.username || '',
        });
        setIsEditDmModalOpen(true);
    };

    const closeEditDmModal = () => {
        setIsEditDmModalOpen(false);
        setEditingDm(null);
        setEditDmFormData({});
    };

    const handleEditDmInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setEditDmFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleUpdateDm = async () => {
        if (!editingDm || !editDmFormData.name || !editDmFormData.email) {
            toast.error("Name and Email are required, and a Discipline Master must be selected.");
            return;
        }
        setIsLoading(true);
        const payload = {
            name: editDmFormData.name,
            email: editDmFormData.email,
            phone: editDmFormData.phone || null,
            username: editDmFormData.username || null,
        };
        try {
            await apiService.put(`/users/${editingDm.id}`, payload);
            toast.success(`Discipline Master ${editingDm.name} updated successfully.`);
            closeEditDmModal();
            fetchData();
        } catch (error: any) {
            console.error("DM update error:", error);
            // apiService handles toast
        } finally {
            setIsLoading(false);
        }
    };

    // --- Assignment Handling ---
    const handleUpdateAssignments = async () => {
        if (!selectedDm) return;
        const originalAssignments = new Set(selectedDm.assignedSubClassIds || []);
        const newAssignments = new Set(selectedSubClassIdsInModal);
        const assignmentsToAdd = selectedSubClassIdsInModal.filter(id => !originalAssignments.has(id));
        const assignmentsToRemove = (selectedDm.assignedSubClassIds || []).filter(id => !newAssignments.has(id));

        if (assignmentsToAdd.length === 0 && assignmentsToRemove.length === 0) {
            toast("No changes in assignments detected.");
            closeAssignmentModal();
            return;
        }
        setIsLoading(true);
        const dmId = selectedDm.id;
        const promises = [];

        for (const subClassId of assignmentsToAdd) {
            promises.push(apiService.post(`/users/${dmId}/assignments/discipline-master`, { subClassId }));
        }
        for (const subClassId of assignmentsToRemove) {
            promises.push(apiService.delete(`/users/${dmId}/assignments/discipline-master/${subClassId}`));
        }

        try {
            const results = await Promise.allSettled(promises);
            let successCount = 0;
            let failureCount = 0;

            results.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                    successCount++;
                } else {
                    failureCount++;
                    console.error("Assignment error:", result.reason);
                    // Individual errors are handled by apiService if they throw, or logged here
                }
            });

            if (failureCount > 0) {
                toast.error(`${failureCount} assignment ances failed. Check console for details.`);
            }
            if (successCount > 0) {
                toast.success(`${successCount} assignment changes applied successfully.`);
            }
            if (failureCount === 0 && successCount === 0) { // Should not happen if initial check passes
                toast("No effective assignment changes made.");
            }

            fetchData(); // Refresh all data
        } catch (error) {
            // This catch is for Promise.allSettled itself, though unlikely here.
            console.error("Overall assignment update error:", error);
            toast.error("An unexpected error occurred while updating assignments.");
        } finally {
            setIsLoading(false);
            closeAssignmentModal();
        }
    };

    // --- JSX --- 
    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Updated Title */}
                <h1 className="text-2xl font-bold text-gray-900 mb-6">Discipline Master Management</h1>

                {/* DM List/Table */}
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
                            {!isLoading && disciplineMasters.length === 0 && (
                                <tr><td colSpan={4} className="text-center py-4 text-gray-500">No Discipline Masters found.</td></tr>
                            )}
                            {disciplineMasters.map((dm) => (
                                <tr key={dm.id}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">{dm.name}</div>
                                        <div className="text-sm text-gray-500">{dm.email || '-'}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {dm.username ? (
                                            <span className="text-gray-700">{dm.username}</span>
                                        ) : (
                                            <span className="text-gray-500 italic">empty</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-gray-700">
                                            {dm.assignedSubClassIds?.length || 0} subclasses
                                            {/* Optional: Display names if needed, might get long */}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <button
                                            onClick={() => openAssignmentModal(dm)}
                                            className="px-3 py-1 text-xs font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 mr-2"
                                            disabled={isLoading}
                                        >
                                            Manage Assignments
                                        </button>
                                        <button
                                            onClick={() => openEditDmModal(dm)}
                                            className="px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                                            disabled={isLoading}
                                            title="Edit Discipline Master"
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
            {isAssignmentModalOpen && selectedDm && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
                    <div className="relative mx-auto p-8 border w-full max-w-2xl shadow-lg rounded-md bg-white">
                        {/* Updated Title */}
                        <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Assign Subclasses to: {selectedDm.name}</h3>

                        {/* Subclass Selection UI (Same as VP) */}
                        <div className="max-h-96 overflow-y-auto space-y-4 p-4 border rounded-md mb-4">
                            {classes.map(cls => {
                                const relevantSubClasses = subClasses.filter(sc => sc.classId === cls.id);
                                if (relevantSubClasses.length === 0) return null;
                                return (
                                    <div key={cls.id} className="mb-2">
                                        <h4 className="font-semibold text-gray-800 border-b pb-1 mb-2">{cls.name}</h4>
                                        <div className="pl-4 mt-1 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                                            {relevantSubClasses.map(subCls => {
                                                const isChecked = selectedSubClassIdsInModal.includes(subCls.id);
                                                // console.log(`Modal Check: Subclass ID=${subCls.id} (Type: ${typeof subCls.id}), Name='${subCls.name}'. Assigned IDs: ${JSON.stringify(selectedSubClassIdsInModal)}. Is Checked: ${isChecked}`);
                                                return (
                                                    <div key={subCls.id} className="flex items-center">
                                                        <input
                                                            type="checkbox"
                                                            id={`subclass-${subCls.id}`}
                                                            checked={isChecked}
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
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end space-x-3 pt-4 border-t">
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

            {/* Edit DM Modal */}
            {isEditDmModalOpen && editingDm && (
                <EditDisciplineMasterModal
                    isOpen={isEditDmModalOpen}
                    onClose={closeEditDmModal}
                    disciplineMasterData={editDmFormData}
                    onInputChange={handleEditDmInputChange}
                    onSubmit={handleUpdateDm}
                    isLoading={isLoading}
                    editingDisciplineMasterName={editingDm.name}
                />
            )}
        </div>
    );
}