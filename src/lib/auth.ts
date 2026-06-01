/**
 * Authentication utilities for token management and user session handling
 */

// Token management constants
const TOKEN_STORAGE_KEY = 'token';
const TOKEN_EXPIRY_KEY = 'tokenExpiry';
const REFRESH_TOKEN_KEY = 'refreshToken';
const USER_DATA_KEY = 'userData';
const USER_ROLE_KEY = 'userRole';
const ACADEMIC_YEAR_KEY = 'academicYear';

// Token refresh threshold (refresh when 5 minutes left)
const REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes in milliseconds

/**
 * Retrieves the authentication token from localStorage.
 * Returns null if localStorage is not available (e.g., during SSR) or token is not set.
 */
export const getAuthToken = (): string | null => {
  if (typeof window !== 'undefined' && window.localStorage) {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  }
  return null;
};

/**
 * Sets the authentication token in localStorage
 * @param token - The JWT token to store
 * @param expiresIn - Token expiration time (optional, defaults to 24h)
 */
export const setAuthToken = (token: string, expiresIn?: string): void => {
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);

    // Calculate and store expiry time
    const now = new Date().getTime();
    let expiryTime = now + (24 * 60 * 60 * 1000); // Default 24 hours

    if (expiresIn) {
      // Parse expiresIn string (e.g., "24h", "1d", "2h")
      const value = parseInt(expiresIn.replace(/[^0-9]/g, ''));
      const unit = expiresIn.replace(/[0-9]/g, '');

      switch (unit) {
        case 'h':
          expiryTime = now + (value * 60 * 60 * 1000);
          break;
        case 'd':
          expiryTime = now + (value * 24 * 60 * 60 * 1000);
          break;
        case 'm':
          expiryTime = now + (value * 60 * 1000);
          break;
        default:
          expiryTime = now + (value * 1000); // Assume seconds
      }
    }

    localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());
  }
};

/**
 * Checks if the current token is expired or close to expiry
 * @returns boolean indicating if token needs refresh
 */
export const isTokenExpired = (): boolean => {
  if (typeof window !== 'undefined' && window.localStorage) {
    const expiryTime = localStorage.getItem(TOKEN_EXPIRY_KEY);
    if (expiryTime) {
      const now = new Date().getTime();
      return now >= (parseInt(expiryTime) - REFRESH_THRESHOLD);
    }
  }
  return true; // Consider expired if no expiry time is set
};

/**
 * Clears all authentication data from localStorage
 */
export const clearAuthData = (): void => {
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_DATA_KEY);
    localStorage.removeItem(USER_ROLE_KEY);
    localStorage.removeItem(ACADEMIC_YEAR_KEY);
  }
};

/**
 * Checks if user is currently authenticated
 * @returns boolean indicating authentication status
 */
export const isAuthenticated = (): boolean => {
  const token = getAuthToken();
  return token !== null && !isTokenExpired();
};

/**
 * Gets stored user data
 * @returns user data object or null
 */
export const getStoredUserData = (): any | null => {
  if (typeof window !== 'undefined' && window.localStorage) {
    const userData = localStorage.getItem(USER_DATA_KEY);
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
};

/**
 * Sets user data in localStorage
 * @param userData - User data object to store
 */
export const setStoredUserData = (userData: any): void => {
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
  }
};

/**
 * Gets stored user role
 * @returns user role string or null
 */
export const getStoredUserRole = (): string | null => {
  if (typeof window !== 'undefined' && window.localStorage) {
    return localStorage.getItem(USER_ROLE_KEY);
  }
  return null;
};

/**
 * Sets user role in localStorage
 * @param role - User role to store
 */
export const setStoredUserRole = (role: string): void => {
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.setItem(USER_ROLE_KEY, role);
  }
};

/**
 * Gets stored academic year
 * @returns academic year object or null
 */
export const getStoredAcademicYear = (): any | null => {
  if (typeof window !== 'undefined' && window.localStorage) {
    const academicYear = localStorage.getItem(ACADEMIC_YEAR_KEY);
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
};

/**
 * Sets academic year in localStorage
 * @param academicYear - Academic year object to store
 */
export const setStoredAcademicYear = (academicYear: any): void => {
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.setItem(ACADEMIC_YEAR_KEY, JSON.stringify(academicYear));
  }
};

/**
 * Validates session and redirects to login if invalid
 * @param router - Next.js router instance
 * @returns boolean indicating if session is valid
 */
export const validateSession = (router?: any): boolean => {
  if (!isAuthenticated()) {
    clearAuthData();
    if (router && typeof window !== 'undefined') {
      router.push('/');
    }
    return false;
  }
  return true;
};

/**
 * Creates authorization header for API requests
 * @returns authorization header object or empty object
 */
export const getAuthHeaders = (): { [key: string]: string } => {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/**
 * Extracts unique roles from userRoles array
 * @param userRoles - Array of user role objects
 * @returns Array of unique role strings
 */
export const extractUniqueRoles = (userRoles: any[]): string[] => {
  if (!Array.isArray(userRoles)) {
    return [];
  }

  return [...new Set(userRoles.map(roleObj => roleObj.role))];
};

/**
 * Formats role name for display
 * @param role - Role string to format
 * @returns formatted role string
 */
export const formatRoleName = (role: string): string => {
  if (!role) return '';
  return role
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
};

/**
 * Formats role name for URL
 * @param role - Role string to format
 * @returns URL-friendly role string
 */
export const formatRoleForURL = (role: string): string => {
  if (!role) return '';
  return role.toLowerCase().replace(/_/g, '-');
};

/**
 * Checks if a role requires academic year selection
 * @param role - Role string to check
 * @returns boolean indicating if academic year is required
 */
export const requiresAcademicYear = (role: string): boolean => {
  const rolesRequiringAcademicYear = [
    'TEACHER',
    'HOD',
    'VICE_PRINCIPAL',
    'DISCIPLINE_MASTER',
    'GUIDANCE_COUNSELOR',
    'BURSAR'
  ];

  return rolesRequiringAcademicYear.includes(role);
};

/**
 * Gets dashboard route for a specific role
 * @param role - Role string
 * @returns dashboard route string
 */
export const getDashboardRoute = (role: string): string => {
  const dashboardRoutes: { [key: string]: string } = {
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

  return dashboardRoutes[role] || '/dashboard';
};

// Export all functions for backwards compatibility
export default {
  getAuthToken,
  setAuthToken,
  isTokenExpired,
  clearAuthData,
  isAuthenticated,
  getStoredUserData,
  setStoredUserData,
  getStoredUserRole,
  setStoredUserRole,
  getStoredAcademicYear,
  setStoredAcademicYear,
  validateSession,
  getAuthHeaders,
  extractUniqueRoles,
  formatRoleName,
  formatRoleForURL,
  requiresAcademicYear,
  getDashboardRoute
}; 