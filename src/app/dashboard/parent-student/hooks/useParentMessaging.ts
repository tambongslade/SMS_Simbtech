import { useState, useEffect, useCallback } from 'react';
import { getAuthToken } from '@/lib/auth';
import { toast } from 'react-hot-toast';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export interface MessageThread {
    id: number;
    subject: string;
    participants: Array<{
        userId: number;
        userName: string;
        userRole: string;
        isActive: boolean;
        lastReadAt?: string;
    }>;
    messageCount: number;
    lastMessageAt: string;
    lastMessagePreview: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    category: 'GENERAL' | 'ACADEMIC' | 'DISCIPLINARY' | 'FINANCIAL' | 'ADMINISTRATIVE' | 'EMERGENCY';
    status: 'ACTIVE' | 'RESOLVED' | 'ARCHIVED';
    tags: string[];
    createdAt: string;
    createdBy: {
        id: number;
        name: string;
        role: string;
    };
}

export interface Message {
    id: number;
    threadId: number;
    senderId: number;
    senderName: string;
    senderRole: string;
    content: string;
    messageType: 'TEXT' | 'ANNOUNCEMENT' | 'ALERT' | 'REMINDER' | 'URGENT';
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    isRead: boolean;
    readAt?: string;
    readBy: Array<{
        userId: number;
        userName: string;
        readAt: string;
    }>;
    attachments: Array<{
        id: number;
        fileName: string;
        fileUrl: string;
        fileSize: number;
        uploadedAt: string;
    }>;
    reactions: Array<{
        userId: number;
        userName: string;
        reaction: '👍' | '👎' | '❤️' | '😂' | '😮' | '😢' | '😡';
        reactedAt: string;
    }>;
    mentions: Array<{
        userId: number;
        userName: string;
        position: number;
    }>;
    deliveryStatus: 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
    sentAt: string;
    editedAt?: string;
    isEdited: boolean;
}

export interface CreateThreadData {
    subject: string;
    participants: number[];
    category?: 'GENERAL' | 'ACADEMIC' | 'DISCIPLINARY' | 'FINANCIAL' | 'ADMINISTRATIVE' | 'EMERGENCY';
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    initialMessage: string;
    tags?: string[];
}

export interface SendMessageData {
    content: string;
    messageType?: string;
    priority?: string;
    mentions?: number[];
    attachments?: Array<{
        fileName: string;
        fileUrl: string;
        fileSize: number;
    }>;
}

export interface NotificationPreferences {
    userId: number;
    emailNotifications: boolean;
    pushNotifications: boolean;
    smsNotifications: boolean;
    priority: {
        low: boolean;
        medium: boolean;
        high: boolean;
        urgent: boolean;
    };
    categories: {
        general: boolean;
        academic: boolean;
        disciplinary: boolean;
        financial: boolean;
        administrative: boolean;
        emergency: boolean;
    };
    quietHours: {
        enabled: boolean;
        startTime: string;
        endTime: string;
    };
    digestFrequency: 'IMMEDIATE' | 'HOURLY' | 'DAILY' | 'WEEKLY' | 'DISABLED';
}

export function useParentMessaging() {
    const [threads, setThreads] = useState<MessageThread[]>([]);
    const [messages, setMessages] = useState<{ [threadId: number]: Message[] }>({});
    const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch message threads
    const fetchThreads = useCallback(async (filters?: {
        category?: string;
        priority?: string;
        status?: string;
        search?: string;
        page?: number;
        limit?: number;
    }) => {
        try {
            const token = getAuthToken();
            if (!token) throw new Error('Authentication token not found.');

            const params = new URLSearchParams();
            if (filters?.category) params.append('category', filters.category);
            if (filters?.priority) params.append('priority', filters.priority);
            if (filters?.status) params.append('status', filters.status);
            if (filters?.search) params.append('search', filters.search);
            if (filters?.page) params.append('page', filters.page.toString());
            if (filters?.limit) params.append('limit', filters.limit.toString());

            const response = await fetch(`${API_BASE_URL}/messaging/threads?${params}`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to fetch message threads.');
            }

            const result = await response.json();
            setThreads(result.data);
            return result.data;
        } catch (err: any) {
            setError(err.message);
            toast.error(err.message);
            return [];
        }
    }, []);

    // Fetch messages for a specific thread
    const fetchThreadMessages = useCallback(async (threadId: number, page = 1, limit = 50) => {
        try {
            const token = getAuthToken();
            if (!token) throw new Error('Authentication token not found.');

            const response = await fetch(
                `${API_BASE_URL}/messaging/threads/${threadId}/messages?page=${page}&limit=${limit}`,
                {
                    headers: { 'Authorization': `Bearer ${token}` },
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to fetch messages.');
            }

            const result = await response.json();
            setMessages(prev => ({ ...prev, [threadId]: result.data }));
            return result.data;
        } catch (err: any) {
            setError(err.message);
            toast.error(err.message);
            return [];
        }
    }, []);

    // Create new message thread
    const createThread = useCallback(async (data: CreateThreadData) => {
        try {
            const token = getAuthToken();
            if (!token) throw new Error('Authentication token not found.');

            const response = await fetch(`${API_BASE_URL}/messaging/threads`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to create message thread.');
            }

            const result = await response.json();
            toast.success('Message thread created successfully');

            // Refresh threads
            await fetchThreads();

            return result.data;
        } catch (err: any) {
            setError(err.message);
            toast.error(err.message);
            throw err;
        }
    }, [fetchThreads]);

    // Send message to thread
    const sendMessage = useCallback(async (threadId: number, data: SendMessageData) => {
        try {
            const token = getAuthToken();
            if (!token) throw new Error('Authentication token not found.');

            const response = await fetch(`${API_BASE_URL}/messaging/threads/${threadId}/messages`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to send message.');
            }

            const result = await response.json();
            toast.success('Message sent successfully');

            // Refresh messages for this thread
            await fetchThreadMessages(threadId);

            return result.data;
        } catch (err: any) {
            setError(err.message);
            toast.error(err.message);
            throw err;
        }
    }, [fetchThreadMessages]);

    // Fetch notification preferences
    const fetchPreferences = useCallback(async () => {
        try {
            const token = getAuthToken();
            if (!token) throw new Error('Authentication token not found.');

            const response = await fetch(`${API_BASE_URL}/messaging/preferences`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to fetch preferences.');
            }

            const result = await response.json();
            setPreferences(result.data);
            return result.data;
        } catch (err: any) {
            setError(err.message);
            toast.error(err.message);
            return null;
        }
    }, []);

    // Update notification preferences
    const updatePreferences = useCallback(async (data: Partial<NotificationPreferences>) => {
        try {
            const token = getAuthToken();
            if (!token) throw new Error('Authentication token not found.');

            const response = await fetch(`${API_BASE_URL}/messaging/preferences`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to update preferences.');
            }

            const result = await response.json();
            setPreferences(result.data);
            toast.success('Notification preferences updated successfully');

            return result.data;
        } catch (err: any) {
            setError(err.message);
            toast.error(err.message);
            throw err;
        }
    }, []);

    // Mark messages as read
    const markAsRead = useCallback(async (threadId: number, messageIds: number[]) => {
        try {
            const token = getAuthToken();
            if (!token) throw new Error('Authentication token not found.');

            const response = await fetch(`${API_BASE_URL}/messaging/threads/${threadId}/read`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ messageIds }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to mark messages as read.');
            }

            // Update local state
            setMessages(prev => ({
                ...prev,
                [threadId]: prev[threadId]?.map(msg =>
                    messageIds.includes(msg.id) ? { ...msg, isRead: true, readAt: new Date().toISOString() } : msg
                ) || []
            }));

            return true;
        } catch (err: any) {
            setError(err.message);
            toast.error(err.message);
            return false;
        }
    }, []);

    // Archive thread
    const archiveThread = useCallback(async (threadId: number) => {
        try {
            const token = getAuthToken();
            if (!token) throw new Error('Authentication token not found.');

            const response = await fetch(`${API_BASE_URL}/messaging/threads/${threadId}/archive`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to archive thread.');
            }

            toast.success('Thread archived successfully');

            // Refresh threads
            await fetchThreads();

            return true;
        } catch (err: any) {
            setError(err.message);
            toast.error(err.message);
            return false;
        }
    }, [fetchThreads]);

    // Initialize data
    useEffect(() => {
        const initializeData = async () => {
            setIsLoading(true);
            setError(null);

            try {
                await Promise.all([
                    fetchThreads(),
                    fetchPreferences()
                ]);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        initializeData();
    }, [fetchThreads, fetchPreferences]);

    return {
        threads,
        messages,
        preferences,
        isLoading,
        error,
        fetchThreads,
        fetchThreadMessages,
        createThread,
        sendMessage,
        fetchPreferences,
        updatePreferences,
        markAsRead,
        archiveThread,
        refetch: () => fetchThreads()
    };
} 