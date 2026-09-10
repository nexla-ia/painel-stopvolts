import { useEffect, useMemo, useState } from 'react';
import {
  supabase,
  Profile,
  UserRow,
  UserStats,
  SubscriptionPlan,
  PROFILE_COLUMNS,
} from '../lib/supabase';
import {
  Periodo,
  usuariosNoPeriodo,
  calcularFunil,
  calcularPlanos,
  calcularMonetizacao,
  calcularCoortesRetencao,
} from '../lib/funnel';
import { useToast } from '../contexts/ToastContext';
import { Filter, Users as UsersIcon, Crown, TrendingDown, Repeat, Info, Wallet, Clock } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Panel from '../components/ui/Panel';
import StatCard from '../components/ui/StatCard';
import Skeleton from '../components/ui/Skeleton';
import { inputClass, labelClass } from '../components/ui/classes';
import FunnelChart from '../components/funnel/FunnelChart';
import PlanComparison from '../components/funnel/PlanComparison';
import CohortTable from '../components/funnel/CohortTable';

function inicioDoDia(data: Date) {
  const d = new Date(data);
  d.setHours(0, 0, 0, 0);
  return d;
}

function fimDoDia(data: Date) {
  const d = new Date(data);
  d.setHours(23, 59, 59, 999);
  return d;
}

function paraInputDate(data: Date) {
  return data.toISOString().slice(0, 10);
}

/*
 * Data fixa e distante no passado, não "últimos N dias": o padrão é mostrar
 * todo o histórico de cadastros. Um padrão de janela curta deixava a tela
 * vazia sempre que a semana era fraca — o filtro continua aí pra quem quiser
 * restringir a um intervalo específico.
 */
const INICIO_PADRAO = '2020-01-01';

export default function Funnel() {
  const toast = useToast();
  const [usuarios, setUsuarios] = useState<UserRow[]>([]);
  const [plans, setPlans] = useState<Record<string, SubscriptionPlan>>({});
  const [loading, setLoading] = useState(true);
  const [de, setDe] = useState(INICIO_PADRAO);
  const [ate, setAte] = useState(() => paraInputDate(new Date()));

  const periodo: Periodo = useMemo(
    () => ({ de: inicioDoDia(new Date(de)), ate: fimDoDia(new Date(ate)) }),
    [de, ate],
  );

  useEffect(() => {
    carregar();
  }, []);

  const carregar = async () => {
    try {
      const [profilesResult, statsResult, plansResult] = await Promise.all([
        supabase.from('profiles').select(PROFILE_COLUMNS).returns<Profile[]>(),
        supabase.from('user_stats_view').select('*'),
        supabase.from('subscription_plans').select('*'),
      ]);

      if (profilesResult.error) throw profilesResult.error;

      const statsByUser: Record<string, UserStats> = {};
      if (!statsResult.error) {
        for (const row of statsResult.data || []) statsByUser[row.user_id] = row;
      }

      const planMap: Record<string, SubscriptionPlan> = {};
      if (!plansResult.error) {
        for (const row of plansResult.data || []) planMap[row.plan_name] = row;
      }
      setPlans(planMap);

      setUsuarios((profilesResult.data || []).map(p => ({ ...p, stats: statsByUser[p.id] })));
    } catch (error) {
      console.error('Error loading funnel data:', error);
      toast.error('Não foi possível carregar os dados do funil.');
    } finally {
      setLoading(false);
    }
  };

  const usuariosFiltrados = useMemo(() => usuariosNoPeriodo(usuarios, periodo), [usuarios, periodo]);

  const funil = useMemo(() => calcularFunil(usuariosFiltrados), [usuariosFiltrados]);
  const planos = useMemo(() => calcularPlanos(usuariosFiltrados, plans), [usuariosFiltrados, plans]);
  const monetizacao = useMemo(
    () => calcularMonetizacao(usuariosFiltrados, plans),
    [usuariosFiltrados, plans],
  );
  const coortes = useMemo(() => calcularCoortesRetencao(usuariosFiltrados), [usuariosFiltrados]);

  const maiorQueda = useMemo(() => {
    let pior: (typeof funil)[number] | null = null;
    for (const etapa of funil) {
      if (etapa.conversaoAnterior === null) continue;
      if (!pior || etapa.conversaoAnterior < (pior.conversaoAnterior ?? 100)) pior = etapa;
    }
    return pior;
  }, [funil]);

  /*
   * Retenção de referência no topo: média das coortes já maduras (30 dias),
   * ponderada pelo tamanho de cada uma — não é uma nova contagem por pessoa,
   * é a mesma taxa que já sai de `calcularCoortesRetencao`, só resumida num
   * número só em vez de uma linha por mês.
   */
  const retencao30Geral = useMemo(() => {
    let baseTotal = 0;
    let somaPonderada = 0;
    for (const c of coortes) {
      if (c.retencao[30] === null) continue;
      baseTotal += c.tamanho;
      somaPonderada += c.retencao[30] * c.tamanho;
    }
    return baseTotal > 0 ? Math.round((somaPonderada / baseTotal) * 10) / 10 : null;
  }, [coortes]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-9 w-64 mb-2" />
          <Skeleton className="h-4 w-80" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    // O <main> trava a rolagem no desktop (ver Layout.tsx); esta página
    // precisa da própria rolagem interna, senão o conteúdo abaixo da altura
    // da janela fica inalcançável.
    <div className="flex flex-col gap-6 desk:h-full desk:min-h-0 desk:overflow-y-auto desk:overscroll-contain">
      <PageHeader
        eyebrow="Aquisição & Retenção"
        title="Funil de Conversão"
        subtitle="Do cadastro até virar assinante — e quem continua depois"
      />

      <div className="flex items-start gap-3 px-4 py-3 rounded-md border border-info/25 bg-info-soft">
        <Info className="w-4 h-4 text-info shrink-0 mt-0.5" />
        <p className="text-xs text-muted">
          <strong className="font-semibold text-fg">Instalação, paywall e checkout não aparecem aqui</strong> —
          esses eventos vão para o Gerenciador de Anúncios da Meta (via SDK do app) e para o Google Play
          Console, sem espelho no banco do StopVolts. Também não existe separação por App/Site: não há coluna
          de origem em <code className="font-mono">profiles</code>. Tudo abaixo vem de cadastro, dispositivos
          e assinatura — dado real, sempre atualizado, sem depender de instrumentação nova.
        </p>
      </div>

      <Panel className="p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
          <div>
            <label htmlFor="funil-de" className={labelClass}>
              De
            </label>
            <input
              id="funil-de"
              type="date"
              value={de}
              max={ate}
              onChange={e => setDe(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="funil-ate" className={labelClass}>
              Até
            </label>
            <input
              id="funil-ate"
              type="date"
              value={ate}
              min={de}
              max={paraInputDate(new Date())}
              onChange={e => setAte(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted">
          <Filter className="w-3.5 h-3.5 shrink-0" />
          <span>{usuariosFiltrados.length} cadastros no período selecionado</span>
        </div>
      </Panel>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          index={0}
          icon={UsersIcon}
          accent="brand"
          label="Cadastros no Período"
          value={usuariosFiltrados.length}
          sublabel="Topo do funil"
        />
        <StatCard
          index={1}
          icon={Crown}
          accent="indigo"
          label="Viraram Assinantes"
          value={funil.find(e => e.chave === 'assinante')?.usuarios ?? 0}
          sublabel={
            funil.find(e => e.chave === 'assinante')?.conversaoInicial !== null
              ? `${funil.find(e => e.chave === 'assinante')?.conversaoInicial}% de conversão`
              : undefined
          }
        />
        <StatCard
          index={2}
          icon={TrendingDown}
          accent="warning"
          label="Maior Queda"
          value={maiorQueda ? `${Math.round(100 - (maiorQueda.conversaoAnterior ?? 100))}%` : '—'}
          sublabel={maiorQueda ? `não chegou em "${maiorQueda.rotulo}"` : undefined}
        />
        <StatCard
          index={3}
          icon={Repeat}
          accent="success"
          label="Retenção em 30 Dias"
          value={retencao30Geral !== null ? `${retencao30Geral}%` : '—'}
          sublabel="Coortes já maduras, logaram de novo depois de 30 dias"
        />
      </div>

      <Panel className="p-6">
        <FunnelChart titulo="Funil de Conversão" etapas={funil} cor="brand" />
      </Panel>

      <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_1fr] gap-6">
        <Panel className="p-6">
          <div className="flex items-center gap-2 mb-1">
            <Wallet className="w-4 h-4 text-muted" />
            <h3 className="font-display font-bold text-lg text-fg">Monetização</h3>
          </div>
          <p className="text-xs text-faint mb-5">
            Pagamento é avulso, não recorrente — "receita ativa" é quem está pago e dentro do prazo, não uma
            cobrança garantida.
          </p>

          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="rounded-md border border-edge p-3.5">
              <p className="text-[11px] uppercase tracking-wider text-faint mb-1">Receita ativa estimada</p>
              <p className="font-display font-bold text-xl text-fg font-tabular">
                {monetizacao.receitaAtivaEstimada.toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                })}
              </p>
            </div>
            <div className="rounded-md border border-edge p-3.5">
              <p className="text-[11px] uppercase tracking-wider text-faint mb-1">Assinantes ativos</p>
              <p className="font-display font-bold text-xl text-fg font-tabular">
                {monetizacao.assinantesAtivos}
              </p>
            </div>
            <div className="rounded-md border border-edge p-3.5">
              <p className="text-[11px] uppercase tracking-wider text-faint mb-1">Conversão free → pago</p>
              <p className="font-display font-bold text-xl text-fg font-tabular">
                {monetizacao.conversaoPaga !== null ? `${monetizacao.conversaoPaga}%` : '—'}
              </p>
            </div>
            <div className="rounded-md border border-edge p-3.5">
              <p className="text-[11px] uppercase tracking-wider text-faint mb-1">Entraram por código promo</p>
              <p className="font-display font-bold text-xl text-fg font-tabular">
                {monetizacao.entraramPorPromo}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-3.5 h-3.5 text-muted" />
            <p className="text-xs font-semibold text-fg">Vencimentos próximos</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { rotulo: '7 dias', valor: monetizacao.vencemEm7Dias },
              { rotulo: '15 dias', valor: monetizacao.vencemEm15Dias },
              { rotulo: '30 dias', valor: monetizacao.vencemEm30Dias },
            ].map(v => (
              <div key={v.rotulo} className="rounded-md bg-edge/20 px-3 py-2.5 text-center">
                <p className="font-display font-bold text-lg text-fg font-tabular">{v.valor}</p>
                <p className="text-[11px] text-faint">em {v.rotulo}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="p-6">
          <h3 className="font-display font-bold text-lg text-fg mb-1">Distribuição de Planos</h3>
          <p className="text-xs text-faint mb-5">Vigentes e legados — descontinuados seguem ativos até vencer</p>
          <PlanComparison planos={planos} plans={plans} />
        </Panel>
      </div>

      <Panel className="p-6">
        <h3 className="font-display font-bold text-lg text-fg mb-1">Retenção por Coorte de Cadastro</h3>
        <p className="text-xs text-faint mb-5">
          % de cada leva mensal que logou de novo depois de 30/60/90 dias do cadastro. Medição começou em
          agosto/2026 — coortes anteriores a isso não têm histórico de login confiável.
        </p>
        <CohortTable coortes={coortes} />
      </Panel>
    </div>
  );
}
