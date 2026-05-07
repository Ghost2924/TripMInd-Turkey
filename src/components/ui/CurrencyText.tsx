interface CurrencyTextProps {
  amount: number;
  className?: string;
  maximumFractionDigits?: number;
}

export function formatUSD(amount: number, maximumFractionDigits = 0): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits,
  }).format(amount);
}

export default function CurrencyText({
  amount,
  className = '',
  maximumFractionDigits = 0,
}: CurrencyTextProps) {
  return <span className={className}>{formatUSD(amount, maximumFractionDigits)}</span>;
}
