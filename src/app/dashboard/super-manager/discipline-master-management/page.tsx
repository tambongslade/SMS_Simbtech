'use client';
import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

// --- Types --- 
type DisciplineMaster = {
    id: number;
    name: string;
    email?: string;
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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://192.168.1.103:4000/api/v1';
const getAuthToken = () => localStorage.getItem('token');

export default function DisciplineMasterManagement() {
    const [disciplineMasters, setDisciplineMasters] = useState<DisciplineMaster[]>([]);
    const [classes, setClasses] = useState<ClassInfo[]>([]);
    const [subClasses, setSubClasses] = useState<SubClassInfo[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
    const [selectedDm, setSelectedDm] = useState<DisciplineMaster | null>(null);
    const [selectedSubClassIdsInModal, setSelectedSubClassIdsInModal] = useState<number[]>([]);

    // --- Fetch Data ---
    const fetchData = async () => {
        setIsLoading(true);
        const token = getAuthToken();
        if (!token) { /* ... */ return; }

        try {
            // Fetch Discipline Masters
            // Updated to reflect the sample API response structure
            const dmResponse = await fetch(`${API_BASE_URL}/users?role=DISCIPLINE_MASTER`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!dmResponse.ok) throw new Error('Failed to fetch Discipline Masters');
            const dmResult = await dmResponse.json();
            console.log("DM API Response:", JSON.stringify(dmResult, null, 2));
            const fetchedDms = dmResult.data?.map((dm: any) => {
                // Explicitly map and log the IDs first
                const assignmentsArray = dm.disciplineMasterAssignments || [];
                const mappedIds = assignmentsArray.map((a: any) => a.subClassId);
                console.log(`Intermediate mapped IDs for DM ${dm.id}:`, mappedIds);

                return {
                    id: dm.id,
                    name: dm.name,
                    email: dm.email,
                    assignedSubClassIds: mappedIds
                };
            }) || [];
            setDisciplineMasters(fetchedDms);

            // Fetch Classes & SubClasses (same as VP management)
            const classResponse = await fetch(`${API_BASE_URL}/classes`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!classResponse.ok) throw new Error('Failed to fetch classes');
            const classResult = await classResponse.json();
            setClasses(classResult.data || []);

            const subClassResponse = await fetch(`${API_BASE_URL}/classes/sub-classes`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!subClassResponse.ok) throw new Error('Failed to fetch subClasses');
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
        const token = getAuthToken();
        if (!token) { /* ... */ return; }

        const dmId = selectedDm.id;
        const promises = [];

        // Additions
        for (const subClassId of assignmentsToAdd) {
            promises.push(
                fetch(`${API_BASE_URL}/users/${dmId}/assignments/discipline-master`, { // Use correct endpoint
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ subClassId: subClassId }),
                })
            );
        }

        // Removals
        for (const subClassId of assignmentsToRemove) {
            promises.push(
                fetch(`${API_BASE_URL}/users/${dmId}/assignments/discipline-master/${subClassId}`, { // Use correct endpoint
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` },
                })
            );
        }

        try {
            const results = await Promise.allSettled(promises);
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
                        // Log the error properly
                        result.value.json()
                           .then(err => {
                             const errorMsg = `Failed to ${action} subclass ${subClassId}: ${err.message || result.value.statusText}`;
                             console.error(errorMsg, err); // Log full error
                             errors.push(errorMsg);
                           })
                           .catch(() => {
                             const errorMsg = `Failed to ${action} subclass ${subClassId}: ${result.value.statusText}`;
                             console.error(errorMsg); // Log status text
                             errors.push(errorMsg);
                           });
                    }
                } else {
                    failureCount++;
                    const errorMsg = `Failed to ${action} subclass ${subClassId}: ${result.reason?.message || 'Network error'}`;
                    console.error(errorMsg, result.reason);
                    errors.push(errorMsg);
                }
            });

            // Display appropriate toast message based on outcome
             if (failureCount === 0) {
                 toast.success(`Assignments updated successfully for ${selectedDm.name}.`);
             } else if (successCount > 0) {
                 toast.error(`Assignments partially updated for ${selectedDm.name}. ${failureCount} errors occurred. Check console for details.`);
             } else {
                 toast.error(`Failed to update assignments for ${selectedDm.name}. Check console for details.`);
             }
             // Log errors to console if any occurred
             if (errors.length > 0) {
                 console.error("Assignment Update Errors:", errors);
             }

        } catch (error: any) {
            // Catch unexpected errors during Promise.allSettled or setup
            toast.error(`An unexpected error occurred: ${error.message}`);
            console.error("Unexpected assignment error:", error);
        } finally {
            // Ensure loading stops, modal closes, and data refreshes
            setIsLoading(false);
            closeAssignmentModal();
            fetchData(); 
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
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subclasses Assigned</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {isLoading && ( 
                                <tr><td colSpan={3} className="text-center py-4 text-gray-500 italic">Loading...</td></tr>
                             )}
                            {!isLoading && disciplineMasters.length === 0 && (
                                <tr><td colSpan={3} className="text-center py-4 text-gray-500">No Discipline Masters found.</td></tr>
                            )}
                            {disciplineMasters.map((dm) => (
                                <tr key={dm.id}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">{dm.name}</div>
                                        <div className="text-sm text-gray-500">{dm.email || '-'}</div>
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
                                            className="text-indigo-600 hover:text-indigo-900 disabled:opacity-50"
                                            disabled={isLoading}
                                        >
                                            Manage Assignments
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
        </div>
    );
}