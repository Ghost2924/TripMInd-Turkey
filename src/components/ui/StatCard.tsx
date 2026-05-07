interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}

import React from 'react';

export default function StatCard({ icon, label, value, sub }: StatCardProps) {
  return (
    <div className="rounded-2xl bg-white border border-border shadow-card p-4 flex items-start gap-3">
      <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-700">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate font-medium uppercase tracking-wide">{label}</p>
        <p className="text-xl font-bold text-charcoal leading-tight">{value}</p>
        {sub && <p className="text-xs text-slate mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}
