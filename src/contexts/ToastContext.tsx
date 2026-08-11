import { createContext, useCallback, useContext, useRef, useState, ReactNode } from 'react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

type ToastVariant = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  variant: ToastVariant;
  message: string;
}

interface ToastContextType {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);
const DURATION = 4500;

const VARIANT_STYLES: Record<ToastVariant, { icon: typeof CheckCircle2; accent: string }> = {
  success: { icon: CheckCircle2, accent: 'text-success' },
  error: { icon: XCircle, accent: 'text-danger' },
  info: { icon: Info, accent: 'text-info' },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts(current => current.filter(t => t.id !== id));
  }, []);

  const push = useCallback((variant: ToastVariant, message: string) => {
    const id = counter.current++;
    setToasts(current => [...current, { id, variant, message }]);
    setTimeout(() => dismiss(id), DURATION);
  }, [dismiss]);

  const value: ToastContextType = {
    success: message => push('success', message),
    error: message => push('error', message),
    info: message => push('info', message),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-full max-w-sm pointer-events-none">
        {toasts.map(toast => {
          const { icon: Icon, accent } = VARIANT_STYLES[toast.variant];
          return (
            <div
              key={toast.id}
              className="pointer-events-auto animate-toast-in flex items-start gap-3 rounded-lg border border-edge bg-elevated shadow-2xl shadow-black/40 p-4"
            >
              <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${accent}`} />
              <p className="flex-1 text-sm text-fg leading-snug">{toast.message}</p>
              <button
                onClick={() => dismiss(toast.id)}
                className="text-faint hover:text-fg transition-colors"
                aria-label="Fechar notificação"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
