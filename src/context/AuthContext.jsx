import { createContext, useContext, useEffect, useState } from 'react';
import { apiLogin, isApiConfigured } from '../lib/apiClient';

const AUTH_STORAGE_KEY = 'npccsm_auth_user_v1';

const DEMO_USERS = [
  {
    id: 'demo-student',
    username: 'student',
    password: 'student123',
    role: 'student',
    name: 'Student User',
    department: 'Computer Science',
  },
  {
    id: 'demo-teacher',
    username: 'teacher',
    password: 'teacher123',
    role: 'teacher',
    name: 'Prof. Het Gajjar',
    department: 'Faculty of CS & IT',
  },
  {
    id: 'demo-principal',
    username: 'principal',
    password: 'principal123',
    role: 'principal',
    name: 'Dr. Principal',
    department: 'Administration',
  },
];

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore session from localStorage if available
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch (e) {
      console.error('[AuthContext] Failed to load saved auth session:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async ({ username, password, role }) => {
    const cleanUsername = (username || '').trim().toLowerCase();
    const cleanPassword = (password || '').trim();
    const targetRole = (role || '').trim().toLowerCase();

    if (!cleanUsername || !cleanPassword) {
      return { success: false, error: 'Please enter both username and password.' };
    }

    // 1. Try PostgreSQL backend verification if configured
    if (isApiConfigured) {
      try {
        const data = await apiLogin({ username: cleanUsername, password: cleanPassword, role: targetRole });

        if (data && data.id) {
          const sessionUser = {
            id: data.id,
            username: data.username,
            role: data.role,
            name: data.name || data.username,
            department: data.department || '',
            source: 'postgresql',
          };
          setUser(sessionUser);
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(sessionUser));
          return { success: true, user: sessionUser };
        }
      } catch (err) {
        // If it's a permission error (403), surface it to the user
        if (err.message.includes('Permission Denied')) {
          return { success: false, error: err.message };
        }
        // If it's invalid credentials (401), surface that too
        if (err.message.includes('Invalid username')) {
          // Fall through to demo users check below
        }
        console.warn('[AuthContext] Backend auth failed, checking fallback:', err.message);
      }
    }

    // 2. Check local demo credentials (Fallback / Offline / Local mode)
    const matchedDemo = DEMO_USERS.find(
      (u) => u.username.toLowerCase() === cleanUsername && u.password === cleanPassword
    );

    if (matchedDemo) {
      if (matchedDemo.role !== targetRole) {
        return {
          success: false,
          error: `Permission Denied: Demo account '${cleanUsername}' has '${matchedDemo.role}' role, not '${targetRole}'.`,
        };
      }
      const sessionUser = {
        id: matchedDemo.id,
        username: matchedDemo.username,
        role: matchedDemo.role,
        name: matchedDemo.name,
        department: matchedDemo.department,
        source: 'demo',
      };
      setUser(sessionUser);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(sessionUser));
      return { success: true, user: sessionUser };
    }

    return {
      success: false,
      error: 'Invalid username or password. Please check your credentials and selected role.',
    };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  const value = {
    user,
    loading,
    login,
    logout,
    demoUsers: DEMO_USERS,
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
