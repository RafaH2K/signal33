import { createContext, useContext, useEffect, useState } from 'react';
import { authApi } from '../api/resources.js';
import { getAccessToken, setTokens } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getAccessToken()) {
      setLoading(false);
      return;
    }
    authApi
      .me()
      .then(setUser)
      .catch(() => setTokens(null))
      .finally(() => setLoading(false));
  }, []);

  async function login(email, password) {
    const data = await authApi.login({ email, password });
    setUser(data.user);
    return data.user;
  }

  async function register(name, email, password) {
    const data = await authApi.register({ name, email, password });
    setUser(data.user);
    return data.user;
  }

  function logout() {
    const token = localStorage.getItem('refreshToken');
    setTokens(null);
    setUser(null);
    if (token) authApi.logout(token).catch(() => {});
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, isAdmin: user?.role === 'ADMIN' }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
