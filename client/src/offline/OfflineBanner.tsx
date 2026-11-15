import React, { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CloudOff, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { discardItem, flushQueue, retryFailedItem } from './offlineQueue';
import { useOnlineStatus, useQueueItems } from './online';

const FLUSH_INTERVAL_MS = 30 * 1000;

// Shows connectivity state and the write queue (pending and failed items), and replays the queue when back online.
export const OfflineBanner: React.FC = () => {
  const online = useOnlineStatus();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const items = useQueueItems().filter((i) => i.userId === user?.id);
  const pending = items.filter((i) => i.status === 'pending');
  const failed = items.filter((i) => i.status === 'failed');

  // Replay on reconnect, on mount, and periodically while online with pending items
  useEffect(() => {
    if (!online || !user?.id) return;
    const run = async () => {
      const sent = await flushQueue(user.id);
      if (sent > 0) queryClient.invalidateQueries(); // refetch lists and summaries that now include the replayed logs
    };
    void run();
    if (pending.length === 0) return;
    const t = setInterval(run, FLUSH_INTERVAL_MS);
    return () => clearInterval(t);
  }, [online, user?.id, pending.length, queryClient]);

  if (online && pending.length === 0 && failed.length === 0) return null;

  return (
    <div className="space-y-2 mb-4" role="status" aria-live="polite">
      {!online && (
        <div className="p-3 rounded-control bg-amber-500/10 border border-amber-500/30 text-amber-100 text-sm flex items-start gap-2">
          <CloudOff className="w-4 h-4 mt-0.5 shrink-0 text-amber-300" />
          <p>
            You are offline. You can see recently loaded data; meals, water, weight and sleep you add are saved on this device and sync
            when you reconnect. Workouts, the planner and everything else need a connection.
          </p>
        </div>
      )}
      {pending.length > 0 && (
        <div className="p-3 rounded-control bg-kaizen-surface border border-kaizen-border text-sm text-kaizen-text">
          <p className="flex items-center gap-2 font-medium">
            <RefreshCw className={`w-4 h-4 ${online ? 'animate-spin text-emerald-400' : 'text-kaizen-muted'}`} />
            {pending.length} item{pending.length === 1 ? '' : 's'} waiting to sync
          </p>
          <ul className="mt-1.5 space-y-0.5 text-xs font-mono text-kaizen-muted">
            {pending.map((i) => <li key={i.clientRequestId}>{i.label}{i.attempts > 0 ? ` (attempt ${i.attempts})` : ''}</li>)}
          </ul>
        </div>
      )}
      {failed.length > 0 && (
        <div className="p-3 rounded-control bg-rose-500/10 border border-rose-500/30 text-sm text-rose-100">
          <p className="font-medium">{failed.length} item{failed.length === 1 ? '' : 's'} could not be synced</p>
          <ul className="mt-1.5 space-y-1.5 text-xs">
            {failed.map((i) => (
              <li key={i.clientRequestId} className="flex items-center justify-between gap-2">
                <span className="font-mono">{i.label}: {i.error ?? 'failed'}</span>
                <span className="flex gap-1 shrink-0">
                  <Button size="sm" variant="secondary" disabled={!online} onClick={() => void retryFailedItem(i.clientRequestId)}>Retry</Button>
                  <Button size="sm" variant="ghost" onClick={() => void discardItem(i.clientRequestId)} aria-label={`Discard ${i.label}`}><Trash2 className="w-3.5 h-3.5" /></Button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
