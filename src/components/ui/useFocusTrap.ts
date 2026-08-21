import { RefObject, useEffect } from 'react';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Mantém o foco do teclado dentro de um diálogo enquanto ele está aberto e
 * devolve o foco ao elemento anterior ao fechar. Sem isso o Tab escapa para a
 * página atrás do overlay, deixando quem navega só por teclado preso fora.
 */
export function useFocusTrap(ref: RefObject<HTMLElement>, isOpen: unknown = true) {
  useEffect(() => {
    const container = ref.current;
    if (!container || !isOpen) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    const focusables = () => Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE));

    // Foca o primeiro controle assim que o diálogo abre.
    focusables()[0]?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const items = focusables();
      if (items.length === 0) {
        e.preventDefault();
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      if (e.shiftKey && (active === first || !container.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    container.ownerDocument.addEventListener('keydown', onKeyDown);
    return () => {
      container.ownerDocument.removeEventListener('keydown', onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [ref, isOpen]);
}
