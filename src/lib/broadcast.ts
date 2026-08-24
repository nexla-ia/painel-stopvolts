import { Profile } from './supabase';

/**
 * Webhook do n8n que recebe a campanha. Pode ser trocado por ambiente sem
 * alterar o código, mas tem um padrão para o painel funcionar sem configuração.
 */
export const BROADCAST_WEBHOOK_URL =
  import.meta.env.VITE_BROADCAST_WEBHOOK_URL ||
  'https://n8n.nexladesenvolvimento.com.br/webhook/envia-info-energia';

/**
 * Instrução que viaja junto com a campanha.
 *
 * A Meta bane números que disparam a mesma mensagem literal para muitos
 * destinatários. Por isso o texto vai marcado como BASE: o n8n deve gerar uma
 * variação por contato em vez de repetir o original.
 */
export const MENSAGEM_BASE_INSTRUCAO =
  'A mensagem_base é um MODELO, não o texto final. Gere uma variação diferente ' +
  'para cada contato mantendo o mesmo sentido e as mesmas informações. Enviar o ' +
  'texto idêntico para todos faz a Meta marcar o número como spam e banir a conta.';

/**
 * Foto da campanha. A imagem não é hospedada em lugar nenhum: viaja em base64
 * dentro do próprio payload, e o n8n converte para binário na hora de enviar.
 */
export interface MidiaCampanha {
  id: string;
  nome_arquivo: string;
  mime_type: string;
  tamanho_bytes: number;
  /** Base64 puro, sem o prefixo `data:`. É o formato que o n8n consome direto. */
  base64: string;
  legenda: string;
}

export interface LinkCampanha {
  id: string;
  titulo: string;
  url: string;
}

export interface ContatoPayload {
  id: string;
  nome: string;
  telefone: string;
  telefone_original: string;
  email: string;
  cidade: string | null;
  estado: string | null;
  plano: string;
}

export interface BroadcastPayload {
  enviado_em: string;
  enviado_por: string;
  campanha: {
    titulo: string;
    mensagem_base: string;
    instrucao_antibanimento: string;
    midias: {
      nome_arquivo: string;
      mime_type: string;
      tamanho_bytes: number;
      legenda: string;
      base64: string;
    }[];
    links: { titulo: string; url: string }[];
  };
  total_contatos: number;
  contatos: ContatoPayload[];
}

/**
 * Normaliza um telefone brasileiro para o formato que o WhatsApp espera:
 * código do país + DDD + número, só dígitos.
 *
 * A base guarda os números como "41999654389" (DDD + 9 dígitos) ou
 * "4133334444" (DDD + 8 dígitos, fixo). Retorna null para o que não dá para
 * aproveitar com segurança — melhor não enviar do que enviar para o número errado.
 */
export function normalizePhone(raw: string | null): string | null {
  if (!raw) return null;

  let digits = raw.replace(/\D/g, '');

  // Remove o zero de operadora ou de DDD ("041999...").
  if (digits.length > 11 && digits.startsWith('0')) {
    digits = digits.replace(/^0+/, '');
  }

  // Já veio com o código do país.
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) {
    return digits;
  }

  // DDD + número, com ou sem o nono dígito.
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }

  return null;
}

/** Contatos sem telefone aproveitável não entram no disparo. */
export const podeReceber = (user: Profile) => normalizePhone(user.phone) !== null;

export function buildBroadcastPayload(params: {
  titulo: string;
  mensagem: string;
  midias: MidiaCampanha[];
  links: LinkCampanha[];
  contatos: Profile[];
  enviadoPor: string;
  agora: Date;
}): BroadcastPayload {
  const { titulo, mensagem, midias, links, contatos, enviadoPor, agora } = params;

  return {
    enviado_em: agora.toISOString(),
    enviado_por: enviadoPor,
    campanha: {
      titulo: titulo.trim(),
      mensagem_base: mensagem.trim(),
      instrucao_antibanimento: MENSAGEM_BASE_INSTRUCAO,
      midias: midias
        .filter(m => m.base64)
        .map(m => ({
          nome_arquivo: m.nome_arquivo,
          mime_type: m.mime_type,
          tamanho_bytes: m.tamanho_bytes,
          legenda: m.legenda.trim(),
          base64: m.base64,
        })),
      links: links.filter(l => l.url.trim()).map(l => ({ titulo: l.titulo.trim(), url: l.url.trim() })),
    },
    total_contatos: contatos.length,
    contatos: contatos.flatMap(user => {
      const telefone = normalizePhone(user.phone);
      if (!telefone) return [];
      return [
        {
          id: user.id,
          nome: user.full_name?.trim() || 'Sem nome',
          telefone,
          telefone_original: user.phone ?? '',
          email: user.email,
          cidade: user.city,
          estado: user.state,
          plano: user.plan,
        },
      ];
    }),
  };
}

/** Lê um arquivo e devolve o base64 puro, sem o prefixo `data:...;base64,`. */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error('Falha ao ler o arquivo.'));
    reader.readAsDataURL(file);
  });
}

/** Data URI para exibir a miniatura sem guardar uma segunda cópia da imagem. */
export const midiaPreview = (midia: MidiaCampanha) => `data:${midia.mime_type};base64,${midia.base64}`;

/**
 * Peso aproximado do POST. Base64 infla o arquivo em cerca de 33%, então uma
 * campanha com muitas fotos pode estourar o limite de corpo do n8n.
 */
export function estimatePayloadBytes(midias: MidiaCampanha[], contatos: number, mensagem: string) {
  const midiaBytes = midias.reduce((sum, m) => sum + m.base64.length, 0);
  const contatoBytes = contatos * 220;
  return midiaBytes + contatoBytes + mensagem.length;
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export interface BroadcastResult {
  ok: boolean;
  status?: number;
  detalhe: string;
}

/** Envia a campanha inteira num único POST. */
export async function sendBroadcast(payload: BroadcastPayload): Promise<BroadcastResult> {
  try {
    const response = await fetch(BROADCAST_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const corpo = await response.text().catch(() => '');
      return {
        ok: false,
        status: response.status,
        detalhe: corpo.slice(0, 300) || `O webhook respondeu ${response.status}.`,
      };
    }

    return { ok: true, status: response.status, detalhe: 'Campanha entregue ao n8n.' };
  } catch (error) {
    // fetch só lança em falha de rede ou bloqueio de CORS — o navegador não
    // deixa distinguir os dois casos, então a mensagem cobre ambos.
    return {
      ok: false,
      detalhe:
        'Não foi possível alcançar o webhook. Verifique se o fluxo do n8n está ativo e se ' +
        'ele responde a requisições do navegador (CORS liberado para este domínio). ' +
        (error instanceof Error ? error.message : ''),
    };
  }
}
