import { PontoRetencao } from '../../lib/funnel';
import EmptyState from '../ui/EmptyState';
import { Repeat } from 'lucide-react';

interface RetentionCurveProps {
  pontos: PontoRetencao[];
}

/** Verde acima de 70%, âmbar entre 40–69%, vermelho abaixo — mesma leitura rápida do resto do painel. */
function corDaTaxa(taxa: number) {
  if (taxa >= 70) return { texto: 'text-brand', ponto: 'bg-brand', trilho: 'bg-brand' };
  if (taxa >= 40) return { texto: 'text-warning', ponto: 'bg-warning', trilho: 'bg-warning' };
  return { texto: 'text-danger', ponto: 'bg-danger', trilho: 'bg-danger' };
}

/**
 * Só 3 marcos reais (30/60/90 dias) — por isso são pontos ligados por linhas
 * retas, não uma curva suavizada, que sugeriria dados entre eles que não
 * existem.
 */
export default function RetentionCurve({ pontos }: RetentionCurveProps) {
  const comCoorte = pontos.filter(p => p.coorte > 0);

  if (comCoorte.length === 0) {
    return (
      <EmptyState
        icon={Repeat}
        title="Nenhuma coorte atingiu 30 dias ainda"
        description="A retenção aparece aqui assim que as primeiras assinaturas completarem 30 dias."
      />
    );
  }

  const ALTURA = 96;

  return (
    /* pt-10 reserva espaço fixo acima da área do gráfico — sem ele, uma
       coorte com retenção perto de 100% empurra o próprio rótulo (ex.:
       "96%") para cima do subtítulo do painel. */
    <div className="pt-10">
      <div className="flex items-end gap-6" style={{ height: ALTURA + 56 }}>
        {pontos.map((ponto, indice) => {
          const semDado = ponto.coorte === 0;
          const taxa = ponto.taxa ?? 0;
          const cor = corDaTaxa(taxa);
          const alturaPonto = ALTURA * (taxa / 100);
          const proximo = pontos[indice + 1];

          return (
            <div key={ponto.dias} className="flex-1 flex flex-col items-center h-full relative">
              {/* Linha reta até o próximo marco — desenhada atrás dos pontos. */}
              {proximo && !semDado && proximo.coorte > 0 && (
                <svg
                  className="absolute pointer-events-none"
                  style={{ left: '50%', bottom: 56, width: '100%', height: ALTURA, overflow: 'visible' }}
                  aria-hidden="true"
                >
                  <line
                    x1="0"
                    y1={ALTURA - alturaPonto}
                    x2="100%"
                    y2={ALTURA - ALTURA * ((proximo.taxa ?? 0) / 100)}
                    stroke="rgb(var(--border-strong))"
                    strokeWidth="2"
                    strokeDasharray="4 4"
                  />
                </svg>
              )}

              <div className="flex-1 flex items-end justify-center w-full" style={{ height: ALTURA }}>
                {semDado ? (
                  <div className="mb-1 text-center">
                    <p className="text-xs text-faint">Ainda não chegou</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center" style={{ marginBottom: alturaPonto }}>
                    <span className={`font-display font-bold text-2xl leading-none font-tabular ${cor.texto}`}>
                      {taxa}%
                    </span>
                    <span className={`mt-2 w-3.5 h-3.5 rounded-full ring-4 ring-panel ${cor.ponto}`} />
                  </div>
                )}
              </div>

              <div className="mt-3 text-center">
                <p className="text-sm font-semibold text-fg">{ponto.dias} dias</p>
                <p className="text-[11px] text-faint font-tabular">
                  {ponto.coorte} {ponto.coorte === 1 ? 'assinante' : 'assinantes'}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
