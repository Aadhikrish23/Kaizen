import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  suffix?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  suffix,
  error,
  className = '',
  id,
  ...props
}) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label htmlFor={inputId} className="text-xs font-medium text-kaizen-muted">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        <input
          id={inputId}
          className={`w-full bg-kaizen-surface border border-kaizen-border rounded-control px-3.5 py-2 text-sm text-kaizen-text placeholder:text-kaizen-subtle transition-colors focus:border-kaizen-primary focus:bg-kaizen-bg disabled:opacity-50 ${
            suffix ? 'pr-12' : ''
          } ${error ? 'border-rose-500/50' : ''} ${className}`}
          {...props}
        />
        {suffix && (
          <span className="absolute right-3 text-xs font-mono text-kaizen-subtle pointer-events-none select-none">
            {suffix}
          </span>
        )}
      </div>
      {error && <span className="text-xs text-rose-400 mt-0.5">{error}</span>}
    </div>
  );
};
