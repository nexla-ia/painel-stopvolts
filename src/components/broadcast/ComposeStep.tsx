import { ChangeEvent, useRef, useState } from 'react';
import { MidiaCampanha, fileToBase64, formatBytes } from '../../lib/broadcast';
import { ACCEPT_MIDIA, limiteDeTexto, limiteDoTipo, tipoDoMime } from '../../lib/whatsapp';
import { criarMiniatura } from '../../lib/miniatura';
import { useMidiaPreviews } from './useMidiaPreviews';
import { useToast } from '../../contexts/ToastContext';
import { Trash2, Camera, Video, Image } from 'lucide-react';
import Spinner from '../ui/Spinner';
import MessagePreview from './MessagePreview';
import { bigInput, bigLabel, helpText, chipButton } from './ui';

/**
 * Teto do conjunto de mídias. Tudo vai em base64 dentro do JSON, e base64 infla
 * o arquivo em cerca de um terço. Barrar aqui, com mensagem clara, é melhor do
 * que deixar o envio falhar depois sem explicação.
 */
const MAX_TOTAL_BYTES = 20 * 1024 * 1024;

interface ComposeStepProps {
  titulo: string;
  onTituloChange: (v: string) => void;
  mensagem: string;
  onMensagemChange: (v: string) => void;
  midias: MidiaCampanha[];
  onMidiasChange: (v: MidiaCampanha[]) => void;
}

export default function ComposeStep({
  titulo,
  onTituloChange,
  mensagem,
  onMensagemChange,
  midias,
  onMidiasChange,
}: ComposeStepProps) {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [reading, setReading] = useState(false);
  const previews = useMidiaPreviews(midias);

  const novoId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const limite = limiteDeTexto(midias.length > 0);
  const excedeu = mensagem.length > limite;

  const handleFiles = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length === 0) return;

    setReading(true);
    try {
      const aceitas: MidiaCampanha[] = [];
      let acumulado = midias.reduce((sum, m) => sum + m.tamanho_bytes, 0);

      for (const file of files) {
        const tipo = tipoDoMime(file.type);
        if (!tipo) {
          toast.error(`"${file.name}" não é um formato que o WhatsApp aceita. Use JPG, PNG ou MP4.`);
          continue;
        }

        const limiteArquivo = limiteDoTipo(tipo);
        if (file.size > limiteArquivo) {
          toast.error(
            `"${file.name}" tem ${formatBytes(file.size)}. O WhatsApp aceita até ${formatBytes(limiteArquivo)} para ${tipo === 'video' ? 'vídeo' : 'foto'}.`,
          );
          continue;
        }

        if (acumulado + file.size > MAX_TOTAL_BYTES) {
          toast.error(
            `Não dá para incluir "${file.name}": os arquivos juntos passariam de ${formatBytes(MAX_TOTAL_BYTES)}.`,
          );
          continue;
        }

        acumulado += file.size;
        aceitas.push({
          id: novoId(),
          tipo,
          nome_arquivo: file.name,
          mime_type: file.type,
          tamanho_bytes: file.size,
          base64: await fileToBase64(file),
          miniatura: await criarMiniatura(file, tipo),
        });
      }

      if (aceitas.length > 0) onMidiasChange([...midias, ...aceitas]);
    } catch (error) {
      console.error('Error reading media:', error);
      toast.error('Não foi possível abrir esse arquivo. Tente outro.');
    } finally {
      setReading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_24rem] gap-8 items-start">
      <div className="space-y-7">
        <div>
          <label className={bigLabel} htmlFor="info-titulo">
            Que assunto é este informativo?
          </label>
          <input
            id="info-titulo"
            type="text"
            value={titulo}
            onChange={e => onTituloChange(e.target.value)}
            className={bigInput}
            placeholder="Ex: Aviso de bandeira vermelha"
          />
          <p className={helpText}>
            Só você vê este nome. Ele serve para encontrar o informativo depois, na lista de enviados.
          </p>
        </div>

        <div>
          <label className={bigLabel} htmlFor="info-mensagem">
            Escreva a mensagem
          </label>

          <textarea
            id="info-mensagem"
            value={mensagem}
            onChange={e => onMensagemChange(e.target.value)}
            rows={9}
            className={`${bigInput} resize-y leading-relaxed ${excedeu ? 'border-danger' : ''}`}
            placeholder={
              'Olá! A bandeira da conta de luz mudou para *vermelha* neste mês.\n\nIsso quer dizer que a energia ficou mais cara...'
            }
          />

          <div className="flex justify-end mt-2">
            <span className={`text-sm font-tabular ${excedeu ? 'text-danger font-semibold' : 'text-faint'}`}>
              {mensagem.length} de {limite} letras
            </span>
          </div>

          {excedeu && (
            <p className="text-base text-danger mt-2">
              A mensagem passou do limite do WhatsApp
              {midias.length > 0 && ' para texto que acompanha foto ou vídeo'}. Encurte para conseguir enviar.
            </p>
          )}
        </div>

        <div className="rounded-lg border-2 border-edge p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h3 className="flex items-center gap-2.5 text-base font-semibold text-fg">
              <Camera className="w-5 h-5 text-muted" />
              Foto ou vídeo
              <span className="text-muted font-normal">(opcional)</span>
            </h3>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={reading}
              className={chipButton}
            >
              {reading ? <Spinner className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
              {reading ? 'Abrindo...' : 'Escolher arquivo'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPT_MIDIA}
              multiple
              onChange={handleFiles}
              className="hidden"
            />
          </div>

          {midias.length === 0 ? (
            <p className="text-base text-muted">
              Nada escolhido. Pode enviar só com texto. Aceita foto JPG ou PNG (até 5 MB) e vídeo MP4 (até 16
              MB).
            </p>
          ) : (
            <div className="space-y-3">
              {midias.map(midia => (
                <div key={midia.id} className="flex gap-4 items-center">
                  <div className="shrink-0 w-16 h-16 rounded-lg border border-edge overflow-hidden bg-edge/30 relative">
                    {midia.tipo === 'imagem' ? (
                      <img src={previews[midia.id]} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <video src={previews[midia.id]} className="w-full h-full object-cover" muted />
                    )}
                    {midia.tipo === 'video' && (
                      <span className="absolute inset-0 flex items-center justify-center bg-black/35">
                        <Video className="w-6 h-6 text-white" />
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-base font-medium text-fg truncate">{midia.nome_arquivo}</p>
                    <p className="text-sm text-muted flex items-center gap-1.5 mt-0.5">
                      {midia.tipo === 'video' ? <Video className="w-4 h-4" /> : <Image className="w-4 h-4" />}
                      {midia.tipo === 'video' ? 'Vídeo' : 'Foto'} · {formatBytes(midia.tamanho_bytes)}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => onMidiasChange(midias.filter(m => m.id !== midia.id))}
                    className="shrink-0 p-3 rounded-lg text-danger hover:bg-danger-soft transition-colors"
                    aria-label={`Tirar ${midia.nome_arquivo}`}
                    title="Tirar este arquivo"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}

              <p className="text-sm text-muted pt-1">
                A mensagem escrita acima vai junto, como legenda do primeiro arquivo.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="xl:sticky xl:top-2">
        <MessagePreview mensagem={mensagem} midias={midias} />
      </div>
    </div>
  );
}
