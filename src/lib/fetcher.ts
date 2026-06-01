// src/lib/fetcher.ts
import { getAuthToken } from '@/lib/auth'; // Use path alias

/**
 * A reusable fetcher function for use with SWR.
 * Automatically adds Authorization header if a token is found.
 * Handles basic JSON parsing and error throwing for non-OK responses.
 */
export const fetcher = async (url: string) => {
  const token = getAuthToken();
  const headers: HeadersInit = {
    'Accept': 'application/json',
    'Content-Type': 'application/json', 
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, { headers });

  if (!res.ok) {
    let errorInfo = { status: res.status, message: res.statusText };
    try {
        // Try to parse detailed error message from backend if available
        const errorData = await res.json();
        errorInfo.message = errorData.message || errorData.error || res.statusText;
    } catch (e) {
        // Ignore if parsing fails, use default statusText
    }
    // Create an error object with status and message
    const error = new Error(`API Error: ${errorInfo.message}`);
    (error as any).status = errorInfo.status; // Attach status code to the error
    console.error(`Fetch error (${errorInfo.status}) for ${url}:`, errorInfo.message); // Log the error
    throw error; // Throw error to be caught by SWR
  }

  // Handle cases where the response might not be JSON (e.g., 204 No Content)
  const contentType = res.headers.get("content-type");
  if (res.status === 204 || !contentType || contentType.indexOf("application/json") === -1) {
      return null; // Return null for non-JSON or empty responses
  }

  try {
    return await res.json(); // Parse and return JSON data
  } catch (e) {
    console.error(`Failed to parse JSON response for ${url}:`, e);
    throw new Error(`Failed to parse JSON response from ${url}`); // Throw specific JSON parsing error
  }
}; 