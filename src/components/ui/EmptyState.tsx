import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export default function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <div className="text-center py-16 px-4">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-edge/40 mb-4">
        <Icon className="w-6 h-6 text-faint" />
      </div>
      <h3 className="text-sm font-semibold text-fg">{title}</h3>
      <p className="mt-1 text-sm text-muted">{description}</p>
    </div>
  );
}
