import { toast } from 'react-hot-toast';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v1';

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

interface LoginRequest {
    email?: string;
    matricule?: string;
    password: string;
}

interface LoginResponse {
    success: boolean;
    data: {
        token: string;
        expiresIn: string;
        user: User;
    };
}

interface UserResponse {
    success: boolean;
    data: User;
}

interface AcademicYearsResponse {
    success: boolean;
    data: {
        academicYears: AcademicYear[];
        currentAcademicYearId: number;
        userHasAccessTo: number[];
    };
}

interface ApiError {
    success: false;
    error: string;
    details?: {
        field?: string;
        code?: string;
    };
}

// Token management
const getAuthToken = (): string | null => {
    if (typeof window !== 'undefined') {
        return localStorage.getItem('token');
    }
    return null;
};

const setAuthToken = (token: string): void => {
    if (typeof window !== 'undefined') {
        localStorage.setItem('token', token);
    }
};

const clearAuthData = (): void => {
    if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('userData');
        localStorage.removeItem('userRole');
        localStorage.removeItem('academicYear');
    }
};

// API call wrapper with error handling
const apiCall = async <T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> => {
    const token = getAuthToken();
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

    try {
        const response = await fetch(url, {
            ...options,
            headers,
        });

        // Handle 401 Unauthorized
        if (response.status === 401) {
            clearAuthData();
            const errorMessage = 'Your session has expired. Please log in again.';

            if (typeof window !== 'undefined') {
                window.location.href = '/';
            }

            throw new Error(errorMessage);
        }

        const data = await response.json();

        if (!response.ok) {
            const error: ApiError = data;
            throw new Error(error.error || `Request failed with status ${response.status}`);
        }

        return data;
    } catch (error) {
        console.error('API call error:', error);

        if (!(error instanceof Error && error.message.includes('session has expired'))) {
            // Don't show toast for session expired errors as they're handled by redirect
            if (error instanceof Error) {
                throw error;
            } else {
                throw new Error('An unexpected error occurred');
            }
        }

        throw error;
    }
};

// Authentication API functions
export const authApi = {
    /**
     * Login with email/matricule and password
     * @param credentials - Login credentials
     * @returns Promise<LoginResponse>
     */
    login: async (credentials: LoginRequest): Promise<LoginResponse> => {
        try {
            // Determine if input is email or matricule based on the presence of @ symbol
            const inputValue = credentials.email || credentials.matricule || '';
            const isEmail = inputValue.includes('@');

            const requestBody: any = {
                password: credentials.password,
            };

            if (isEmail) {
                requestBody.email = inputValue;
            } else {
                requestBody.matricule = inputValue;
            }

            const response = await apiCall<LoginResponse>('/auth/login', {
                method: 'POST',
                body: JSON.stringify(requestBody),
            });

            if (response.success && response.data.token) {
                setAuthToken(response.data.token);

                // Store user data
                localStorage.setItem('userData', JSON.stringify(response.data.user));

                return response;
            } else {
                throw new Error('Invalid response format');
            }
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    },

    /**
     * Get current user profile
     * @returns Promise<UserResponse>
     */
    getMe: async (): Promise<UserResponse> => {
        try {
            const response = await apiCall<UserResponse>('/auth/me');

            if (response.success && response.data) {
                // Update stored user data
                localStorage.setItem('userData', JSON.stringify(response.data));
                return response;
            } else {
                throw new Error('Invalid response format');
            }
        } catch (error) {
            console.error('Get user profile error:', error);
            throw error;
        }
    },

    /**
     * Get available academic years for a specific role
     * @param role - User role
     * @returns Promise<AcademicYearsResponse>
     */
    getAcademicYearsForRole: async (role: string): Promise<AcademicYearsResponse> => {
        try {
            const response = await apiCall<AcademicYearsResponse>(
                `/academic-years/available-for-role?role=${encodeURIComponent(role)}`
            );

            if (response.success && response.data) {
                return response;
            } else {
                throw new Error('Invalid response format');
            }
        } catch (error) {
            console.error('Get academic years error:', error);
            throw error;
        }
    },

    /**
     * Logout user and clear authentication data
     */
    logout: (): void => {
        clearAuthData();

        if (typeof window !== 'undefined') {
            window.location.href = '/';
        }
    },

    /**
     * Check if user is authenticated
     * @returns boolean
     */
    isAuthenticated: (): boolean => {
        return !!getAuthToken();
    },

    /**
     * Get stored user data
     * @returns User | null
     */
    getStoredUser: (): User | null => {
        if (typeof window !== 'undefined') {
            const userData = localStorage.getItem('userData');
            if (userData) {
                try {
                    return JSON.parse(userData);
                } catch (error) {
                    console.error('Error parsing stored user data:', error);
                    return null;
                }
            }
        }
        return null;
    },

    /**
     * Get stored user role
     * @returns string | null
     */
    getStoredRole: (): string | null => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('userRole');
        }
        return null;
    },

    /**
     * Get stored academic year
     * @returns AcademicYear | null
     */
    getStoredAcademicYear: (): AcademicYear | null => {
        if (typeof window !== 'undefined') {
            const academicYear = localStorage.getItem('academicYear');
            if (academicYear) {
                try {
                    return JSON.parse(academicYear);
                } catch (error) {
                    console.error('Error parsing stored academic year:', error);
                    return null;
                }
            }
        }
        return null;
    },

    /**
     * Set user role
     * @param role - User role
     */
    setRole: (role: string): void => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('userRole', role);
        }
    },

    /**
     * Set academic year
     * @param academicYear - Academic year object
     */
    setAcademicYear: (academicYear: AcademicYear): void => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('academicYear', JSON.stringify(academicYear));
        }
    },

    /**
     * Get auth token
     * @returns string | null
     */
    getToken: (): string | null => {
        return getAuthToken();
    },
};

// Export individual functions for backwards compatibility
export const {
    login,
    getMe,
    getAcademicYearsForRole,
    logout,
    isAuthenticated,
    getStoredUser,
    getStoredRole,
    getStoredAcademicYear,
    setRole,
    setAcademicYear,
    getToken,
} = authApi;

export default authApi; 