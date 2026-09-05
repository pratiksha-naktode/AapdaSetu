import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../types';

interface AuthContextType {
  user: UserProfile;
  currentRole: UserRole;
  switchRole: (role: UserRole) => void;
  updateAvatar: (avatarUrl: string) => void;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const defaultCitizen: UserProfile = {
  id: 'dddddddd-dddd-dddd-dddd-ddddddddddd1',
  email: 'citizen@varahi.org',
  full_name: 'Citizen User',
  phone: '+919876543221',
  role: 'CITIZEN',
  avatar_url: null
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem('varahi_auth_user');
      return saved ? JSON.parse(saved) : defaultCitizen;
    } catch {
      return defaultCitizen;
    }
  });

  const [currentRole, setCurrentRole] = useState<UserRole>(() => {
    return user?.role || 'ADMIN';
  });

  // Fetch latest profile from backend on mount or when user changes
  const refreshProfile = async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`${API_BASE}/api/users/${user.id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setUser(prev => {
            const updated = { ...prev, ...data.user };
            localStorage.setItem('varahi_auth_user', JSON.stringify(updated));
            return updated;
          });
        }
      }
    } catch (err) {
      console.warn('Could not refresh profile from server:', err);
    }
  };

  useEffect(() => {
    refreshProfile();
  }, []);

  const switchRole = (newRole: UserRole) => {
    setCurrentRole(newRole);
    // Switch active user id appropriately
    let targetUser = user;
    if (newRole === 'ADMIN') {
      targetUser = {
        id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        email: 'admin@varahi.gov.in',
        full_name: 'District Control Room',
        phone: '+919876543200',
        role: 'ADMIN',
        avatar_url: null
      };
    } else if (newRole === 'RESPONDER') {
      targetUser = {
        id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
        email: 'ndrf.alpha@varahi.gov.in',
        full_name: 'NDRF Rescue Unit Alpha (Capt. Rajesh)',
        phone: '+919876543201',
        role: 'RESPONDER',
        avatar_url: null
      };
    } else if (newRole === 'VOLUNTEER') {
      targetUser = {
        id: 'cccccccc-cccc-cccc-cccc-ccccccccccc1',
        email: 'ramesh.med@volunteer.in',
        full_name: 'Ramesh Varma',
        phone: '+919876543211',
        role: 'VOLUNTEER',
        avatar_url: null
      };
    } else {
      // Citizen
      targetUser = {
        id: 'dddddddd-dddd-dddd-dddd-ddddddddddd1',
        email: 'citizen@varahi.org',
        full_name: user.full_name || 'Citizen User',
        phone: user.phone || '+919876543221',
        role: 'CITIZEN',
        avatar_url: user.avatar_url || null
      };
    }
    setUser(targetUser);
    localStorage.setItem('varahi_auth_user', JSON.stringify(targetUser));
  };

  const updateAvatar = (avatarUrl: string) => {
    setUser(prev => {
      const updated = { ...prev, avatar_url: avatarUrl };
      localStorage.setItem('varahi_auth_user', JSON.stringify(updated));
      return updated;
    });
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    const updated = { ...user, ...updates };
    setUser(updated);
    localStorage.setItem('varahi_auth_user', JSON.stringify(updated));

    try {
      await fetch(`${API_BASE}/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
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
        currentRole,
        switchRole,
        updateAvatar,
        updateProfile,
        refreshProfile
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
