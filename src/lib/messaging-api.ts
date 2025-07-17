import { getAuthToken } from './auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export interface Message {
    id: number;
    from: string;
    to: string;
    subject: string;
    content: string;
    category: 'ACADEMIC' | 'FINANCIAL' | 'DISCIPLINARY' | 'GENERAL';
    date: string;
    isRead: boolean;
    senderRole: string;
    receiverRole: string;
}

export interface SendMessageRequest {
    receiverId: number;
    subject: string;
    content: string;
    category: 'ACADEMIC' | 'FINANCIAL' | 'DISCIPLINARY' | 'GENERAL';
}

export interface Contact {
    id: number;
    name: string;
    matricule: string;
    role: string;
    subjects?: string[];
    canMessage?: boolean;
    lastMessageDate?: string;
}

export type MessagesResponse = Message[];

export interface ContactsResponse {
    contacts: Contact[];
    groups: {
        ADMIN_STAFF: number;
        TEACHERS: number;
        PARENTS: number;
        OTHER_STAFF: number;
    };
}

// Send a message
export async function sendMessage(messageData: SendMessageRequest): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
        const response = await fetch(`${API_BASE_URL}/messaging/simple/send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`,
            },
            body: JSON.stringify(messageData),
        });

        const result = await response.json();

        if (!response.ok) {
            return { success: false, error: result.error || 'Failed to send message' };
        }

        return { success: true, data: result.data };
    } catch (error) {
        console.error('Send message error:', error);
        return { success: false, error: 'Network error. Please check your connection.' };
    }
}

// Get messages (inbox or sent)
export async function getMessages(params: {
    type?: 'inbox' | 'sent';
    page?: number;
    limit?: number;
    category?: 'ACADEMIC' | 'FINANCIAL' | 'DISCIPLINARY' | 'GENERAL';
} = {}): Promise<{ success: boolean; data?: MessagesResponse; error?: string }> {
    try {
        const queryParams = new URLSearchParams({
            type: params.type || 'inbox',
            page: (params.page || 1).toString(),
            limit: (params.limit || 20).toString(),
        });
        if (params.category) queryParams.append('category', params.category);

        const response = await fetch(`${API_BASE_URL}/messaging/simple/messages?${queryParams.toString()}`, {
            headers: {
                'Authorization': `Bearer ${getAuthToken()}`,
            },
        });

        const result = await response.json();

        if (!response.ok) {
            return { success: false, error: result.error || 'Failed to fetch messages' };
        }

        // The API now returns the array of messages directly in the data property
        const messages: MessagesResponse = Array.isArray(result.data) ? result.data : [];

        return { success: true, data: messages };
    } catch (error) {
        console.error('Get messages error:', error);
        return { success: false, error: 'Failed to fetch messages. Please try again.' };
    }
}

// Get available contacts
export async function getContacts(params: {
    role?: string;
    search?: string;
} = {}): Promise<{ success: boolean; data?: ContactsResponse; error?: string }> {
    try {
        const queryParams = new URLSearchParams();
        if (params.role) queryParams.append('role', params.role);
        if (params.search) queryParams.append('search', params.search);

        const response = await fetch(`${API_BASE_URL}/messaging/simple/contacts?${queryParams.toString()}`, {
            headers: {
                'Authorization': `Bearer ${getAuthToken()}`,
            },
        });

        const result = await response.json();

        if (!response.ok) {
            return { success: false, error: result.error || 'Failed to fetch contacts' };
        }

        // Handle the new API structure where contacts are directly in result.data
        const transformedData: ContactsResponse = {
            contacts: Array.isArray(result.data) ? result.data : [],
            groups: {
                ADMIN_STAFF: 0,
                TEACHERS: 0,
                PARENTS: 0,
                OTHER_STAFF: 0,
            }
        };

        return { success: true, data: transformedData };
    } catch (error) {
        console.error('Get contacts error:', error);
        return { success: false, error: 'Network error. Please check your connection.' };
    }
}

// Mark message as read
export async function markMessageAsRead(messageId: number): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
        const response = await fetch(`${API_BASE_URL}/messaging/simple/messages/${messageId}/read`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${getAuthToken()}`,
            },
        });

        const result = await response.json();

        if (!response.ok) {
            return { success: false, error: result.error || 'Failed to mark message as read' };
        }

        return { success: true, data: result.data };
    } catch (error) {
        console.error('Mark message as read error:', error);
        return { success: false, error: 'Network error. Please check your connection.' };
    }
}

// Delete a message (soft delete)
export async function deleteMessage(messageId: number): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
        const response = await fetch(`${API_BASE_URL}/messaging/simple/messages/${messageId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${getAuthToken()}`,
            },
        });

        const result = await response.json();

        if (!response.ok) {
            return { success: false, error: result.error || 'Failed to delete message' };
        }

        return { success: true, message: result.message };
    } catch (error) {
        console.error('Delete message error:', error);
        return { success: false, error: 'Network error. Please check your connection.' };
    }
}

// Message categories for UI
export const MESSAGE_CATEGORIES = [
    { value: 'ACADEMIC', label: 'Academic', icon: '📚', color: 'blue' },
    { value: 'FINANCIAL', label: 'Financial', icon: '💰', color: 'green' },
    { value: 'DISCIPLINARY', label: 'Disciplinary', icon: '⚠️', color: 'red' },
    { value: 'GENERAL', label: 'General', icon: '💬', color: 'gray' }
] as const; 