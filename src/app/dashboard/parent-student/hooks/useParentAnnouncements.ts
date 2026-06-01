import { useState, useEffect, useCallback } from 'react';
import { getAuthToken } from '@/lib/auth';
import { toast } from 'react-hot-toast';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export interface Announcement {
  id: number;
  title: string;
  content: string;
  audience: 'ALL' | 'STUDENTS' | 'PARENTS' | 'TEACHERS' | 'STAFF';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  isActive: boolean;
  publishDate: string;
  expiryDate?: string;
  academicYearId?: number;
  authorId: number;
  createdAt: string;
  updatedAt: string;
  author: {
    id: number;
    name: string;
    email: string;
  };
  academicYear?: {
    id: number;
    name: string;
    startDate: string;
    endDate: string;
  };
  attachments?: Array<{
    id: number;
    fileName: string;
    fileUrl: string;
    fileSize: number;
  }>;
  isRead?: boolean;
  readAt?: string;
}

export interface AnnouncementFilters {
  page?: number;
  limit?: number;
  audience?: 'ALL' | 'STUDENTS' | 'PARENTS' | 'TEACHERS' | 'STAFF';
  academicYearId?: number;
  startDate?: string;
  endDate?: string;
  active?: boolean;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  search?: string;
}

export interface AnnouncementsPagination {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

export function useParentAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [pagination, setPagination] = useState<AnnouncementsPagination | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch announcements with filters
  const fetchAnnouncements = useCallback(async (filters?: AnnouncementFilters) => {
    try {
      const token = getAuthToken();
      if (!token) throw new Error('Authentication token not found.');

      const params = new URLSearchParams();
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.audience) params.append('audience', filters.audience);
      if (filters?.academicYearId) params.append('academicYearId', filters.academicYearId.toString());
      if (filters?.startDate) params.append('startDate', filters.startDate);
      if (filters?.endDate) params.append('endDate', filters.endDate);
      if (filters?.active !== undefined) params.append('active', filters.active.toString());
      if (filters?.priority) params.append('priority', filters.priority);
      if (filters?.search) params.append('search', filters.search);

      const response = await fetch(`${API_BASE_URL}/communications/announcements?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch announcements.');
      }

      const result = await response.json();
      setAnnouncements(result.data.announcements);
      setPagination(result.data.pagination);
      return result.data;
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
      return { announcements: [], pagination: null };
    }
  }, []);

  // Get specific announcement
  const getAnnouncement = useCallback(async (announcementId: number) => {
    try {
      const token = getAuthToken();
      if (!token) throw new Error('Authentication token not found.');

      const response = await fetch(`${API_BASE_URL}/communications/announcements/${announcementId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch announcement.');
      }

      const result = await response.json();
      return result.data;
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
      return null;
    }
  }, []);

  // Mark announcements as read
  const markAsRead = useCallback(async (announcementIds: number[]) => {
    try {
      const token = getAuthToken();
      if (!token) throw new Error('Authentication token not found.');

      const response = await fetch(`${API_BASE_URL}/communications/announcements/mark-read`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ announcementIds }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to mark announcements as read.');
      }

      // Update local state
      setAnnouncements(prev => 
        prev.map(announcement => 
          announcementIds.includes(announcement.id) 
            ? { ...announcement, isRead: true, readAt: new Date().toISOString() }
            : announcement
        )
      );

      toast.success(`Marked ${announcementIds.length} announcement${announcementIds.length > 1 ? 's' : ''} as read`);
      return true;
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
      return false;
    }
  }, []);

  // Mark all announcements as read
  const markAllAsRead = useCallback(async () => {
    try {
      const token = getAuthToken();
      if (!token) throw new Error('Authentication token not found.');

      const response = await fetch(`${API_BASE_URL}/communications/announcements/mark-all-read`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to mark all announcements as read.');
      }

      // Update local state
      setAnnouncements(prev => 
        prev.map(announcement => ({
          ...announcement,
          isRead: true,
          readAt: new Date().toISOString()
        }))
      );

      toast.success('All announcements marked as read');
      return true;
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
      return false;
    }
  }, []);

  // Get unread count
  const getUnreadCount = useCallback(async () => {
    try {
      const token = getAuthToken();
      if (!token) throw new Error('Authentication token not found.');

      const response = await fetch(`${API_BASE_URL}/communications/announcements/unread-count`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch unread count.');
      }

      const result = await response.json();
      return result.data.unreadCount;
    } catch (err: any) {
      setError(err.message);
      return 0;
    }
  }, []);

  // Download announcement attachment
  const downloadAttachment = useCallback(async (announcementId: number, attachmentId: number) => {
    try {
      const token = getAuthToken();
      if (!token) throw new Error('Authentication token not found.');

      const response = await fetch(
        `${API_BASE_URL}/communications/announcements/${announcementId}/attachments/${attachmentId}/download`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to download attachment.');
      }

      // Handle file download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `attachment_${attachmentId}`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('Attachment downloaded successfully');
      return true;
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
      return false;
    }
  }, []);

  // Get announcement statistics
  const getStatistics = useCallback(async (filters?: Partial<AnnouncementFilters>) => {
    try {
      const token = getAuthToken();
      if (!token) throw new Error('Authentication token not found.');

      const params = new URLSearchParams();
      if (filters?.academicYearId) params.append('academicYearId', filters.academicYearId.toString());
      if (filters?.startDate) params.append('startDate', filters.startDate);
      if (filters?.endDate) params.append('endDate', filters.endDate);

      const response = await fetch(`${API_BASE_URL}/communications/announcements/statistics?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch announcement statistics.');
      }

      const result = await response.json();
      return result.data;
    } catch (err: any) {
      setError(err.message);
      return {
        total: 0,
        unread: 0,
        byPriority: {},
        byAudience: {},
        recentCount: 0
      };
    }
  }, []);

  // Subscribe to announcement notifications
  const subscribeToNotifications = useCallback(async (preferences: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    priorities: string[];
    categories: string[];
  }) => {
    try {
      const token = getAuthToken();
      if (!token) throw new Error('Authentication token not found.');

      const response = await fetch(`${API_BASE_URL}/communications/announcements/subscribe`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preferences),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update notification preferences.');
      }

      toast.success('Notification preferences updated successfully');
      return true;
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
      return false;
    }
  }, []);

  // Initialize data
  useEffect(() => {
    const initializeData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        await fetchAnnouncements({
          active: true,
          limit: 20
        });
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    initializeData();
  }, [fetchAnnouncements]);

  return {
    announcements,
    pagination,
    isLoading,
    error,
    fetchAnnouncements,
    getAnnouncement,
    markAsRead,
    markAllAsRead,
    getUnreadCount,
    downloadAttachment,
    getStatistics,
    subscribeToNotifications,
    refetch: () => fetchAnnouncements({ active: true, limit: 20 })
  };
} 