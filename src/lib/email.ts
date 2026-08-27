import { Profile } from './supabase';

/** Webhook do n8n que dispara os e-mails. */
export const EMAIL_WEBHOOK_URL =
  import.meta.env.VITE_EMAIL_WEBHOOK_URL ||
  'https://n8n.nexladesenvolvimento.com.br/webhook/envio-email-stopvolts';

/** Modo de montagem do conteúdo. */
export type ModoConteudo = 'escrever' | 'html';

export interface BotaoEmail {
  texto: string;
  url: string;
}

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

/** Variáveis que o texto e o HTML colado podem usar. */
export const VARIAVEIS = [
  { chave: '{{nome}}', descricao: 'Nome completo' },
  { chave: '{{primeiro_nome}}', descricao: 'Só o primeiro nome' },
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
 * Monta o HTML do e-mail a partir do texto escrito na tela.
 *
 * Usa tabelas e CSS embutido de propósito: Outlook e Gmail ignoram folhas de
 * estilo e boa parte do CSS moderno, então layout de e-mail continua sendo
 * feito assim. A largura de 600px é o padrão que cabe em todos os clientes.
 */
export function montarHtml(params: {
  saudacao: string;
  corpo: string;
  botao: BotaoEmail | null;
  assinatura: string;
}) {
  const { saudacao, corpo, botao, assinatura } = params;

  const paragrafos = corpo
    .split(/\n{2,}/)
    .map(bloco => bloco.trim())
    .filter(Boolean)
    .map(
      bloco =>
        `<p style="margin:0 0 16px;font-size:16px;line-height:1.65;color:#2b2b2b;">${escaparHtml(
          bloco,
        ).replace(/\n/g, '<br />')}</p>`,
    )
    .join('');

  const blocoBotao =
    botao && botao.url.trim() && botao.texto.trim()
      ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;">
          <tr>
            <td align="center" bgcolor="#B45309" style="border-radius:6px;">
              <a href="${escaparHtml(botao.url.trim())}"
                 style="display:inline-block;padding:14px 28px;font-family:Helvetica,Arial,sans-serif;font-size:16px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:6px;">
                ${escaparHtml(botao.texto.trim())}
              </a>
            </td>
          </tr>
        </table>`
      : '';

  const blocoSaudacao = saudacao.trim()
    ? `<p style="margin:0 0 16px;font-size:18px;line-height:1.5;color:#1a1a1a;font-weight:bold;">${escaparHtml(
        saudacao.trim(),
      )}</p>`
    : '';

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>StopVolts</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f2;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f2;">
  <tr>
    <td align="center" style="padding:24px 12px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:100%;background-color:#ffffff;border-radius:8px;overflow:hidden;font-family:Helvetica,Arial,sans-serif;">
        <tr>
          <td style="background-color:#B45309;padding:20px 32px;">
            <span style="font-size:22px;font-weight:bold;color:#ffffff;letter-spacing:-0.5px;">StopVolts</span>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            ${blocoSaudacao}
            ${paragrafos}
            ${blocoBotao}
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;background-color:#faf9f7;border-top:1px solid #e8e6e1;">
            <p style="margin:0;font-size:13px;line-height:1.6;color:#7a756c;">${escaparHtml(
              assinatura,
            ).replace(/\n/g, '<br />')}</p>
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
export function montarTexto(params: {
  saudacao: string;
  corpo: string;
  botao: BotaoEmail | null;
  assinatura: string;
}) {
  const partes = [params.saudacao.trim(), params.corpo.trim()];
  if (params.botao?.url.trim()) {
    partes.push(`${params.botao.texto.trim()}: ${params.botao.url.trim()}`);
  }
  partes.push('—', params.assinatura.trim());
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
  /** Função que devolve o HTML já personalizado de um destinatário. */
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
    campanha: {
      titulo: titulo.trim(),
      assunto: assunto.trim(),
      modo,
    },
    total_destinatarios: destinatarios.length,
    destinatarios: destinatarios.map(user => ({
      id: user.id,
      nome: user.full_name?.trim() || '',
      email: user.email.trim(),
      // O assunto também aceita variáveis: "Maria, sua conta subiu?"
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
