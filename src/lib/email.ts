import { Profile } from './supabase';

/** Webhook do n8n que dispara os e-mails. */
export const EMAIL_WEBHOOK_URL =
  import.meta.env.VITE_EMAIL_WEBHOOK_URL ||
  'https://n8n.nexladesenvolvimento.com.br/webhook/envio-email-stopvolts';

/** Modo de montagem do conteúdo. */
export type ModoConteudo = 'escrever' | 'html';

/**
 * Cores fixas do e-mail.
 *
 * Saem do HTML de referência do produto, não do tema do painel: o painel é a
 * ferramenta interna, o e-mail é o que o cliente recebe. Cliente de e-mail
 * também não tem tema claro/escuro, então os valores são literais.
 */
export const CORES_EMAIL = {
  fundo: '#F9FAFB',
  cartao: '#FFFFFF',
  titulo: '#111827',
  texto: '#6B7280',
  fraco: '#9CA3AF',
  borda: '#E5E7EB',
} as const;

/**
 * Tons de destaque. O verde é o padrão do produto; os outros existem para um
 * aviso de cobrança ou de urgência não precisar sair do mesmo desenho.
 */
export const TONS = {
  verde: { cor: '#22C55E', suave: '#DCFCE7', sombra: 'rgba(34,197,94,0.3)', rotulo: 'Verde' },
  azul: { cor: '#3B82F6', suave: '#DBEAFE', sombra: 'rgba(59,130,246,0.3)', rotulo: 'Azul' },
  ambar: { cor: '#F59E0B', suave: '#FEF3C7', sombra: 'rgba(245,158,11,0.3)', rotulo: 'Âmbar' },
  vermelho: { cor: '#EF4444', suave: '#FEE2E2', sombra: 'rgba(239,68,68,0.3)', rotulo: 'Vermelho' },
} as const;

export type TomEmail = keyof typeof TONS;

export interface ConteudoEmail {
  tom: TomEmail;
  titulo: string;
  corpo: string;
  botaoTexto: string;
  botaoUrl: string;
  rodape: string;
  /** URL pública do logo. Vazio cai no bloco com a inicial. */
  logoUrl: string;
}

export const CONTEUDO_PADRAO: ConteudoEmail = {
  tom: 'verde',
  titulo: 'Sua conta de luz pode cair neste mês',
  corpo:
    'Olá, {{primeiro_nome}}. A bandeira tarifária mudou e isso pesa na conta de todo mundo.\n\nNo *StopVolts* você acompanha quais aparelhos mais consomem e quanto dá para economizar em cada um.',
  botaoTexto: 'Ver meu consumo',
  botaoUrl: '',
  rodape: 'Enviado automaticamente por StopVolts',
  logoUrl: '',
};

export interface DestinatarioEmail {
  id: string;
  nome: string;
  email: string;
  assunto: string;
  /** HTML já personalizado para esta pessoa — o n8n só entrega. */
  html: string;
  /** Versão em texto puro, para clientes que não exibem HTML. */
  texto: string;
}

export interface EmailPayload {
  enviado_em: string;
  enviado_por: string;
  campanha: {
    titulo: string;
    assunto: string;
    modo: ModoConteudo;
  };
  total_destinatarios: number;
  destinatarios: DestinatarioEmail[];
}

/** Aceita o formato usual de e-mail; o resto fica de fora do disparo. */
const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const emailValido = (email: string | null) => Boolean(email && REGEX_EMAIL.test(email.trim()));

export const podeReceberEmail = (user: Profile) => emailValido(user.email);

export const primeiroNome = (nome: string | null) => {
  const limpo = (nome || '').trim();
  if (!limpo) return '';
  return limpo.split(/\s+/)[0];
};

/**
 * Escapa o texto digitado antes de virar HTML.
 *
 * Sem isso, um "&" ou "<" no texto quebraria o e-mail, e um trecho colado de
 * outro lugar poderia injetar marcação no meio do template.
 */
export function escaparHtml(texto: string) {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Aplica o negrito de `*palavra*`.
 *
 * Mesma convenção da tela de informativos, para quem escreve não precisar
 * aprender dois jeitos de destacar. Roda depois do escape, então o asterisco é
 * o único caractere que ainda tem poder de marcação.
 */
export function aplicarNegrito(textoEscapado: string) {
  return textoEscapado.replace(
    /(?<![\w*])\*([^*\n]+)\*(?![\w*])/g,
    `<strong style="color:${CORES_EMAIL.titulo};font-weight:600;">$1</strong>`,
  );
}

/** Tira os asteriscos, para a versão em texto puro. */
const semMarcacao = (texto: string) => texto.replace(/(?<![\w*])\*([^*\n]+)\*(?![\w*])/g, '$1');

/** Variáveis que o texto e o HTML colado podem usar. */
export const VARIAVEIS = [
  { chave: '{{primeiro_nome}}', descricao: 'Só o primeiro nome' },
  { chave: '{{nome}}', descricao: 'Nome completo' },
  { chave: '{{email}}', descricao: 'E-mail da pessoa' },
  { chave: '{{cidade}}', descricao: 'Cidade' },
  { chave: '{{estado}}', descricao: 'Estado (UF)' },
] as const;

/** Troca as variáveis pelos dados da pessoa. */
export function aplicarVariaveis(texto: string, user: Profile) {
  return texto
    .replace(/\{\{\s*nome\s*\}\}/gi, user.full_name?.trim() || '')
    .replace(/\{\{\s*primeiro_nome\s*\}\}/gi, primeiroNome(user.full_name))
    .replace(/\{\{\s*email\s*\}\}/gi, user.email)
    .replace(/\{\{\s*cidade\s*\}\}/gi, user.city || '')
    .replace(/\{\{\s*estado\s*\}\}/gi, user.state || '');
}

/**
 * Monta o HTML final do e-mail.
 *
 * Tabelas e CSS embutido porque Gmail e Outlook descartam folhas de estilo.
 * Sem flexbox nem grid: o Outlook desktop renderiza com o motor do Word e
 * ignora os dois — o círculo do emoji usa `line-height` no lugar. Sombra e
 * cantos arredondados ficam; onde não há suporte, degradam sem quebrar nada.
 */
export function montarHtml(conteudo: ConteudoEmail) {
  const { tom, titulo, corpo, botaoTexto, botaoUrl, rodape, logoUrl } = conteudo;
  const t = TONS[tom] ?? TONS.verde;
  const c = CORES_EMAIL;

  const paragrafos = corpo
    .split(/\n{2,}/)
    .map(bloco => bloco.trim())
    .filter(Boolean)
    .map((bloco, i, todos) => {
      const margem = i === todos.length - 1 ? '28px' : '10px';
      const html = aplicarNegrito(escaparHtml(bloco)).replace(/\n/g, '<br />');
      return `<p style="color:${c.texto};font-size:15px;line-height:1.7;text-align:center;margin:0 0 ${margem};">${html}</p>`;
    })
    .join('');

  const blocoLogo = logoUrl.trim()
    ? `<img src="${escaparHtml(logoUrl.trim())}" alt="StopVolts" width="48" height="48" style="border-radius:10px;display:block;margin:0 auto 12px;border:0;" />`
    : `<div style="width:48px;height:48px;line-height:48px;background:${t.cor};border-radius:10px;margin:0 auto 12px;text-align:center;"><span style="color:#ffffff;font-size:24px;font-weight:700;">S</span></div>`;

  const blocoTitulo = titulo.trim()
    ? `<h2 style="color:${c.titulo};text-align:center;margin:0 0 16px;font-size:21px;font-weight:700;">${escaparHtml(titulo.trim())}</h2>`
    : '';

  const blocoBotao =
    botaoUrl.trim() && botaoTexto.trim()
      ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;">
          <tr>
            <td align="center" bgcolor="${t.cor}" style="border-radius:10px;">
              <a href="${escaparHtml(botaoUrl.trim())}" style="background:${t.cor};color:#FFFFFF;text-decoration:none;font-weight:600;font-size:15px;padding:14px 36px;border-radius:10px;display:inline-block;box-shadow:0 2px 6px ${t.sombra};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">${escaparHtml(botaoTexto.trim())}</a>
            </td>
          </tr>
        </table>`
      : '';

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>StopVolts</title>
</head>
<body style="margin:0;padding:0;background:${c.fundo};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${c.fundo};">
  <tr>
    <td align="center" style="padding:40px 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" border="0" style="width:480px;max-width:100%;">
        <tr>
          <td align="center" style="padding-bottom:28px;">
            ${blocoLogo}
            <span style="color:${c.fraco};font-size:13px;letter-spacing:0.5px;text-transform:uppercase;font-weight:600;">StopVolts</span>
          </td>
        </tr>
        <tr>
          <td style="background:${c.cartao};border-radius:16px;box-shadow:0 1px 2px rgba(0,0,0,0.04),0 4px 12px rgba(0,0,0,0.04);">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <!-- Faixa de destaque: dá identidade ao cartão sem recorrer a ícone -->
              <tr>
                <td bgcolor="${t.cor}" height="4" style="height:4px;line-height:4px;font-size:0;background:${t.cor};border-radius:16px 16px 0 0;">&nbsp;</td>
              </tr>
              <tr>
                <td style="padding:36px 32px;">
                  ${blocoTitulo}
                  ${paragrafos}
                  ${blocoBotao}
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding-top:28px;">
            <p style="color:${c.fraco};font-size:12px;text-align:center;margin:0;">${escaparHtml(rodape).replace(/\n/g, '<br />')}</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

/** Versão em texto puro, para clientes que não exibem HTML. */
export function montarTexto(conteudo: ConteudoEmail) {
  const partes = [conteudo.titulo.trim(), semMarcacao(conteudo.corpo.trim())];
  if (conteudo.botaoUrl.trim() && conteudo.botaoTexto.trim()) {
    partes.push(`${conteudo.botaoTexto.trim()}: ${conteudo.botaoUrl.trim()}`);
  }
  partes.push('—', conteudo.rodape.trim());
  return partes.filter(Boolean).join('\n\n');
}

/** Tira as tags do HTML colado, para gerar a versão em texto puro. */
export function htmlParaTexto(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|h[1-6])>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function buildEmailPayload(params: {
  titulo: string;
  assunto: string;
  modo: ModoConteudo;
  htmlPara: (user: Profile) => string;
  textoPara: (user: Profile) => string;
  destinatarios: Profile[];
  enviadoPor: string;
  agora: Date;
}): EmailPayload {
  const { titulo, assunto, modo, htmlPara, textoPara, destinatarios, enviadoPor, agora } = params;

  return {
    enviado_em: agora.toISOString(),
    enviado_por: enviadoPor,
    campanha: { titulo: titulo.trim(), assunto: assunto.trim(), modo },
    total_destinatarios: destinatarios.length,
    destinatarios: destinatarios.map(user => ({
      id: user.id,
      nome: user.full_name?.trim() || '',
      email: user.email.trim(),
      assunto: aplicarVariaveis(assunto, user).trim(),
      html: htmlPara(user),
      texto: textoPara(user),
    })),
  };
}

export interface EmailResult {
  ok: boolean;
  status?: number;
  detalhe: string;
}

export async function sendEmailBlast(payload: EmailPayload): Promise<EmailResult> {
  try {
    const response = await fetch(EMAIL_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const corpo = await response.text().catch(() => '');
      return {
        ok: false,
        status: response.status,
        detalhe: corpo.slice(0, 300) || `O servidor respondeu ${response.status}.`,
      };
    }

    return { ok: true, status: response.status, detalhe: 'Enviado para a fila de e-mails.' };
  } catch (error) {
    return {
      ok: false,
      detalhe:
        'Não foi possível alcançar o servidor de e-mail. Verifique se o fluxo está ativo. ' +
        (error instanceof Error ? error.message : ''),
    };
  }
}
