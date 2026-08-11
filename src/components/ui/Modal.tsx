import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: string;
}

export default function Modal({ title, onClose, children, maxWidth = 'max-w-md' }: ModalProps) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`w-full ${maxWidth} rounded-lg border border-edge bg-elevated shadow-2xl animate-fade-up`}>
        <div className="flex items-center justify-between p-5 border-b border-edge">
          <h2 className="font-display font-bold text-2xl text-fg">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-faint hover:text-fg hover:bg-edge/40 transition-colors"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
