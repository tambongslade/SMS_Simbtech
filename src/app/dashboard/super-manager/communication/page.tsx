'use client';

import { useState, useEffect } from 'react';
import { PlusIcon, PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { AnnouncementModal } from './components/AnnouncementModal';
import apiService from '../../../../lib/apiService'; // Import apiService

// const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://192.168.1.103:4000/api/v1'; // REMOVED
// const getAuthToken = () => typeof window !== 'undefined' ? localStorage.getItem('token') : null; // REMOVED

// --- Types ---
type Audience = 'INTERNAL' | 'EXTERNAL' | 'BOTH';
type Announcement = {
    id: number;
    title: string;
    message: string;
    audience: Audience;
    authorName?: string;
    academicYearId?: number;
    createdAt: string;
    updatedAt: string;
};

type AnnouncementSubmitData = {
    title: string;
    message: string;
    audience: Audience;
    // academicYearId?: number | '';
};

// --- Main Page Component ---
export default function CommunicationPage() {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null); // For displaying UI error messages
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);

    const ANNOUNCEMENTS_ENDPOINT = '/communications/announcements'; // Relative path

    // --- Data Fetching ---
    const fetchAnnouncements = async () => {
        setIsLoading(true);
        setError(null);
        try {
            // Use apiService for fetching
            const result = await apiService.get<{ data: Announcement[] }>(ANNOUNCEMENTS_ENDPOINT);
            setAnnouncements(result.data || []);
        } catch (err: any) {
            console.error("Fetch error:", err);
            // apiService handles toasting. Update UI error state if needed.
            if (err.message !== 'Unauthorized') {
                setError(err.message || 'An unexpected error occurred.');
            }
            setAnnouncements([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAnnouncements();
    }, []);

    // --- Handlers ---
    const handleCreateClick = () => {
        setEditingAnnouncement(null);
        setIsModalOpen(true);
    };

    const handleEditClick = (announcement: Announcement) => {
        setEditingAnnouncement(announcement);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingAnnouncement(null);
    };

    const handleSubmitAnnouncement = async (formData: AnnouncementSubmitData) => {
        setIsSubmitting(true);
        const isEditing = !!editingAnnouncement;
        const url = isEditing
            ? `${ANNOUNCEMENTS_ENDPOINT}/${editingAnnouncement.id}`
            : ANNOUNCEMENTS_ENDPOINT;
        const method = isEditing ? 'put' : 'post';

        try {
            if (isEditing) {
                await apiService.put(url, formData);
            } else {
                await apiService.post(url, formData);
            }
            toast.success(`Announcement ${isEditing ? 'updated' : 'created'} successfully!`);
            handleCloseModal();
            await fetchAnnouncements();
        } catch (err: any) {
            console.error("Submit error:", err);
            // apiService handles generic error toasts. Specific UI updates can go here.
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteClick = async (announcementId: number) => {
        if (!window.confirm("Are you sure you want to delete this announcement?")) {
            return;
        }
        setIsLoading(true); // Consider using isSubmitting or a more specific loading state
        try {
            await apiService.delete(`${ANNOUNCEMENTS_ENDPOINT}/${announcementId}`);
            toast.success("Announcement deleted successfully!");
            await fetchAnnouncements();
        } catch (err: any) {
            console.error("Delete error:", err);
            // apiService handles toasts
            if (err.message !== 'Unauthorized') {
                setError(err.message);
            }
        } finally {
            setIsLoading(false);
        }
    };

    // --- JSX Structure ---
    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Communication & Announcements</h1>
                <button
                    onClick={handleCreateClick}
                    disabled={isLoading || isSubmitting} // Disable button during loading/submitting states
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700 flex items-center space-x-2 transition duration-150 ease-in-out disabled:opacity-50"
                >
                    <PlusIcon className="h-5 w-5" />
                    <span>Create Announcement</span>
                </button>
            </div>

            {isLoading && announcements.length === 0 && <p className="text-center text-gray-500">Loading announcements...</p>}
            {error && <p className="text-center text-red-600">Error loading announcements: {error}</p>}

            {!isLoading && !error && announcements.length === 0 && (
                <div className="text-center py-10 bg-white rounded-lg shadow-md">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.79 4 4s-1.79 4-4 4c-1.742 0-3.223-.835-3.772-2M12 12H21M3 12h2.5M12 6V3M12 21v-3M6 18l-2-2M18 6l2-2" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No announcements yet</h3>
                    <p className="mt-1 text-sm text-gray-500">Get started by creating a new announcement.</p>
                </div>
            )}

            {!isLoading && !error && announcements.length > 0 && (
                <div className="space-y-6">
                    {/* Internal Communications Section */}
                    <section>
                        <h2 className="text-xl font-semibold text-gray-700 mb-3 border-b pb-2">Internal Communications</h2>
                        {announcements.filter(a => a.audience === 'INTERNAL' || a.audience === 'BOTH').length > 0 ? (
                            <div className="space-y-4">
                                {announcements.filter(a => a.audience === 'INTERNAL' || a.audience === 'BOTH').map(announcement => (
                                    <div key={announcement.id} className="bg-white p-4 rounded-lg shadow border border-gray-200 hover:shadow-md transition-shadow duration-200">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <h3 className="text-lg font-semibold text-gray-800 mb-1">{announcement.title}</h3>
                                                <p className="text-sm text-gray-500">By {announcement.authorName || 'System'} on {new Date(announcement.createdAt).toLocaleDateString()}</p>
                                                <p className="text-xs text-gray-400 mt-1">Audience: {announcement.audience}</p>
                                            </div>
                                            <div className="flex space-x-2 flex-shrink-0">
                                                <button
                                                    onClick={() => handleEditClick(announcement)}
                                                    disabled={isSubmitting || isLoading}
                                                    className="p-1 text-blue-600 hover:text-blue-800 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-50"
                                                    title="Edit Announcement"
                                                >
                                                    <PencilSquareIcon className="h-5 w-5" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteClick(announcement.id)}
                                                    disabled={isSubmitting || isLoading}
                                                    className="p-1 text-red-600 hover:text-red-800 rounded focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 disabled:opacity-50"
                                                    title="Delete Announcement"
                                                >
                                                    <TrashIcon className="h-5 w-5" />
                                                </button>
                                            </div>
                                        </div>
                                        <p className="text-gray-700 whitespace-pre-wrap mt-2">{announcement.message}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-500 italic">No internal announcements found.</p>
                        )}
                    </section>

                    {/* Public Announcements Section */}
                    <section>
                        <h2 className="text-xl font-semibold text-gray-700 mb-3 border-b pb-2">Public Announcements</h2>
                        {announcements.filter(a => a.audience === 'EXTERNAL' || a.audience === 'BOTH').length > 0 ? (
                            <div className="space-y-4">
                                {announcements.filter(a => a.audience === 'EXTERNAL' || a.audience === 'BOTH').map(announcement => (
                                    <div key={announcement.id} className="bg-white p-4 rounded-lg shadow border border-gray-200 hover:shadow-md transition-shadow duration-200">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <h3 className="text-lg font-semibold text-gray-800 mb-1">{announcement.title}</h3>
                                                <p className="text-sm text-gray-500">Posted on {new Date(announcement.createdAt).toLocaleDateString()}</p>
                                                <p className="text-xs text-gray-400 mt-1">Audience: {announcement.audience}</p>
                                            </div>
                                            <div className="flex space-x-2 flex-shrink-0">
                                                <button
                                                    onClick={() => handleEditClick(announcement)}
                                                    disabled={isSubmitting || isLoading}
                                                    className="p-1 text-blue-600 hover:text-blue-800 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-50"
                                                    title="Edit Announcement"
                                                >
                                                    <PencilSquareIcon className="h-5 w-5" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteClick(announcement.id)}
                                                    disabled={isSubmitting || isLoading}
                                                    className="p-1 text-red-600 hover:text-red-800 rounded focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 disabled:opacity-50"
                                                    title="Delete Announcement"
                                                >
                                                    <TrashIcon className="h-5 w-5" />
                                                </button>
                                            </div>
                                        </div>
                                        <p className="text-gray-700 whitespace-pre-wrap mt-2">{announcement.message}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-500 italic">No public announcements found.</p>
                        )}
                    </section>
                </div>
            )}

            {isModalOpen && (
                <AnnouncementModal
                    initialData={editingAnnouncement}
                    onSubmit={handleSubmitAnnouncement}
                    onClose={handleCloseModal}
                    isLoading={isSubmitting}
                />
            )}
        </div>
    );
} 