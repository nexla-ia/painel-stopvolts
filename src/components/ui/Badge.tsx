import { ReactNode } from 'react';

type BadgeVariant = 'volt' | 'info' | 'danger' | 'success' | 'warning' | 'neutral';

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  volt: 'bg-volt-soft text-volt border-volt/25',
  info: 'bg-info-soft text-info border-info/25',
  danger: 'bg-danger-soft text-danger border-danger/25',
  success: 'bg-success-soft text-success border-success/25',
  warning: 'bg-warning-soft text-warning border-warning/25',
  neutral: 'bg-edge/40 text-muted border-edge-strong',
};

interface BadgeProps {
  variant?: BadgeVariant;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Texto do tooltip nativo — útil quando o rótulo do badge sozinho não basta. */
  title?: string;
}

export default function Badge({ variant = 'neutral', icon, children, className = '', title }: BadgeProps) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-semibold tracking-wide ${VARIANT_CLASSES[variant]} ${className}`}
    >
      {icon}
      {children}
    </span>
  );
}
