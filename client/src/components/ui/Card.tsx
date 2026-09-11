import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  title,
  subtitle,
  action,
}) => {
  return (
    <div className={`card-sheen border border-kaizen-border rounded-structural p-5 shadow-card transition-all duration-200 ${className}`}>
      {(title || action) && (
        <div className="flex items-start justify-between gap-4 mb-4 pb-3 border-b border-kaizen-border/50">
          <div>
            {title && <h3 className="font-semibold text-base text-kaizen-text tracking-tight font-sans">{title}</h3>}
            {subtitle && <p className="text-xs text-kaizen-muted mt-0.5">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
};
