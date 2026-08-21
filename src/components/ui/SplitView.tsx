import { ReactNode } from 'react';
import Panel from './Panel';

interface SplitViewProps {
  /** Rótulo do topo da coluna da lista, ex: "53 usuários cadastrados". */
  listLabel: string;
  /** Ação opcional no topo da lista, ex: botão "Adicionar". */
  listActions?: ReactNode;
  /** Itens da lista — normalmente botões renderizados por `splitItemClass`. */
  list: ReactNode;
  /** Conteúdo do painel de detalhe do item selecionado. */
  detail: ReactNode;
}

/**
 * Layout lista + detalhe usado nas telas de gestão.
 *
 * No desktop os dois painéis preenchem a altura disponível e rolam por dentro,
 * então o cabeçalho e os filtros da página ficam sempre visíveis. O
 * `overscroll-contain` impede o scroll de vazar para fora quando a lista acaba.
 * No mobile os painéis voltam à altura natural e quem rola é a página.
 */
export default function SplitView({ listLabel, listActions, list, detail }: SplitViewProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6 lg:h-full lg:min-h-0">
      <Panel className="overflow-hidden flex flex-col lg:h-full lg:min-h-0 max-h-[70vh] lg:max-h-none">
        <div className="px-4 py-3 border-b border-edge shrink-0 flex items-center justify-between gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-faint">{listLabel}</span>
          {listActions}
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain divide-y divide-edge">{list}</div>
      </Panel>

      <Panel className="p-6 overflow-y-auto overscroll-contain lg:h-full lg:min-h-0">{detail}</Panel>
    </div>
  );
}
