import { AnalyticsEvent, AssinaturaUsuario } from './funnel';
import { EVENTO, GATILHO_PAYWALL, PLANO } from './analyticsEvents';

/**
 * Gera um conjunto de eventos plausível para pré-visualizar a tela antes de
 * `analytics_events` existir no banco (ou enquanto ainda não tem dado real).
 * Passa pelo mesmo `calcularFunil`/`calcularRetencao` que os dados reais —
 * não é uma tela "fake" à parte, é a mesma tela com outra fonte de dado.
 *
 * Gerador determinístico (seed fixa): mesma sessão, mesmo resultado — não
 * fica mudando de número a cada re-render enquanto se navega pela tela.
 */
function criarGerador(seed: number) {
  let estado = seed;
  return () => {
    estado = (estado * 1103515245 + 12345) & 0x7fffffff;
    return estado / 0x7fffffff;
  };
}

function embaralhar<T>(itens: T[], aleatorio: () => number): T[] {
  const copia = [...itens];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(aleatorio() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

/**
 * Ignora o período escolhido no filtro de propósito: é dado de exemplo, não
 * dado real filtrado por data. Uma janela fixa de 150 dias garante coortes de
 * compra maduras o bastante para os 3 marcos de retenção (30/60/90 dias)
 * aparecerem preenchidos, o que quase nunca aconteceria se a geração seguisse
 * o período padrão de 30 dias da tela.
 */
const JANELA_DEMONSTRACAO_DIAS = 150;

export function gerarDadosDemonstracao(): {
  eventos: AnalyticsEvent[];
  assinantes: AssinaturaUsuario[];
} {
  const aleatorio = criarGerador(42);
  const eventos: AnalyticsEvent[] = [];
  const assinantes: AssinaturaUsuario[] = [];

  const inicioJanela = new Date(Date.now() - JANELA_DEMONSTRACAO_DIAS * 24 * 60 * 60 * 1000);
  const duracaoMs = JANELA_DEMONSTRACAO_DIAS * 24 * 60 * 60 * 1000;
  const dataAleatoria = (dentroDe = duracaoMs) => new Date(inicioJanela.getTime() + aleatorio() * dentroDe);

  const TOTAL_INSTALACOES = 520;
  const gatilhos = Object.values(GATILHO_PAYWALL);
  let contadorId = 0;
  const proximoId = () => `demo-${(contadorId++).toString(36)}`;

  for (let i = 0; i < TOTAL_INSTALACOES; i++) {
    const userId = `demo-user-${i}`;
    const plataforma = aleatorio() < 0.64 ? 'app' : 'site';
    const dataInstalacao = dataAleatoria();

    eventos.push({
      id: proximoId(),
      user_id: userId,
      event_name: EVENTO.SESSAO_INICIADA,
      platform: plataforma,
      metadata: {},
      session_id: null,
      created_at: dataInstalacao.toISOString(),
    });

    if (aleatorio() >= 0.68) continue; // não cadastrou
    const dataCadastro = new Date(dataInstalacao.getTime() + aleatorio() * 60 * 60 * 1000);
    eventos.push({
      id: proximoId(),
      user_id: userId,
      event_name: EVENTO.CADASTRO_CONCLUIDO,
      platform: plataforma,
      metadata: {},
      session_id: null,
      created_at: dataCadastro.toISOString(),
    });

    if (aleatorio() >= 0.74) continue; // não ativou
    eventos.push({
      id: proximoId(),
      user_id: userId,
      event_name: EVENTO.DISPOSITIVO_ATIVADO,
      platform: plataforma,
      metadata: { device_id: proximoId() },
      session_id: null,
      created_at: new Date(dataCadastro.getTime() + aleatorio() * 3 * 60 * 60 * 1000).toISOString(),
    });

    if (aleatorio() >= 0.77) continue; // não voltou depois do 1º dia
    eventos.push({
      id: proximoId(),
      user_id: userId,
      event_name: EVENTO.SESSAO_INICIADA,
      platform: plataforma,
      metadata: {},
      session_id: null,
      created_at: new Date(dataCadastro.getTime() + (1 + aleatorio() * 5) * 24 * 60 * 60 * 1000).toISOString(),
    });

    if (aleatorio() >= 0.8) continue; // não viu consumo
    eventos.push({
      id: proximoId(),
      user_id: userId,
      event_name: EVENTO.CONSUMO_VISUALIZADO,
      platform: plataforma,
      metadata: {},
      session_id: null,
      created_at: new Date(dataCadastro.getTime() + aleatorio() * 6 * 24 * 60 * 60 * 1000).toISOString(),
    });

    if (aleatorio() >= 0.65) continue; // não viu paywall
    const gatilho = gatilhos[Math.floor(aleatorio() * gatilhos.length)];
    eventos.push({
      id: proximoId(),
      user_id: userId,
      event_name: EVENTO.PAYWALL_EXIBIDO,
      platform: plataforma,
      metadata: { trigger: gatilho },
      session_id: null,
      created_at: new Date(dataCadastro.getTime() + aleatorio() * 7 * 24 * 60 * 60 * 1000).toISOString(),
    });

    if (aleatorio() >= 0.44) continue; // não iniciou checkout
    eventos.push({
      id: proximoId(),
      user_id: userId,
      event_name: EVENTO.CHECKOUT_INICIADO,
      platform: plataforma,
      metadata: {},
      session_id: null,
      created_at: new Date(dataCadastro.getTime() + aleatorio() * 8 * 24 * 60 * 60 * 1000).toISOString(),
    });

    if (aleatorio() >= 0.63) continue; // desistiu no checkout
    const plano = aleatorio() < 0.58 ? PLANO.ESSENCIAL : PLANO.PREMIUM;
    const dataCompra = new Date(dataCadastro.getTime() + aleatorio() * 9 * 24 * 60 * 60 * 1000);
    eventos.push({
      id: proximoId(),
      user_id: userId,
      event_name: EVENTO.COMPRA_CONCLUIDA,
      platform: plataforma,
      metadata: { plan: plano },
      session_id: null,
      created_at: dataCompra.toISOString(),
    });

    /* Curva de churn plausível: a maioria segue ativa, uma fração cancela em
       algum ponto entre a compra e hoje. */
    const cancelou = aleatorio() < 0.32;
    const diasAteHoje = Math.max((Date.now() - dataCompra.getTime()) / (24 * 60 * 60 * 1000), 1);
    const fimAssinatura = cancelou
      ? new Date(dataCompra.getTime() + aleatorio() * diasAteHoje * 24 * 60 * 60 * 1000)
      : null;

    assinantes.push({ id: userId, subscription_end_date: fimAssinatura?.toISOString() ?? null });
  }

  return { eventos: embaralhar(eventos, aleatorio), assinantes };
}
