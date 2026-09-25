import { apiRequest, setTokens } from './client.js';

export const authApi = {
  login: async credentials => {
    const data = await apiRequest('/auth/login', {
      method: 'POST',
      body: credentials,
    });

    setTokens(data);

    return data;
  },

  register: async data => {
    const result = await apiRequest('/auth/register', {
      method: 'POST',
      body: data,
    });

    setTokens(result);

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
      setTokens(null);
    }
  },
};
