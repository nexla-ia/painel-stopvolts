import { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import Spinner from './Spinner';

interface ConfirmDialogProps {
  title: string;
  description: ReactNode;
  warning?: string;
  confirmLabel: string;
  pendingLabel: string;
  pending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  title,
  description,
  warning,
  confirmLabel,
  pendingLabel,
  pending,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-md rounded-lg border border-edge bg-elevated shadow-2xl animate-fade-up p-6">
        <div className="flex items-center justify-center w-12 h-12 mx-auto rounded-full bg-danger-soft mb-4">
          <AlertTriangle className="w-6 h-6 text-danger" />
        </div>
        <h2 className="font-display font-bold text-2xl text-fg text-center mb-2">{title}</h2>
        <p className="text-sm text-muted text-center mb-4 leading-relaxed">{description}</p>
        {warning && (
          <div className="rounded-md border border-danger/25 bg-danger-soft p-3 mb-6">
            <p className="text-xs text-danger text-center">{warning}</p>
          </div>
        )}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="flex-1 px-4 py-2.5 rounded-md border border-edge text-fg hover:bg-edge/30 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={pending}
            className="flex-1 px-4 py-2.5 rounded-md bg-danger text-white hover:opacity-90 transition-opacity font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {pending ? (
              <>
                <Spinner className="w-4 h-4 text-white" />
                {pendingLabel}
              </>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
