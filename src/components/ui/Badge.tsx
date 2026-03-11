import { clsx } from 'clsx';

interface BadgeProps {
  label: string;
  color?: string;
  variant?: 'filled' | 'outline';
  size?: 'sm' | 'md';
  onClick?: () => void;
  active?: boolean;
}

export function Badge({ label, color, variant = 'filled', size = 'sm', onClick, active }: BadgeProps) {
  const baseStyle = size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  return (
    <span
      onClick={onClick}
      className={clsx(
        baseStyle,
        'rounded-full font-medium inline-flex items-center gap-1 transition-all duration-200',
        onClick && 'cursor-pointer hover:scale-105',
        variant === 'filled' && 'text-white',
        variant === 'outline' && 'border',
        active && 'ring-2 ring-white/20',
      )}
      style={{
        backgroundColor: variant === 'filled' ? (color || '#6b7280') + '22' : 'transparent',
        color: color || '#9ca3af',
        borderColor: variant === 'outline' ? (color || '#6b7280') + '44' : undefined,
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: color || '#6b7280' }}
      />
      {label}
    </span>
  );
}
