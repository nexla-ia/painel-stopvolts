import { ReactNode, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useFocusTrap } from './useFocusTrap';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: string;
}

export default function Modal({ title, onClose, children, maxWidth = 'max-w-md' }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, onClose);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    /*
      O overlay rola. Sem isso, um diálogo mais alto que a tela — comum em
      celular deitado — transbordava pelas duas pontas por causa do
      `items-center`, e os botões de ação ficavam fora de alcance.
      `items-start` abaixo de sm evita o mesmo corte no topo.
    */
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 overflow-y-auto overscroll-contain p-4 flex items-start sm:items-center justify-center">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`w-full ${maxWidth} my-auto rounded-lg border border-edge bg-elevated shadow-2xl animate-fade-up`}
      >
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
