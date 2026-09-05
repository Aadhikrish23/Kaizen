import React from 'react';

interface ProgressRingProps {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  colorClass?: string;
  label?: string;
  unit?: string;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  value,
  max,
  size = 140,
  strokeWidth = 10,
  colorClass = 'text-kaizen-primary',
  label,
  unit,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const percent = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-kaizen-border fill-transparent"
        />
        {/* Active progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className={`fill-transparent transition-all duration-500 ease-out ${colorClass}`}
        />
      </svg>
      {/* Central Metric Value */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2">
        <span className="text-xl font-bold font-mono tracking-tight text-kaizen-text">
          {percent}%
        </span>
        {label && (
          <span className="text-[10px] font-mono text-kaizen-muted uppercase tracking-wider mt-0.5">
            {value}{unit ? ` ${unit}` : ''}
          </span>
        )}
      </div>
    </div>
  );
};
