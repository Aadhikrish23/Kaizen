import React, { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { useDueReminders, useReminderPrefs } from '../../services/reminderService';
import { hasEnabledReminders } from '../../utils/reminderPolling';
import { addId, DISMISSED_PREFIX, loadIds, NOTIFIED_PREFIX } from '../../utils/reminderDismissals';
import { showBrowserNotification } from './browserNotifications';

const store = (): Storage | null => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

// Dismissible in-app reminders (no alert()). Dismissals are remembered per reminder per day in localStorage.
export const ReminderBanner: React.FC = () => {
  // Prefs are fetched once; the due list is only polled when at least one reminder is enabled
  const { data: prefs } = useReminderPrefs();
  const polling = hasEnabledReminders(prefs);
  const { data: polled = [] } = useDueReminders(polling);
  const due = polling ? polled : []; // never show stale items after everything was switched off
  const [dismissedByDate, setDismissedByDate] = useState<Record<string, string[]>>({});

  const dismissedFor = (date: string) => dismissedByDate[date] ?? loadIds(store(), DISMISSED_PREFIX, date);
  const visible = due.filter((d) => !dismissedFor(d.date).includes(d.id));

  // Optional browser notification, once per reminder per day, only if the user opted in
  useEffect(() => {
    for (const d of due) {
      if (loadIds(store(), NOTIFIED_PREFIX, d.date).includes(d.id)) continue;
      addId(store(), NOTIFIED_PREFIX, d.date, d.id);
      showBrowserNotification('Kaizen reminder', d.message);
    }
  }, [due]);

  if (visible.length === 0) return null;

  const dismiss = (date: string, id: string) =>
    setDismissedByDate((prev) => ({ ...prev, [date]: addId(store(), DISMISSED_PREFIX, date, id) }));

  return (
    <div className="space-y-2 mb-4" role="status" aria-live="polite">
      {visible.map((d) => (
        <div key={`${d.date}:${d.id}`} className="flex items-center justify-between gap-3 p-3 rounded-control bg-amber-500/10 border border-amber-500/30 text-amber-100">
          <span className="flex items-center gap-2 text-sm">
            <Bell className="w-4 h-4 text-amber-300 shrink-0" />
            {d.message} <span className="text-[11px] font-mono text-amber-300/80">{d.time}</span>
          </span>
          <button type="button" onClick={() => dismiss(d.date, d.id)} aria-label={`Dismiss ${d.type} reminder`} className="text-amber-200 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
