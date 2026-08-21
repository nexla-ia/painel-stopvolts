export const labelClass = 'block text-sm font-medium text-muted mb-1.5';

export const inputClass =
  'w-full px-4 py-2.5 rounded-md bg-ink border border-edge text-fg placeholder-faint focus:ring-2 focus:ring-volt/40 focus:border-volt transition-colors';

export const inputClassReadOnly =
  'w-full px-4 py-2.5 rounded-md bg-edge/20 border border-edge text-faint cursor-not-allowed';

export const selectClass = inputClass;

/**
 * Item clicável da coluna esquerda de `SplitView`.
 * `alert` pinta a borda lateral de vermelho para destacar itens que exigem ação.
 */
export const splitItemClass = (isSelected: boolean, alert = false) =>
  `w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-l-2 ${
    isSelected
      ? 'bg-volt-soft border-l-volt'
      : alert
        ? 'border-l-danger hover:bg-edge/20'
        : 'border-l-transparent hover:bg-edge/20'
  }`;
