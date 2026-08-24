import { useRef } from 'react';
import { MidiaCampanha } from '../../lib/broadcast';

/**
 * Guarda a data URI de cada foto entre renderizações.
 *
 * Montar `data:image/jpeg;base64,...` cria uma string do tamanho da imagem. Sem
 * cache isso acontecia a cada tecla digitada na mensagem, porque a prévia
 * renderiza junto — com algumas fotos de alguns MB, a digitação travava.
 * Aqui cada foto é convertida uma vez só, e a entrada é descartada quando a
 * foto sai da lista.
 */
export function useMidiaPreviews(midias: MidiaCampanha[]): Record<string, string> {
  const cache = useRef(new Map<string, string>());

  const idsAtuais = new Set(midias.map(m => m.id));
  for (const id of cache.current.keys()) {
    if (!idsAtuais.has(id)) cache.current.delete(id);
  }

  const previews: Record<string, string> = {};
  for (const midia of midias) {
    let uri = cache.current.get(midia.id);
    if (!uri) {
      uri = `data:${midia.mime_type};base64,${midia.base64}`;
      cache.current.set(midia.id, uri);
    }
    previews[midia.id] = uri;
  }

  return previews;
}
