'use client';

import { useState, useEffect } from 'react';
import {
    Announcement,
    getAnnouncements,
    canCreateAnnouncements,
    deleteAnnouncement
} from '@/lib/announcements-api';
import { toast } from 'react-hot-toast';
import {
    PlusIcon,
    SpeakerWaveIcon,
    CalendarIcon,
    UserGroupIcon,
    TrashIcon
} from '@heroicons/react/24/outline';

interface AnnouncementListProps {
    userRole: string;
    onCreateClick?: () => void;
    showCreateButton?: boolean;
}

export default function AnnouncementList({
    userRole,
    onCreateClick,
    showCreateButton = true
}: AnnouncementListProps) {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    const canCreate = canCreateAnnouncements(userRole);

    const fetchAnnouncements = async (page = 1) => {
        setLoading(true);
        try {
            const result = await getAnnouncements({ page, limit: 10 });

            if (result.success && result.data) {
                setAnnouncements(result.data.announcements);
                setCurrentPage(result.data.pagination.currentPage);
                setTotalPages(result.data.pagination.totalPages);
                setTotalItems(result.data.pagination.totalItems);
            } else {
                toast.error(result.error || 'Failed to fetch announcements');
            }
        } catch (error) {
            toast.error('Failed to fetch announcements');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (announcementId: number) => {
        // Optimistically remove the announcement
        const originalAnnouncements = [...announcements];
        setAnnouncements(prev => prev.filter(ann => ann.id !== announcementId));

        try {
            const result = await deleteAnnouncement(announcementId);

            if (result.success) {
                toast.success(result.message || 'Announcement deleted successfully');
                setTotalItems(prev => prev - 1);
            } else {
                setAnnouncements(originalAnnouncements);
                toast.error(result.error || 'Failed to delete announcement');
            }
        } catch (error) {
            setAnnouncements(originalAnnouncements);
            toast.error('Failed to delete announcement');
        }
    };

    const confirmDelete = (announcementId: number) => {
        toast((t) => (
            <div className="flex flex-col space-y-3">
                <p className="font-medium">Are you sure you want to delete this announcement?</p>
                <div className="flex space-x-2">
                    <button
                        onClick={() => {
                            toast.dismiss(t.id);
                            handleDelete(announcementId);
                        }}
                        className="w-full bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-md text-sm"
                    >
                        Confirm Delete
                    </button>
                    <button
                        onClick={() => toast.dismiss(t.id)}
                        className="w-full bg-gray-200 hover:bg-gray-300 px-3 py-1.5 rounded-md text-sm"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        ), {
            duration: 6000,
        });
    };

    useEffect(() => {
        fetchAnnouncements();
    }, []);

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getAudienceIcon = (audience: string) => {
        switch (audience) {
            case 'INTERNAL':
                return '👥';
            case 'EXTERNAL':
                return '👨‍👩‍👧‍👦';
            case 'BOTH':
                return '🌍';
            default:
                return '📢';
        }
    };

    const getAudienceColor = (audience: string) => {
        switch (audience) {
            case 'INTERNAL':
                return 'bg-blue-100 text-blue-800';
            case 'EXTERNAL':
                return 'bg-green-100 text-green-800';
            case 'BOTH':
                return 'bg-purple-100 text-purple-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const handlePageChange = (page: number) => {
        fetchAnnouncements(page);
    };

    const refreshAnnouncements = () => {
        fetchAnnouncements(currentPage);
    };

    if (loading) {
        return (
            <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-full mb-1"></div>
                        <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                    <SpeakerWaveIcon className="h-6 w-6 text-blue-600" />
                    <h2 className="text-xl font-semibold text-gray-900">Announcements</h2>
                    <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-sm">
                        {totalItems} total
                    </span>
                </div>

                {canCreate && showCreateButton && onCreateClick && (
                    <button
                        onClick={onCreateClick}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                    >
                        <PlusIcon className="h-4 w-4" />
                        <span>Create Announcement</span>
                    </button>
                )}
            </div>

            {/* Announcements List */}
            {announcements.length === 0 ? (
                <div className="text-center py-8">
                    <SpeakerWaveIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No announcements yet</h3>
                    <p className="text-gray-500">
                        {canCreate
                            ? 'Create your first announcement to communicate with staff and parents.'
                            : 'Check back later for important school announcements.'
                        }
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {announcements.map((announcement) => (
                        <div
                            key={announcement.id}
                            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                        >
                            <div className="flex justify-between items-start mb-3">
                                <h3 className="text-lg font-semibold text-gray-900">
                                    {announcement.title}
                                </h3>
                                <span
                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getAudienceColor(announcement.audience)}`}
                                >
                                    <span className="mr-1">{getAudienceIcon(announcement.audience)}</span>
                                    {announcement.audience === 'BOTH' ? 'Everyone' :
                                        announcement.audience === 'INTERNAL' ? 'Staff Only' : 'Parents Only'}
                                </span>
                            </div>

                            <p className="text-gray-700 mb-4 leading-relaxed">
                                {announcement.message}
                            </p>

                            <div className="flex items-center justify-between text-sm text-gray-500">
                                <div className="flex items-center space-x-4">
                                    <div className="flex items-center space-x-1">
                                        <CalendarIcon className="h-4 w-4" />
                                        <span>{formatDate(announcement.datePosted)}</span>
                                    </div>
                                    {announcement.createdBy && (
                                        <div className="flex items-center space-x-1">
                                            <UserGroupIcon className="h-4 w-4" />
                                            <span>By {announcement.createdBy.name}</span>
                                        </div>
                                    )}
                                </div>
                                {canCreate && (
                                    <button
                                        onClick={() => confirmDelete(announcement.id)}
                                        className="flex items-center text-xs font-medium text-red-600 hover:text-red-800"
                                    >
                                        <TrashIcon className="h-4 w-4 mr-1" />
                                        Delete
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                        Showing {((currentPage - 1) * 10) + 1} to {Math.min(currentPage * 10, totalItems)} of {totalItems} announcements
                    </div>

                    <div className="flex space-x-2">
                        <button
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Previous
                        </button>

                        {[...Array(totalPages)].map((_, i) => {
                            const page = i + 1;
                            return (
                                <button
                                    key={page}
                                    onClick={() => handlePageChange(page)}
                                    className={`px-3 py-2 text-sm font-medium rounded-md ${page === currentPage
                                        ? 'bg-blue-600 text-white'
                                        : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                                        }`}
                                >
                                    {page}
                                </button>
                            );
                        })}

                        <button
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}

            {/* Refresh Button */}
            <div className="text-center">
                <button
                    onClick={refreshAnnouncements}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                    Refresh Announcements
                </button>
            </div>
        </div>
    );
} 