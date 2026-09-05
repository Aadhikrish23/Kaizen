import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../api/client';

interface FormData {
  name: string;
  dob: string;
  gender: 'male' | 'female' | 'other' | '';
  heightCm: string;
  currentWeightKg: string;
  goal: 'lose_weight' | 'gain_weight' | 'maintain_weight' | '';
  activityLevel: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extra_active' | '';
  calorieDailyTarget: string;
  proteinDailyTargetG: string;
  waterDailyTargetMl: string;
}

interface TdeeResult {
  tdee: number;
  recommendedCalories: number;
  recommendedProteinG: number;
}

const GOALS = [
  { id: 'lose_weight', label: 'Lose Weight', desc: 'Reduce body fat, calorie deficit' },
  { id: 'maintain_weight', label: 'Maintain Weight', desc: 'Stay at current weight, eat at TDEE' },
  { id: 'gain_weight', label: 'Gain Weight', desc: 'Build muscle, calorie surplus' },
] as const;

const ACTIVITY_LEVELS = [
  { id: 'sedentary', label: 'Sedentary', desc: 'Little or no exercise, desk job' },
  { id: 'lightly_active', label: 'Lightly Active', desc: 'Light exercise 1-3 days/week' },
  { id: 'moderately_active', label: 'Moderately Active', desc: 'Moderate exercise 3-5 days/week' },
  { id: 'very_active', label: 'Very Active', desc: 'Hard exercise 6-7 days/week' },
  { id: 'extra_active', label: 'Extra Active', desc: 'Very hard exercise, physical job' },
] as const;

export const Onboarding: React.FC = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [step, setStep] = useState(1);
  const [tdee, setTdee] = useState<TdeeResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState<FormData>({
    name: user?.name || '',
    dob: '',
    gender: '',
    heightCm: '',
    currentWeightKg: '',
    goal: '',
    activityLevel: '',
    calorieDailyTarget: '',
    proteinDailyTargetG: '',
    waterDailyTargetMl: '2500',
  });

  const set = (field: keyof FormData, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const stepValid = () => {
    if (step === 1) return form.name && form.dob && form.gender;
    if (step === 2) return form.heightCm && form.currentWeightKg;
    if (step === 3) return form.goal;
    if (step === 4) return form.activityLevel;
    if (step === 5) return form.calorieDailyTarget && form.waterDailyTargetMl;
    return true;
  };

  const fetchTdee = async (activityLevel: string) => {
    try {
      const result = await apiClient.post('/profile/tdee', {
        dob: form.dob,
        gender: form.gender,
        heightCm: Number(form.heightCm),
        currentWeightKg: Number(form.currentWeightKg),
        activityLevel,
        goal: form.goal,
      }) as TdeeResult;
      setTdee(result);
      setForm((prev) => ({
        ...prev,
        calorieDailyTarget: String(result.recommendedCalories),
        proteinDailyTargetG: String(result.recommendedProteinG),
      }));
    } catch {
      // use defaults
    }
  };

  const handleNext = async () => {
    if (step === 4 && form.activityLevel) {
      await fetchTdee(form.activityLevel);
    }
    setStep((s) => s + 1);
  };

  const handleComplete = async () => {
    setIsLoading(true);
    setError('');
    try {
      const payload = {
        dob: form.dob,
        gender: form.gender,
        heightCm: Number(form.heightCm),
        currentWeightKg: Number(form.currentWeightKg),
        goal: form.goal,
        activityLevel: form.activityLevel,
        calorieDailyTarget: Number(form.calorieDailyTarget),
        proteinDailyTargetG: Number(form.proteinDailyTargetG),
        waterDailyTargetMl: Number(form.waterDailyTargetMl),
      };
      await apiClient.post('/profile/onboarding', payload);
      updateUser({ onboardingComplete: true });
      navigate('/dashboard');
    } catch {
      setError('Failed to save your profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const SelectCard = ({
    label,
    desc,
    active,
    onClick,
  }: {
    label: string;
    desc: string;
    active: boolean;
    onClick: () => void;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left p-4 rounded-lg border transition-all duration-150 ${
        active
          ? 'border-emerald-500 bg-emerald-500/10 text-kaizen-text'
          : 'border-kaizen-border bg-kaizen-surface hover:border-kaizen-border/80 text-kaizen-muted hover:text-kaizen-text'
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-kaizen-text">{label}</p>
          <p className="text-xs text-kaizen-muted mt-0.5">{desc}</p>
        </div>
        {active && <Check className="w-4 h-4 text-emerald-500 shrink-0" />}
      </div>
    </button>
  );

  return (
    <div className="min-h-screen bg-kaizen-bg flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold font-mono text-sm">K</div>
            <span className="font-bold text-kaizen-text text-lg">Kaizen</span>
          </div>
          <h1 className="text-2xl font-bold text-kaizen-text">Set up your profile</h1>
          <p className="text-kaizen-muted text-sm mt-1">Step {step} of 5</p>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-kaizen-border rounded-full h-1 mb-8">
          <div
            className="bg-emerald-500 h-1 rounded-full transition-all duration-500"
            style={{ width: `${(step / 5) * 100}%` }}
          />
        </div>

        {/* Card */}
        <div className="bg-kaizen-surface border border-kaizen-border rounded-xl p-6">
          {/* Step 1 — Personal */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-kaizen-text">Personal Details</h2>
              <Input
                label="Full Name"
                type="text"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="Your name"
              />
              <Input
                label="Date of Birth"
                type="date"
                value={form.dob}
                onChange={(e) => set('dob', e.target.value)}
              />
              <div>
                <label className="block text-xs font-medium text-kaizen-muted mb-2 uppercase tracking-wide">Gender</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['male', 'female', 'other'] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => set('gender', g)}
                      className={`py-2.5 text-sm font-medium rounded-lg border capitalize transition-all duration-150 ${
                        form.gender === g
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                          : 'border-kaizen-border bg-transparent text-kaizen-muted hover:text-kaizen-text'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2 — Body */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-kaizen-text">Your Body</h2>
              <Input
                label="Height (cm)"
                type="number"
                value={form.heightCm}
                onChange={(e) => set('heightCm', e.target.value)}
                placeholder="e.g. 175"
              />
              <Input
                label="Current Weight (kg)"
                type="number"
                value={form.currentWeightKg}
                onChange={(e) => set('currentWeightKg', e.target.value)}
                placeholder="e.g. 75.5"
              />
            </div>
          )}

          {/* Step 3 — Goal */}
          {step === 3 && (
            <div className="space-y-3">
              <h2 className="text-base font-semibold text-kaizen-text">Your Goal</h2>
              {GOALS.map((g) => (
                <SelectCard
                  key={g.id}
                  label={g.label}
                  desc={g.desc}
                  active={form.goal === g.id}
                  onClick={() => set('goal', g.id)}
                />
              ))}
            </div>
          )}

          {/* Step 4 — Activity Level */}
          {step === 4 && (
            <div className="space-y-3">
              <h2 className="text-base font-semibold text-kaizen-text">Activity Level</h2>
              {ACTIVITY_LEVELS.map((a) => (
                <SelectCard
                  key={a.id}
                  label={a.label}
                  desc={a.desc}
                  active={form.activityLevel === a.id}
                  onClick={() => set('activityLevel', a.id)}
                />
              ))}
              {tdee && (
                <div className="mt-3 p-3 rounded-lg bg-kaizen-bg border border-kaizen-border">
                  <p className="text-xs text-kaizen-muted mb-1">Estimated daily energy expenditure</p>
                  <p className="font-mono text-lg font-semibold text-emerald-400">{tdee.tdee.toLocaleString()} kcal TDEE</p>
                  <p className="font-mono text-sm text-kaizen-muted">{tdee.recommendedCalories.toLocaleString()} kcal recommended target</p>
                </div>
              )}
            </div>
          )}

          {/* Step 5 — Targets */}
          {step === 5 && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-kaizen-text">Your Daily Targets</h2>
              {tdee && (
                <div className="p-3 rounded-lg bg-kaizen-bg border border-kaizen-border">
                  <p className="text-xs text-kaizen-muted">Computed TDEE — <span className="font-mono text-kaizen-text">{tdee.tdee.toLocaleString()} kcal</span></p>
                </div>
              )}
              <Input
                label="Calorie Target (kcal/day)"
                type="number"
                value={form.calorieDailyTarget}
                onChange={(e) => set('calorieDailyTarget', e.target.value)}
                placeholder="e.g. 2000"
              />
              <Input
                label="Protein Target (g/day)"
                type="number"
                value={form.proteinDailyTargetG}
                onChange={(e) => set('proteinDailyTargetG', e.target.value)}
                placeholder="e.g. 150"
              />
              <Input
                label="Water Target (ml/day)"
                type="number"
                value={form.waterDailyTargetMl}
                onChange={(e) => set('waterDailyTargetMl', e.target.value)}
                placeholder="e.g. 2500"
              />
              {error && <p className="text-sm text-rose-400">{error}</p>}
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-kaizen-border">
            <Button
              variant="ghost"
              onClick={() => setStep((s) => s - 1)}
              disabled={step === 1}
              className="gap-1"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </Button>
            {step < 5 ? (
              <Button
                variant="primary"
                onClick={handleNext}
                disabled={!stepValid()}
                className="gap-1"
              >
                Next <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={handleComplete}
                disabled={!stepValid() || isLoading}
                className="gap-1"
              >
                {isLoading ? 'Saving...' : 'Complete Setup'} <Check className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
