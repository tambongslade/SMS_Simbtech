/**
 * Retrieves the authentication token from localStorage.
 * Returns null if localStorage is not available (e.g., during SSR) or token is not set.
 */
export const getAuthToken = (): string | null => {
  if (typeof window !== 'undefined' && window.localStorage) {
    return localStorage.getItem('token');
  }
  return null;
}; 