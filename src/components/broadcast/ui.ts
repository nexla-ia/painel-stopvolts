/**
 * Escala visual da tela de informativos.
 *
 * Esta tela é operada por alguém com pouca familiaridade com tecnologia, então
 * ela usa controles maiores e texto maior que o resto do painel. As classes
 * ficam aqui para os três passos permanecerem consistentes entre si.
 */

/** Campo de texto grande, confortável para ler e clicar. */
export const bigInput =
  'w-full px-5 py-4 text-lg rounded-lg bg-ink border-2 border-edge text-fg placeholder-faint ' +
  'focus:border-volt focus:ring-4 focus:ring-volt/20 transition-colors outline-none';

/** Rótulo acima de um campo. */
export const bigLabel = 'block text-base font-semibold text-fg mb-2';

/** Explicação curta abaixo de um campo. */
export const helpText = 'text-sm text-muted mt-2';

/** Ação principal do passo — sempre a maior coisa clicável da tela. */
export const primaryButton =
  'inline-flex items-center justify-center gap-2.5 px-7 py-4 text-lg font-semibold rounded-lg ' +
  'bg-volt text-volt-ink shadow-lg shadow-volt/25 hover:bg-volt-strong transition-colors ' +
  'disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none';

/** Ação secundária: voltar, cancelar. */
export const secondaryButton =
  'inline-flex items-center justify-center gap-2.5 px-6 py-4 text-lg font-medium rounded-lg ' +
  'border-2 border-edge text-fg hover:bg-edge/30 transition-colors disabled:opacity-40';

/** Botão pequeno dentro de um bloco, como "adicionar foto". */
export const chipButton =
  'inline-flex items-center gap-2 px-4 py-2.5 text-base font-semibold rounded-lg ' +
  'border-2 border-volt/40 text-volt hover:bg-volt-soft transition-colors disabled:opacity-40';
