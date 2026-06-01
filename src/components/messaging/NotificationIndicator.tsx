'use client';

import { useState, useEffect } from 'react';
import { getUnreadNotificationCount } from '@/lib/notifications-api';
import { BellIcon } from '@heroicons/react/24/outline';
import { BellIcon as BellSolidIcon } from '@heroicons/react/24/solid';

interface NotificationIndicatorProps {
    onClick?: () => void;
    className?: string;
}

export default function NotificationIndicator({
    onClick,
    className = ''
}: NotificationIndicatorProps) {
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);

    const fetchUnreadCount = async () => {
        try {
            const result = await getUnreadNotificationCount();
            if (result.success && result.data) {
                setUnreadCount(result.data.unreadCount);
            }
        } catch (error) {
            console.error('Failed to fetch unread count:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUnreadCount();

        // Poll for updates every 30 seconds
        const interval = setInterval(fetchUnreadCount, 30000);
        return () => clearInterval(interval);
    }, []);

    // Update count when window becomes visible (user returns to tab)
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (!document.hidden) {
                fetchUnreadCount();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    const handleClick = () => {
        onClick?.();
    };

    if (loading) {
        return (
            <button
                className={`relative p-2 text-gray-400 hover:text-gray-600 transition-colors ${className}`}
                disabled
            >
                <BellIcon className="h-6 w-6" />
            </button>
        );
    }

    return (
        <button
            onClick={handleClick}
            className={`relative p-2 text-gray-600 hover:text-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg ${className}`}
            title={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
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
    );
} 