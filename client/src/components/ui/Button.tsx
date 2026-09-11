import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'secondary',
  size = 'md',
  className = '',
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-control transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none active:scale-[0.98] select-none';
  
  const sizeStyles = {
    sm: 'text-xs px-2.5 py-1.5 gap-1.5 font-mono',
    md: 'text-sm px-3.5 py-2 gap-2 font-medium',
    lg: 'text-base px-5 py-2.5 gap-2.5 font-semibold',
  };

  const variantStyles = {
    primary: 'bg-emerald-500 hover:bg-emerald-400 text-[#0B0D13] font-semibold shadow-sm hover:shadow-glow-emerald active:bg-emerald-600',
    secondary: 'bg-kaizen-surface hover:bg-kaizen-surface-hover text-kaizen-text border border-kaizen-border hover:border-kaizen-border/80 shadow-subtle',
    ghost: 'bg-transparent hover:bg-kaizen-surface-hover/70 text-kaizen-muted hover:text-white',
    danger: 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:border-rose-500/50',
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
