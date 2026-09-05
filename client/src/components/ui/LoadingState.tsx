import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = 'Loading...' }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-4 text-emerald-500">
      <Loader2 className="w-8 h-8 animate-spin" />
      <p className="text-sm font-medium text-slate-400">{message}</p>
    </div>
  );
}
