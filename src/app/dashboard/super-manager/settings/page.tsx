'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { toast } from 'react-hot-toast';
import apiService from '@/lib/apiService';
import { AcademicCapIcon, PlusIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';

interface AcademicYear {
    id: number;
    name: string;
    startDate: string;
    endDate: string;
    isCurrent: boolean;
}

export default function SettingsPage() {
    const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingYear, setEditingYear] = useState<AcademicYear | null>(null);
    const [form, setForm] = useState({
        name: '',
        startDate: '',
        endDate: '',
    });

    useEffect(() => {
        fetchAcademicYears();
    }, []);

    const fetchAcademicYears = async () => {
        try {
            setIsLoading(true);
            const response = await apiService.get('/academic-years');
            if (response.success) {
                setAcademicYears(response.data);
            } else {
                toast.error('Failed to fetch academic years: ' + response.error);
            }
        } catch (error: any) {
            toast.error('Error fetching academic years: ' + (error.response?.data?.error || error.message));
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddEdit = (year?: AcademicYear) => {
        if (year) {
            setEditingYear(year);
            setForm({
                name: year.name,
                startDate: year.startDate.split('T')[0], // Format for input type="date"
                endDate: year.endDate.split('T')[0],
            });
        } else {
            setEditingYear(null);
            setForm({ name: '', startDate: '', endDate: '' });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async () => {
        if (!form.name || !form.startDate || !form.endDate) {
            toast.error('Please fill in all fields.');
            return;
        }

        try {
            const payload = { ...form };
            let response;
            if (editingYear) {
                // Assuming an update endpoint like PUT /api/v1/academic-years/:id
                response = await apiService.put(`/academic-years/${editingYear.id}`, payload);
            } else {
                // Assuming a create endpoint like POST /api/v1/academic-years
                response = await apiService.post('/academic-years', payload);
            }

            if (response.success) {
                toast.success(`Academic Year ${editingYear ? 'updated' : 'created'} successfully!`);
                fetchAcademicYears(); // Refresh list
                setIsModalOpen(false);
            } else {
                toast.error(`Failed to ${editingYear ? 'update' : 'create'} academic year: ` + response.error);
            }
        } catch (error: any) {
            toast.error(`Error ${editingYear ? 'updating' : 'creating'} academic year: ` + (error.response?.data?.error || error.message));
        }
    };

    const handleDelete = async (id: number) => {
        if (window.confirm('Are you sure you want to delete this academic year?')) {
            try {
                // Assuming a delete endpoint like DELETE /api/v1/academic-years/:id
                const response = await apiService.delete(`/academic-years/${id}`);
                if (response.success) {
                    toast.success('Academic Year deleted successfully!');
                    fetchAcademicYears(); // Refresh list
                } else {
                    toast.error('Failed to delete academic year: ' + response.error);
                }
            } catch (error: any) {
                toast.error('Error deleting academic year: ' + (error.response?.data?.error || error.message));
            }
        }
    };

    const handleSetCurrent = async (id: number) => {
        if (window.confirm('Are you sure you want to set this academic year as current? This will unset any other current year.')) {
            try {
                // Assuming a set current endpoint like POST /api/v1/academic-years/:id/set-current
                const response = await apiService.post(`/academic-years/${id}/set-current`, {});
                if (response.success) {
                    toast.success('Academic Year set as current successfully!');
                    fetchAcademicYears(); // Refresh list to reflect change
                } else {
                    toast.error('Failed to set academic year as current: ' + response.error);
                }
            } catch (error: any) {
                toast.error('Error setting academic year as current: ' + (error.response?.data?.error || error.message));
            }
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
                <Button onClick={() => handleAddEdit()} className="flex items-center space-x-2">
                    <PlusIcon className="h-5 w-5" />
                    <span>Add Academic Year</span>
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                        <AcademicCapIcon className="h-6 w-6 text-blue-500" />
                        <span>Academic Year Management</span>
                    </CardTitle>
                </CardHeader>
                <CardBody>
                    {isLoading ? (
                        <div className="text-center py-8 text-gray-500">Loading academic years...</div>
                    ) : academicYears.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">No academic years found. Add one to get started.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Date</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End Date</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {academicYears.map((year) => (
                                        <tr key={year.id} className={year.isCurrent ? 'bg-blue-50' : ''}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{year.name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(year.startDate).toLocaleDateString()}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(year.endDate).toLocaleDateString()}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${year.isCurrent ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                                    }`}>
                                                    {year.isCurrent ? 'Current' : 'Archived'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                                {!year.isCurrent && (
                                                    <Button size="sm" variant="outline" onClick={() => handleSetCurrent(year.id)}>
                                                        Set Current
                                                    </Button>
                                                )}
                                                <Button size="sm" onClick={() => handleAddEdit(year)}>
                                                    Edit
                                                </Button>
                                                <Button size="sm" variant="danger" onClick={() => handleDelete(year.id)}>
                                                    Delete
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardBody>
            </Card>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingYear ? 'Edit Academic Year' : 'Add New Academic Year'}>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label>
                        <Input
                            type="text"
                            id="name"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            placeholder="e.g., 2024-2025 Academic Year"
                        />
                    </div>
                    <div>
                        <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">Start Date</label>
                        <Input
                            type="date"
                            id="startDate"
                            value={form.startDate}
                            onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                        />
                    </div>
                    <div>
                        <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">End Date</label>
                        <Input
                            type="date"
                            id="endDate"
                            value={form.endDate}
                            onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                        />
                    </div>
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                    <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                    <Button onClick={handleSubmit}>
                        {editingYear ? 'Update' : 'Add'} Academic Year
                    </Button>
                </div>
            </Modal>
        </div>
    );
} 