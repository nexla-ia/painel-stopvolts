/**
 * Regras do WhatsApp que a tela precisa respeitar.
 *
 * Os limites são os da API Cloud da Meta. Passar deles faz a mensagem ser
 * recusada no envio, então é melhor barrar na hora de escrever.
 */

export const WHATSAPP_LIMITS = {
  /** Mensagem só de texto. */
  TEXTO: 4096,
  /** Texto que acompanha uma foto ou vídeo. */
  LEGENDA: 1024,
  /** Imagem: JPEG e PNG. */
  IMAGEM_BYTES: 5 * 1024 * 1024,
  /** Vídeo: MP4 e 3GPP, com vídeo H.264 e áudio AAC. */
  VIDEO_BYTES: 16 * 1024 * 1024,
} as const;

export const MIME_IMAGEM = ['image/jpeg', 'image/png'];
export const MIME_VIDEO = ['video/mp4', 'video/3gpp'];

/** Tipos que o seletor de arquivos oferece. */
export const ACCEPT_MIDIA = [...MIME_IMAGEM, ...MIME_VIDEO].join(',');

export type TipoMidia = 'imagem' | 'video';

export function tipoDoMime(mime: string): TipoMidia | null {
  if (MIME_IMAGEM.includes(mime)) return 'imagem';
  if (MIME_VIDEO.includes(mime)) return 'video';
  return null;
}

export function limiteDoTipo(tipo: TipoMidia) {
  return tipo === 'video' ? WHATSAPP_LIMITS.VIDEO_BYTES : WHATSAPP_LIMITS.IMAGEM_BYTES;
}

/**
 * Limite de caracteres da mensagem.
 *
 * Com foto ou vídeo o texto vira legenda da mídia, e a legenda é bem mais
 * curta que uma mensagem de texto solta.
 */
export const limiteDeTexto = (temMidia: boolean) =>
  temMidia ? WHATSAPP_LIMITS.LEGENDA : WHATSAPP_LIMITS.TEXTO;

/**
 * A formatação segue a mesma convenção do WhatsApp: quem escreve digita os
 * símbolos direto no texto e a prévia mostra o resultado.
 *
 *   *negrito*   _itálico_   ~riscado~   ```monoespaçado```
 *
 * Não há barra de botões de propósito — é assim que funciona no aplicativo que
 * o cliente vai receber, então o que se digita aqui é exatamente o que sai lá.
 */

/** Encontra links no texto — o WhatsApp transforma em link clicável sozinho. */
export const REGEX_LINK = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;

export const contarLinks = (texto: string) => (texto.match(REGEX_LINK) || []).length;
