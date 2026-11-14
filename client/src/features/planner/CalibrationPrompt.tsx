import React, { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { useUpdateWorkingWeight } from '../../services/inventoryService';

interface CalibrationPromptProps {
  exerciseName: string;
  targetReps?: number;
}

// Asks for a starting weight for an exercise with no known working weight (e.g. after a swap).
export const CalibrationPrompt: React.FC<CalibrationPromptProps> = ({ exerciseName, targetReps }) => {
  const [value, setValue] = useState('');
  const { mutateAsync, isPending } = useUpdateWorkingWeight();
  const weight = parseFloat(value);
  const valid = isFinite(weight) && weight > 0;

  return (
    <div className="mt-2 p-2.5 rounded-control bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-2">
      <p>
        No working weight known for <strong>{exerciseName}</strong>. Enter a comfortable starting weight (kg) so the plan
        can prescribe a load, or leave it and choose your weight when you log it.
      </p>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min="0"
          step="0.5"
          inputMode="decimal"
          aria-label={`Starting weight for ${exerciseName} in kg`}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-24 bg-kaizen-bg border border-kaizen-border rounded-control px-2 py-1 text-xs text-kaizen-text outline-none focus:border-amber-400"
          placeholder="kg"
        />
        <Button
          size="sm"
          variant="secondary"
          disabled={!valid || isPending}
          onClick={() => mutateAsync({ exerciseName, currentWeightKg: weight, targetReps })}
        >
          {isPending ? 'Saving...' : 'Set starting weight'}
        </Button>
      </div>
    </div>
  );
};
