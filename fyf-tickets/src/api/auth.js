import { apiRequest } from './client.js';
import { setSession, clearSession } from '../auth/auth.js';

export const authApi = {
  login: async credentials => {
    const data = await apiRequest('/auth/login', {
      method: 'POST',
      body: credentials,
    });

    setSession(data);

    return data;
  },

  register: async data => {
    const result = await apiRequest('/auth/register', {
      method: 'POST',
      body: data,
    });

    setSession(result);

    return result;
  },

  me: () => apiRequest('/auth/me'),

  logout: async () => {
    try {
      const refreshToken =
        localStorage.getItem('fyf_refresh_token');

      if (refreshToken) {
        await apiRequest('/auth/logout', {
          method: 'POST',
          body: { refreshToken },
        });
      }
    } finally {
      clearSession();
    }
  },
};
