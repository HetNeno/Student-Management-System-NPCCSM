import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiGetSession, apiLogin, apiLogout, apiRegister } from '../lib/apiClient';

const AuthContext = createContext(null);

export const DASHBOARD_BY_ROLE = {
  student: '/student',
  teacher: '/teacher',
  principal: '/principal',
};

/**
 * Session state mirrors the Laravel session. Nothing here grants access:
 * every protected API endpoint re-checks authentication and role.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    apiGetSession()
      .then((data) => active && setUser(data?.user || null))
      .catch(() => active && setUser(null))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async ({ email, password, remember }) => {
    try {
      const data = await apiLogin({ email: (email || '').trim(), password, remember });
      setUser(data.user);
      return { success: true, user: data.user, redirect: data.redirect };
    } catch (err) {
      return { success: false, error: err.message, fieldErrors: err.errors || {} };
    }
  }, []);

  const register = useCallback(async (payload) => {
    try {
      const data = await apiRegister(payload);
      setUser(data.user);
      return { success: true, user: data.user, redirect: data.redirect };
    } catch (err) {
      return { success: false, error: err.message, fieldErrors: err.errors || {} };
    }
  }, []);

  const logout = useCallback(async () => {
    // Clear local state first so callers can navigate immediately; the
    // server then invalidates the session and rotates the CSRF token.
    setUser(null);
    try {
      await apiLogout();
    } catch (err) {
      console.error('[Auth] Logout request failed:', err.message);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
