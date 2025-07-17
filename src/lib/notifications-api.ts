import { getAuthToken } from './auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export interface Notification {
    id: number;
    message: string;
    status: 'SENT' | 'DELIVERED' | 'READ';
    dateSent: string;
    type: 'ANNOUNCEMENT' | 'MESSAGE';
    relatedId: number;
}

export interface NotificationsResponse {
    notifications: Notification[];
    pagination: {
        currentPage: number;
        totalPages: number;
        totalItems: number;
        itemsPerPage: number;
    };
    summary: {
        totalUnread: number;
        totalNotifications: number;
    };
}

export interface NotificationCountResponse {
    unreadCount: number;
    breakdown: {
        announcements: number;
        messages: number;
    };
}

// Get user notifications
export async function getNotifications(params: {
    page?: number;
    limit?: number;
    status?: 'SENT' | 'DELIVERED' | 'READ';
} = {}): Promise<{ success: boolean; data?: NotificationsResponse; error?: string }> {
    try {
        const queryParams = new URLSearchParams({
            page: (params.page || 1).toString(),
            limit: (params.limit || 10).toString(),
        });
        if (params.status) queryParams.append('status', params.status);

        const response = await fetch(`${API_BASE_URL}/notifications/me?${queryParams.toString()}`, {
            headers: {
                'Authorization': `Bearer ${getAuthToken()}`,
            },
        });

        if (!response.ok) {
            const errorResult = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
            return { success: false, error: errorResult.error || 'Failed to fetch notifications' };
        }

        const result = await response.json();

        // Transform the API response to match the expected structure
        const transformedData: NotificationsResponse = {
            notifications: result.data,
            pagination: {
                currentPage: result.meta.page,
                totalPages: result.meta.totalPages,
                totalItems: result.meta.total,
                itemsPerPage: result.meta.limit,
            },
            summary: {
                totalUnread: result.meta.totalUnread,
                totalNotifications: result.meta.total,
            }
        };

        return { success: true, data: transformedData };
    } catch (error) {
        console.error('Get notifications error:', error);
        return { success: false, error: 'Failed to fetch notifications. Please try again.' };
    }
}

// Get unread notification count
export async function getUnreadNotificationCount(): Promise<{ success: boolean; data?: NotificationCountResponse; error?: string }> {
    try {
        const response = await fetch(`${API_BASE_URL}/notifications/me/unread-count`, {
            headers: {
                'Authorization': `Bearer ${getAuthToken()}`,
                'Content-Type': 'application/json',
            },
        });

        const result = await response.json();

        if (!response.ok) {
            return { success: false, error: result.error || 'Failed to fetch unread count' };
        }

        return { success: true, data: result.data };
    } catch (error) {
        console.error('Get unread count error:', error);
        return { success: false, error: 'Network error. Please check your connection.' };
    }
}

// Mark notification as read
export async function markNotificationAsRead(notificationId: number): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
        const response = await fetch(`${API_BASE_URL}/notifications/${notificationId}/read`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${getAuthToken()}`,
            },
        });

        const result = await response.json();

        if (!response.ok) {
            return { success: false, error: result.error || 'Failed to mark notification as read' };
        }

        return { success: true, data: result.data };
    } catch (error) {
        console.error('Mark notification as read error:', error);
        return { success: false, error: 'Network error. Please check your connection.' };
    }
}

// Mark all notifications as read
export async function markAllNotificationsAsRead(): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
        const response = await fetch(`${API_BASE_URL}/notifications/mark-all-read`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${getAuthToken()}`,
            },
        });

        const result = await response.json();

        if (!response.ok) {
            return { success: false, error: result.error || 'Failed to mark all notifications as read' };
        }

        return { success: true, data: result.data };
    } catch (error) {
        console.error('Mark all notifications as read error:', error);
        return { success: false, error: 'Network error. Please check your connection.' };
    }
}

// Delete a notification
export async function deleteNotification(notificationId: number): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
        const response = await fetch(`${API_BASE_URL}/notifications/${notificationId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${getAuthToken()}`,
            },
        });

        const result = await response.json();

        if (!response.ok) {
            return { success: false, error: result.error || 'Failed to delete notification' };
        }

        return { success: true, message: result.message };
    } catch (error) {
        console.error('Delete notification error:', error);
        return { success: false, error: 'Network error. Please check your connection.' };
    }
} 