import { MidiaCampanha } from '../../lib/broadcast';
import { Check } from 'lucide-react';
import { useMidiaPreviews } from './useMidiaPreviews';
import WhatsAppText from './WhatsAppText';

interface MessagePreviewProps {
  mensagem: string;
  midias: MidiaCampanha[];
  nomeExemplo?: string;
}

/**
 * Prévia no formato de uma conversa do WhatsApp, com a formatação já aplicada.
 *
 * É uma aproximação: o texto final sai com pequenas variações geradas pelo n8n,
 * e isso está dito abaixo do balão.
 */
export default function MessagePreview({ mensagem, midias, nomeExemplo = 'Maria' }: MessagePreviewProps) {
  const previews = useMidiaPreviews(midias);
  const vazio = !mensagem.trim() && midias.length === 0;
  const primeira = midias[0];
  const restantes = midias.slice(1);

  const horario = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="rounded-xl border-2 border-edge bg-edge/15 p-4">
      <p className="text-xs uppercase tracking-wider text-faint mb-3 text-center">
        Assim vai aparecer no celular de {nomeExemplo}
      </p>

      <div className="mx-auto max-w-sm space-y-2">
        {vazio ? (
          <p className="text-center text-muted py-10 text-base">
            Escreva a mensagem ao lado para ver a prévia aqui.
          </p>
        ) : (
          <>
            {/* Primeiro balão: a mídia com o texto como legenda, ou só o texto. */}
            <div className="rounded-2xl rounded-tl-sm bg-panel border border-edge shadow-sm overflow-hidden">
              {primeira &&
                (primeira.tipo === 'imagem' ? (
                  <img src={previews[primeira.id]} alt="" className="w-full max-h-64 object-cover" />
                ) : (
                  <video
                    src={previews[primeira.id]}
                    className="w-full max-h-64 object-cover bg-black"
                    controls
                    preload="metadata"
                  />
                ))}

              {mensagem.trim() && (
                <div className="px-3.5 pt-3 pb-1.5">
                  <WhatsAppText texto={mensagem} className="text-[15px] leading-relaxed text-fg" />
                </div>
              )}

              <div className="flex items-center justify-end gap-1 px-3.5 pb-2 pt-1">
                <span className="text-[11px] text-faint font-tabular">{horario}</span>
                <Check className="w-3.5 h-3.5 text-info" />
              </div>
            </div>

            {/* Cada arquivo extra chega como uma mensagem separada. */}
            {restantes.map(midia => (
              <div
                key={midia.id}
                className="rounded-2xl rounded-tl-sm bg-panel border border-edge shadow-sm overflow-hidden"
              >
                {midia.tipo === 'imagem' ? (
                  <img src={previews[midia.id]} alt="" className="w-full max-h-56 object-cover" />
                ) : (
                  <video
                    src={previews[midia.id]}
                    className="w-full max-h-56 object-cover bg-black"
                    controls
                    preload="metadata"
                  />
                )}
                <div className="flex items-center justify-end gap-1 px-3.5 py-2">
                  <span className="text-[11px] text-faint font-tabular">{horario}</span>
                  <Check className="w-3.5 h-3.5 text-info" />
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {!vazio && (
        <p className="text-center text-xs text-faint mt-3 leading-relaxed">
          Cada pessoa recebe uma versão com pequenas diferenças no texto
          {midias.length > 1 && ` · ${midias.length} arquivos viram ${midias.length} mensagens`}
        </p>
      )}
    </div>
  );
}
