import { PlanoContagem } from '../../lib/funnel';
import { SubscriptionPlan, planLabel } from '../../lib/supabase';
import EmptyState from '../ui/EmptyState';
import { CreditCard, History } from 'lucide-react';

interface PlanComparisonProps {
  planos: PlanoContagem[];
  plans: Record<string, SubscriptionPlan>;
}

/* Paleta cíclica — não há um número fixo de planos (hoje 6, pode mudar sem
   deploy do painel), então as cores são atribuídas por posição, não por nome. */
const CORES = ['bg-brand', 'bg-indigo', 'bg-info', 'bg-warning', 'bg-danger', 'bg-faint'];

export default function PlanComparison({ planos, plans }: PlanComparisonProps) {
  if (planos.length === 0) {
    return (
      <EmptyState
        icon={CreditCard}
        title="Nenhum usuário no período"
        description="A distribuição de planos aparece aqui assim que houver cadastros no intervalo selecionado."
      />
    );
  }

  const total = planos.reduce((soma, p) => soma + p.usuarios, 0);
  /* MRR real só faz sentido para quem está no plano E dentro do prazo —
     esta soma é "se todo mundo no plano estivesse em dia", uma referência de
     tamanho de carteira, não a receita ativa (essa é `calcularMonetizacao`). */
  const valorDeCatalogo = planos.reduce((soma, p) => soma + p.usuarios * (p.precoMensal ?? 0), 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        {planos.map((p, indice) => {
          const participacao = total > 0 ? Math.round((p.usuarios / total) * 100) : 0;
          const cor = CORES[indice % CORES.length];

          return (
            <div key={p.plano} className="rounded-md border border-edge p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className={`w-2 h-2 rounded-full ${cor}`} />
                <span className="text-xs font-semibold uppercase tracking-wide text-muted truncate">
                  {planLabel(p.plano, plans)}
                </span>
                {p.legado && (
                  <History className="w-3 h-3 text-faint shrink-0" aria-label="Plano descontinuado" />
                )}
              </div>
              <p className="font-display font-bold text-3xl leading-none text-fg font-tabular">{p.usuarios}</p>
              <p className="text-xs text-faint mt-1.5">
                {participacao}% da base
                {p.precoMensal !== null &&
                  p.precoMensal > 0 &&
                  ` · R$ ${p.precoMensal.toFixed(2).replace('.', ',')}/mês`}
                {p.legado && ' · descontinuado'}
              </p>
            </div>
          );
        })}
      </div>

      <div className="h-2.5 rounded-full bg-edge overflow-hidden flex">
        {planos.map((p, indice) => (
          <div
            key={p.plano}
            className={CORES[indice % CORES.length]}
            style={{ width: `${total > 0 ? (p.usuarios / total) * 100 : 0}%` }}
          />
        ))}
      </div>

      <div className="flex items-center justify-between text-xs pt-1">
        <span className="text-faint">Valor de catálogo da base (se todos estivessem em dia)</span>
        <span className="font-semibold text-fg font-tabular">
          {valorDeCatalogo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </span>
      </div>
    </div>
  );
}
