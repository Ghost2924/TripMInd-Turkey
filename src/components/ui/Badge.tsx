import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'teal' | 'terracotta' | 'gold' | 'success' | 'warning';
  size?: 'sm' | 'md';
  className?: string;
}

const variantClasses: Record<NonNullable<BadgeProps['variant']>, string> = {
  default: 'bg-white/80 text-slate border border-border',
  teal: 'bg-teal-50 text-teal-700 border border-teal-100',
  terracotta: 'bg-terracotta-50 text-terracotta-700 border border-terracotta-100',
  gold: 'bg-amber-50 text-amber-700 border border-amber-100',
  success: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
  warning: 'bg-terracotta-50 text-terracotta-700 border border-terracotta-100',
};

const sizeClasses: Record<NonNullable<BadgeProps['size']>, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-3 py-1 text-sm',
};

export default function Badge({
  children,
  variant = 'default',
  size = 'sm',
  className = '',
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      {children}
    </span>
  );
}
