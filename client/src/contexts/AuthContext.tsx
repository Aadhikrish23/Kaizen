import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { clearApiCache, claimApiCache } from '../offline/apiCache';
import { browserTimezone } from '../utils/date';
import { SESSION_EXPIRED_EVENT, shouldClearQueryCache } from './sessionCache';

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
  targetDate?: string;
  calorieDailyTarget?: number;
  proteinDailyTargetG?: number;
  waterDailyTargetMl?: number;
  units?: 'metric' | 'imperial';
  timezone?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (userData: any) => Promise<void>;
  register: (userData: any) => Promise<void>;
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
  const queryClient = useQueryClient();
  const cacheUserId = useRef<string | null>(null); // the user the in-memory query cache was filled for

  // Order matters: first make the offline (service worker) cache belong to the new user, then drop the in-memory
  // query cache, and only then expose the user, so no screen can render or refetch the previous user's data.
  const switchCaches = async (nextUserId: string | null) => {
    if (nextUserId) await claimApiCache(nextUserId);
    else await clearApiCache();
    if (shouldClearQueryCache(cacheUserId.current, nextUserId)) {
      await queryClient.cancelQueries();
      // queryClient.clear(); (scratch: reverted to prove the E2E spec fails without the fix)
    }
    cacheUserId.current = nextUserId;
  };

  // Forced logout: the API client could not renew the session
  useEffect(() => {
    const onExpired = () => {
      void switchCaches(null).then(() => {
        setAccessToken(null);
        setUser(null);
      });
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        await switchCaches(userData?.id ?? null); // cache left by another user (or unknown owner) is dropped before any screen reads it
        setUser(userData as User);
        // Adopt the browser timezone while the account is still on the server default.
        const tz = browserTimezone();
        if (tz && tz !== 'UTC' && (!userData.timezone || userData.timezone === 'UTC')) {
          apiClient.patch('/profile', { timezone: tz })
            .then(() => setUser(prev => (prev ? { ...prev, timezone: tz } : prev)))
            .catch(() => { /* non-fatal: retried on next load */ });
        }
      } catch {
        setUser(null);
        localStorage.removeItem('kaizen_access_token');
        await switchCaches(null);
      } finally {
        setIsLoading(false);
      }
    };
    restoreSession();
  }, []);

  const startSession = async (data: any) => {
    const token = data.accessToken;
    const userData = data.user || data;
    if (userData && !userData.id && userData._id) {
      userData.id = userData._id;
    }
    // Callers await this before navigating, so the caches are already switched when the first screen mounts
    await switchCaches(userData?.id ?? null);
    if (token) {
      setAccessToken(token);
      localStorage.setItem('kaizen_access_token', token);
    }
    if (userData) setUser(userData as User);
  };

  const login = (data: any) => startSession(data);
  const register = (data: any) => startSession(data);

  const updateUser = (partial: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...partial } : prev));
  };

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // ignore
    } finally {
      // Cached API responses belong to this user: drop them. (Queued offline writes stay tagged with their user id
      // and are only replayed when that same user is signed in again.)
      await switchCaches(null);
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
