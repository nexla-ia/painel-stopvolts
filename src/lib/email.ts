import { Profile } from './supabase';

/** Webhook do n8n que dispara os e-mails. */
export const EMAIL_WEBHOOK_URL =
  import.meta.env.VITE_EMAIL_WEBHOOK_URL ||
  'https://n8n.nexladesenvolvimento.com.br/webhook/envio-email-stopvolts';

/** Modo de montagem do conteúdo. */
export type ModoConteudo = 'escrever' | 'html';

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

/** Conteúdo editável do e-mail — cada campo vira um bloco do template. */
export interface ConteudoEmail {
  /** Emoji do círculo no topo do cartão. Vazio esconde o círculo. */
  emoji: string;
  titulo: string;
  corpo: string;
  botaoTexto: string;
  botaoUrl: string;
  rodape: string;
  /** URL pública do logo. Vazio cai no bloco com a inicial. */
  logoUrl: string;
}

export const CONTEUDO_PADRAO: ConteudoEmail = {
  emoji: '💡',
  titulo: 'Sua conta de luz pode cair',
  corpo:
    'Olá, {{primeiro_nome}}! A bandeira tarifária mudou neste mês e isso pesa na conta de todo mundo.\n\nNo aplicativo você vê quais aparelhos mais consomem e quanto dá para economizar em cada um.',
  botaoTexto: 'Abrir o StopVolts',
  botaoUrl: '',
  rodape: 'Enviado automaticamente por StopVolts',
  logoUrl: '',
};

/**
 * Monta o HTML final do e-mail.
 *
 * O CSS vai todo embutido porque Gmail e Outlook descartam folhas de estilo.
 * Evita flexbox e grid pelo mesmo motivo — o Outlook desktop renderiza com o
 * motor do Word e ignora os dois. Border-radius e sombra ficam: onde não há
 * suporte, degradam para cantos retos sem quebrar o layout.
 */
export function montarHtml(conteudo: ConteudoEmail) {
  const { emoji, titulo, corpo, botaoTexto, botaoUrl, rodape, logoUrl } = conteudo;

  const paragrafos = corpo
    .split(/\n{2,}/)
    .map(bloco => bloco.trim())
    .filter(Boolean)
    .map(
      (bloco, i, todos) =>
        `<p style="color:#6B7280;font-size:15px;line-height:1.7;text-align:center;margin:0 0 ${
          i === todos.length - 1 ? '28px' : '12px'
        };">${escaparHtml(bloco).replace(/\n/g, '<br />')}</p>`,
    )
    .join('');

  const blocoLogo = logoUrl.trim()
    ? `<img src="${escaparHtml(logoUrl.trim())}" alt="StopVolts" width="48" height="48"
           style="border-radius:10px;display:block;margin:0 auto 12px;border:0;" />`
    : `<div style="width:48px;height:48px;line-height:48px;background:#B45F04;border-radius:10px;margin:0 auto 12px;text-align:center;">
         <span style="color:#ffffff;font-size:24px;font-weight:700;">S</span>
       </div>`;

  // O círculo do emoji usa line-height no lugar de flex, que o Outlook ignora.
  const blocoEmoji = emoji.trim()
    ? `<div style="width:48px;height:48px;line-height:48px;background:#FEF3C7;border-radius:12px;margin:0 auto 20px;text-align:center;">
         <span style="font-size:22px;">${escaparHtml(emoji.trim())}</span>
       </div>`
    : '';

  const blocoTitulo = titulo.trim()
    ? `<h2 style="color:#111827;text-align:center;margin:0 0 16px;font-size:21px;font-weight:700;">${escaparHtml(
        titulo.trim(),
      )}</h2>`
    : '';

  const blocoBotao =
    botaoUrl.trim() && botaoTexto.trim()
      ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;">
           <tr>
             <td align="center" bgcolor="#B45F04" style="border-radius:10px;">
               <a href="${escaparHtml(botaoUrl.trim())}"
                  style="background:#B45F04;color:#FFFFFF;text-decoration:none;font-weight:600;font-size:15px;padding:14px 36px;border-radius:10px;display:inline-block;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
                 ${escaparHtml(botaoTexto.trim())}
               </a>
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
<body style="margin:0;padding:0;background:#F9FAFB;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F9FAFB;">
  <tr>
    <td align="center" style="padding:40px 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" border="0" style="width:480px;max-width:100%;">

        <tr>
          <td align="center" style="padding-bottom:28px;">
            ${blocoLogo}
            <span style="color:#9CA3AF;font-size:13px;letter-spacing:0.5px;text-transform:uppercase;font-weight:600;">StopVolts</span>
          </td>
        </tr>

        <tr>
          <td style="background:#FFFFFF;border-radius:16px;padding:36px 32px;box-shadow:0 1px 2px rgba(0,0,0,0.04),0 4px 12px rgba(0,0,0,0.04);">
            ${blocoEmoji}
            ${blocoTitulo}
            ${paragrafos}
            ${blocoBotao}
          </td>
        </tr>

        <tr>
          <td align="center" style="padding-top:28px;">
            <p style="color:#9CA3AF;font-size:12px;text-align:center;margin:0;">${escaparHtml(rodape).replace(
              /\n/g,
              '<br />',
            )}</p>
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
  const partes = [conteudo.titulo.trim(), conteudo.corpo.trim()];
  if (conteudo.botaoUrl.trim()) {
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
