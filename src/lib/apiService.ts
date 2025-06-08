import { toast } from 'react-hot-toast';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api/v1'; // Fallback for safety

// Helper to get the token
const getAuthToken = (): string | null => {
    if (typeof window !== 'undefined') {
        return localStorage.getItem('token');
    }
    return null;
};

// Helper to clear auth data from localStorage
const clearAuthData = () => {
    if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('userData');
        localStorage.removeItem('userRole');
    }
};

interface RequestOptions extends RequestInit {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    body?: any; // Allow any body type for flexibility, will be stringified if object
}

type ExpectedResponseType = 'json' | 'blob' | 'text' | 'arrayBuffer'; // Add more as needed

// Centralized API request function
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function request<T = any>(
    endpoint: string,
    options: RequestOptions = {},
    expectedResponseType: ExpectedResponseType = 'json' // Added parameter with default
): Promise<T> {
    const token = getAuthToken();
    const headers: HeadersInit = {
        ...options.headers,
        // 'Accept': 'application/json', // Accept header might change based on expectedResponseType
    };

    if (expectedResponseType === 'json') {
        headers['Accept'] = 'application/json';
    }
    // For 'blob', the browser will typically set Accept based on context, or you might not need one.
    // Or, you could set it specifically if your API requires it for blobs:
    // else if (expectedResponseType === 'blob') {
    //     headers['Accept'] = 'application/octet-stream'; // Or specific MIME type
    // }


    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    // Stringify body if it's an object and Content-Type is not already set to something else
    let body = options.body;
    if (typeof body === 'object' && body !== null && !(body instanceof FormData) && !(headers['Content-Type'] || headers['content-type'])) {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify(body);
    }


    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

    try {
        const response = await fetch(url, {
            ...options,
            headers,
            body,
        });

        if (response.status === 401) {
            // Unauthorized
            clearAuthData();
            let errorMessage = 'Your session has expired. Please log in again.';
            try {
                const errorData = await response.clone().json(); // Clone to read body again if needed
                if (errorData && errorData.message) {
                    errorMessage = errorData.message;
                } else if (errorData && errorData.error) { // Handle cases like {"error":"Token expired"}
                    errorMessage = errorData.error;
                }
            } catch (e) {
                // Ignore if error response is not JSON
            }
            toast.error(errorMessage);
            if (typeof window !== 'undefined') {
                // Ensure this only runs client-side
                window.location.href = '/'; // Redirect to login
            }
            // Throw an error to stop further processing in the calling function
            throw new Error('Unauthorized');
        }

        if (!response.ok) {
            // Handle other errors (4xx, 5xx)
            let errorMessage = `Request failed with status ${response.status}`;
            try {
                const errorData = await response.json();
                errorMessage = errorData.message || errorData.error || errorMessage;
            } catch (e) {
                // Ignore if error response is not JSON
                const textError = await response.text();
                errorMessage = textError || errorMessage;
            }
            toast.error(errorMessage);
            throw new Error(errorMessage);
        }

        // For 204 No Content or similar, where response.json() would fail
        if (response.status === 204 || response.headers.get("content-length") === "0") {
            return undefined as T;
        }

        // Handle response based on expectedResponseType
        switch (expectedResponseType) {
            case 'blob':
                return response.blob() as Promise<T>;
            case 'text':
                return response.text() as Promise<T>;
            case 'arrayBuffer':
                return response.arrayBuffer() as Promise<T>;
            case 'json':
            default:
                return response.json() as Promise<T>;
        }
    } catch (error) {
        // Log network errors or errors from response.json()
        console.error('API Service Error:', error);
        if (!(error instanceof Error && error.message === 'Unauthorized')) { // Don't double-toast for 401
            // toast.error(error instanceof Error ? error.message : 'An unexpected error occurred.');
        }
        throw error; // Re-throw the error so the calling component can handle it if needed
    }
}

// Export specific methods for convenience
export const apiService = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    get: <T = any>(endpoint: string, options?: Omit<RequestOptions, 'body' | 'method'>, expectedResponseType?: ExpectedResponseType) =>
        request<T>(endpoint, { ...options, method: 'GET' }, expectedResponseType),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    post: <T = any, B = any>(endpoint: string, body: B, options?: Omit<RequestOptions, 'body' | 'method'>, expectedResponseType?: ExpectedResponseType) =>
        request<T>(endpoint, { ...options, method: 'POST', body }, expectedResponseType),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    put: <T = any, B = any>(endpoint: string, body: B, options?: Omit<RequestOptions, 'body' | 'method'>, expectedResponseType?: ExpectedResponseType) =>
        request<T>(endpoint, { ...options, method: 'PUT', body }, expectedResponseType),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete: <T = any>(endpoint: string, options?: Omit<RequestOptions, 'body' | 'method'>, expectedResponseType?: ExpectedResponseType) =>
        request<T>(endpoint, { ...options, method: 'DELETE' }, expectedResponseType),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    patch: <T = any, B = any>(endpoint: string, body: B, options?: Omit<RequestOptions, 'body' | 'method'>, expectedResponseType?: ExpectedResponseType) =>
        request<T>(endpoint, { ...options, method: 'PATCH', body }, expectedResponseType),
};

export default apiService;