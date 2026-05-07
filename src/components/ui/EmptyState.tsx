interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
}

import React from 'react';

export default function EmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
      {icon && (
        <div className="w-12 h-12 rounded-full bg-sand flex items-center justify-center text-slate text-2xl">
          {icon}
        </div>
      )}
      <p className="font-semibold text-charcoal">{title}</p>
      {description && <p className="text-sm text-slate max-w-xs">{description}</p>}
    </div>
  );
}
