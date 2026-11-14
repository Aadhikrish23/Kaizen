import React from 'react';
import { Button } from './Button';

interface ConfirmReplaceProps {
  isPending?: boolean;
  onReplace: () => void;
  onCancel: () => void;
}

// In-page confirmation shown when activating a planned day would erase completed sets.
export const ConfirmReplace: React.FC<ConfirmReplaceProps> = ({ isPending, onReplace, onCancel }) => (
  <div role="alertdialog" aria-live="assertive" className="p-4 rounded-control bg-amber-500/10 border border-amber-500/30 text-amber-200 space-y-3">
    <p className="text-sm font-semibold">Replace today's workout?</p>
    <p className="text-xs">
      Today's workout already has completed sets. Loading this planned day will erase them and cannot be undone.
    </p>
    <div className="flex gap-2">
      <Button variant="danger" size="sm" onClick={onReplace} disabled={isPending}>Replace</Button>
      <Button variant="ghost" size="sm" onClick={onCancel} disabled={isPending}>Cancel</Button>
    </div>
  </div>
);

export const isCompletedSetsConflict = (err: any): boolean => err?.code === 'WORKOUT_HAS_COMPLETED_SETS';
