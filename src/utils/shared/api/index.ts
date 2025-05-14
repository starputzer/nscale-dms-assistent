/**
 * Shared API Utilities
 *
 * Common API functions that can be used in both Vue 3 and Vanilla JS implementations.
 */

/**
 * Handles fetch errors and standardizes error responses
 * @param response The fetch response object
 * @returns The response data if successful, throws a standardized error otherwise
 */
export async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    // Attempt to parse error response
    let errorData;
    try {
      errorData = await response.json();
    } catch (e) {
      errorData = { message: response.statusText };
    }

    // Create a standardized error object
    const error = new Error(errorData.message || 'API request failed');
    (error as any).status = response.status;
    (error as any).data = errorData;
    throw error;
  }

  // For successful responses, check if there's content
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return await response.json() as T;
  }

  return {} as T;
}

/**
 * Fetches data from an API with standardized error handling
 * @param url The URL to fetch from
 * @param options Fetch options
 * @returns The response data
 */
export async function fetchApi<T>(url: string, options?: RequestInit): Promise<T> {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers
      },
      ...options
    });

    return await handleResponse<T>(response);
  } catch (error) {
    // Re-throw the error with additional context
    if (error instanceof Error) {
      error.message = `API request to ${url} failed: ${error.message}`;
    }
    throw error;
  }
}

/**
 * Makes a POST request to an API
 * @param url The URL to post to
 * @param data The data to send
 * @param options Additional fetch options
 * @returns The response data
 */
export async function postApi<T>(url: string, data: any, options?: RequestInit): Promise<T> {
  return fetchApi<T>(url, {
    method: 'POST',
    body: JSON.stringify(data),
    ...options
  });
}

/**
 * Makes a PUT request to an API
 * @param url The URL to put to
 * @param data The data to send
 * @param options Additional fetch options
 * @returns The response data
 */
export async function putApi<T>(url: string, data: any, options?: RequestInit): Promise<T> {
  return fetchApi<T>(url, {
    method: 'PUT',
    body: JSON.stringify(data),
    ...options
  });
}

/**
 * Makes a DELETE request to an API
 * @param url The URL to delete from
 * @param options Additional fetch options
 * @returns The response data
 */
export async function deleteApi<T>(url: string, options?: RequestInit): Promise<T> {
  return fetchApi<T>(url, {
    method: 'DELETE',
    ...options
  });
}
