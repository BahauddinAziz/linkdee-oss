/**
 * LinkedReach API Client
 * A robust fetch wrapper with auth, token refresh, and upload support.
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

/** Read the stored access token */
const getToken = () => localStorage.getItem('lr_access_token');

/** Store a new access token */
const setToken = (token) => localStorage.setItem('lr_access_token', token);

/** Clear stored tokens */
const clearTokens = () => {
  localStorage.removeItem('lr_access_token');
  localStorage.removeItem('lr_refresh_token');
};

/** Build request headers */
const buildHeaders = (isJson = true) => {
  const headers = {};
  if (isJson) headers['Content-Type'] = 'application/json';
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
};

/** Attempt to refresh the access token */
const refreshToken = async () => {
  const refreshTok = localStorage.getItem('lr_refresh_token');
  if (!refreshTok) throw new Error('No refresh token');

  const res = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: refreshTok }),
  });

  if (!res.ok) {
    clearTokens();
    throw new Error('Token refresh failed');
  }

  const data = await res.json();
  if (data.accessToken) setToken(data.accessToken);
  return data;
};

/** Core request handler with auto-retry on 401 */
const request = async (method, path, body, isJson = true, isRetry = false) => {
  const url = `${BASE_URL}${path}`;
  const options = {
    method,
    headers: buildHeaders(isJson),
  };

  if (body && isJson) {
    options.body = JSON.stringify(body);
  } else if (body && !isJson) {
    options.body = body; // FormData
  }

  let res;
  try {
    res = await fetch(url, options);
  } catch (err) {
    throw new Error(`Network error: ${err.message}`);
  }

  // If 401 and not already retried, attempt token refresh
  if (res.status === 401 && !isRetry) {
    try {
      await refreshToken();
      return request(method, path, body, isJson, true);
    } catch {
      // Dispatch a global auth failure event so the app can redirect
      window.dispatchEvent(new Event('lr:auth-expired'));
      throw new Error('Session expired. Please log in again.');
    }
  }

  // Handle 204 No Content
  if (res.status === 204) return null;

  let data;
  const contentType = res.headers.get('Content-Type') || '';
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  if (!res.ok) {
    const message =
      (typeof data === 'object' && data?.message) ||
      (typeof data === 'object' && data?.error) ||
      `Request failed with status ${res.status}`;
    throw new Error(message);
  }

  return data;
};

/** Public API client */
export const api = {
  /** GET request */
  get: (path) => request('GET', path),

  /** POST request with JSON body */
  post: (path, body) => request('POST', path, body),

  /** PATCH request with JSON body */
  patch: (path, body) => request('PATCH', path, body),

  /** PUT request with JSON body */
  put: (path, body) => request('PUT', path, body),

  /** DELETE request */
  delete: (path) => request('DELETE', path),

  /** Upload a file via multipart/form-data */
  upload: (path, formData) => request('POST', path, formData, false),

  /** Helpers */
  setToken,
  getToken,
  clearTokens,
};

export default api;
