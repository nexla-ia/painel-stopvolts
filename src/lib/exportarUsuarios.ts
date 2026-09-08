import {
  UserRow,
  SubscriptionPlan,
  planLabel,
  deviceCountOf,
  isOverLimit,
  isAtLimit,
} from './supabase';
import { ColunaPlanilha, baixarXlsx, carimboDeData } from './planilha';

/**
 * Converte um campo de data do banco (texto ISO) em Date, ou null quando o
 * campo está vazio ou veio inválido — célula vazia é mais honesta do que uma
 * data de 1970 no meio da planilha.
 */
function paraData(valor: string | null | undefined) {
  if (!valor) return null;
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? null : data;
}

/**
 * Números vindos de `user_stats_view`.
 *
 * Se a linha da view existe, um valor ausente significa zero de verdade (a
 * conta simplesmente não tem dispositivos). Se a linha inteira não veio, o
 * dado é desconhecido — a célula fica vazia em vez de fingir um zero que
 * estragaria qualquer soma ou média feita na planilha.
 */
function numeroDaView(user: UserRow, ler: (stats: NonNullable<UserRow['stats']>) => number | null) {
  if (!user.stats) return null;
  return ler(user.stats) ?? 0;
}

function situacaoDoLimite(user: UserRow) {
  if (isOverLimit(user)) return 'Estourou o limite';
  if (isAtLimit(user)) return 'No limite';
  return 'Dentro do limite';
}

/**
 * Colunas da planilha de usuários.
 *
 * Cada campo vira uma coluna própria em vez de textos combinados ("Curitiba,
 * PR") porque na planilha o valor serve para filtrar e ordenar, não para ler.
 * Endereço residencial não entra — o painel nem carrega esses campos.
 */
export function colunasDeUsuarios(plans: Record<string, SubscriptionPlan>): ColunaPlanilha<UserRow>[] {
  return [
    { cabecalho: 'Nome', largura: 30, valor: u => u.full_name },
    { cabecalho: 'E-mail', largura: 32, valor: u => u.email },
    { cabecalho: 'Telefone', largura: 18, valor: u => u.phone },
    { cabecalho: 'Cidade', largura: 20, valor: u => u.city },
    { cabecalho: 'UF', largura: 6, valor: u => u.state },

    { cabecalho: 'Plano', largura: 18, valor: u => planLabel(u.plan, plans) },
    { cabecalho: 'Plano (chave)', largura: 14, valor: u => u.plan },
    { cabecalho: 'Limite de dispositivos', largura: 12, tipo: 'inteiro', valor: u => u.device_limit },
    { cabecalho: 'Dispositivos', largura: 12, tipo: 'inteiro', valor: u => deviceCountOf(u) },
    {
      cabecalho: 'Dispositivos ativos',
      largura: 12,
      tipo: 'inteiro',
      valor: u => numeroDaView(u, s => s.active_devices),
    },
    { cabecalho: 'Situação do limite', largura: 20, valor: situacaoDoLimite },

    {
      cabecalho: 'Consumo (kWh/mês)',
      largura: 16,
      tipo: 'decimal',
      valor: u => numeroDaView(u, s => s.estimated_monthly_kwh),
    },
    {
      cabecalho: 'Custo estimado (mês)',
      largura: 18,
      tipo: 'moeda',
      valor: u => numeroDaView(u, s => s.estimated_monthly_cost),
    },
    {
      cabecalho: 'Economia estimada',
      largura: 18,
      tipo: 'moeda',
      valor: u => u.estimated_savings,
    },

    {
      cabecalho: 'Conquistas',
      largura: 11,
      tipo: 'inteiro',
      valor: u => numeroDaView(u, s => s.achievements_count),
    },
    { cabecalho: 'Pontos', largura: 10, tipo: 'inteiro', valor: u => numeroDaView(u, s => s.total_points) },
    {
      cabecalho: 'Ranking',
      largura: 10,
      tipo: 'inteiro',
      valor: u => u.stats?.leaderboard_rank ?? null,
    },

    { cabecalho: 'Status da assinatura', largura: 20, valor: u => u.subscription_status },
    {
      cabecalho: 'Assinatura expira em',
      largura: 18,
      tipo: 'data',
      valor: u => paraData(u.subscription_end_date),
    },
    { cabecalho: 'Código promocional', largura: 20, valor: u => u.promo_code_used },

    { cabecalho: 'Perfil', largura: 10, valor: u => (u.role === 'admin' ? 'Admin' : 'Usuário') },
    { cabecalho: 'Conta ativa', largura: 11, valor: u => (u.is_active ? 'Sim' : 'Não') },

    { cabecalho: 'Cadastro', largura: 18, tipo: 'dataHora', valor: u => paraData(u.created_at) },
    { cabecalho: 'Último login', largura: 18, tipo: 'dataHora', valor: u => paraData(u.last_login_at) },
    { cabecalho: 'Nº de logins', largura: 12, tipo: 'inteiro', valor: u => u.login_count ?? 0 },

    { cabecalho: 'ID', largura: 38, valor: u => u.id },
  ];
}

/**
 * Gera e baixa a planilha com os usuários informados — sempre o conjunto que
 * passou pelos filtros da tela, nunca a base inteira. A ordenação das linhas
 * no arquivo é a da página; dentro do Excel a planilha já vem com filtro
 * automático e cabeçalho congelado para reordenar como quiser.
 */
export function exportarUsuarios(usuarios: UserRow[], plans: Record<string, SubscriptionPlan>) {
  baixarXlsx({
    nomeArquivo: `usuarios-stopvolts-${carimboDeData()}.xlsx`,
    nomePlanilha: 'Usuários',
    colunas: colunasDeUsuarios(plans),
    linhas: usuarios,
  });
}
