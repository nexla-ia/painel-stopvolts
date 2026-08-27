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
 * Logo do aplicativo, servido pela loja.
 *
 * Fixo de propósito: e-mail exige imagem hospedada em endereço público e
 * estável, e este já é o ícone que o cliente vê no celular.
 */
export const LOGO_URL =
  'https://play-lh.googleusercontent.com/YtWPrwEgbMro6zz1En934OkL_Q12spPBEADv0a99f8H9PIOsSxBM2j7ysXStLJodq3ucpsAq9gN5Sosxt_nH8wk=w480-h960';

/**
 * Tons de destaque. O verde é o padrão do produto; os demais existem para um
 * aviso de cobrança ou de urgência não precisar sair do mesmo desenho.
 * As cores seguem a mesma família da referência (nível 500 e 100).
 */
export const TONS = {
  verde: { cor: '#22C55E', suave: '#DCFCE7', sombra: 'rgba(34,197,94,0.3)', rotulo: 'Verde' },
  esmeralda: { cor: '#10B981', suave: '#D1FAE5', sombra: 'rgba(16,185,129,0.3)', rotulo: 'Esmeralda' },
  ciano: { cor: '#06B6D4', suave: '#CFFAFE', sombra: 'rgba(6,182,212,0.3)', rotulo: 'Ciano' },
  azul: { cor: '#3B82F6', suave: '#DBEAFE', sombra: 'rgba(59,130,246,0.3)', rotulo: 'Azul' },
  indigo: { cor: '#6366F1', suave: '#E0E7FF', sombra: 'rgba(99,102,241,0.3)', rotulo: 'Índigo' },
  roxo: { cor: '#8B5CF6', suave: '#EDE9FE', sombra: 'rgba(139,92,246,0.3)', rotulo: 'Roxo' },
  rosa: { cor: '#EC4899', suave: '#FCE7F3', sombra: 'rgba(236,72,153,0.3)', rotulo: 'Rosa' },
  vermelho: { cor: '#EF4444', suave: '#FEE2E2', sombra: 'rgba(239,68,68,0.3)', rotulo: 'Vermelho' },
  laranja: { cor: '#F97316', suave: '#FFEDD5', sombra: 'rgba(249,115,22,0.3)', rotulo: 'Laranja' },
  ambar: { cor: '#F59E0B', suave: '#FEF3C7', sombra: 'rgba(245,158,11,0.3)', rotulo: 'Âmbar' },
  grafite: { cor: '#475569', suave: '#F1F5F9', sombra: 'rgba(71,85,105,0.3)', rotulo: 'Grafite' },
} as const;

export type TomEmail = keyof typeof TONS;

/**
 * Corpo do e-mail.
 *
 * Sem título: o assunto já é o título e aparece na caixa de entrada. Repetir
 * o mesmo texto dentro do cartão só ocuparia espaço dizendo o que a pessoa
 * acabou de ler para abrir a mensagem.
 */
export interface ConteudoEmail {
  tom: TomEmail;
  corpo: string;
  botaoTexto: string;
  botaoUrl: string;
  rodape: string;
}

export const ASSUNTO_PADRAO = '';

/**
 * Começa em branco de propósito.
 *
 * Texto de exemplo já preenchido é o tipo de coisa que acaba sendo enviada
 * sem querer para a base inteira. Só o rodapé vem pronto, por ser institucional
 * e igual em todo envio.
 */
export const CONTEUDO_PADRAO: ConteudoEmail = {
  tom: 'verde',
  corpo: '',
  botaoTexto: '',
  botaoUrl: '',
  rodape: 'Enviado automaticamente por StopVolts',
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

/**
 * Troca as variáveis pelos dados da pessoa.
 *
 * Aceita `{{primeiro_nome}}`, `{{nome}}`, `{{email}}`, `{{cidade}}` e
 * `{{estado}}`, no assunto, no texto e no HTML colado.
 */
export function aplicarVariaveis(texto: string, user: Profile) {
  return texto
    .replace(/\{\{\s*nome\s*\}\}/gi, user.full_name?.trim() || '')
    .replace(/\{\{\s*primeiro_nome\s*\}\}/gi, primeiroNome(user.full_name))
    .replace(/\{\{\s*email\s*\}\}/gi, user.email)
    .replace(/\{\{\s*cidade\s*\}\}/gi, user.city || '')
    .replace(/\{\{\s*estado\s*\}\}/gi, user.state || '');
}

/** Valores usados na prévia quando a conta de exemplo não tem o dado. */
const EXEMPLO = { nome: 'Maria Silva Santos', cidade: 'Curitiba', estado: 'PR' };

/**
 * Versão da substituição para a prévia.
 *
 * Campo vazio vira dado de exemplo em vez de buraco. Sem isso, uma conta sem
 * cidade cadastrada produzia "localizado em /." na tela, e quem estava
 * escrevendo não conseguia julgar como a frase fica para quem tem o dado.
 * O envio de verdade continua usando `aplicarVariaveis`.
 */
export function aplicarVariaveisPrevia(texto: string, user: Profile | null) {
  const nome = user?.full_name?.trim() || EXEMPLO.nome;
  return texto
    .replace(/\{\{\s*nome\s*\}\}/gi, nome)
    .replace(/\{\{\s*primeiro_nome\s*\}\}/gi, primeiroNome(nome))
    .replace(/\{\{\s*email\s*\}\}/gi, user?.email || 'maria@exemplo.com')
    .replace(/\{\{\s*cidade\s*\}\}/gi, user?.city || EXEMPLO.cidade)
    .replace(/\{\{\s*estado\s*\}\}/gi, user?.state || EXEMPLO.estado);
}

/** Variáveis usadas no texto que ficariam vazias para esta pessoa. */
export function variaveisVazias(texto: string, user: Profile): string[] {
  const faltando: string[] = [];
  const usa = (chave: string) => new RegExp(`\\{\\{\\s*${chave}\\s*\\}\\}`, 'i').test(texto);

  if ((usa('nome') || usa('primeiro_nome')) && !user.full_name?.trim()) faltando.push('nome');
  if (usa('cidade') && !user.city) faltando.push('cidade');
  if (usa('estado') && !user.state) faltando.push('estado');

  return faltando;
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
  const { tom, corpo, botaoTexto, botaoUrl, rodape } = conteudo;
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

  const blocoLogo = `<img src="${LOGO_URL}" alt="StopVolts" width="48" height="48" style="width:48px;height:48px;border-radius:10px;display:block;margin:0 auto 12px;border:0;" />`;

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
  const partes = [semMarcacao(conteudo.corpo.trim())];
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
