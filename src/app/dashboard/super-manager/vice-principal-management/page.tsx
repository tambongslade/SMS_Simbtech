'use client';
import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

// TODO: Define necessary types (VicePrincipal, Class, SubClass, Assignment)

type VicePrincipal = {
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

export default function VicePrincipalManagement() {
    const [vicePrincipals, setVicePrincipals] = useState<VicePrincipal[]>([]);
    const [classes, setClasses] = useState<ClassInfo[]>([]);
    const [subClasses, setSubClasses] = useState<SubClassInfo[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
    const [selectedVp, setSelectedVp] = useState<VicePrincipal | null>(null);
    // Only need state for selected subclass IDs in the modal
    const [selectedSubClassIdsInModal, setSelectedSubClassIdsInModal] = useState<number[]>([]);

    // --- Fetch Data ---
    const fetchData = async () => {
        setIsLoading(true);
        const token = getAuthToken();
        if (!token) {
            toast.error("Authentication required.");
            setIsLoading(false);
            return;
        }

        try {
            // Fetch VPs - **CRITICAL**: Ensure response includes VP's current assignments
            // Example assumes response looks like: { data: [ { id: 1, name: 'VP Name', assignments: [{ subClassId: 5 }, { subClassId: 8 }] } ] }
            const vpResponse = await fetch(`${API_BASE_URL}/users?role=VICE_PRINCIPAL`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!vpResponse.ok) throw new Error('Failed to fetch Vice Principals');
            const vpResult = await vpResponse.json();
            const fetchedVps = vpResult.data?.map((vp: any) => ({
                id: vp.id,
                name: vp.name,
                email: vp.email,
                // Map from the specific assignment array
                assignedSubClassIds: vp.vicePrincipalAssignments?.map((a: any) => a.subClassId) || [] 
            })) || [];
            setVicePrincipals(fetchedVps);

            // Fetch Classes
            const classResponse = await fetch(`${API_BASE_URL}/classes`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!classResponse.ok) throw new Error('Failed to fetch classes');
            const classResult = await classResponse.json();
            setClasses(classResult.data || []);

            // Fetch SubClasses
            const subClassResponse = await fetch(`${API_BASE_URL}/classes/sub-classes`, { headers: { 'Authorization': `Bearer ${token}` } });
            console.log("SubClass Response:", subClassResponse);
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
    const openAssignmentModal = (vp: VicePrincipal) => {
        setSelectedVp(vp);
        // Initialize modal state with the VP's current assignments
        setSelectedSubClassIdsInModal(vp.assignedSubClassIds || []);
        setIsAssignmentModalOpen(true);
    };

    const closeAssignmentModal = () => {
        setIsAssignmentModalOpen(false);
        setSelectedVp(null);
        setSelectedSubClassIdsInModal([]);
    };

    // --- Assignment Handling (Revised) ---
    const handleUpdateAssignments = async () => {
        if (!selectedVp) return;

        const originalAssignments = new Set(selectedVp.assignedSubClassIds || []);
        const newAssignments = new Set(selectedSubClassIdsInModal);

        const assignmentsToAdd = selectedSubClassIdsInModal.filter(id => !originalAssignments.has(id));
        const assignmentsToRemove = (selectedVp.assignedSubClassIds || []).filter(id => !newAssignments.has(id));

        if (assignmentsToAdd.length === 0 && assignmentsToRemove.length === 0) {
            toast("No changes in assignments detected.");
            closeAssignmentModal();
            return;
        }

        setIsLoading(true);
        const token = getAuthToken();
        if (!token) { 
            toast.error("Authentication required.");
            setIsLoading(false); 
            return; 
        }

        const vpId = selectedVp.id;
        const promises = [];

        // Create POST promises for additions
        for (const subClassId of assignmentsToAdd) {
            console.log(`Assigning VP ${vpId} to Subclass ${subClassId}`);
            promises.push(
                fetch(`${API_BASE_URL}/users/${vpId}/assignments/vice-principal`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ subClassId: subClassId }),
                })
            );
        }

        // Create DELETE promises for removals
        for (const subClassId of assignmentsToRemove) {
            console.log(`Removing VP ${vpId} from Subclass ${subClassId}`);
            promises.push(
                fetch(`${API_BASE_URL}/users/${vpId}/assignments/vice-principal/${subClassId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                })
            );
        }

        try {
            const results = await Promise.allSettled(promises);
            console.log("Assignment results:", results);

            let successCount = 0;
            let failureCount = 0;
            const errors: string[] = [];

            results.forEach((result, index) => {
                const isAdd = index < assignmentsToAdd.length;
                const subClassId = isAdd ? assignmentsToAdd[index] : assignmentsToRemove[index - assignmentsToAdd.length];
                const action = isAdd ? 'assign' : 'remove';

                if (result.status === 'fulfilled') {
                    // Check if the response was actually OK (status 2xx)
                    if (result.value.ok) {
                        successCount++;
                    } else {
                        failureCount++;
                        // Attempt to get error message from failed response
                        result.value.json().then(err => errors.push(`Failed to ${action} subclass ${subClassId}: ${err.message || result.value.statusText}`)).catch(() => errors.push(`Failed to ${action} subclass ${subClassId}: ${result.value.statusText}`));
                    }
                } else {
                    // Promise rejected (network error, etc.)
                    failureCount++;
                    errors.push(`Failed to ${action} subclass ${subClassId}: ${result.reason?.message || 'Network error'}`);
                }
            });

            if (failureCount === 0) {
                toast.success(`Assignments updated successfully for ${selectedVp.name}.`);
            } else if (successCount > 0) {
                toast(`Assignments partially updated for ${selectedVp.name}. ${failureCount} errors occurred.`);
                console.error("Partial assignment errors:", errors);
                // Optionally display detailed errors
                // errors.forEach(err => toast.error(err, { duration: 6000 }));
            } else {
                toast.error(`Failed to update assignments for ${selectedVp.name}.`);
                console.error("Assignment errors:", errors);
                // errors.forEach(err => toast.error(err, { duration: 6000 }));
            }

            closeAssignmentModal();
            fetchData(); // Re-fetch to update the list regardless of partial success

        } catch (error: any) {
            // This catch is unlikely to be hit with Promise.allSettled unless something
            // fundamentally breaks before the promises are created.
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
                <h1 className="text-2xl font-bold text-gray-900 mb-6">Vice Principal Management</h1>

                {/* VP List/Table */} 
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
                            {!isLoading && vicePrincipals.length === 0 && (
                                <tr><td colSpan={3} className="text-center py-4 text-gray-500">No Vice Principals found.</td></tr>
                            )}
                            {vicePrincipals.map((vp) => (
                                <tr key={vp.id}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">{vp.name}</div>
                                        <div className="text-sm text-gray-500">{vp.email || '-'}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {/* Display count or list of assigned subclasses */} 
                                        <div className="text-sm text-gray-700">
                                            {vp.assignedSubClassIds?.length || 0} subClasses
                                            {/* Or potentially map names: */} 
                                            {/* {(vp.assignedSubClassIds || [])
                                                .map(id => subClasses.find(sc => sc.id === id)?.name)
                                                .filter(Boolean)
                                                .join(', ') || 'None'} */} 
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <button 
                                            onClick={() => openAssignmentModal(vp)}
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
            {isAssignmentModalOpen && selectedVp && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
                    <div className="relative mx-auto p-8 border w-full max-w-2xl shadow-lg rounded-md bg-white">
                        <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Assign Subclasses to: {selectedVp.name}</h3>
                        
                         {/* Subclass Selection UI */} 
                         <div className="max-h-96 overflow-y-auto space-y-4 p-4 border rounded-md mb-4">
                             {classes.length === 0 && subClasses.length === 0 && <p className="text-gray-500 italic">Loading classes...</p>}
                             {classes.map(cls => {
                                 const relevantSubClasses = subClasses.filter(sc => sc.classId === cls.id);
                                 if (relevantSubClasses.length === 0) return null; // Don't show class if no subclasses
                                 
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