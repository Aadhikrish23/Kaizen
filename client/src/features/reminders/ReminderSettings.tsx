import React, { useEffect, useState } from 'react';
import { Plus, Save, X } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Reminder, ReminderPrefs, ReminderType, useReminderPrefs, useSaveReminderPrefs } from '../../services/reminderService';
import {
  browserNotificationsActive, browserNotificationsSupported, disableBrowserNotifications, enableBrowserNotifications,
} from './browserNotifications';

const LABELS: Record<ReminderType, string> = { water: 'Water', meal: 'Meals', weight: 'Weigh-in', workout: 'Workout', sleep: 'Sleep' };
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MAX_TIMES = 8;

export const ReminderSettings: React.FC = () => {
  const { data, isLoading } = useReminderPrefs();
  const { mutateAsync: save, isPending } = useSaveReminderPrefs();
  const [prefs, setPrefs] = useState<ReminderPrefs | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [notifOn, setNotifOn] = useState(browserNotificationsActive());
  const [notifNote, setNotifNote] = useState<string | null>(null);

  useEffect(() => {
    if (data) setPrefs(data);
  }, [data]);

  if (isLoading || !prefs) return <Card title="Reminders"><p className="text-xs font-mono text-kaizen-muted">Loading...</p></Card>;

  const update = (type: ReminderType, patch: Partial<Reminder>) =>
    setPrefs({ ...prefs, reminders: prefs.reminders.map((r) => (r.type === type ? { ...r, ...patch } : r)) });

  const setTime = (r: Reminder, i: number, value: string) => update(r.type, { times: r.times.map((t, idx) => (idx === i ? value : t)) });
  const toggleDay = (r: Reminder, d: number) => {
    const days = r.days ?? [];
    update(r.type, { days: days.includes(d) ? days.filter((x) => x !== d) : [...days, d].sort() });
  };

  const handleSave = async () => {
    setMessage(null);
    const timeRe = /^([01]\d|2[0-3]):[0-5]\d$/;
    for (const r of prefs.reminders) {
      if (r.times.some((t) => !timeRe.test(t))) return setMessage(`${LABELS[r.type]}: enter every time as HH:MM.`);
      if (new Set(r.times).size !== r.times.length) return setMessage(`${LABELS[r.type]}: times must be different.`);
    }
    try {
      await save(prefs);
      setMessage('Reminders saved.');
    } catch {
      setMessage('Could not save reminders. Please check the times and try again.');
    }
  };

  const handleNotifToggle = async (checked: boolean) => {
    setNotifNote(null);
    if (!checked) {
      disableBrowserNotifications();
      setNotifOn(false);
      return;
    }
    const result = await enableBrowserNotifications(); // asks the browser for permission, only now
    setNotifOn(result === 'enabled');
    if (result === 'unsupported') setNotifNote('This browser does not support notifications; in-app reminders still work.');
    if (result === 'denied') setNotifNote('Permission was not granted. In-app reminders still work; you can allow notifications in your browser settings.');
  };

  return (
    <Card title="Reminders" subtitle="In-app reminders, shown while Kaizen is open (times are in your timezone)">
      <div className="space-y-4">
        {prefs.reminders.map((r) => (
          <div key={r.type} className="p-3 rounded-control border border-kaizen-border bg-kaizen-bg space-y-2">
            <label className="flex items-center gap-2 text-sm text-kaizen-text">
              <input type="checkbox" checked={r.enabled} onChange={(e) => update(r.type, { enabled: e.target.checked })} />
              {LABELS[r.type]}
            </label>
            {r.enabled && (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  {r.times.map((t, i) => (
                    <span key={i} className="flex items-center gap-1">
                      <input
                        type="time"
                        value={t}
                        aria-label={`${LABELS[r.type]} reminder time ${i + 1}`}
                        onChange={(e) => setTime(r, i, e.target.value)}
                        className="bg-kaizen-surface border border-kaizen-border rounded-control px-2 py-1 text-xs text-kaizen-text"
                      />
                      <button type="button" aria-label="Remove time" onClick={() => update(r.type, { times: r.times.filter((_, idx) => idx !== i) })} className="text-kaizen-subtle hover:text-rose-400">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                  {r.times.length < MAX_TIMES && (
                    <button type="button" onClick={() => update(r.type, { times: [...r.times, '09:00'] })} className="text-xs text-kaizen-primary inline-flex items-center gap-1">
                      <Plus className="w-3 h-3" /> Add time
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-mono text-kaizen-subtle mr-1">Days (none = every day):</span>
                  {DAY_LABELS.map((label, d) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => toggleDay(r, d)}
                      aria-pressed={(r.days ?? []).includes(d)}
                      className={`px-1.5 py-0.5 rounded text-[11px] border ${(r.days ?? []).includes(d) ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'border-kaizen-border text-kaizen-muted'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        ))}

        <div className="p-3 rounded-control border border-kaizen-border bg-kaizen-bg space-y-2">
          <label className="flex items-center gap-2 text-sm text-kaizen-text">
            <input type="checkbox" checked={prefs.quietHours.enabled} onChange={(e) => setPrefs({ ...prefs, quietHours: { ...prefs.quietHours, enabled: e.target.checked } })} />
            Quiet hours (no reminders)
          </label>
          {prefs.quietHours.enabled && (
            <div className="flex items-center gap-2 text-xs text-kaizen-muted">
              <input type="time" aria-label="Quiet hours start" value={prefs.quietHours.start} onChange={(e) => setPrefs({ ...prefs, quietHours: { ...prefs.quietHours, start: e.target.value } })} className="bg-kaizen-surface border border-kaizen-border rounded-control px-2 py-1 text-kaizen-text" />
              to
              <input type="time" aria-label="Quiet hours end" value={prefs.quietHours.end} onChange={(e) => setPrefs({ ...prefs, quietHours: { ...prefs.quietHours, end: e.target.value } })} className="bg-kaizen-surface border border-kaizen-border rounded-control px-2 py-1 text-kaizen-text" />
            </div>
          )}
        </div>

        <div className="p-3 rounded-control border border-kaizen-border bg-kaizen-bg space-y-1">
          <label className="flex items-center gap-2 text-sm text-kaizen-text">
            <input type="checkbox" checked={notifOn} disabled={!browserNotificationsSupported()} onChange={(e) => handleNotifToggle(e.target.checked)} />
            Browser notifications (optional)
          </label>
          <p className="text-[11px] text-kaizen-subtle">Your browser will ask for permission when you turn this on. Reminders appear in the app either way.</p>
          {!browserNotificationsSupported() && <p className="text-[11px] font-mono text-amber-300">Not supported in this browser.</p>}
          {notifNote && <p className="text-[11px] font-mono text-amber-300">{notifNote}</p>}
        </div>

        <div className="flex items-center gap-3">
          <Button variant="primary" size="sm" onClick={handleSave} disabled={isPending}>
            <Save className="w-4 h-4" /> {isPending ? 'Saving...' : 'Save reminders'}
          </Button>
          {message && <span className="text-xs font-mono text-kaizen-muted">{message}</span>}
        </div>
      </div>
    </Card>
  );
};
