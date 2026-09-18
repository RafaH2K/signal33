export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api';

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

let accessToken = localStorage.getItem('accessToken') ?? null;
let refreshToken = localStorage.getItem('refreshToken') ?? null;

export function setTokens(tokens) {
  accessToken = tokens?.accessToken ?? null;
  refreshToken = tokens?.refreshToken ?? null;

  if (accessToken) localStorage.setItem('accessToken', accessToken);
  else localStorage.removeItem('accessToken');

  if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
  else localStorage.removeItem('refreshToken');
}

export function getAccessToken() {
  return accessToken;
}

async function refreshAccessToken() {
  if (!refreshToken) return false;

  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  const body = await res.json();
  if (!res.ok) {
    setTokens(null);
    return false;
  }
  setTokens(body.data);
  return true;
}

// Cliente delgado sobre fetch: agrega el Bearer token, reintenta una vez si
// el access token venció (401) refrescándolo, y siempre devuelve el `data`
// del formato {success, data|message} que usa toda la API.
export async function apiRequest(path, { method = 'GET', body, isFormData = false, retry = true } = {}) {
  const headers = {};
  if (!isFormData) headers['Content-Type'] = 'application/json';
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: isFormData ? body : body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && retry && refreshToken) {
    const refreshed = await refreshAccessToken();
    if (refreshed) return apiRequest(path, { method, body, isFormData, retry: false });
  }

  const responseBody = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(responseBody?.message ?? 'Error de red', res.status);
  }
  return responseBody?.data;
}

// Descarga un archivo protegido (el CSV de reservas): un <a href> no puede
// mandar el Bearer token, así que se baja con fetch y se guarda como blob.
export async function apiDownload(path, { retry = true } = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
  });
  if (res.status === 401 && retry && refreshToken && (await refreshAccessToken())) {
    return apiDownload(path, { retry: false });
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(body?.message ?? 'No se pudo descargar', res.status);
  }

  const filename = res.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] ?? 'descarga';
  const url = URL.createObjectURL(await res.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
