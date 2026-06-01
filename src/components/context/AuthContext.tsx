'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

// Types
interface User {
    id: number;
    name: string;
    email: string;
    matricule: string;
    gender: 'MALE' | 'FEMALE';
    dateOfBirth: string;
    phone: string;
    address: string;
    photo?: string;
    status: 'ACTIVE' | 'INACTIVE';
    createdAt: string;
    updatedAt: string;
    userRoles: UserRole[];
}

interface UserRole {
    id: number;
    userId: number;
    role: string;
    academicYearId: number | null;
    createdAt: string;
    updatedAt: string;
}

interface AcademicYear {
    id: number;
    name: string;
    startDate: string;
    endDate: string;
    isCurrent: boolean;
    status: 'ACTIVE' | 'COMPLETED' | 'INACTIVE';
    studentCount?: number;
    classCount?: number;
    terms?: Term[];
}

interface Term {
    id: number;
    name: string;
    startDate: string;
    endDate: string;
    feeDeadline: string;
}

interface LoginResponse {
    success: boolean;
    data: {
        token: string;
        expiresIn: string;
        user: User;
    };
}

interface AuthContextType {
    // State
    user: User | null;
    selectedRole: string | null;
    selectedAcademicYear: AcademicYear | null;
    availableRoles: string[];
    availableAcademicYears: AcademicYear[];
    isAuthenticated: boolean;
    isLoading: boolean;
    isSelectingAcademicYear: boolean; // Add new loading state for academic year selection
    currentAcademicYear: AcademicYear | null; // Added this line

    // Actions
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
    selectRole: (role: string) => Promise<void>;
    selectAcademicYear: (academicYear: AcademicYear) => Promise<void>; // Make this async
    refreshUser: () => Promise<void>;

    // Helpers
    hasRole: (role: string) => boolean;
    requiresAcademicYear: (role: string) => boolean;
    getToken: () => string | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Helper functions
const ROLES_REQUIRING_ACADEMIC_YEAR = [
    'TEACHER',
    'HOD',
    'PRINCIPAL',
    'VICE_PRINCIPAL',
    'DISCIPLINE_MASTER',
    'GUIDANCE_COUNSELOR',
    'BURSAR'
];

const DASHBOARD_ROUTES: Record<string, string> = {
    'SUPER_MANAGER': '/dashboard/super-manager',
    'PRINCIPAL': '/dashboard/principal',
    'VICE_PRINCIPAL': '/dashboard/vice-principal',
    'TEACHER': '/dashboard/teacher',
    'HOD': '/dashboard/hod',
    'BURSAR': '/dashboard/bursar',
    'DISCIPLINE_MASTER': '/dashboard/discipline-master',
    'GUIDANCE_COUNSELOR': '/dashboard/guidance-counselor',
    'PARENT': '/dashboard/parent-student',
    'STUDENT': '/dashboard/parent-student',
    'MANAGER': '/dashboard/manager'
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v1';

// Token management
const getAuthToken = (): string | null => {
    if (typeof window !== 'undefined') {
        return localStorage.getItem('token');
    }
    return null;
};

const setAuthToken = (token: string) => {
    if (typeof window !== 'undefined') {
        localStorage.setItem('token', token);
    }
};

const clearAuthData = () => {
    if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('userData');
        localStorage.removeItem('userRole');
        localStorage.removeItem('academicYear');
    }
};

// API functions
const apiCall = async <T,>(endpoint: string, options: RequestInit = {}): Promise<T> => {
    const token = getAuthToken();
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        // Merge existing headers if any, ensuring they are also strings
        ...(options.headers as Record<string, string> || {}),
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
    });

    if (response.status === 401) {
        clearAuthData();
        throw new Error('Authentication failed or session expired. Please log in again.');
    }

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || `Request failed with status ${response.status}`);
    }

    return response.json();
};

// Auth Provider Component
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [selectedRole, setSelectedRole] = useState<string | null>(null);
    const [selectedAcademicYear, setSelectedAcademicYear] = useState<AcademicYear | null>(null);
    const [availableRoles, setAvailableRoles] = useState<string[]>([]);
    const [availableAcademicYears, setAvailableAcademicYears] = useState<AcademicYear[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSelectingAcademicYear, setIsSelectingAcademicYear] = useState(false); // Initialize new loading state
    const router = useRouter();

    // Initialize auth state on mount
    useEffect(() => {
        const initializeAuth = async () => {
            const token = getAuthToken();
            if (token) {
                try {
                    await refreshUser();
                } catch (error) {
                    console.error('Failed to refresh user:', error);
                    clearAuthData();
                }
            }
            setIsLoading(false);
        };

        initializeAuth();
    }, []);

    // Restore selected role and academic year from localStorage
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedRole = localStorage.getItem('userRole');
            const savedAcademicYear = localStorage.getItem('academicYear');

            if (savedRole) {
                setSelectedRole(savedRole);
            }

            // Conditionally restore academic year
            if (savedAcademicYear) {
                try {
                    const parsedAcademicYear = JSON.parse(savedAcademicYear) as AcademicYear;
                    setSelectedAcademicYear(parsedAcademicYear); // Always set if valid
                } catch (error) {
                    console.error('Failed to parse saved academic year:', error);
                    localStorage.removeItem('academicYear'); // Clear corrupted item
                    setSelectedAcademicYear(null);
                }
            } else {
                setSelectedAcademicYear(null);
            }
        }
    }, []);

    const login = async (email: string, password: string): Promise<void> => {
        setIsLoading(true);
        try {
            // Determine if input is email or matricule
            const isEmail = email.includes('@');
            const requestBody: any = {
                password
            };

            if (isEmail) {
                requestBody.email = email;
            } else {
                requestBody.matricule = email;
            }

            const response: LoginResponse = await apiCall('/auth/login', {
                method: 'POST',
                body: JSON.stringify(requestBody),
            });

            const { token, user } = response.data;
            setAuthToken(token);
            setUser(user);

            const uniqueRoles: string[] = [...new Set(user.userRoles.map(ur => ur.role))];
            setAvailableRoles(uniqueRoles);

            // Store user data
            localStorage.setItem('userData', JSON.stringify(user));

            toast.success('Login successful!');

            // If there's only one role, automatically select it and trigger the next step
            if (uniqueRoles.length === 1) {
                // Call selectRole which handles academic year check and setting selectedAcademicYear
                await selectRole(uniqueRoles[0]);

                // Only redirect immediately if the selected role does NOT require an academic year
                if (!ROLES_REQUIRING_ACADEMIC_YEAR.includes(uniqueRoles[0])) {
                    redirectToDashboard(uniqueRoles[0]);
                }
            } else {
                // Multiple roles: UI should prompt for selection.
                // Redirect to login page, which is expected to display the role selection
                // based on `availableRoles` in AuthContext.
                router.push('/');
            }

        } catch (error) {
            console.error('Login error:', error);
            toast.error(error instanceof Error ? error.message : 'Login failed. Please try again.');
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const logout = (): void => {
        clearAuthData();
        setUser(null);
        setSelectedRole(null);
        setSelectedAcademicYear(null);
        setAvailableRoles([]);
        setAvailableAcademicYears([]);
        toast('Logged out successfully.');
        router.push('/');
    };

    const selectRole = async (role: string): Promise<void> => {
        setIsLoading(true);
        try {
            setSelectedRole(role);
            localStorage.setItem('userRole', role);

            // Fetch academic years relevant to the selected role
            if (ROLES_REQUIRING_ACADEMIC_YEAR.includes(role)) {
                const academicYearsResponse = await apiCall<{ data: { academicYears: AcademicYear[], currentAcademicYearId: number, userHasAccessTo: number[] } }>(`/academic-years/available-for-role?role=${role}`);
                const fetchedAcademicYears = academicYearsResponse.data.academicYears;
                setAvailableAcademicYears(fetchedAcademicYears);

                // Explicitly ensure selectedAcademicYear is null for roles requiring selection
                setSelectedAcademicYear(null); // ADDED THIS LINE
                localStorage.removeItem('academicYear'); // Clear any old saved academic year

                if (fetchedAcademicYears.length === 0) {
                    toast.error('No academic years available for this role. Please contact administrator.');
                }

            } else {
                // For roles that do NOT require an academic year
                setSelectedAcademicYear(null);
                localStorage.removeItem('academicYear');
                setAvailableAcademicYears([]);
            }

            // Removed redirectToDashboard(role) from here.
            // Redirection logic will be handled after academic year selection or in login flow.
        } catch (error) {
            console.error('Error selecting role:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to select role.');
            // Revert role selection if API call fails
            setSelectedRole(null);
            localStorage.removeItem('userRole');
        } finally {
            setIsLoading(false);
        }
    };

    const selectAcademicYear = async (academicYear: AcademicYear): Promise<void> => {
        setIsSelectingAcademicYear(true); // Set loading state
        try {
            // Show initial loading toast
            const loadingToast = toast.loading(`Setting up ${academicYear.name}...`);

            setSelectedAcademicYear(academicYear);
            if (typeof window !== 'undefined') {
                localStorage.setItem('academicYear', JSON.stringify(academicYear));
            }

            // Simulate some processing time (can be removed if you have actual async operations)
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Dismiss loading toast and show success
            toast.dismiss(loadingToast);
            toast.success(`Academic Year set to ${academicYear.name}`);

            // Redirect to dashboard after academic year is selected
            if (selectedRole) {
                redirectToDashboard(selectedRole);
            }
        } catch (error) {
            console.error('Error selecting academic year:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to select academic year.');
        } finally {
            setIsSelectingAcademicYear(false); // Reset loading state
        }
    };

    const redirectToDashboard = (role: string): void => {
        const path = DASHBOARD_ROUTES[role] || '/dashboard';
        router.push(path);
    };

    const refreshUser = async (): Promise<void> => {
        setIsLoading(true);
        try {
            const token = getAuthToken();
            if (!token) {
                clearAuthData();
                router.push('/');
                return;
            }

            const response = await apiCall<{ data: User }>('/auth/me');
            const user: User = response.data;

            // Ensure user object and userRoles exist before proceeding
            if (!user || !user.userRoles) {
                console.error('Refresh user: Invalid user data received from /auth/me', user);
                clearAuthData();
                router.push('/');
                toast.error('Invalid user session. Please log in again.');
                return; // Exit early
            }

            setUser(user);

            // Extract unique roles
            const uniqueRoles: string[] = [...new Set(user.userRoles.map(ur => ur.role))];
            setAvailableRoles(uniqueRoles);

            // Restore selected role and academic year based on refreshed user data
            const savedRole = localStorage.getItem('userRole');
            const savedAcademicYearString = localStorage.getItem('academicYear');

            let refreshedSelectedRole = savedRole;
            let refreshedAcademicYear: AcademicYear | null = null;

            if (user.userRoles.some(ur => ur.role === savedRole)) {
                setSelectedRole(savedRole);
            } else if (uniqueRoles.length > 0) {
                // If saved role is no longer valid, default to first available role
                setSelectedRole(uniqueRoles[0]);
                localStorage.setItem('userRole', uniqueRoles[0]);
                refreshedSelectedRole = uniqueRoles[0];
            } else {
                // No roles available, clear auth and redirect
                clearAuthData();
                router.push('/');
                toast.error('No roles found for your account. Please contact administrator.');
                return; // Exit early as there's no valid role
            }

            // Attempt to restore academic year if a valid academic year dependent role is selected
            if (refreshedSelectedRole && ROLES_REQUIRING_ACADEMIC_YEAR.includes(refreshedSelectedRole)) {
                // Do NOT automatically set selectedAcademicYear from localStorage or API for these roles
                // The UI should prompt the user to select one from availableAcademicYears.
                // We only ensure availableAcademicYears is populated.

                const academicYearsResponse = await apiCall<{ data: { academicYears: AcademicYear[], currentAcademicYearId: number } }>(`/academic-years/available-for-role?role=${refreshedSelectedRole}`);
                const fetchedAcademicYears = academicYearsResponse.data.academicYears;
                setAvailableAcademicYears(fetchedAcademicYears);

                // If no academic years are found for the role, toast an error.
                if (fetchedAcademicYears.length === 0) {
                    toast.error(`No academic years found for role: ${refreshedSelectedRole}. Please contact administrator.`);
                }
                // selectedAcademicYear remains null or whatever it was before,
                // unless explicitly set by selectAcademicYear.

            } else {
                // For roles that do NOT require an academic year, clear any saved academic year
                setSelectedAcademicYear(null);
                localStorage.removeItem('academicYear');
                setAvailableAcademicYears([]);
            }
        } catch (error) {
            console.error('Error refreshing user session:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to refresh session.');
            clearAuthData();
            router.push('/');
        } finally {
            setIsLoading(false);
        }
    };

    const hasRole = (role: string): boolean => {
        return user?.userRoles?.some(ur => ur.role === role) || false;
    };

    const requiresAcademicYear = (role: string): boolean => {
        return ROLES_REQUIRING_ACADEMIC_YEAR.includes(role);
    };

    const getToken = (): string | null => {
        return getAuthToken();
    };

    return (
        <AuthContext.Provider value={{
            user,
            selectedRole,
            selectedAcademicYear,
            availableRoles,
            availableAcademicYears,
            isAuthenticated: !!user,
            isLoading,
            isSelectingAcademicYear, // Provide new loading state
            currentAcademicYear: selectedAcademicYear, // Provide currentAcademicYear from selectedAcademicYear

            login,
            logout,
            selectRole,
            selectAcademicYear,
            refreshUser,
            hasRole,
            requiresAcademicYear,
            getToken,
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === null) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}; 