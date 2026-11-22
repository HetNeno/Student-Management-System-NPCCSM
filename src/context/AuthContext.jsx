import { createContext, useContext, useEffect, useState } from 'react';
import { apiGetSession, apiLogin, apiLogout } from '../lib/apiClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    apiGetSession()
      .then((data) => {
        if (active) setUser(data.user || null);
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const login = async ({ username, password, role }) => {
    const cleanUsername = (username || '').trim().toLowerCase();
    const cleanPassword = (password || '').trim();
    const targetRole = (role || '').trim().toLowerCase();

    if (!cleanUsername || !cleanPassword) {
      return { success: false, error: 'Please enter both username and password.' };
    }

    try {
      const data = await apiLogin({ username: cleanUsername, password: cleanPassword, role: targetRole });
      const sessionUser = {
        id: data.id,
        username: data.username,
        role: data.role,
        name: data.name || data.username,
        department: data.department || '',
        source: 'laravel',
      };
      setUser(sessionUser);
      return { success: true, user: sessionUser };
    } catch (err) {
      return { success: false, error: err.message || 'Unable to sign in. Please try again.' };
    }
  };

  const logout = async () => {
    setUser(null);
    try {
      await apiLogout();
    } catch (err) {
      console.error('[AuthContext] Failed to close server session:', err);
    }
  };

  const value = {
    user,
    loading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
