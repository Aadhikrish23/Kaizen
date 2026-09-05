import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'emerald' | 'cyan' | 'amber' | 'violet' | 'rose' | 'neutral';
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
    sm: 'text-[10px] px-1.5 py-0.5 font-semibold tracking-wider uppercase',
    md: 'text-xs px-2.5 py-1 font-medium',
  };

  const variantStyles = {
    emerald: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    cyan: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    violet: 'bg-violet-500/10 text-violet-400 border border-violet-500/20',
    rose: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
    neutral: 'bg-kaizen-surface-elevated text-kaizen-muted border border-kaizen-border',
  };

  return (
    <span className={`inline-flex items-center rounded-control font-mono ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}>
      {children}
    </span>
  );
};
