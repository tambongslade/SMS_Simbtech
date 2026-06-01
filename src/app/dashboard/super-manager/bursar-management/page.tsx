"use client";
import React, { useState, useEffect, useMemo } from "react";
import { toast } from "react-hot-toast";
import { AddEditPersonnelModal } from "../personnel-management/components/AddEditPersonnelModal";
import apiService from "../../../../lib/apiService";

// Bursar type
type Bursar = {
    id: number;
    name: string;
    email: string;
    phone?: string;
    dateJoined?: string;
    roles: string[];
    status: 'active' | 'inactive';
};

function formatDate(dateString?: string) {
    if (!dateString) return "-";
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "-";
    return d.toISOString().split("T")[0];
}

export default function BursarManagementPage() {
    const [bursars, setBursars] = useState<Bursar[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingBursar, setEditingBursar] = useState<Bursar | null>(null);
    const [formData, setFormData] = useState<Partial<Bursar>>({});

    // Fetch bursars
    const fetchBursars = async () => {
        setIsLoading(true);
        try {
            const result = await apiService.get(`/users?role=BURSAR`);
            setBursars(
                (result.data || []).map((b: any) => ({
                    id: b.id,
                    name: b.name,
                    email: b.email,
                    phone: b.phone,
                    dateJoined: b.dateJoined || b.createdAt || b.date_joined,
                    roles: b.userRoles ? b.userRoles.map((r: any) => r.role) : [],
                    status: typeof b.status === 'string' && b.status.toLowerCase() === 'active' ? 'active' : 'inactive',
                }))
            );
        } catch (error) {
            toast.error("Failed to load bursars");
            setBursars([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchBursars();
    }, []);

    // Handlers
    const openEditModal = (bursar: Bursar) => {
        setEditingBursar(bursar);
        setFormData({ ...bursar });
        setIsEditModalOpen(true);
    };
    const closeEditModal = () => {
        setIsEditModalOpen(false);
        setEditingBursar(null);
        setFormData({});
    };
    const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };
    const handleUpdateBursar = async () => {
        if (!editingBursar || !formData) return;
        if (!formData.name || !formData.email) {
            toast.error("Name and email are required.");
            return;
        }
        setIsLoading(true);
        try {
            await apiService.put(`/users/${editingBursar.id}`, {
                name: formData.name,
                email: formData.email,
                phone: formData.phone || null,
            });
            toast.success("Bursar updated successfully!");
            closeEditModal();
            fetchBursars();
        } catch (error) {
            toast.error("Failed to update bursar");
        } finally {
            setIsLoading(false);
        }
    };

    // Table rendering
    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-2xl font-bold text-gray-900 mb-6">Bursar Management</h1>
                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        {isLoading && bursars.length === 0 ? (
                            <div className="p-6 text-center text-gray-500 italic">Loading bursars...</div>
                        ) : !isLoading && bursars.length === 0 ? (
                            <div className="p-6 text-center text-gray-500">No bursars found.</div>
                        ) : (
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Joined</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {bursars.map((bursar) => (
                                        <tr key={bursar.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{bursar.name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{bursar.email}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{bursar.phone || '-'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(bursar.dateJoined)}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                <button
                                                    onClick={() => openEditModal(bursar)}
                                                    className="px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                                                    disabled={isLoading}
                                                >
                                                    Edit
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
            {isEditModalOpen && editingBursar && (
                <AddEditPersonnelModal
                    isOpen={isEditModalOpen}
                    onClose={closeEditModal}
                    onSubmit={handleUpdateBursar}
                    initialData={editingBursar}
                    formData={formData}
                    setFormData={setFormData}
                    isLoading={isLoading}
                    allRoles={[{ value: "BURSAR", label: "Bursar" }]}
                />
            )}
        </div>
    );
} 