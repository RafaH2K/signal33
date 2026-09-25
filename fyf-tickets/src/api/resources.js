import { API_URL, apiRequest } from './client.js';

export const eventsApi = {
  list: (params = '') => apiRequest(`/events/${params}`),
};

export const reservationsApi = {
  create: data =>
    apiRequest('/reservations/', {
      method: 'POST',
      body: data,
    }),

  availability: eventId =>
    apiRequest(`/reservations/availability/${eventId}`),

  track: trackingCode =>
    apiRequest(
      `/reservations/track/${encodeURIComponent(trackingCode)}`
    ),

  mine: () => apiRequest('/reservations/mine'),

  qrUrl: code =>
    `${API_URL}/reservations/tickets/${encodeURIComponent(code)}/qr.png`,
};

export const organizationsApi = {
  publicEvents: slug => apiRequest(`/organizations/public/${encodeURIComponent(slug)}/events`),
  mine: () => apiRequest('/organizations'),
  create: name => apiRequest('/organizations', { method: 'POST', body: { name } }),
  events: organizationId => apiRequest(`/organizations/${organizationId}/events`),
  createEvent: (organizationId, data) => apiRequest(`/organizations/${organizationId}/events`, { method: 'POST', body: data }),
  uploadCover: (organizationId, file) => {
    const body = new FormData();
    body.append('file', file);
    return apiRequest(`/organizations/${organizationId}/uploads`, { method: 'POST', body, isFormData: true });
  },
  updateEvent: (organizationId, eventId, data) => apiRequest(`/organizations/${organizationId}/events/${eventId}`, { method: 'PATCH', body: data }),
  deleteEvent: (organizationId, eventId) => apiRequest(`/organizations/${organizationId}/events/${eventId}`, { method: 'DELETE' }),
  reservations: organizationId => apiRequest(`/organizations/${organizationId}/reservations`),
  setPaid: (organizationId, reservationId, isPaid) => apiRequest(`/organizations/${organizationId}/reservations/${reservationId}/payment`, { method: 'PATCH', body: { isPaid } }),
  checkIn: (organizationId, code) => apiRequest(`/organizations/${organizationId}/tickets/${encodeURIComponent(code)}/check-in`, { method: 'POST' }),
};
