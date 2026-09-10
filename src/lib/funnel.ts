import { supabase } from './supabase';
import { EVENTO, GatilhoPaywall, Plano, Origem } from './analyticsEvents';

export interface AnalyticsEvent {
  id: string;
  user_id: string;
  event_name: string;
  platform: Origem;
  metadata: Record<string, unknown>;
  session_id: string | null;
  created_at: string;
}

/** Só os campos de `profiles` usados no cálculo de retenção. */
export interface AssinaturaUsuario {
  id: string;
  subscription_end_date: string | null;
}

export interface Periodo {
  de: Date;
  ate: Date;
}

/* ------------------------------------------------------------------ *
 * Busca
 * ------------------------------------------------------------------ */

/**
 * `analytics_events` ainda não existe até a migration proposta ser aplicada
 * no Supabase — nesse caso o PostgREST responde com o código PGRST205. A tela
 * trata isso como "ainda não configurado", não como erro de rede.
 */
export type ResultadoBusca =
  | { status: 'ok'; eventos: AnalyticsEvent[] }
  | { status: 'tabela_inexistente' }
  | { status: 'erro'; mensagem: string };

export async function buscarEventos(periodo: Periodo): Promise<ResultadoBusca> {
  const { data, error } = await supabase
    .from('analytics_events')
    .select('id, user_id, event_name, platform, metadata, session_id, created_at')
    .gte('created_at', periodo.de.toISOString())
    .lte('created_at', periodo.ate.toISOString())
    .order('created_at', { ascending: true });

  if (error) {
    if (error.code === 'PGRST205') return { status: 'tabela_inexistente' };
    return { status: 'erro', mensagem: error.message };
  }

  return { status: 'ok', eventos: (data || []) as AnalyticsEvent[] };
}

/* ------------------------------------------------------------------ *
 * Origem (app vs site)
 * ------------------------------------------------------------------ *
 *
 * Cada pessoa é classificada pela plataforma da sua 1ª sessão DENTRO do
 * período selecionado — não é um dado fixo por pessoa, é relativo à janela de
 * tempo em tela. Filtrar para "este mês" reclassifica quem começou a sessão
 * neste mês, mesmo que a conta seja antiga. Isso evita uma segunda consulta
 * sem limite de data só para descobrir a origem "de verdade" de cada um, e é
 * como a maioria das ferramentas de funil se comporta ao aplicar um filtro de
 * período.
 */
export function origemPorUsuario(eventos: AnalyticsEvent[]): Map<string, Origem> {
  const primeiraSessao = new Map<string, { data: string; origem: Origem }>();

  for (const evento of eventos) {
    if (evento.event_name !== EVENTO.SESSAO_INICIADA) continue;
    const atual = primeiraSessao.get(evento.user_id);
    if (!atual || evento.created_at < atual.data) {
      primeiraSessao.set(evento.user_id, { data: evento.created_at, origem: evento.platform });
    }
  }

  const resultado = new Map<string, Origem>();
  for (const [userId, { origem }] of primeiraSessao) resultado.set(userId, origem);
  return resultado;
}

/* ------------------------------------------------------------------ *
 * Funil
 * ------------------------------------------------------------------ */

export interface EtapaFunil {
  chave: string;
  rotulo: string;
  usuarios: number;
  /** % em relação à etapa anterior; null na 1ª etapa (não há anterior). */
  conversaoAnterior: number | null;
  /** % em relação à 1ª etapa; null na própria 1ª etapa. */
  conversaoInicial: number | null;
}

const ETAPAS_BASE: { chave: string; rotulo: string }[] = [
  { chave: 'cadastro', rotulo: 'Cadastro' },
  { chave: 'ativacao', rotulo: 'Ativação (1º aparelho)' },
  { chave: 'uso', rotulo: 'Retornou após o 1º dia' },
  { chave: 'consumo', rotulo: 'Viu o consumo de um aparelho' },
  { chave: 'paywall', rotulo: 'Viu o paywall' },
  { chave: 'checkout', rotulo: 'Iniciou o checkout' },
  { chave: 'compra', rotulo: 'Assinou um plano' },
];

/** Dias-de-calendário (não timestamps) em que cada usuário teve ao menos uma sessão. */
function diasComSessaoPorUsuario(eventos: AnalyticsEvent[]): Map<string, Set<string>> {
  const dias = new Map<string, Set<string>>();
  for (const evento of eventos) {
    if (evento.event_name !== EVENTO.SESSAO_INICIADA) continue;
    const dia = evento.created_at.slice(0, 10); // AAAA-MM-DD, no fuso do servidor
    if (!dias.has(evento.user_id)) dias.set(evento.user_id, new Set());
    dias.get(evento.user_id)!.add(dia);
  }
  return dias;
}

function usuariosComEvento(eventos: AnalyticsEvent[], nomeEvento: string): Set<string> {
  const usuarios = new Set<string>();
  for (const evento of eventos) {
    if (evento.event_name === nomeEvento) usuarios.add(evento.user_id);
  }
  return usuarios;
}

/**
 * Monta o funil de 7 etapas a partir dos eventos já filtrados para uma
 * origem (app/site) ou para todas — quem chama decide o recorte.
 *
 * Começa em Cadastro, não em "Instalação": sem SDK de atribuição de loja não
 * dá para afirmar de verdade quando alguém instalou o app. `session_started`
 * ainda existe por baixo (define a origem de cada pessoa e alimenta a etapa
 * "Uso/retorno"), só não vira uma etapa própria contada aqui.
 *
 * Cada etapa conta USUÁRIOS DISTINTOS que alcançaram aquele marco no
 * período, não quantidade de eventos — uma pessoa que viu o paywall 5 vezes
 * conta 1 vez aqui (a quebra por gatilho, em `calcularGatilhosPaywall`, é que
 * usa o total de ocorrências). Isso é o que evita a etapa contar usuário
 * duas vezes ou inflar com eventos repetidos.
 *
 * Não é um funil sequencial estrito (não exige que a etapa N só conte quem
 * passou pela N-1 dentro da mesma ordem cronológica) — é "quantos alcançaram
 * cada marco", o modelo padrão de funil de produto.
 */
export function calcularFunil(eventos: AnalyticsEvent[]): EtapaFunil[] {
  const diasPorUsuario = diasComSessaoPorUsuario(eventos);

  const usuariosUso = new Set<string>();
  for (const [userId, dias] of diasPorUsuario) {
    if (dias.size >= 2) usuariosUso.add(userId);
  }

  const conjuntos: Record<string, Set<string>> = {
    cadastro: usuariosComEvento(eventos, EVENTO.CADASTRO_CONCLUIDO),
    ativacao: usuariosComEvento(eventos, EVENTO.DISPOSITIVO_ATIVADO),
    uso: usuariosUso,
    consumo: usuariosComEvento(eventos, EVENTO.CONSUMO_VISUALIZADO),
    paywall: usuariosComEvento(eventos, EVENTO.PAYWALL_EXIBIDO),
    checkout: usuariosComEvento(eventos, EVENTO.CHECKOUT_INICIADO),
    compra: usuariosComEvento(eventos, EVENTO.COMPRA_CONCLUIDA),
  };

  const primeiraContagem = conjuntos[ETAPAS_BASE[0].chave].size;

  return ETAPAS_BASE.map((etapa, indice) => {
    const contagem = conjuntos[etapa.chave].size;
    const anterior = indice > 0 ? conjuntos[ETAPAS_BASE[indice - 1].chave].size : null;

    return {
      chave: etapa.chave,
      rotulo: etapa.rotulo,
      usuarios: contagem,
      conversaoAnterior: anterior ? Math.round((contagem / anterior) * 1000) / 10 : null,
      conversaoInicial:
        indice > 0 && primeiraContagem > 0 ? Math.round((contagem / primeiraContagem) * 1000) / 10 : null,
    };
  });
}

/* ------------------------------------------------------------------ *
 * Gatilho do paywall
 * ------------------------------------------------------------------ */

export interface GatilhoContagem {
  gatilho: string;
  usuarios: number;
  ocorrencias: number;
}

/** Usuários distintos e total de exibições de cada gatilho de paywall. */
export function calcularGatilhosPaywall(eventos: AnalyticsEvent[]): GatilhoContagem[] {
  const usuariosPorGatilho = new Map<string, Set<string>>();
  const ocorrenciasPorGatilho = new Map<string, number>();

  for (const evento of eventos) {
    if (evento.event_name !== EVENTO.PAYWALL_EXIBIDO) continue;
    const gatilho = typeof evento.metadata?.trigger === 'string' ? evento.metadata.trigger : 'desconhecido';

    if (!usuariosPorGatilho.has(gatilho)) usuariosPorGatilho.set(gatilho, new Set());
    usuariosPorGatilho.get(gatilho)!.add(evento.user_id);
    ocorrenciasPorGatilho.set(gatilho, (ocorrenciasPorGatilho.get(gatilho) || 0) + 1);
  }

  return [...usuariosPorGatilho.entries()]
    .map(([gatilho, usuarios]) => ({
      gatilho: gatilho as GatilhoPaywall | 'desconhecido',
      usuarios: usuarios.size,
      ocorrencias: ocorrenciasPorGatilho.get(gatilho) || 0,
    }))
    .sort((a, b) => b.usuarios - a.usuarios);
}

/* ------------------------------------------------------------------ *
 * Planos
 * ------------------------------------------------------------------ */

export interface PlanoContagem {
  plano: string;
  usuarios: number;
}

/**
 * Compras distintas por usuário e plano. Quando a mesma pessoa compra mais de
 * uma vez no período (upgrade, renovação após reativar), conta a compra mais
 * recente — é o plano que ela tem agora, não quantas vezes comprou.
 */
export function calcularPlanos(eventos: AnalyticsEvent[]): PlanoContagem[] {
  const planoMaisRecentePorUsuario = new Map<string, { plano: string; data: string }>();

  for (const evento of eventos) {
    if (evento.event_name !== EVENTO.COMPRA_CONCLUIDA) continue;
    const plano = typeof evento.metadata?.plan === 'string' ? evento.metadata.plan : 'desconhecido';
    const atual = planoMaisRecentePorUsuario.get(evento.user_id);
    if (!atual || evento.created_at > atual.data) {
      planoMaisRecentePorUsuario.set(evento.user_id, { plano, data: evento.created_at });
    }
  }

  const contagem = new Map<string, number>();
  for (const { plano } of planoMaisRecentePorUsuario.values()) {
    contagem.set(plano, (contagem.get(plano) || 0) + 1);
  }

  return [...contagem.entries()]
    .map(([plano, usuarios]) => ({ plano: plano as Plano | 'desconhecido', usuarios }))
    .sort((a, b) => b.usuarios - a.usuarios);
}

/* ------------------------------------------------------------------ *
 * Retenção 30/60/90 dias
 * ------------------------------------------------------------------ *
 *
 * Definição: assinatura ainda ativa no marco de dias, usando
 * profiles.subscription_end_date — não depende de nenhum evento novo. Um
 * `subscription_end_date` nulo é tratado como assinatura sem prazo definido
 * (ainda ativa). Só entram no denominador coortes cujo marco já passou — quem
 * assinou há 10 dias não conta nem a favor nem contra a retenção de 30 dias,
 * porque ainda não chegou lá.
 */

const MARCOS_RETENCAO = [30, 60, 90] as const;

export interface PontoRetencao {
  dias: (typeof MARCOS_RETENCAO)[number];
  coorte: number;
  retidos: number;
  taxa: number | null;
}

export function calcularRetencao(
  eventos: AnalyticsEvent[],
  assinantes: AssinaturaUsuario[],
  hoje: Date = new Date(),
): PontoRetencao[] {
  const dataCompraPorUsuario = new Map<string, Date>();
  for (const evento of eventos) {
    if (evento.event_name !== EVENTO.COMPRA_CONCLUIDA) continue;
    const data = new Date(evento.created_at);
    const atual = dataCompraPorUsuario.get(evento.user_id);
    if (!atual || data < atual) dataCompraPorUsuario.set(evento.user_id, data);
  }

  const fimAssinaturaPorUsuario = new Map<string, Date | null>();
  for (const assinante of assinantes) {
    fimAssinaturaPorUsuario.set(
      assinante.id,
      assinante.subscription_end_date ? new Date(assinante.subscription_end_date) : null,
    );
  }

  return MARCOS_RETENCAO.map(dias => {
    let coorte = 0;
    let retidos = 0;

    for (const [userId, dataCompra] of dataCompraPorUsuario) {
      const marco = new Date(dataCompra);
      marco.setDate(marco.getDate() + dias);
      if (marco > hoje) continue; // coorte ainda não chegou nesse marco

      coorte += 1;
      const fim = fimAssinaturaPorUsuario.get(userId);
      if (fim === undefined) continue; // sem perfil correspondente — não conta como retido
      if (fim === null || fim >= marco) retidos += 1;
    }

    return { dias, coorte, retidos, taxa: coorte > 0 ? Math.round((retidos / coorte) * 1000) / 10 : null };
  });
}
