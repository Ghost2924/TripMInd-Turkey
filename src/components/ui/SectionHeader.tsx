interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  className?: string;
}

export default function SectionHeader({ title, subtitle, className = '' }: SectionHeaderProps) {
  return (
    <div className={`space-y-1 ${className}`}>
      <h2 className="text-2xl font-bold tracking-tight text-charcoal">{title}</h2>
      {subtitle && <p className="text-slate text-sm leading-relaxed">{subtitle}</p>}
    </div>
  );
}
