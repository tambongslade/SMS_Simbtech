import { useState, useEffect, useCallback } from 'react';
import { getAuthToken } from '@/lib/auth';
import { toast } from 'react-hot-toast';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export interface ParentProfile {
    id: number;
    name: string;
    email: string;
    phone: string;
    whatsapp?: string;
    address: string;
    emergencyContact: {
        name: string;
        phone: string;
        relationship: string;
    };
    preferredLanguage: string;
    timezone: string;
    avatar?: string;
    dateOfBirth?: string;
    occupation?: string;
    nationality?: string;
}

export interface NotificationPreferences {
    userId: number;
    emailNotifications: boolean;
    smsNotifications: boolean;
    pushNotifications: boolean;
    whatsappNotifications: boolean;
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
    language: string;
    timezone: string;
}

export interface SecuritySettings {
    twoFactorEnabled: boolean;
    twoFactorMethod: 'SMS' | 'EMAIL' | 'AUTHENTICATOR' | null;
    lastPasswordChange: string;
    activeSessions: Array<{
        id: string;
        device: string;
        browser: string;
        location: string;
        lastActive: string;
        current: boolean;
    }>;
    loginHistory: Array<{
        id: string;
        timestamp: string;
        ipAddress: string;
        location: string;
        device: string;
        success: boolean;
    }>;
}

export interface PasswordChangeData {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
}

export interface ChildPermissions {
    studentId: number;
    permissions: {
        viewAcademicRecords: boolean;
        viewFinancialInfo: boolean;
        viewDisciplineRecords: boolean;
        communicateWithStaff: boolean;
        receiveNotifications: boolean;
        downloadReports: boolean;
    };
}

export function useParentSettings() {
    const [profile, setProfile] = useState<ParentProfile | null>(null);
    const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
    const [security, setSecurity] = useState<SecuritySettings | null>(null);
    const [childPermissions, setChildPermissions] = useState<{ [studentId: number]: ChildPermissions }>({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch user profile
    const fetchProfile = useCallback(async () => {
        try {
            const token = getAuthToken();
            if (!token) throw new Error('Authentication token not found.');

            const response = await fetch(`${API_BASE_URL}/users/me`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to fetch profile.');
            }

            const result = await response.json();
            setProfile(result.data);
            return result.data;
        } catch (err: any) {
            setError(err.message);
            toast.error(err.message);
            return null;
        }
    }, []);

    // Update user profile
    const updateProfile = useCallback(async (profileData: Partial<ParentProfile>) => {
        try {
            const token = getAuthToken();
            if (!token) throw new Error('Authentication token not found.');

            const response = await fetch(`${API_BASE_URL}/users/me`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(profileData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to update profile.');
            }

            const result = await response.json();
            setProfile(result.data);
            toast.success('Profile updated successfully');
            return result.data;
        } catch (err: any) {
            setError(err.message);
            toast.error(err.message);
            throw err;
        }
    }, []);

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
                throw new Error(errorData.message || 'Failed to fetch notification preferences.');
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
    const updatePreferences = useCallback(async (preferencesData: Partial<NotificationPreferences>) => {
        try {
            const token = getAuthToken();
            if (!token) throw new Error('Authentication token not found.');

            const response = await fetch(`${API_BASE_URL}/messaging/preferences`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(preferencesData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to update notification preferences.');
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

    // Change password
    const changePassword = useCallback(async (passwordData: PasswordChangeData) => {
        try {
            const token = getAuthToken();
            if (!token) throw new Error('Authentication token not found.');

            const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    currentPassword: passwordData.currentPassword,
                    newPassword: passwordData.newPassword,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to change password.');
            }

            toast.success('Password changed successfully');
            return true;
        } catch (err: any) {
            setError(err.message);
            toast.error(err.message);
            throw err;
        }
    }, []);

    // Fetch security settings
    const fetchSecurity = useCallback(async () => {
        try {
            const token = getAuthToken();
            if (!token) throw new Error('Authentication token not found.');

            const response = await fetch(`${API_BASE_URL}/users/security`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to fetch security settings.');
            }

            const result = await response.json();
            setSecurity(result.data);
            return result.data;
        } catch (err: any) {
            setError(err.message);
            toast.error(err.message);
            return null;
        }
    }, []);

    // Enable/disable two-factor authentication
    const toggleTwoFactor = useCallback(async (enabled: boolean, method?: 'SMS' | 'EMAIL' | 'AUTHENTICATOR') => {
        try {
            const token = getAuthToken();
            if (!token) throw new Error('Authentication token not found.');

            const response = await fetch(`${API_BASE_URL}/auth/two-factor`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ enabled, method }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to update two-factor authentication.');
            }

            const result = await response.json();
            setSecurity(prev => prev ? { ...prev, twoFactorEnabled: enabled, twoFactorMethod: method || null } : null);
            toast.success(`Two-factor authentication ${enabled ? 'enabled' : 'disabled'} successfully`);
            return result.data;
        } catch (err: any) {
            setError(err.message);
            toast.error(err.message);
            throw err;
        }
    }, []);

    // Get active sessions
    const getActiveSessions = useCallback(async () => {
        try {
            const token = getAuthToken();
            if (!token) throw new Error('Authentication token not found.');

            const response = await fetch(`${API_BASE_URL}/auth/sessions`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to fetch active sessions.');
            }

            const result = await response.json();
            return result.data;
        } catch (err: any) {
            setError(err.message);
            toast.error(err.message);
            return [];
        }
    }, []);

    // Revoke session
    const revokeSession = useCallback(async (sessionId: string) => {
        try {
            const token = getAuthToken();
            if (!token) throw new Error('Authentication token not found.');

            const response = await fetch(`${API_BASE_URL}/auth/sessions/${sessionId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to revoke session.');
            }

            toast.success('Session revoked successfully');

            // Refresh security data
            await fetchSecurity();

            return true;
        } catch (err: any) {
            setError(err.message);
            toast.error(err.message);
            return false;
        }
    }, [fetchSecurity]);

    // Get login history
    const getLoginHistory = useCallback(async (limit = 20, offset = 0) => {
        try {
            const token = getAuthToken();
            if (!token) throw new Error('Authentication token not found.');

            const response = await fetch(
                `${API_BASE_URL}/auth/login-history?limit=${limit}&offset=${offset}`,
                {
                    headers: { 'Authorization': `Bearer ${token}` },
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to fetch login history.');
            }

            const result = await response.json();
            return result.data;
        } catch (err: any) {
            setError(err.message);
            toast.error(err.message);
            return [];
        }
    }, []);

    // Upload avatar
    const uploadAvatar = useCallback(async (file: File) => {
        try {
            const token = getAuthToken();
            if (!token) throw new Error('Authentication token not found.');

            const formData = new FormData();
            formData.append('avatar', file);

            const response = await fetch(`${API_BASE_URL}/users/avatar`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to upload avatar.');
            }

            const result = await response.json();
            setProfile(prev => prev ? { ...prev, avatar: result.data.avatarUrl } : null);
            toast.success('Avatar uploaded successfully');
            return result.data.avatarUrl;
        } catch (err: any) {
            setError(err.message);
            toast.error(err.message);
            throw err;
        }
    }, []);

    // Delete account
    const deleteAccount = useCallback(async (password: string, confirmation: string) => {
        try {
            const token = getAuthToken();
            if (!token) throw new Error('Authentication token not found.');

            if (confirmation !== 'DELETE MY ACCOUNT') {
                throw new Error('Please type "DELETE MY ACCOUNT" to confirm.');
            }

            const response = await fetch(`${API_BASE_URL}/users/delete-account`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ password, confirmation }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to delete account.');
            }

            toast.success('Account deletion initiated. You will receive a confirmation email.');
            return true;
        } catch (err: any) {
            setError(err.message);
            toast.error(err.message);
            throw err;
        }
    }, []);

    // Fetch child permissions
    const fetchChildPermissions = useCallback(async (studentId: number) => {
        try {
            const token = getAuthToken();
            if (!token) throw new Error('Authentication token not found.');

            const response = await fetch(`${API_BASE_URL}/parents/children/${studentId}/permissions`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to fetch child permissions.');
            }

            const result = await response.json();
            setChildPermissions(prev => ({ ...prev, [studentId]: result.data }));
            return result.data;
        } catch (err: any) {
            setError(err.message);
            toast.error(err.message);
            return null;
        }
    }, []);

    // Update child permissions
    const updateChildPermissions = useCallback(async (studentId: number, permissions: Partial<ChildPermissions['permissions']>) => {
        try {
            const token = getAuthToken();
            if (!token) throw new Error('Authentication token not found.');

            const response = await fetch(`${API_BASE_URL}/parents/children/${studentId}/permissions`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ permissions }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to update child permissions.');
            }

            const result = await response.json();
            setChildPermissions(prev => ({ ...prev, [studentId]: result.data }));
            toast.success('Child permissions updated successfully');
            return result.data;
        } catch (err: any) {
            setError(err.message);
            toast.error(err.message);
            throw err;
        }
    }, []);

    // Initialize data
    useEffect(() => {
        const initializeData = async () => {
            setIsLoading(true);
            setError(null);

            try {
                await Promise.all([
                    fetchProfile(),
                    fetchPreferences(),
                    fetchSecurity()
                ]);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        initializeData();
    }, [fetchProfile, fetchPreferences, fetchSecurity]);

    return {
        profile,
        preferences,
        security,
        childPermissions,
        isLoading,
        error,
        updateProfile,
        updatePreferences,
        changePassword,
        toggleTwoFactor,
        getActiveSessions,
        revokeSession,
        getLoginHistory,
        uploadAvatar,
        deleteAccount,
        fetchChildPermissions,
        updateChildPermissions,
        refetch: () => {
            fetchProfile();
            fetchPreferences();
            fetchSecurity();
        }
    };
} 