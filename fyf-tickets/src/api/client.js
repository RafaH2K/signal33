import { getAccessToken, getRefreshToken, setSession, clearSession } from '../auth/auth.js';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function apiRequest(
  path,
  { method = 'GET', body, isFormData = false, retry = true } = {}
) {
  const headers = {};

  const accessToken = getAccessToken();

  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    credentials: 'include',
    body: isFormData
      ? body
      : body
        ? JSON.stringify(body)
        : undefined,
  });

  const responseBody = await res.json().catch(() => null);

  if (res.status === 401 && retry && !path.startsWith('/auth/')) {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      const refreshed = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }), credentials: 'include',
      });
      const tokenData = await refreshed.json().catch(() => null);
      if (refreshed.ok && tokenData?.data?.accessToken) {
        setSession(tokenData.data);
        return apiRequest(path, { method, body, isFormData, retry: false });
      }
    }
    clearSession();
  }

  if (!res.ok) {
    throw new ApiError(
      responseBody?.message ??
        responseBody?.error ??
        'Error de red',
      res.status
    );
  }

  return responseBody?.data;
}

export { API_URL };
