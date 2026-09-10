import { PlanoContagem } from '../../lib/funnel';
import { ROTULO_PLANO, PRECO_PLANO, Plano } from '../../lib/analyticsEvents';
import EmptyState from '../ui/EmptyState';
import { CreditCard } from 'lucide-react';

interface PlanComparisonProps {
  planos: PlanoContagem[];
}

const COR_PLANO: Record<string, string> = {
  essencial: 'bg-brand',
  premium: 'bg-indigo',
};

const COR_TEXTO_PLANO: Record<string, string> = {
  essencial: 'text-brand',
  premium: 'text-indigo',
};

/** Quantos assinantes escolheram cada plano, com a receita mensal recorrente implícita. */
export default function PlanComparison({ planos }: PlanComparisonProps) {
  if (planos.length === 0) {
    return (
      <EmptyState
        icon={CreditCard}
        title="Nenhuma assinatura no período"
        description="Assim que houver compras concluídas, a comparação entre planos aparece aqui."
      />
    );
  }

  const totalAssinantes = planos.reduce((soma, p) => soma + p.usuarios, 0);
  const mrrTotal = planos.reduce((soma, p) => soma + p.usuarios * (PRECO_PLANO[p.plano as Plano] ?? 0), 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        {planos.map(p => {
          const rotulo = ROTULO_PLANO[p.plano as Plano] ?? p.plano;
          const preco = PRECO_PLANO[p.plano as Plano];
          const participacao = totalAssinantes > 0 ? Math.round((p.usuarios / totalAssinantes) * 100) : 0;

          return (
            <div key={p.plano} className="rounded-md border border-edge p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className={`w-2 h-2 rounded-full ${COR_PLANO[p.plano] ?? 'bg-faint'}`} />
                <span className={`text-xs font-semibold uppercase tracking-wide ${COR_TEXTO_PLANO[p.plano] ?? 'text-muted'}`}>
                  {rotulo}
                </span>
              </div>
              <p className="font-display font-bold text-3xl leading-none text-fg font-tabular">{p.usuarios}</p>
              <p className="text-xs text-faint mt-1.5">
                {participacao}% dos assinantes
                {preco !== undefined && ` · R$ ${preco.toFixed(2).replace('.', ',')}/mês`}
              </p>
            </div>
          );
        })}
      </div>

      <div className="h-2.5 rounded-full bg-edge overflow-hidden flex">
        {planos.map(p => (
          <div
            key={p.plano}
            className={COR_PLANO[p.plano] ?? 'bg-faint'}
            style={{ width: `${totalAssinantes > 0 ? (p.usuarios / totalAssinantes) * 100 : 0}%` }}
          />
        ))}
      </div>

      <div className="flex items-center justify-between text-xs pt-1">
        <span className="text-faint">MRR estimado no período</span>
        <span className="font-semibold text-fg font-tabular">
          {mrrTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </span>
      </div>
    </div>
  );
}
