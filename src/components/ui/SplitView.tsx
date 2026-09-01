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
    /*
      Duas colunas só a partir de xl. Em 1024px a coluna de detalhe sobrava com
      cerca de 340px depois da barra lateral e das margens — estreita demais
      para os pares de campo que vão dentro dela. Entre 1024 e 1279 as duas
      partes empilham e cada uma usa a largura inteira.

      Largura e altura seguem pontos de corte diferentes, porque respondem a
      perguntas diferentes: `xl` decide se cabem duas colunas lado a lado;
      `desk` decide se a tela é alta o bastante para os painéis rolarem por
      dentro em vez de a página inteira rolar.

      Num notebook 1366x768 as duas colunas aparecem, mas a altura continua
      livre — que é o que evita a lista espremida em 150px sem saída.
    */
    <div className="grid grid-cols-1 xl:grid-cols-[340px_1fr] gap-6 desk:h-full desk:min-h-0">
      <Panel className="overflow-hidden flex flex-col min-h-[22rem] max-h-[70vh] desk:min-h-0 desk:max-h-none desk:h-full">
        <div className="px-4 py-3 border-b border-edge shrink-0 flex items-center justify-between gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-faint">{listLabel}</span>
          {listActions}
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain divide-y divide-edge">{list}</div>
      </Panel>

      <Panel className="p-5 sm:p-6 overflow-y-auto overscroll-contain min-h-[22rem] max-h-[80vh] desk:min-h-0 desk:max-h-none desk:h-full">
        {detail}
      </Panel>
    </div>
  );
}
