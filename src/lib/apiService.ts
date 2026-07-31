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

// ── User-friendly error messages ──
// Backend error bodies range from clean sentences to Prisma dumps, validation
// arrays and whole HTML pages. Only clean, short server messages are shown to
// the user; everything else falls back to a friendly status-based message.
const FRIENDLY_BY_STATUS: Record<number, string> = {
    400: 'Some of the information sent was not valid. Please check and try again.',
    403: "You don't have permission to perform this action.",
    404: 'The requested information could not be found.',
    408: 'The request took too long. Please try again.',
    409: 'This conflicts with information that already exists.',
    422: 'Some of the information sent was not valid. Please check and try again.',
    429: 'Too many requests at once. Please wait a moment and try again.',
};

const friendlyStatusMessage = (status: number): string =>
    FRIENDLY_BY_STATUS[status] ?? (status >= 500
        ? 'Something went wrong on the server. Please try again in a moment.'
        : 'The request could not be completed. Please try again.');

// Heuristics for messages that should never reach a user's screen.
const looksTechnical = (message: string): boolean =>
    message.length > 160
    || /<\/?[a-z][^>]*>/i.test(message) // HTML fragments / error pages
    || /\b(prisma|sql|query|traceback|stack|exception|econn|etimedout|enotfound|typeerror|referenceerror|undefined|null|jwt|token)\b/i.test(message)
    || /\n\s+at\s/.test(message); // stack traces

const humanizeServerMessage = (raw: unknown, status: number): string => {
    // NestJS-style validation errors arrive as an array of strings.
    const message = Array.isArray(raw)
        ? raw.filter((m): m is string => typeof m === 'string').slice(0, 3).join('. ')
        : typeof raw === 'string' ? raw.trim() : '';
    if (!message || looksTechnical(message)) return friendlyStatusMessage(status);
    return message.charAt(0).toUpperCase() + message.slice(1);
};

interface RequestOptions extends RequestInit {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    body?: any; // Allow any body type for flexibility, will be stringified if object
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    params?: any; // Allow params object for query parameters
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

    // Extract and format query parameters
    let url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
    if (options.params) {
        const queryString = new URLSearchParams(options.params).toString();
        url = `${url}?${queryString}`;
    }

    // Stringify body if it's an object and Content-Type is not already set to something else
    let body = options.body;
    if (typeof body === 'object' && body !== null && !(body instanceof FormData) && !(headers['Content-Type'] || headers['content-type'])) {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify(body);
    }


    try {
        const response = await fetch(url, {
            ...options,
            headers,
            body,
        });

        if (response.status === 401) {
            // Parent portal sessions are matricule-based with no JWT — a 401 from
            // a staff-only endpoint must not log the parent out or redirect.
            if (typeof window !== 'undefined' && !getAuthToken() && localStorage.getItem('parentPortal')) {
                throw new Error('Unauthorized');
            }
            // Unauthorized — server details ("jwt expired", "invalid token"…) are
            // never useful to the user mid-session.
            clearAuthData();
            toast.error('Your session has expired. Please log in again.', { id: 'api-error' });
            if (typeof window !== 'undefined') {
                // Ensure this only runs client-side
                window.location.href = '/'; // Redirect to login
            }
            // Throw an error to stop further processing in the calling function
            throw new Error('Unauthorized');
        }

        if (!response.ok) {
            // Handle other errors (4xx, 5xx)
            let serverMessage: unknown;
            try {
                const errorData = await response.json();
                serverMessage = errorData?.message ?? errorData?.error;
            } catch {
                // Non-JSON body (e.g. an HTML error page) — never show it to the user.
            }
            const errorMessage = humanizeServerMessage(serverMessage, response.status);
            // A shared toast id keeps repeated/parallel failures from stacking.
            toast.error(errorMessage, { id: 'api-error' });
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
        // fetch throws TypeError when the server is unreachable — the raw
        // "Failed to fetch" message means nothing to users. Re-throw with the
        // friendly text so components that toast error.message stay readable.
        if (error instanceof TypeError) {
            const friendly = 'Could not reach the server. Please check your internet connection and try again.';
            toast.error(friendly, { id: 'api-error' });
            throw new Error(friendly);
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