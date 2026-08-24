import { MidiaCampanha, LinkCampanha } from '../../lib/broadcast';
import { Image as ImageIcon } from 'lucide-react';
import { useMidiaPreviews } from './useMidiaPreviews';

interface MessagePreviewProps {
  mensagem: string;
  midias: MidiaCampanha[];
  links: LinkCampanha[];
  nomeExemplo?: string;
}

/**
 * Prévia no formato de uma conversa, para quem escreve conseguir julgar o
 * resultado sem precisar imaginar. É uma aproximação: o texto final sai com
 * variações geradas pelo n8n, e isso está dito na tela.
 */
export default function MessagePreview({
  mensagem,
  midias,
  links,
  nomeExemplo = 'Maria',
}: MessagePreviewProps) {
  const previews = useMidiaPreviews(midias);
  const linksValidos = links.filter(l => l.url.trim());
  const vazio = !mensagem.trim() && midias.length === 0 && linksValidos.length === 0;

  return (
    <div className="rounded-xl border-2 border-edge bg-edge/15 p-4">
      <p className="text-xs uppercase tracking-wider text-faint mb-3 text-center">
        Assim vai aparecer no celular de {nomeExemplo}
      </p>

      <div className="mx-auto max-w-sm">
        {vazio ? (
          <p className="text-center text-muted py-10 text-base">
            Escreva a mensagem ao lado para ver a prévia aqui.
          </p>
        ) : (
          <div className="rounded-2xl rounded-tl-sm bg-panel border border-edge shadow-sm overflow-hidden">
            {midias.length > 0 && (
              <div className={midias.length > 1 ? 'grid grid-cols-2 gap-0.5' : ''}>
                {midias.slice(0, 4).map(midia => (
                  <img
                    key={midia.id}
                    src={previews[midia.id]}
                    alt={midia.legenda || midia.nome_arquivo}
                    className="w-full aspect-video object-cover"
                  />
                ))}
              </div>
            )}

            <div className="p-3.5 space-y-2.5">
              {mensagem.trim() && (
                <p className="text-[15px] leading-relaxed text-fg whitespace-pre-wrap break-words">
                  {mensagem}
                </p>
              )}

              {midias.some(m => m.legenda.trim()) && (
                <p className="text-[13px] text-muted italic">
                  {midias
                    .filter(m => m.legenda.trim())
                    .map(m => m.legenda)
                    .join(' · ')}
                </p>
              )}

              {linksValidos.length > 0 && (
                <div className="space-y-1 pt-1">
                  {linksValidos.map(link => (
                    <p key={link.id} className="text-[15px] leading-snug break-all">
                      {link.titulo.trim() && <span className="text-fg">{link.titulo.trim()}: </span>}
                      <span className="text-info underline">{link.url.trim()}</span>
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {midias.length > 4 && (
          <p className="text-center text-xs text-faint mt-2">
            + {midias.length - 4} foto(s) além das mostradas aqui
          </p>
        )}
      </div>

      {!vazio && (
        <div className="flex items-center justify-center gap-1.5 mt-3 text-xs text-faint">
          <ImageIcon className="w-3.5 h-3.5" />
          Cada pessoa recebe uma versão com pequenas diferenças no texto
        </div>
      )}
    </div>
  );
}
