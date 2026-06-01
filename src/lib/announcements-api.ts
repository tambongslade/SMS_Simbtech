import { getAuthToken } from './auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export interface Announcement {
    id: number;
    title: string;
    message: string;
    audience: 'INTERNAL' | 'EXTERNAL' | 'BOTH';
    datePosted: string;
    createdBy?: {
        id: number;
        name: string;
        role: string;
    };
    academicYear?: {
        id: number;
        name: string;
        isCurrent: boolean;
    };
    academicYearId?: number;
    createdById?: number;
    createdAt?: string;
    updatedAt?: string;
}

export interface CreateAnnouncementRequest {
    title: string;
    message: string;
    audience: 'INTERNAL' | 'EXTERNAL' | 'BOTH';
    academicYearId?: number;
}

export interface AnnouncementsResponse {
    announcements: Announcement[];
    pagination: {
        currentPage: number;
        totalPages: number;
        totalItems: number;
        itemsPerPage: number;
    };
}

// Create announcement (Admin only)
export async function createAnnouncement(announcementData: CreateAnnouncementRequest): Promise<{ success: boolean; data?: Announcement; error?: string }> {
    try {
        const response = await fetch(`${API_BASE_URL}/communications/announcements`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`,
            },
            body: JSON.stringify(announcementData),
        });

        const result = await response.json();

        if (!response.ok) {
            if (response.status === 403) {
                return { success: false, error: 'You do not have permission to create announcements' };
            }
            return { success: false, error: result.error || 'Failed to create announcement' };
        }

        return { success: true, data: result.data };
    } catch (error) {
        console.error('Create announcement error:', error);
        return { success: false, error: 'Network error. Please check your connection.' };
    }
}

// Get announcements
export async function getAnnouncements(params: {
    page?: number;
    limit?: number;
    academicYearId?: number;
} = {}): Promise<{ success: boolean; data?: AnnouncementsResponse; error?: string }> {
    try {
        const queryParams = new URLSearchParams({
            page: (params.page || 1).toString(),
            limit: (params.limit || 10).toString(),
        });
        if (params.academicYearId) queryParams.append('academicYearId', params.academicYearId.toString());

        const response = await fetch(`${API_BASE_URL}/communications/announcements?${queryParams.toString()}`, {
            headers: {
                'Authorization': `Bearer ${getAuthToken()}`,
            },
        });

        const result = await response.json();

        // Transform the API response to match the expected structure
        const transformedData: AnnouncementsResponse = {
            announcements: result.data,
            pagination: {
                currentPage: result.meta.page,
                totalPages: result.meta.totalPages,
                totalItems: result.meta.total,
                itemsPerPage: result.meta.limit,
            },
        };

        return { success: true, data: transformedData };
    } catch (error) {
        console.error('Get announcements error:', error);
        return { success: false, error: 'Failed to fetch announcements. Please try again.' };
    }
}

// Get single announcement
export async function getAnnouncement(id: number): Promise<{ success: boolean; data?: Announcement; error?: string }> {
    try {
        const response = await fetch(`${API_BASE_URL}/communications/announcements/${id}`, {
            headers: {
                'Authorization': `Bearer ${getAuthToken()}`,
            },
        });

        const result = await response.json();

        if (!response.ok) {
            return { success: false, error: result.error || 'Failed to fetch announcement' };
        }

        return { success: true, data: result.data };
    } catch (error) {
        console.error('Get announcement error:', error);
        return { success: false, error: 'Network error. Please check your connection.' };
    }
}

// Delete an announcement
export async function deleteAnnouncement(announcementId: number): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
        const response = await fetch(`${API_BASE_URL}/communications/announcements/${announcementId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${getAuthToken()}`,
            },
        });

        const result = await response.json();

        if (!response.ok) {
            return { success: false, error: result.error || 'Failed to delete announcement' };
        }

        return { success: true, message: result.message };
    } catch (error) {
        console.error('Delete announcement error:', error);
        return { success: false, error: 'Network error. Please check your connection.' };
    }
}

// Audience options for UI
export const AUDIENCE_OPTIONS = [
    {
        value: 'INTERNAL',
        label: 'Staff Only',
        description: 'All teachers and administrative staff',
        icon: '👥'
    },
    {
        value: 'EXTERNAL',
        label: 'Parents Only',
        description: 'All parents and guardians',
        icon: '👨‍👩‍👧‍👦'
    },
    {
        value: 'BOTH',
        label: 'Everyone',
        description: 'All staff, teachers, and parents',
        icon: '🌍'
    }
] as const;

// User role permissions
export const ADMIN_ROLES = ['SUPER_MANAGER', 'MANAGER', 'PRINCIPAL', 'VICE_PRINCIPAL'];

export function canCreateAnnouncements(userRole: string): boolean {
    return ADMIN_ROLES.includes(userRole);
} 