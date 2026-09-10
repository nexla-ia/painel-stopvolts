/**
 * Vocabulário de eventos do funil StopVolts.
 *
 * Fica como texto validado aqui no código — não como enum do banco — porque
 * um evento novo não deveria exigir uma migration. A tabela `analytics_events`
 * é só {user_id, event_name, platform, metadata, created_at}; o significado
 * de cada `event_name` e o formato do `metadata` vivem neste arquivo.
 *
 * Este arquivo é a referência tanto para o painel (que lê e agrupa esses
 * eventos) quanto para quem instrumentar o app/site (que os grava).
 */

export const EVENTO = {
  /**
   * Toda abertura do app ou carregamento do site. Não vira uma etapa própria
   * do funil — sem SDK de atribuição de loja não dá para afirmar "instalação"
   * de verdade — mas ainda é indispensável por baixo: a 1ª ocorrência de cada
   * pessoa define a origem dela (app/site), e uma ocorrência num dia de
   * calendário posterior à 1ª é o que vira a etapa "Uso/retorno".
   */
  SESSAO_INICIADA: 'session_started',
  CADASTRO_CONCLUIDO: 'signup_completed',
  /** metadata: { device_id: string } */
  DISPOSITIVO_ATIVADO: 'device_activated',
  /** metadata: { device_id: string } */
  CONSUMO_VISUALIZADO: 'consumption_viewed',
  /** metadata: { trigger: GatilhoPaywall } */
  PAYWALL_EXIBIDO: 'paywall_shown',
  /** metadata: { plan: Plano } */
  CHECKOUT_INICIADO: 'checkout_started',
  /**
   * metadata: { plan: Plano, price_brl: number }
   * Recomendado gravar a partir do webhook do gateway de pagamento, não do
   * cliente — evento que só depende do app pode não chegar se ele fechar
   * logo após o pagamento.
   */
  COMPRA_CONCLUIDA: 'purchase_completed',
} as const;

export type NomeEvento = (typeof EVENTO)[keyof typeof EVENTO];

export const GATILHO_PAYWALL = {
  QUARTO_DISPOSITIVO: '4th_device',
  HISTORICO: 'history',
  COMPARACAO: 'comparison',
  RELATORIO: 'report',
  ANALISE_AVANCADA: 'advanced_analysis',
} as const;

export type GatilhoPaywall = (typeof GATILHO_PAYWALL)[keyof typeof GATILHO_PAYWALL];

export const RATULO_GATILHO: Record<GatilhoPaywall, string> = {
  [GATILHO_PAYWALL.QUARTO_DISPOSITIVO]: '4º dispositivo cadastrado',
  [GATILHO_PAYWALL.HISTORICO]: 'Histórico de consumo',
  [GATILHO_PAYWALL.COMPARACAO]: 'Comparação entre aparelhos',
  [GATILHO_PAYWALL.RELATORIO]: 'Relatório de consumo',
  [GATILHO_PAYWALL.ANALISE_AVANCADA]: 'Análise avançada',
};

export const PLANO = {
  ESSENCIAL: 'essencial',
  PREMIUM: 'premium',
} as const;

export type Plano = (typeof PLANO)[keyof typeof PLANO];

export const ROTULO_PLANO: Record<Plano, string> = {
  [PLANO.ESSENCIAL]: 'Essencial',
  [PLANO.PREMIUM]: 'Premium',
};

export const PRECO_PLANO: Record<Plano, number> = {
  [PLANO.ESSENCIAL]: 9.9,
  [PLANO.PREMIUM]: 19.9,
};

export type Origem = 'app' | 'site';

export const ROTULO_ORIGEM: Record<Origem, string> = {
  app: 'App',
  site: 'Site',
};
