import { Fragment } from 'react';
import { ArrowDown } from 'lucide-react';
import { EtapaFunil } from '../../lib/funnel';

interface FunnelChartProps {
  titulo: string;
  subtitulo?: string;
  etapas: EtapaFunil[];
  /** Realce visual — usado para distinguir o funil do App do funil do Site. */
  cor?: 'brand' | 'indigo';
}

const COR_BARRA: Record<'brand' | 'indigo', string> = {
  brand: 'from-brand to-brand/70',
  indigo: 'from-indigo to-indigo/70',
};

const COR_TEXTO: Record<'brand' | 'indigo', string> = {
  brand: 'text-brand',
  indigo: 'text-indigo',
};

/** Cor da seta de conversão conforme a severidade da queda entre etapas. */
function corDaQueda(percentual: number) {
  if (percentual >= 60) return 'text-brand';
  if (percentual >= 30) return 'text-warning';
  return 'text-danger';
}

/**
 * Funil como barras centralizadas de largura decrescente — a forma de funil
 * de verdade vem só de centralizar cada barra sob a anterior, sem precisar de
 * clip-path (que quebraria fácil em telas pequenas ou com zoom do navegador).
 */
export default function FunnelChart({ titulo, subtitulo, etapas, cor = 'brand' }: FunnelChartProps) {
  const maiorContagem = Math.max(...etapas.map(e => e.usuarios), 1);

  return (
    <div>
      <div className="mb-5">
        <h3 className={`font-display font-bold text-lg leading-none ${COR_TEXTO[cor]}`}>{titulo}</h3>
        {subtitulo && <p className="text-xs text-faint mt-1">{subtitulo}</p>}
      </div>

      <div className="flex flex-col items-stretch">
        {etapas.map((etapa, indice) => {
          /* Largura mínima de 30% — sem isso, uma etapa com poucos usuários
             vira uma lasca fina demais para caber o rótulo (o mais comprido
             do funil é "Viu o consumo de um aparelho"). */
          const largura = Math.max((etapa.usuarios / maiorContagem) * 100, 30);

          return (
            <Fragment key={etapa.chave}>
              {indice > 0 && (
                <div className="flex items-center justify-center gap-1.5 py-1.5">
                  <ArrowDown className={`w-3.5 h-3.5 ${corDaQueda(etapa.conversaoAnterior ?? 0)}`} />
                  <span className={`text-xs font-semibold font-tabular ${corDaQueda(etapa.conversaoAnterior ?? 0)}`}>
                    {etapa.conversaoAnterior ?? 0}%
                  </span>
                  <span className="text-[11px] text-faint">da etapa anterior</span>
                </div>
              )}

              <div className="mx-auto w-full transition-all duration-500" style={{ maxWidth: `${largura}%` }}>
                <div className={`rounded-md px-4 py-3 bg-gradient-to-r ${COR_BARRA[cor]}`}>
                  <div className="flex items-start justify-between gap-3">
                    {/* Sem truncate: numa barra estreita é melhor o rótulo
                        quebrar linha do que cortar a palavra com reticências. */}
                    <span className="text-sm font-semibold text-white leading-snug">{etapa.rotulo}</span>
                    <span className="text-lg font-display font-bold text-white font-tabular shrink-0">
                      {etapa.usuarios}
                    </span>
                  </div>
                  {etapa.conversaoInicial !== null && (
                    <p className="text-[11px] text-white/75 mt-0.5">
                      {etapa.conversaoInicial}% do topo do funil
                    </p>
                  )}
                </div>
              </div>
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
