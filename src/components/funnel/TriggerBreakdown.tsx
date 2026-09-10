import { GatilhoContagem } from '../../lib/funnel';
import { RATULO_GATILHO, GatilhoPaywall } from '../../lib/analyticsEvents';
import EmptyState from '../ui/EmptyState';
import { Lock } from 'lucide-react';

interface TriggerBreakdownProps {
  gatilhos: GatilhoContagem[];
}

/** O que mais leva ao paywall — cada linha é um gatilho, ordenado do mais forte ao mais fraco. */
export default function TriggerBreakdown({ gatilhos }: TriggerBreakdownProps) {
  if (gatilhos.length === 0) {
    return (
      <EmptyState
        icon={Lock}
        title="Nenhum paywall exibido no período"
        description="Assim que houver eventos, o gatilho mais comum aparece aqui."
      />
    );
  }

  const totalUsuarios = gatilhos.reduce((soma, g) => soma + g.usuarios, 0);
  const maiorContagem = Math.max(...gatilhos.map(g => g.usuarios), 1);

  return (
    <div className="space-y-3.5">
      {gatilhos.map(g => {
        const rotulo = RATULO_GATILHO[g.gatilho as GatilhoPaywall] ?? g.gatilho;
        const participacao = totalUsuarios > 0 ? Math.round((g.usuarios / totalUsuarios) * 100) : 0;

        return (
          <div key={g.gatilho}>
            <div className="flex items-baseline justify-between gap-3 mb-1">
              <span className="text-sm font-medium text-fg truncate">{rotulo}</span>
              <span className="text-xs text-faint shrink-0 font-tabular">
                {g.usuarios} usuários · {participacao}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-edge overflow-hidden">
              <div
                className="h-full rounded-full bg-indigo transition-all duration-500"
                style={{ width: `${(g.usuarios / maiorContagem) * 100}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
