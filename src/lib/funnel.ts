import { UserRow, SubscriptionPlan, isPaidPlan, deviceCountOf } from './supabase';

export interface Periodo {
  de: Date;
  ate: Date;
}

/** `created_at` do usuário cai dentro do período selecionado. */
export function usuariosNoPeriodo(usuarios: UserRow[], periodo: Periodo): UserRow[] {
  const de = periodo.de.getTime();
  const ate = periodo.ate.getTime();
  return usuarios.filter(u => {
    const t = new Date(u.created_at).getTime();
    return t >= de && t <= ate;
  });
}

/* ------------------------------------------------------------------ *
 * Funil
 * ------------------------------------------------------------------ *
 *
 * Cinco etapas, todas lidas de `profiles`/`user_stats_view` — nenhuma
 * depende de instrumentação nova no app. "Instalação", "Paywall exibido" e
 * "Checkout iniciado" não entram: esses três só existem no Gerenciador de
 * Anúncios da Meta (o app manda pra lá via SDK) e no Google Play Console,
 * sem espelho nenhum no Supabase — não dá pra montar gráfico do que não
 * existe no banco.
 */

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
  { chave: 'onboarding', rotulo: 'Concluiu o onboarding' },
  { chave: 'ativacao', rotulo: 'Ativação (1º aparelho)' },
  { chave: 'retorno', rotulo: 'Voltou a usar' },
  { chave: 'assinante', rotulo: 'Virou assinante' },
];

/**
 * Conta usuários distintos que alcançaram cada marco — nunca "eventos", já
 * que aqui cada linha é uma pessoa, não um log. Não é sequencial estrito
 * (não exige ter passado pela etapa anterior antes de contar a próxima): é
 * "quantos alcançaram cada marco", o modelo padrão de funil de produto.
 */
export function calcularFunil(usuarios: UserRow[]): EtapaFunil[] {
  const conjuntos: Record<string, number> = {
    cadastro: usuarios.length,
    onboarding: usuarios.filter(u => u.onboarding_completed).length,
    ativacao: usuarios.filter(u => deviceCountOf(u) > 0).length,
    // login_count é o sinal usado (não last_login_at) porque é o que marca
    // "voltou pelo menos mais uma vez" sem exigir cálculo de data — o próprio
    // valor já veio incrementado pelo app a cada login novo.
    retorno: usuarios.filter(u => (u.login_count ?? 0) >= 2).length,
    assinante: usuarios.filter(u => isPaidPlan(u.plan)).length,
  };

  const primeiraContagem = conjuntos[ETAPAS_BASE[0].chave];

  return ETAPAS_BASE.map((etapa, indice) => {
    const contagem = conjuntos[etapa.chave];
    const anterior = indice > 0 ? conjuntos[ETAPAS_BASE[indice - 1].chave] : null;

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
 * Monetização
 * ------------------------------------------------------------------ *
 *
 * Pagamento é avulso, não recorrente — a pessoa paga uma vez e o acesso
 * vence em `subscription_end_date`. Não existe cobrança automática, então
 * "receita ativa" aqui é quanto está pago e ainda dentro do prazo, não uma
 * receita recorrente garantida — e "vencimento" é o análogo de churn: sem
 * renovação, não sem cancelamento.
 */

export interface PlanoContagem {
  plano: string;
  usuarios: number;
  legado: boolean;
  precoMensal: number | null;
}

/** Todos os planos com usuário no período, mesmo os descontinuados. */
export function calcularPlanos(
  usuarios: UserRow[],
  plans: Record<string, SubscriptionPlan>,
): PlanoContagem[] {
  const contagem = new Map<string, number>();
  for (const u of usuarios) contagem.set(u.plan, (contagem.get(u.plan) ?? 0) + 1);

  return [...contagem.entries()]
    .map(([plano, qtd]) => ({
      plano,
      usuarios: qtd,
      legado: plans[plano]?.is_active === false,
      precoMensal: plans[plano]?.price_brl ?? null,
    }))
    .sort((a, b) => b.usuarios - a.usuarios);
}

/** Assinatura sem prazo definido conta como ativa; com prazo, precisa não ter vencido. */
function assinaturaAtiva(u: UserRow, hoje: Date) {
  if (!isPaidPlan(u.plan)) return false;
  if (!u.subscription_end_date) return true;
  return new Date(u.subscription_end_date) >= hoje;
}

export interface ResumoMonetizacao {
  receitaAtivaEstimada: number;
  assinantesAtivos: number;
  vencemEm7Dias: number;
  vencemEm15Dias: number;
  vencemEm30Dias: number;
  conversaoPaga: number | null;
  entraramPorPromo: number;
}

export function calcularMonetizacao(
  usuarios: UserRow[],
  plans: Record<string, SubscriptionPlan>,
  hoje: Date = new Date(),
): ResumoMonetizacao {
  const ativos = usuarios.filter(u => assinaturaAtiva(u, hoje));

  const emJanela = (dias: number) => {
    const limite = new Date(hoje);
    limite.setDate(limite.getDate() + dias);
    return usuarios.filter(u => {
      if (!isPaidPlan(u.plan) || !u.subscription_end_date) return false;
      const fim = new Date(u.subscription_end_date);
      return fim >= hoje && fim <= limite;
    }).length;
  };

  const receitaAtivaEstimada = ativos.reduce((soma, u) => soma + (plans[u.plan]?.price_brl ?? 0), 0);
  const pagos = usuarios.filter(u => isPaidPlan(u.plan)).length;

  return {
    receitaAtivaEstimada,
    assinantesAtivos: ativos.length,
    vencemEm7Dias: emJanela(7),
    vencemEm15Dias: emJanela(15),
    vencemEm30Dias: emJanela(30),
    conversaoPaga: usuarios.length > 0 ? Math.round((pagos / usuarios.length) * 1000) / 10 : null,
    entraramPorPromo: usuarios.filter(u => Boolean(u.promo_code_used)).length,
  };
}

/* ------------------------------------------------------------------ *
 * Retenção por coorte de cadastro
 * ------------------------------------------------------------------ *
 *
 * `last_login_at` é o sinal usado — não `login_count` — porque é um
 * timestamp que reflete o login mais recente independente de quando o
 * contador começou a existir; `login_count` some do zero em agosto/2026 e
 * conta com um valor de partida de 1 para quem já era usuário, então baixo
 * não significa inatividade, significa pouco tempo de medição.
 */

const MARCOS_RETENCAO = [30, 60, 90] as const;

export interface LinhaCoorte {
  /** "2026-08" — mês de cadastro da coorte. */
  mes: string;
  rotuloMes: string;
  tamanho: number;
  retencao: Record<(typeof MARCOS_RETENCAO)[number], number | null>;
}

export function calcularCoortesRetencao(usuarios: UserRow[], hoje: Date = new Date()): LinhaCoorte[] {
  const porMes = new Map<string, UserRow[]>();

  for (const u of usuarios) {
    const data = new Date(u.created_at);
    const chave = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
    if (!porMes.has(chave)) porMes.set(chave, []);
    porMes.get(chave)!.push(u);
  }

  return [...porMes.entries()]
    .sort(([a], [b]) => b.localeCompare(a)) // mês mais recente primeiro
    .map(([mes, membros]) => {
      const [ano, mesNum] = mes.split('-').map(Number);
      const retencao = {} as LinhaCoorte['retencao'];

      for (const dias of MARCOS_RETENCAO) {
        let elegiveis = 0;
        let retidos = 0;

        for (const u of membros) {
          const marco = new Date(u.created_at);
          marco.setDate(marco.getDate() + dias);
          if (marco > hoje) continue; // coorte ainda não chegou nesse marco

          elegiveis += 1;
          if (u.last_login_at && new Date(u.last_login_at) >= marco) retidos += 1;
        }

        retencao[dias] = elegiveis > 0 ? Math.round((retidos / elegiveis) * 1000) / 10 : null;
      }

      return {
        mes,
        rotuloMes: new Date(ano, mesNum - 1, 1).toLocaleDateString('pt-BR', {
          month: 'long',
          year: 'numeric',
        }),
        tamanho: membros.length,
        retencao,
      };
    });
}
