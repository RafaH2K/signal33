import { API_URL, apiDownload, apiRequest, setTokens } from './client.js';

export const authApi = {
  register: (data) => apiRequest('/auth/register', { method: 'POST', body: data }).then(saveTokens),
  login: (data) => apiRequest('/auth/login', { method: 'POST', body: data }).then(saveTokens),
  me: () => apiRequest('/auth/me'),
  logout: (refreshToken) => apiRequest('/auth/logout', { method: 'POST', body: { refreshToken } }),
  forgotPassword: (email) => apiRequest('/auth/forgot-password', { method: 'POST', body: { email } }),
  resetPassword: (token, password) => apiRequest('/auth/reset-password', { method: 'POST', body: { token, password } }),
};

function saveTokens(data) {
  setTokens(data);
  return data;
}

export const usersApi = {
  me: () => apiRequest('/users/me'),
  updateMe: (data) => apiRequest('/users/me', { method: 'PATCH', body: data }),
  changePassword: (data) => apiRequest('/users/me/password', { method: 'PATCH', body: data }),
  adminList: (params = '') => apiRequest(`/users/${params}`),
  adminRemove: (id) => apiRequest(`/users/${id}`, { method: 'DELETE' }),
  updateRole: (id, role) => apiRequest(`/users/${id}/role`, { method: 'PATCH', body: { role } }),
};

export const productsApi = {
  list: (params = '') => apiRequest(`/products/${params}`),
  get: (id, params = '') => apiRequest(`/products/${id}${params}`),
  create: (data) => apiRequest('/products/', { method: 'POST', body: data }),
  update: (id, data) => apiRequest(`/products/${id}`, { method: 'PATCH', body: data }),
  remove: (id) => apiRequest(`/products/${id}`, { method: 'DELETE' }),
};

export const cartApi = {
  get: () => apiRequest('/cart/'),
  addItem: (productId, quantity = 1) => apiRequest('/cart/items', { method: 'POST', body: { productId, quantity } }),
  updateItem: (productId, quantity) =>
    apiRequest(`/cart/items/${productId}`, { method: 'PATCH', body: { quantity } }),
  removeItem: (productId) => apiRequest(`/cart/items/${productId}`, { method: 'DELETE' }),
};

export const ordersApi = {
  checkout: () => apiRequest('/orders/', { method: 'POST' }),
  mine: () => apiRequest('/orders/'),
  adminList: (params = '') => apiRequest(`/orders/all${params}`),
  updateStatus: (id, status) => apiRequest(`/orders/${id}/status`, { method: 'PATCH', body: { status } }),
};

export const galleryApi = {
  list: (params = '') => apiRequest(`/gallery/${params}`),
  create: (data) => apiRequest('/gallery/', { method: 'POST', body: data }),
  update: (id, data) => apiRequest(`/gallery/${id}`, { method: 'PATCH', body: data }),
  remove: (id) => apiRequest(`/gallery/${id}`, { method: 'DELETE' }),
  reorder: (items) => apiRequest('/gallery/reorder', { method: 'PATCH', body: { items } }),
};

export const eventsApi = {
  list: (params = '') => apiRequest(`/events/${params}`),
  create: (data) => apiRequest('/events/', { method: 'POST', body: data }),
  update: (id, data) => apiRequest(`/events/${id}`, { method: 'PATCH', body: data }),
  remove: (id) => apiRequest(`/events/${id}`, { method: 'DELETE' }),
};

export const aboutApi = {
  get: () => apiRequest('/about/'),
  update: (data) => apiRequest('/about/', { method: 'PATCH', body: data }),
};

export const signalApi = {
  resolve: (command) => apiRequest(`/signal/${encodeURIComponent(command)}`),
};

export const uploadsApi = {
  upload: (file) => {
    const form = new FormData();
    form.append('file', file);
    return apiRequest('/uploads/', { method: 'POST', body: form, isFormData: true });
  },
};

export const dashboardApi = {
  summary: () => apiRequest('/dashboard/summary'),
  signals: {
    list: (params = '') => apiRequest(`/dashboard/signals${params}`),
    create: (data) => apiRequest('/dashboard/signals', { method: 'POST', body: data }),
    update: (id, data) => apiRequest(`/dashboard/signals/${id}`, { method: 'PATCH', body: data }),
    remove: (id) => apiRequest(`/dashboard/signals/${id}`, { method: 'DELETE' }),
  },
};

export const reservationsApi = {
  create: (data) => apiRequest('/reservations/', { method: 'POST', body: data }),
  availability: (eventId) => apiRequest(`/reservations/availability/${eventId}`),
  get: (id) => apiRequest(`/reservations/${id}`),
  resendEmail: (id) => apiRequest(`/reservations/${id}/resend-email`, { method: 'POST' }),
  exportCsv: (eventId) => apiDownload(`/reservations/export.csv?eventId=${eventId}`),
  track: (trackingCode) => apiRequest(`/reservations/track/${encodeURIComponent(trackingCode)}`),
  qrUrl: (code) => `${API_URL}/reservations/tickets/${code}/qr.png`,
  adminList: (params = '') => apiRequest(`/reservations/${params}`),
  stats: (eventId) => apiRequest(`/reservations/stats/${eventId}`),
  getTicket: (code) => apiRequest(`/reservations/tickets/${encodeURIComponent(code)}`),
  checkIn: (code) => apiRequest(`/reservations/tickets/${encodeURIComponent(code)}/check-in`, { method: 'POST' }),
  setPaid: (id, isPaid) => apiRequest(`/reservations/${id}/payment`, { method: 'PATCH', body: { isPaid } }),
  cancel: (id) => apiRequest(`/reservations/${id}`, { method: 'DELETE' }),
};
