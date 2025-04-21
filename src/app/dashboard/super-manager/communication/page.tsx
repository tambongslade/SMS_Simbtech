'use client';

import { useState, useEffect } from 'react';
import { PlusIcon, PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { AnnouncementModal } from './components/AnnouncementModal';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://192.168.1.103:4000/api/v1';


// Define getAuthToken locally (consistent with other pages)
const getAuthToken = () => typeof window !== 'undefined' ? localStorage.getItem('token') : null;

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

// Type for the form data submitted from the modal
type AnnouncementSubmitData = {
    title: string;
    message: string;
    audience: Audience;
    // academicYearId?: number | ''; // Add if implemented
};

// --- Main Page Component ---
export default function CommunicationPage() {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);

    // --- Data Fetching ---
    const fetchAnnouncements = async () => {
        setIsLoading(true);
        setError(null);
        const token = getAuthToken();
        if (!token) { toast.error("Authentication required."); setIsLoading(false); setError("Not authenticated"); return; }

        try {
            const response = await fetch(`${API_BASE_URL}/communications/announcements`, { 
                headers: { 'Authorization': `Bearer ${token}` } 
            });
            if (!response.ok) {
                 const errorData = await response.json().catch(() => ({ message: 'Failed to fetch announcements' }));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            setAnnouncements(data.data || []);
        } catch (err: any) {
            console.error("Fetch error:", err);
            setError(err.message || 'An unexpected error occurred.');
            toast.error(`Failed to load announcements: ${err.message}`);
            setAnnouncements([]); // Clear list on error
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
    
    // Handle form submission from modal
    const handleSubmitAnnouncement = async (formData: AnnouncementSubmitData) => {
        setIsSubmitting(true);
        const token = getAuthToken();
        if (!token) { toast.error("Auth error"); setIsSubmitting(false); return; }
        
        // TODO: Add PUT logic if editingAnnouncement exists
        const isEditing = !!editingAnnouncement;
        const url = isEditing 
            ? `${API_BASE_URL}/communications/announcements/${editingAnnouncement.id}` 
            : `${API_BASE_URL}/communications/announcements`;
        const method = isEditing ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData) // Send submitted form data
            });

            if (!response.ok) {
                let errorMsg = `Failed to ${isEditing ? 'update' : 'create'} announcement`;
                 try {
                     const errorData = await response.json();
                     errorMsg = `${errorMsg}: ${errorData.message || response.statusText}`;
                 } catch (e) { /* Ignore if body isn't JSON */ errorMsg = `${errorMsg}: ${response.statusText}`; }
                 throw new Error(errorMsg);
            }
            
            toast.success(`Announcement ${isEditing ? 'updated' : 'created'} successfully!`);
            handleCloseModal(); // Close modal on success
            await fetchAnnouncements(); // Refresh the list

        } catch (err: any) {
            console.error("Submit error:", err);
            toast.error(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle Deletion
    const handleDeleteClick = async (announcementId: number) => {
         if (!window.confirm("Are you sure you want to delete this announcement?")) {
             return;
         }

         const token = getAuthToken();
         if (!token) { toast.error("Auth error"); return; }

         setIsLoading(true); // Use main loading indicator or a specific one

         try {
             const response = await fetch(`${API_BASE_URL}/communications/announcements/${announcementId}`, {
                 method: 'DELETE',
                 headers: { 'Authorization': `Bearer ${token}` },
             });

             if (!response.ok) {
                 let errorMsg = 'Failed to delete announcement';
                  try {
                      const errorData = await response.json();
                      errorMsg = `${errorMsg}: ${errorData.message || response.statusText}`;
                  } catch (e) { /* Ignore if body isn't JSON */ errorMsg = `${errorMsg}: ${response.statusText}`; }
                  throw new Error(errorMsg);
             }

             toast.success("Announcement deleted successfully!");
             await fetchAnnouncements(); // Refresh list after successful deletion

         } catch (err: any) {
             console.error("Delete error:", err);
             toast.error(err.message);
             setError(err.message); // Optionally update main error state
         } finally {
             setIsLoading(false);
         }
    };

    // --- JSX Structure ---
    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Communication & Announcements</h1>
                {/* TODO: Add role-based check if needed for who can create */} 
                <button
                    onClick={handleCreateClick}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700 flex items-center space-x-2 transition duration-150 ease-in-out"
                >
                    <PlusIcon className="h-5 w-5" />
                    <span>Create Announcement</span>
                </button>
            </div>

            {isLoading && <p className="text-center text-gray-500">Loading announcements...</p>}
            {error && <p className="text-center text-red-600">Error loading announcements: {error}</p>}

            {!isLoading && !error && (
                <div className="space-y-6">
                    {/* Internal Communications Section */}
                    <section>
                        <h2 className="text-xl font-semibold text-gray-700 mb-3 border-b pb-2">Internal Communications</h2>
                        {/* Filter based on audience: INTERNAL or BOTH */}
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
                                             {/* Action Buttons */} 
                                            <div className="flex space-x-2 flex-shrink-0">
                                                <button
                                                    onClick={() => handleEditClick(announcement)}
                                                    className="p-1 text-blue-600 hover:text-blue-800 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                                                    title="Edit Announcement"
                                                >
                                                    <PencilSquareIcon className="h-5 w-5" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteClick(announcement.id)}
                                                    className="p-1 text-red-600 hover:text-red-800 rounded focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
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
                        {/* Filter based on audience: EXTERNAL or BOTH */}
                        {announcements.filter(a => a.audience === 'EXTERNAL' || a.audience === 'BOTH').length > 0 ? (
                            <div className="space-y-4">
                                {announcements.filter(a => a.audience === 'EXTERNAL' || a.audience === 'BOTH').map(announcement => (
                                    <div key={announcement.id} className="bg-white p-4 rounded-lg shadow border border-gray-200 hover:shadow-md transition-shadow duration-200">
                                        <div className="flex justify-between items-start mb-2">
                                             <div>
                                                <h3 className="text-lg font-semibold text-gray-800 mb-1">{announcement.title}</h3>
                                                <p className="text-sm text-gray-500">Posted on {new Date(announcement.createdAt).toLocaleDateString()}</p>
                                             </div>
                                             {/* Action Buttons */} 
                                            <div className="flex space-x-2 flex-shrink-0">
                                                <button
                                                    onClick={() => handleEditClick(announcement)}
                                                    className="p-1 text-blue-600 hover:text-blue-800 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                                                    title="Edit Announcement"
                                                >
                                                    <PencilSquareIcon className="h-5 w-5" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteClick(announcement.id)}
                                                    className="p-1 text-red-600 hover:text-red-800 rounded focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
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
                    
                     {/* Placeholder for future messaging features if needed */} 
                     {/* <section><h2 className="text-xl font-semibold text-gray-700 mb-3 border-b pb-2">Direct Messages</h2>...</section> */} 
                </div>
            )}
            
            {/* Render the Modal */}
            <AnnouncementModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onSubmit={handleSubmitAnnouncement}
                isLoading={isSubmitting}
                initialData={editingAnnouncement}
            />
        </div>
    );
} 