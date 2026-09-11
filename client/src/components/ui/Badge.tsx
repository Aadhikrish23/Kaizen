import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'emerald' | 'cyan' | 'amber' | 'violet' | 'rose' | 'indigo' | 'orange' | 'neutral';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  className = '',
}) => {
  const sizeStyles = {
    sm: 'text-[10px] px-2 py-0.5 font-semibold tracking-wider uppercase',
    md: 'text-xs px-2.5 py-1 font-medium',
  };

  const variantStyles = {
    emerald: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-sm',
    cyan: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30',
    amber: 'bg-amber-500/10 text-amber-400 border border-amber-500/30',
    violet: 'bg-violet-500/10 text-violet-400 border border-violet-500/30',
    rose: 'bg-rose-500/10 text-rose-400 border border-rose-500/30',
    indigo: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30',
    orange: 'bg-orange-500/10 text-orange-400 border border-orange-500/30',
    neutral: 'bg-[#1A202E] text-kaizen-muted border border-[#222A3C]',
  };

  return (
    <span className={`inline-flex items-center rounded-control font-mono ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}>
      {children}
    </span>
  );
};
