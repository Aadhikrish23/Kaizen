import { useEffect, useState, useSyncExternalStore } from 'react';
import { getQueueSnapshot, subscribeQueue } from './offlineQueue';

export const useOnlineStatus = (): boolean => {
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine !== false);
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);
  return online;
};

export const useQueueItems = () => useSyncExternalStore(subscribeQueue, getQueueSnapshot, getQueueSnapshot);

export { NEEDS_CONNECTION_MESSAGE } from '../api/client';
