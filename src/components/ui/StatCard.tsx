import { LucideIcon } from 'lucide-react';

type StatAccent = 'volt' | 'info' | 'danger' | 'success' | 'warning';

const ACCENT_CLASSES: Record<StatAccent, string> = {
  volt: 'bg-volt-soft text-volt',
  info: 'bg-info-soft text-info',
  danger: 'bg-danger-soft text-danger',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
};

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  sublabel?: string;
  accent?: StatAccent;
  index?: number;
}

export default function StatCard({
  icon: Icon,
  label,
  value,
  sublabel,
  accent = 'volt',
  index = 0,
}: StatCardProps) {
  return (
    <div
      className="group rounded-lg border border-edge bg-panel p-5 transition-colors hover:border-edge-strong animate-fade-up"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`p-2.5 rounded-md ${ACCENT_CLASSES[accent]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className="text-xs uppercase tracking-wider text-muted mb-1">{label}</p>
      <p className="font-display font-bold text-3xl sm:text-4xl leading-none text-fg font-tabular truncate">
        {value}
      </p>
      {sublabel && <p className="text-xs mt-2.5 text-faint">{sublabel}</p>}
    </div>
  );
}
