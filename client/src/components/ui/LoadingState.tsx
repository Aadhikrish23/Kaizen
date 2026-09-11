interface LoadingStateProps {
  message?: string;
  className?: string;
}

export function LoadingState({ message = 'Loading...', className = '' }: LoadingStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center p-8 space-y-3.5 ${className}`}>
      <div className="relative flex items-center justify-center">
        <div className="w-9 h-9 rounded-full border-2 border-emerald-500/20 border-t-emerald-400 animate-spin" />
        <div className="w-3.5 h-3.5 rounded-full bg-emerald-500/20 absolute animate-pulse" />
      </div>
      <p className="text-xs font-mono text-kaizen-muted uppercase tracking-wider">{message}</p>
    </div>
  );
}
