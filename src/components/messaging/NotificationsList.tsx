'use client';

import { useState, useEffect } from 'react';
import {
    Notification,
    getNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification
} from '@/lib/notifications-api';
import { toast } from 'react-hot-toast';
import {
    BellIcon,
    CheckIcon,
    SpeakerWaveIcon,
    ChatBubbleLeftIcon,
    CalendarIcon,
    TrashIcon
} from '@heroicons/react/24/outline';

interface NotificationsListProps {
    onNotificationUpdate?: () => void;
}

export default function NotificationsList({ onNotificationUpdate }: NotificationsListProps) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [summary, setSummary] = useState<any>(null);
    const [markingAllAsRead, setMarkingAllAsRead] = useState(false);

    const fetchNotifications = async (page = 1) => {
        setLoading(true);
        try {
            const result = await getNotifications({ page, limit: 30 });

            if (result.success && result.data) {
                setNotifications(result.data.notifications);
                setCurrentPage(result.data.pagination.currentPage);
                setTotalPages(result.data.pagination.totalPages);
                setTotalItems(result.data.pagination.totalItems);
                setSummary(result.data.summary);
            } else {
                toast.error(result.error || 'Failed to fetch notifications');
            }
        } catch (error) {
            toast.error('Failed to fetch notifications');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    const handleMarkAsRead = async (notificationId: number) => {
        try {
            const result = await markNotificationAsRead(notificationId);
            if (result.success) {
                setNotifications(prev =>
                    prev.map(notif =>
                        notif.id === notificationId ? { ...notif, status: 'READ' } : notif
                    )
                );
                setSummary((prev: any) => prev ? { ...prev, totalUnread: prev.totalUnread - 1 } : null);
                onNotificationUpdate?.();
            } else {
                toast.error(result.error || 'Failed to mark notification as read');
            }
        } catch (error) {
            toast.error('Failed to mark notification as read');
        }
    };

    const handleMarkAllAsRead = async () => {
        setMarkingAllAsRead(true);
        try {
            const result = await markAllNotificationsAsRead();
            if (result.success) {
                setNotifications(prev =>
                    prev.map(notif => ({ ...notif, status: 'READ' as const }))
                );
                setSummary((prev: any) => prev ? { ...prev, totalUnread: 0 } : null);
                toast.success('All notifications marked as read');
                onNotificationUpdate?.();
            } else {
                toast.error(result.error || 'Failed to mark all notifications as read');
            }
        } catch (error) {
            toast.error('Failed to mark all notifications as read');
        } finally {
            setMarkingAllAsRead(false);
        }
    };

    const handleDelete = async (notificationId: number) => {
        // Optimistically remove the notification
        const originalNotifications = [...notifications];
        setNotifications(prev => prev.filter(notif => notif.id !== notificationId));

        try {
            const result = await deleteNotification(notificationId);

            if (result.success) {
                toast.success(result.message || 'Notification deleted successfully');
                setTotalItems(prev => prev - 1);
            } else {
                setNotifications(originalNotifications);
                toast.error(result.error || 'Failed to delete notification');
            }
        } catch (error) {
            setNotifications(originalNotifications);
            toast.error('Failed to delete notification');
        }
    };

    const confirmDelete = (notificationId: number) => {
        toast((t) => (
            <div className="flex flex-col space-y-3">
                <p className="font-medium">Are you sure you want to delete this notification?</p>
                <div className="flex space-x-2">
                    <button
                        onClick={() => {
                            toast.dismiss(t.id);
                            handleDelete(notificationId);
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

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = now.getTime() - date.getTime();
        const diffMinutes = Math.floor(diffTime / (1000 * 60));
        const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffMinutes < 60) {
            return diffMinutes <= 1 ? 'Just now' : `${diffMinutes}m ago`;
        } else if (diffHours < 24) {
            return `${diffHours}h ago`;
        } else if (diffDays === 1) {
            return 'Yesterday';
        } else if (diffDays < 7) {
            return `${diffDays}d ago`;
        } else {
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
            });
        }
    };

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'ANNOUNCEMENT':
                return <SpeakerWaveIcon className="h-5 w-5 text-blue-600" />;
            case 'MESSAGE':
                return <ChatBubbleLeftIcon className="h-5 w-5 text-green-600" />;
            default:
                return <BellIcon className="h-5 w-5 text-gray-600" />;
        }
    };

    const getNotificationTypeColor = (type: string) => {
        switch (type) {
            case 'ANNOUNCEMENT':
                return 'bg-blue-100 text-blue-800';
            case 'MESSAGE':
                return 'bg-green-100 text-green-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const handlePageChange = (page: number) => {
        fetchNotifications(page);
    };

    const refreshNotifications = () => {
        fetchNotifications(currentPage);
    };

    if (loading) {
        return (
            <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 animate-pulse">
                        <div className="flex items-start space-x-3">
                            <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                            <div className="flex-1 space-y-2">
                                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                                <div className="h-3 bg-gray-200 rounded w-full"></div>
                                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                            </div>
                        </div>
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
                    <BellIcon className="h-6 w-6 text-blue-600" />
                    <h2 className="text-xl font-semibold text-gray-900">Notifications</h2>
                    {summary && (
                        <div className="flex items-center space-x-2">
                            <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-sm">
                                {totalItems} total
                            </span>
                            {summary.totalUnread > 0 && (
                                <span className="bg-red-100 text-red-600 px-2 py-1 rounded-full text-sm font-medium">
                                    {summary.totalUnread} unread
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {summary?.totalUnread > 0 && (
                    <button
                        onClick={handleMarkAllAsRead}
                        disabled={markingAllAsRead}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                    >
                        {markingAllAsRead && (
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                    fill="none"
                                />
                                <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                />
                            </svg>
                        )}
                        <CheckIcon className="h-4 w-4" />
                        <span>Mark All Read</span>
                    </button>
                )}
            </div>

            {/* Notifications List */}
            {notifications.length === 0 ? (
                <div className="text-center py-8 bg-white rounded-lg shadow-sm border border-gray-200">
                    <BellIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications yet</h3>
                    <p className="text-gray-500">
                        You'll see notifications here when you receive announcements or messages.
                    </p>
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 divide-y divide-gray-200">
                    {notifications.map((notification) => (
                        <div
                            key={notification.id}
                            className={`p-4 hover:bg-gray-50 transition-colors ${notification.status !== 'READ' ? 'bg-blue-50' : ''
                                }`}
                        >
                            <div className="flex items-start space-x-3">
                                <div className="flex-shrink-0 mt-1">
                                    {getNotificationIcon(notification.type)}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-2">
                                            <span
                                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getNotificationTypeColor(notification.type)}`}
                                            >
                                                {notification.type ? notification.type.charAt(0).toUpperCase() + notification.type.slice(1).toLowerCase() : ''}
                                            </span>
                                            {notification.status !== 'READ' && (
                                                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                            )}
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <div className="flex items-center space-x-1 text-xs text-gray-500">
                                                <CalendarIcon className="h-3 w-3" />
                                                <span>{formatDate(notification.dateSent)}</span>
                                            </div>
                                            {notification.status !== 'READ' && (
                                                <button
                                                    onClick={() => handleMarkAsRead(notification.id)}
                                                    className="text-blue-600 hover:text-blue-800 text-xs flex items-center space-x-1"
                                                    title="Mark as read"
                                                >
                                                    <CheckIcon className="h-4 w-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="mt-2">
                                        <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                                            {notification.message}
                                        </p>
                                    </div>
                                    <div className="mt-3 flex items-center space-x-4">
                                        {notification.status !== 'READ' && (
                                            <button
                                                onClick={() => handleMarkAsRead(notification.id)}
                                                className="flex items-center text-xs font-medium text-blue-600 hover:text-blue-800"
                                            >
                                                <CheckIcon className="h-4 w-4 mr-1" />
                                                Mark as Read
                                            </button>
                                        )}
                                        <button
                                            onClick={() => confirmDelete(notification.id)}
                                            className="flex items-center text-xs font-medium text-red-600 hover:text-red-800"
                                        >
                                            <TrashIcon className="h-4 w-4 mr-1" />
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                        Showing {((currentPage - 1) * 30) + 1} to {Math.min(currentPage * 30, totalItems)} of {totalItems} notifications
                    </div>

                    <div className="flex space-x-2">
                        <button
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Previous
                        </button>

                        {[...Array(Math.min(5, totalPages))].map((_, i) => {
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
                    onClick={refreshNotifications}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                    Refresh Notifications
                </button>
            </div>
        </div>
    );
} 