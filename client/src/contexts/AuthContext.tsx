import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiClient } from '../api/client';

export interface User {
  id: string;
  name: string;
  email: string;
  role?: string;
  onboardingComplete?: boolean;
  dob?: string;
  gender?: 'male' | 'female' | 'other';
  heightCm?: number;
  currentWeightKg?: number;
  activityLevel?: string;
  goal?: string;
  targetWeightKg?: number;
  calorieDailyTarget?: number;
  proteinDailyTargetG?: number;
  waterDailyTargetMl?: number;
  units?: 'metric' | 'imperial';
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (userData: any) => void;
  register: (userData: any) => void;
  updateUser: (partial: Partial<User>) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

let accessToken: string | null = null;
export const getAccessToken = () => accessToken;
export const setAccessToken = (token: string | null) => { accessToken = token; };

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      const token = localStorage.getItem('kaizen_access_token');
      if (!token) {
        setUser(null);
        setIsLoading(false);
        return;
      }
      setAccessToken(token);
      try {
        const response = await apiClient.get('/auth/me');
        const userData = (response as any)?.user || response;
        if (userData && !userData.id && userData._id) {
          userData.id = userData._id;
        }
        setUser(userData as User);
      } catch {
        setUser(null);
        localStorage.removeItem('kaizen_access_token');
      } finally {
        setIsLoading(false);
      }
    };
    restoreSession();
  }, []);

  const login = (data: any) => {
    const token = data.accessToken;
    const userData = data.user || data;
    if (token) {
      setAccessToken(token);
      localStorage.setItem('kaizen_access_token', token);
    }
    if (userData) {
      if (!userData.id && userData._id) {
        userData.id = userData._id;
      }
      setUser(userData as User);
    }
  };

  const register = (data: any) => {
    const token = data.accessToken;
    const userData = data.user || data;
    if (token) {
      setAccessToken(token);
      localStorage.setItem('kaizen_access_token', token);
    }
    if (userData) {
      if (!userData.id && userData._id) {
        userData.id = userData._id;
      }
      setUser(userData as User);
    }
  };

  const updateUser = (partial: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...partial } : prev));
  };

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // ignore
    } finally {
      setAccessToken(null);
      localStorage.removeItem('kaizen_access_token');
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, register, updateUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
