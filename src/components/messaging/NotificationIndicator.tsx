'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    getUnreadNotificationCount,
    getNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    Notification,
} from '@/lib/notifications-api';
import { BellIcon, TrashIcon, CheckIcon } from '@heroicons/react/24/outline';
import { BellIcon as BellSolidIcon } from '@heroicons/react/24/solid';
import { toast } from 'react-hot-toast';

interface NotificationIndicatorProps {
    onClick?: () => void; // kept for compatibility; the panel opens regardless
    className?: string;
}

const CATEGORY_STYLES: Record<string, string> = {
    APPROVAL_NEEDED: 'bg-red-100 text-red-800',
    APPROVAL_APPROVED: 'bg-green-100 text-green-800',
    APPROVAL_REJECTED: 'bg-red-100 text-red-800',
    TASK_ASSIGNED: 'bg-blue-100 text-blue-800',
    TASK_UPDATE: 'bg-blue-100 text-blue-800',
    ANNOUNCEMENT: 'bg-purple-100 text-purple-800',
    SALARY_UPDATE: 'bg-yellow-100 text-yellow-800',
    FEE_UPDATE: 'bg-yellow-100 text-yellow-800',
    DISCIPLINE: 'bg-orange-100 text-orange-800',
    SYSTEM: 'bg-gray-100 text-gray-700',
    GENERAL: 'bg-gray-100 text-gray-700',
};

const formatCategory = (category?: string) =>
    (category || 'General').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

const formatRelativeTime = (iso?: string) => {
    if (!iso) return '';
    const diffMs = Date.now() - new Date(iso).getTime();
    const minutes = Math.max(0, Math.round(diffMs / 60000));
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours} h ago`;
    return new Date(iso).toLocaleDateString();
};

export default function NotificationIndicator({
    onClick,
    className = ''
}: NotificationIndicatorProps) {
    const router = useRouter();
    const containerRef = useRef<HTMLDivElement>(null);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoadingList, setIsLoadingList] = useState(false);

    const fetchUnreadCount = useCallback(async () => {
        try {
            const result = await getUnreadNotificationCount();
            if (result.success && result.data) {
                setUnreadCount(result.data.unreadCount ?? 0);
            }
        } catch (error) {
            console.error('Failed to fetch unread count:', error);
        }
    }, []);

    const fetchList = useCallback(async () => {
        setIsLoadingList(true);
        try {
            const result = await getNotifications({ page: 1, limit: 10 });
            if (result.success && result.data) {
                setNotifications(result.data.notifications || []);
            }
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        } finally {
            setIsLoadingList(false);
        }
    }, []);

    // Badge polling (30s per spec) + refresh on tab focus
    useEffect(() => {
        fetchUnreadCount();
        const interval = setInterval(fetchUnreadCount, 30000);
        const handleVisibilityChange = () => {
            if (!document.hidden) fetchUnreadCount();
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [fetchUnreadCount]);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleBellClick = () => {
        onClick?.();
        const next = !isOpen;
        setIsOpen(next);
        if (next) fetchList();
    };

    const isUnread = (n: Notification) => n.status !== 'READ';

    const handleNotificationClick = async (notification: Notification) => {
        if (isUnread(notification)) {
            await markNotificationAsRead(notification.id);
            setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, status: 'READ' as const } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        }
        // Deep-link when the notification points inside the app
        if (notification.actionUrl && notification.actionUrl.startsWith('/dashboard')) {
            setIsOpen(false);
            router.push(notification.actionUrl);
        }
    };

    const handleMarkAllRead = async () => {
        const result = await markAllNotificationsAsRead();
        if (result.success) {
            setNotifications(prev => prev.map(n => ({ ...n, status: 'READ' as const })));
            setUnreadCount(0);
            toast.success('All notifications marked as read.');
        } else {
            toast.error(result.error || 'Failed to mark all as read.');
        }
    };

    const handleDelete = async (notification: Notification, event: React.MouseEvent) => {
        event.stopPropagation();
        const result = await deleteNotification(notification.id);
        if (result.success) {
            setNotifications(prev => prev.filter(n => n.id !== notification.id));
            if (isUnread(notification)) setUnreadCount(prev => Math.max(0, prev - 1));
        } else {
            toast.error(result.error || 'Failed to delete notification.');
        }
    };

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            <button
                onClick={handleBellClick}
                className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg"
                title={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
                aria-label="Notifications"
            >
                {unreadCount > 0 ? (
                    <BellSolidIcon className="h-6 w-6 text-blue-600" />
                ) : (
                    <BellIcon className="h-6 w-6" />
                )}
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full min-w-[1.25rem] h-5">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 z-50 mt-2 w-80 sm:w-96 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllRead}
                                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800"
                            >
                                <CheckIcon className="h-4 w-4" /> Mark all read
                            </button>
                        )}
                    </div>

                    <div className="max-h-96 overflow-y-auto">
                        {isLoadingList ? (
                            <p className="p-4 text-sm text-gray-500">Loading…</p>
                        ) : notifications.length === 0 ? (
                            <p className="p-6 text-sm text-gray-500 text-center">No notifications yet.</p>
                        ) : (
                            <ul className="divide-y divide-gray-100">
                                {notifications.map((notification) => (
                                    <li key={notification.id}>
                                        <button
                                            onClick={() => handleNotificationClick(notification)}
                                            className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${isUnread(notification) ? 'bg-blue-50/50' : ''}`}
                                        >
                                            <div className="flex items-start gap-2">
                                                {isUnread(notification) && (
                                                    <span className="mt-1.5 h-2 w-2 rounded-full bg-blue-600 shrink-0" aria-hidden="true" />
                                                )}
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${CATEGORY_STYLES[notification.category || 'GENERAL'] || CATEGORY_STYLES.GENERAL}`}>
                                                            {formatCategory(notification.category)}
                                                        </span>
                                                        <span className="text-[11px] text-gray-400 shrink-0">{formatRelativeTime(notification.dateSent)}</span>
                                                    </div>
                                                    {notification.title && (
                                                        <p className={`mt-1 text-sm truncate ${isUnread(notification) ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                                                            {notification.title}
                                                        </p>
                                                    )}
                                                    <p className="mt-0.5 text-xs text-gray-600 line-clamp-2">{notification.message}</p>
                                                </div>
                                                <span
                                                    role="button"
                                                    tabIndex={0}
                                                    onClick={(e) => handleDelete(notification, e)}
                                                    onKeyDown={(e) => { if (e.key === 'Enter') handleDelete(notification, e as unknown as React.MouseEvent); }}
                                                    title="Delete notification"
                                                    className="p-1 text-gray-300 hover:text-red-500 shrink-0 cursor-pointer"
                                                >
                                                    <TrashIcon className="h-4 w-4" />
                                                </span>
                                            </div>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
