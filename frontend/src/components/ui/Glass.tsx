import React from 'react';

export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'primary' | 'secondary' | 'elevated';
  hoverable?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function GlassCard({
  variant = 'primary',
  hoverable = false,
  className = '',
  children,
  ...props
}: GlassCardProps) {
  const baseClasses = {
    primary: 'glass-panel',
    secondary: 'glass-surface-secondary',
    elevated: 'glass-elevated'
  }[variant];

  const hoverClass = hoverable ? 'glass-panel-hover' : '';

  return (
    <div className={`${baseClasses} ${hoverClass} ${className}`} {...props}>
      {children}
    </div>
  );
}

export interface GlassMetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  subtext?: string;
  trend?: {
    value: string;
    positive?: boolean;
  };
  icon?: React.ReactNode;
  iconBgColor?: string;
  className?: string;
}

export function GlassMetricCard({
  label,
  value,
  unit,
  subtext,
  trend,
  icon,
  iconBgColor = 'bg-orange-500/10 text-[#FF6B16] border border-orange-500/20',
  className = ''
}: GlassMetricCardProps) {
  return (
    <GlassCard hoverable className={`p-5 sm:p-6 flex flex-col justify-between ${className}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-[#61708A]">
          {label}
        </span>
        {icon && (
          <div className={`p-2.5 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${iconBgColor}`}>
            {icon}
          </div>
        )}
      </div>
      <div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0B1739] num-font">
            {value}
          </span>
          {unit && (
            <span className="text-sm font-semibold text-[#61708A]">{unit}</span>
          )}
        </div>
        <div className="mt-2 flex items-center gap-2">
          {trend && (
            <span
              className={`inline-flex items-center text-xs font-semibold px-1.5 py-0.5 rounded-md ${
                trend.positive
                  ? 'bg-emerald-500/15 text-emerald-700'
                  : 'bg-rose-500/15 text-rose-700'
              }`}
            >
              {trend.value}
            </span>
          )}
          {subtext && (
            <span className="text-xs text-[#61708A] truncate">{subtext}</span>
          )}
        </div>
      </div>
    </GlassCard>
  );
}

export interface GlassBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'orange' | 'green' | 'blue' | 'neutral' | 'red' | 'purple';
  className?: string;
  children: React.ReactNode;
}

export function GlassBadge({
  variant = 'orange',
  className = '',
  children,
  ...props
}: GlassBadgeProps) {
  const variantStyles = {
    orange: 'bg-orange-500/10 text-[#FF6B16] border-orange-500/25',
    green: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/25',
    blue: 'bg-blue-500/10 text-blue-700 border-blue-500/25',
    neutral: 'bg-slate-500/10 text-[#61708A] border-slate-300/40',
    red: 'bg-rose-500/10 text-rose-700 border-rose-500/25',
    purple: 'bg-purple-500/10 text-purple-700 border-purple-500/25'
  }[variant];

  return (
    <span
      className={`glass-badge inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold ${variantStyles} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}

export interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export function GlassButton({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: GlassButtonProps) {
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base'
  }[size];

  const variantClass = {
    primary: 'glass-button-primary',
    secondary: 'glass-button-secondary',
    ghost: 'hover:bg-slate-200/50 text-[#0B1739] transition-colors rounded-xl font-medium'
  }[variant];

  return (
    <button
      className={`inline-flex items-center justify-center gap-2 cursor-pointer font-semibold ${sizeClasses} ${variantClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
