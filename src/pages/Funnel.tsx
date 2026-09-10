import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  AnalyticsEvent,
  AssinaturaUsuario,
  buscarEventos,
  calcularFunil,
  calcularGatilhosPaywall,
  calcularPlanos,
  calcularRetencao,
  origemPorUsuario,
  ResultadoBusca,
} from '../lib/funnel';
import { gerarDadosDemonstracao } from '../lib/funnelMock';
import { ROTULO_ORIGEM, Origem } from '../lib/analyticsEvents';
import { useToast } from '../contexts/ToastContext';
import {
  Filter,
  Smartphone,
  Globe,
  LayoutGrid,
  Database,
  FlaskConical,
  Users as UsersIcon,
  Crown,
  Repeat,
  TrendingDown,
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Panel from '../components/ui/Panel';
import StatCard from '../components/ui/StatCard';
import Skeleton from '../components/ui/Skeleton';
import { inputClass, labelClass } from '../components/ui/classes';
import FunnelChart from '../components/funnel/FunnelChart';
import TriggerBreakdown from '../components/funnel/TriggerBreakdown';
import PlanComparison from '../components/funnel/PlanComparison';
import RetentionCurve from '../components/funnel/RetentionCurve';

type FiltroPlataforma = 'all' | Origem;

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
 * todo o uso do app desde sempre. Um padrão de últimos 30 dias deixava a tela
 * vazia por padrão sempre que a instrumentação era nova (ou numa semana fraca
 * de eventos) — o admin tinha que descobrir que precisava alargar o período
 * antes de ver qualquer coisa. O seletor de data continua aí para quem quiser
 * restringir a um intervalo específico.
 */
const INICIO_PADRAO = '2020-01-01';

export default function Funnel() {
  const toast = useToast();

  const [de, setDe] = useState(INICIO_PADRAO);
  const [ate, setAte] = useState(() => paraInputDate(new Date()));
  const [plataforma, setPlataforma] = useState<FiltroPlataforma>('all');

  const [resultado, setResultado] = useState<ResultadoBusca | null>(null);
  const [assinantes, setAssinantes] = useState<AssinaturaUsuario[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [modoDemonstracao, setModoDemonstracao] = useState(false);

  const periodo = useMemo(() => ({ de: inicioDoDia(new Date(de)), ate: fimDoDia(new Date(ate)) }), [de, ate]);

  useEffect(() => {
    let ativo = true;
    setCarregando(true);

    (async () => {
      const [eventosResultado, perfisResultado] = await Promise.all([
        buscarEventos(periodo),
        supabase.from('profiles').select('id, subscription_end_date'),
      ]);

      if (!ativo) return;

      setResultado(eventosResultado);
      if (perfisResultado.error) {
        console.error('Error loading subscriptions for retention:', perfisResultado.error);
      } else {
        setAssinantes((perfisResultado.data || []) as AssinaturaUsuario[]);
      }
      setCarregando(false);
    })();

    return () => {
      ativo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [de, ate]);

  const semTabela = resultado?.status === 'tabela_inexistente';

  useEffect(() => {
    if (resultado?.status === 'erro') toast.error('Não foi possível carregar os eventos do funil.');
  }, [resultado, toast]);

  /* Fonte dos eventos: reais quando existem, sintéticos quando a tabela
     ainda não existe ou está vazia e o modo demonstração foi ligado. */
  const { eventos, assinantesEfetivos, usandoDemonstracao } = useMemo(() => {
    const eventosReais = resultado?.status === 'ok' ? resultado.eventos : [];
    const podeMostrarDemo = modoDemonstracao && (semTabela || eventosReais.length === 0);

    if (podeMostrarDemo) {
      const demo = gerarDadosDemonstracao();
      return { eventos: demo.eventos, assinantesEfetivos: demo.assinantes, usandoDemonstracao: true };
    }

    return { eventos: eventosReais, assinantesEfetivos: assinantes, usandoDemonstracao: false };
  }, [resultado, modoDemonstracao, semTabela, assinantes]);

  const origens = useMemo(() => origemPorUsuario(eventos), [eventos]);

  const eventosPorOrigem = useMemo(() => {
    const app: AnalyticsEvent[] = [];
    const site: AnalyticsEvent[] = [];
    for (const evento of eventos) {
      const origem = origens.get(evento.user_id);
      if (origem === 'app') app.push(evento);
      else if (origem === 'site') site.push(evento);
    }
    return { app, site };
  }, [eventos, origens]);

  const eventosNoFiltro = useMemo(() => {
    if (plataforma === 'app') return eventosPorOrigem.app;
    if (plataforma === 'site') return eventosPorOrigem.site;
    return eventos;
  }, [plataforma, eventos, eventosPorOrigem]);

  const funilApp = useMemo(() => calcularFunil(eventosPorOrigem.app), [eventosPorOrigem.app]);
  const funilSite = useMemo(() => calcularFunil(eventosPorOrigem.site), [eventosPorOrigem.site]);
  const funilFiltrado = useMemo(() => calcularFunil(eventosNoFiltro), [eventosNoFiltro]);

  const gatilhos = useMemo(() => calcularGatilhosPaywall(eventosNoFiltro), [eventosNoFiltro]);
  const planos = useMemo(() => calcularPlanos(eventosNoFiltro), [eventosNoFiltro]);
  const retencao = useMemo(
    () => calcularRetencao(eventosNoFiltro, assinantesEfetivos),
    [eventosNoFiltro, assinantesEfetivos],
  );

  const totalAtivos = eventos.length > 0 ? origens.size : 0;
  const totalCadastros = funilFiltrado.find(e => e.chave === 'cadastro')?.usuarios ?? 0;
  const totalAssinantes = funilFiltrado.find(e => e.chave === 'compra')?.usuarios ?? 0;
  const conversaoGeral = funilFiltrado.find(e => e.chave === 'compra')?.conversaoInicial ?? null;
  const retencao90 = retencao.find(r => r.dias === 90);

  const mostrarConteudo = !carregando && (eventos.length > 0 || usandoDemonstracao);
  const podeOferecerDemo = !carregando && !usandoDemonstracao && (semTabela || eventos.length === 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Aquisição & Retenção"
        title="Funil de Conversão"
        subtitle="Do cadastro até virar assinante — e quem continua depois"
      />

      {usandoDemonstracao && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-md border border-indigo/30 bg-indigo-soft">
          <FlaskConical className="w-4 h-4 text-indigo shrink-0" />
          <p className="text-sm text-fg flex-1">
            <strong className="font-semibold text-indigo">Modo demonstração</strong>
            <span className="text-muted">
              {' '}
              — números fictícios de exemplo, cobrindo sempre os últimos 150 dias (ignora o filtro de data
              acima, para as coortes de retenção terem tempo de amadurecer).
            </span>
          </p>
          <button
            onClick={() => setModoDemonstracao(false)}
            className="text-xs font-semibold text-indigo hover:underline shrink-0"
          >
            Sair da demonstração
          </button>
        </div>
      )}

      <Panel className="p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] gap-3">
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

          <div>
            <span className={labelClass}>Origem</span>
            <div className="flex gap-1 p-1 rounded-md bg-edge/30" role="group" aria-label="Filtrar por origem">
              {(
                [
                  { valor: 'all' as const, rotulo: 'Todos', Icone: LayoutGrid },
                  { valor: 'app' as const, rotulo: 'App', Icone: Smartphone },
                  { valor: 'site' as const, rotulo: 'Site', Icone: Globe },
                ] as const
              ).map(({ valor, rotulo, Icone }) => (
                <button
                  key={valor}
                  onClick={() => setPlataforma(valor)}
                  aria-pressed={plataforma === valor}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-colors whitespace-nowrap ${
                    plataforma === valor ? 'bg-brand text-white shadow-sm' : 'text-muted hover:text-fg'
                  }`}
                >
                  <Icone className="w-3.5 h-3.5" />
                  {rotulo}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted">
          <Filter className="w-3.5 h-3.5 shrink-0" />
          <span>
            {carregando
              ? 'Carregando…'
              : usandoDemonstracao
                ? 'Exibindo dados de exemplo'
                : `${totalAtivos} pessoas com atividade no período · ${totalCadastros} cadastraram`}
          </span>
        </div>
      </Panel>

      {carregando && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      )}

      {!carregando && resultado?.status === 'erro' && (
        <Panel className="p-6 text-center">
          <p className="text-sm text-danger font-semibold">Não foi possível carregar os eventos.</p>
          <p className="text-xs text-muted mt-1">{resultado.mensagem}</p>
        </Panel>
      )}

      {podeOferecerDemo && (
        <Panel className="p-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-brand-soft mb-4">
            <Database className="w-6 h-6 text-brand" />
          </div>
          <h3 className="font-display font-bold text-lg text-fg">
            {semTabela ? 'A tabela de eventos ainda não existe' : 'Nenhum evento neste período'}
          </h3>
          <p className="text-sm text-muted mt-1.5 max-w-md mx-auto">
            {semTabela
              ? 'Esta tela lê a tabela analytics_events, que ainda não foi criada no banco. Assim que a migration for aplicada e o app começar a gravar eventos, os números reais aparecem aqui automaticamente.'
              : 'A tabela existe, mas não há eventos registrados nesse intervalo de datas — tente um período maior.'}
          </p>
          <button
            onClick={() => setModoDemonstracao(true)}
            className="inline-flex items-center gap-2 mt-5 px-4 py-2.5 rounded-md bg-indigo text-white text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <FlaskConical className="w-4 h-4" />
            Ver com dados de exemplo
          </button>
        </Panel>
      )}

      {mostrarConteudo && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              index={0}
              icon={UsersIcon}
              accent="brand"
              label="Cadastros no Período"
              value={totalCadastros}
              sublabel="Topo do funil"
            />
            <StatCard
              index={1}
              icon={Crown}
              accent="indigo"
              label="Viraram Assinantes"
              value={totalAssinantes}
              sublabel={conversaoGeral !== null ? `${conversaoGeral}% de conversão geral` : undefined}
            />
            <StatCard
              index={2}
              icon={TrendingDown}
              accent="warning"
              label="Maior Queda"
              value={
                maiorQueda(funilFiltrado)
                  ? `${Math.round(100 - (maiorQueda(funilFiltrado)?.conversaoAnterior ?? 100))}%`
                  : '—'
              }
              sublabel={maiorQueda(funilFiltrado) ? `não chegou em "${maiorQueda(funilFiltrado)?.rotulo}"` : undefined}
            />
            <StatCard
              index={3}
              icon={Repeat}
              accent="success"
              label="Retenção em 90 Dias"
              value={retencao90?.taxa !== null && retencao90?.taxa !== undefined ? `${retencao90.taxa}%` : '—'}
              sublabel={retencao90 && retencao90.coorte > 0 ? `${retencao90.coorte} na coorte` : 'Sem coorte madura ainda'}
            />
          </div>

          {plataforma === 'all' ? (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <Panel className="p-6">
                <FunnelChart
                  titulo={`Funil — ${ROTULO_ORIGEM.app}`}
                  subtitulo={`${funilApp[0]?.usuarios ?? 0} cadastros`}
                  etapas={funilApp}
                  cor="brand"
                />
              </Panel>
              <Panel className="p-6">
                <FunnelChart
                  titulo={`Funil — ${ROTULO_ORIGEM.site}`}
                  subtitulo={`${funilSite[0]?.usuarios ?? 0} cadastros`}
                  etapas={funilSite}
                  cor="indigo"
                />
              </Panel>
            </div>
          ) : (
            <Panel className="p-6">
              <FunnelChart
                titulo={`Funil — ${ROTULO_ORIGEM[plataforma]}`}
                etapas={funilFiltrado}
                cor={plataforma === 'app' ? 'brand' : 'indigo'}
              />
            </Panel>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Panel className="p-6">
              <h3 className="font-display font-bold text-lg text-fg mb-1">Comparativo de Planos</h3>
              <p className="text-xs text-faint mb-5">Essencial (R$ 9,90) vs. Premium (R$ 19,90)</p>
              <PlanComparison planos={planos} />
            </Panel>

            <Panel className="p-6">
              <h3 className="font-display font-bold text-lg text-fg mb-1">Gatilho do Paywall</h3>
              <p className="text-xs text-faint mb-5">O que mais leva a pessoa a ver a tela de assinatura</p>
              <TriggerBreakdown gatilhos={gatilhos} />
            </Panel>
          </div>

          <Panel className="p-6">
            <h3 className="font-display font-bold text-lg text-fg mb-1">Retenção em Coortes</h3>
            <p className="text-xs text-faint mb-2">
              % de quem assinou e ainda está com a assinatura ativa nos marcos de 30/60/90 dias
            </p>
            <RetentionCurve pontos={retencao} />
          </Panel>
        </>
      )}
    </div>
  );
}

function maiorQueda(etapas: ReturnType<typeof calcularFunil>) {
  let pior: (typeof etapas)[number] | null = null;
  for (const etapa of etapas) {
    if (etapa.conversaoAnterior === null) continue;
    if (!pior || etapa.conversaoAnterior < (pior.conversaoAnterior ?? 100)) pior = etapa;
  }
  return pior;
}
