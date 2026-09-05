import React, { useState, useEffect } from 'react';
import { Save, RefreshCw } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../api/client';

const GOALS = [
  { id: 'lose_weight', label: 'Lose Weight' },
  { id: 'maintain_weight', label: 'Maintain Weight' },
  { id: 'gain_weight', label: 'Gain Weight' },
] as const;

const ACTIVITY_LEVELS = [
  { id: 'sedentary', label: 'Sedentary', desc: 'Little or no exercise' },
  { id: 'lightly_active', label: 'Lightly Active', desc: '1-3 days/week' },
  { id: 'moderately_active', label: 'Moderately Active', desc: '3-5 days/week' },
  { id: 'very_active', label: 'Very Active', desc: '6-7 days/week' },
  { id: 'extra_active', label: 'Extra Active', desc: 'Physical job + daily training' },
] as const;

export const ProfileSettings: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [isComputingTdee, setIsComputingTdee] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [tdee, setTdee] = useState<number | null>(null);

  const [form, setForm] = useState({
    name: user?.name || '',
    dob: user?.dob ? user.dob.substring(0, 10) : '',
    gender: user?.gender || '',
    heightCm: user?.heightCm ? String(user.heightCm) : '',
    currentWeightKg: user?.currentWeightKg ? String(user.currentWeightKg) : '',
    goal: user?.goal || '',
    activityLevel: user?.activityLevel || '',
    calorieDailyTarget: user?.calorieDailyTarget ? String(user.calorieDailyTarget) : '2000',
    proteinDailyTargetG: user?.proteinDailyTargetG ? String(user.proteinDailyTargetG) : '150',
    waterDailyTargetMl: user?.waterDailyTargetMl ? String(user.waterDailyTargetMl) : '2500',
  });

  const set = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const computeTdee = async () => {
    if (!form.dob || !form.gender || !form.heightCm || !form.currentWeightKg || !form.activityLevel) return;
    setIsComputingTdee(true);
    try {
      const result = await apiClient.post('/profile/tdee', {
        dob: form.dob,
        gender: form.gender,
        heightCm: Number(form.heightCm),
        currentWeightKg: Number(form.currentWeightKg),
        activityLevel: form.activityLevel,
        goal: form.goal,
      }) as { tdee: number; recommendedCalories: number; recommendedProteinG: number };
      setTdee(result.tdee);
      setForm((prev) => ({
        ...prev,
        calorieDailyTarget: String(result.recommendedCalories),
        proteinDailyTargetG: String(result.recommendedProteinG),
      }));
    } catch {
      // ignore
    } finally {
      setIsComputingTdee(false);
    }
  };

  useEffect(() => {
    if (form.activityLevel) {
      computeTdee();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.activityLevel, form.goal]);

  const handleSave = async () => {
    setIsSaving(true);
    setError('');
    setSuccess(false);
    try {
      const payload = {
        name: form.name,
        dob: form.dob || undefined,
        gender: form.gender || undefined,
        heightCm: form.heightCm ? Number(form.heightCm) : undefined,
        currentWeightKg: form.currentWeightKg ? Number(form.currentWeightKg) : undefined,
        goal: form.goal || undefined,
        activityLevel: form.activityLevel || undefined,
        calorieDailyTarget: Number(form.calorieDailyTarget),
        proteinDailyTargetG: Number(form.proteinDailyTargetG),
        waterDailyTargetMl: Number(form.waterDailyTargetMl),
      };
      await apiClient.patch('/profile', payload);
      updateUser(payload as Parameters<typeof updateUser>[0]);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError('Failed to save profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const SelectRow = ({
    options,
    value,
    field,
  }: {
    options: readonly { id: string; label: string; desc?: string }[];
    value: string;
    field: string;
  }) => (
    <div className="grid grid-cols-1 gap-2">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => set(field, o.id)}
          className={`text-left w-full px-4 py-3 rounded-lg border text-sm transition-all duration-150 ${
            value === o.id
              ? 'border-emerald-500 bg-emerald-500/10 text-kaizen-text'
              : 'border-kaizen-border bg-transparent text-kaizen-muted hover:text-kaizen-text'
          }`}
        >
          <span className="font-medium">{o.label}</span>
          {o.desc && <span className="text-kaizen-muted text-xs ml-2">— {o.desc}</span>}
        </button>
      ))}
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-kaizen-text">Profile Settings</h1>
        <p className="text-sm text-kaizen-muted mt-0.5">Update your personal details and health targets.</p>
      </div>

      <Card title="Personal">
        <div className="space-y-4">
          <Input label="Full Name" type="text" value={form.name} onChange={(e) => set('name', e.target.value)} />
          <Input label="Date of Birth" type="date" value={form.dob} onChange={(e) => set('dob', e.target.value)} />
          <div>
            <label className="block text-xs font-medium text-kaizen-muted mb-2 uppercase tracking-wide">Gender</label>
            <div className="grid grid-cols-3 gap-2">
              {(['male', 'female', 'other'] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => set('gender', g)}
                  className={`py-2 text-sm font-medium rounded-lg border capitalize transition-all duration-150 ${
                    form.gender === g
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                      : 'border-kaizen-border text-kaizen-muted hover:text-kaizen-text'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <Card title="Body">
        <div className="grid grid-cols-2 gap-4">
          <Input label="Height (cm)" type="number" value={form.heightCm} onChange={(e) => set('heightCm', e.target.value)} placeholder="175" />
          <Input label="Weight (kg)" type="number" value={form.currentWeightKg} onChange={(e) => set('currentWeightKg', e.target.value)} placeholder="75.5" />
        </div>
      </Card>

      <Card title="Goal">
        <SelectRow options={GOALS} value={form.goal} field="goal" />
      </Card>

      <Card title="Activity Level">
        <SelectRow options={ACTIVITY_LEVELS} value={form.activityLevel} field="activityLevel" />
        {tdee !== null && (
          <div className="mt-3 p-3 rounded-lg bg-kaizen-bg border border-kaizen-border flex items-center gap-3">
            {isComputingTdee
              ? <RefreshCw className="w-4 h-4 text-kaizen-muted animate-spin" />
              : <span className="text-xs text-kaizen-muted">Estimated TDEE: <span className="font-mono text-emerald-400 font-semibold">{tdee.toLocaleString()} kcal/day</span></span>
            }
          </div>
        )}
      </Card>

      <Card title="Daily Targets">
        <div className="space-y-4">
          <Input label="Calories (kcal)" type="number" value={form.calorieDailyTarget} onChange={(e) => set('calorieDailyTarget', e.target.value)} />
          <Input label="Protein (g)" type="number" value={form.proteinDailyTargetG} onChange={(e) => set('proteinDailyTargetG', e.target.value)} />
          <Input label="Water (ml)" type="number" value={form.waterDailyTargetMl} onChange={(e) => set('waterDailyTargetMl', e.target.value)} />
        </div>
      </Card>

      <div className="flex items-center gap-3">
        <Button variant="primary" onClick={handleSave} disabled={isSaving} className="gap-2">
          <Save className="w-4 h-4" /> {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
        {success && <span className="text-sm text-emerald-400">Saved successfully.</span>}
        {error && <span className="text-sm text-rose-400">{error}</span>}
      </div>
    </div>
  );
};
