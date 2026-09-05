import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../types';

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  currentRole: UserRole;
  switchRole: (role: UserRole) => void;
  updateAvatar: (avatarUrl: string) => void;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
  login: (email: string, password?: string, expectedRole?: UserRole) => Promise<UserProfile>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('varahi_auth_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('varahi_auth_token') || null;
  });

  const [currentRole, setCurrentRole] = useState<UserRole>(() => {
    return user?.role || 'CITIZEN';
  });

  // Fetch latest profile from backend using stored session ID/token
  const refreshProfile = async () => {
    const storedUser = localStorage.getItem('varahi_auth_user');
    const parsedUser = storedUser ? JSON.parse(storedUser) : null;
    const userId = user?.id || parsedUser?.id;
    if (!userId) return;

    try {
      const res = await fetch(`${API_BASE}/api/users/${userId}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setUser(data.user);
          localStorage.setItem('varahi_auth_user', JSON.stringify(data.user));
        }
      }
    } catch (err) {
      console.warn('Could not refresh profile from server:', err);
    }
  };

  useEffect(() => {
    refreshProfile();
  }, []);

  const login = async (email: string, password?: string, expectedRole?: UserRole): Promise<UserProfile> => {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password: password || 'varahi-secure-pass',
        expected_role: expectedRole
      })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Login failed: Invalid credentials or server error');
    }
    setUser(data.user);
    setToken(data.token);
    setCurrentRole(data.user.role || 'CITIZEN');
    localStorage.setItem('varahi_auth_user', JSON.stringify(data.user));
    if (data.token) {
      localStorage.setItem('varahi_auth_token', data.token);
    }
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('varahi_auth_user');
    localStorage.removeItem('varahi_auth_token');
    setUser(null);
    setToken(null);
  };

  const switchRole = (newRole: UserRole) => {
    // Role selection changes the requested interface/portal.
    // The authenticated user's identity comes strictly from their authenticated session.
    setCurrentRole(newRole);
  };

  const updateAvatar = (avatarUrl: string) => {
    setUser(prev => {
      if (!prev) return null;
      const updated = { ...prev, avatar_url: avatarUrl };
      localStorage.setItem('varahi_auth_user', JSON.stringify(updated));
      return updated;
    });
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user?.id) throw new Error('No active user session');
    const updated = { ...user, ...updates };
    setUser(updated);
    localStorage.setItem('varahi_auth_user', JSON.stringify(updated));

    try {
      await fetch(`${API_BASE}/api/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(updates)
      });
    } catch (err) {
      console.warn('Failed to sync profile update to backend:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(user && user.id),
        currentRole,
        switchRole,
        updateAvatar,
        updateProfile,
        refreshProfile,
        login,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
