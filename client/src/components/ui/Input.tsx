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
        <label htmlFor={inputId} className="text-xs font-mono font-medium text-kaizen-muted uppercase tracking-wider">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        <input
          id={inputId}
          style={{ colorScheme: 'dark', ...props.style }}
          className={`w-full !bg-[#131722] border border-[#222A3C] rounded-control px-3.5 py-2 text-sm !text-[#F8FAFC] placeholder:text-kaizen-subtle caret-emerald-400 transition-all duration-150 focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/40 focus:!bg-[#0B0D13] disabled:opacity-50 disabled:cursor-not-allowed outline-none shadow-subtle ${
            props.type === 'number' ? 'font-mono' : ''
          } ${suffix ? 'pr-12' : ''} ${error ? 'border-rose-500/60 focus:border-rose-500 focus:ring-rose-500/30' : ''} ${className}`}
          {...props}
        />
        {suffix && (
          <span className="absolute right-3.5 text-xs font-mono text-kaizen-subtle pointer-events-none select-none">
            {suffix}
          </span>
        )}
      </div>
      {error && <span className="text-xs text-rose-400 mt-0.5">{error}</span>}
    </div>
  );
};
