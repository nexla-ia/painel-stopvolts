import { ChangeEvent, useRef, useState } from 'react';
import { MidiaCampanha, LinkCampanha, fileToBase64, midiaPreview, formatBytes } from '../../lib/broadcast';
import { useToast } from '../../contexts/ToastContext';
import { Image as ImageIcon, Link2, Plus, Trash2, Camera, Lightbulb } from 'lucide-react';
import Spinner from '../ui/Spinner';
import MessagePreview from './MessagePreview';
import { bigInput, bigLabel, helpText, chipButton } from './ui';

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ACCEPTED = 'image/jpeg,image/png,image/webp,image/gif';

interface ComposeStepProps {
  titulo: string;
  onTituloChange: (v: string) => void;
  mensagem: string;
  onMensagemChange: (v: string) => void;
  midias: MidiaCampanha[];
  onMidiasChange: (v: MidiaCampanha[]) => void;
  links: LinkCampanha[];
  onLinksChange: (v: LinkCampanha[]) => void;
}

export default function ComposeStep({
  titulo,
  onTituloChange,
  mensagem,
  onMensagemChange,
  midias,
  onMidiasChange,
  links,
  onLinksChange,
}: ComposeStepProps) {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [reading, setReading] = useState(false);

  const novoId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const handleFiles = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length === 0) return;

    setReading(true);
    try {
      const aceitas: MidiaCampanha[] = [];
      for (const file of files) {
        if (file.size > MAX_FILE_BYTES) {
          toast.error(`A foto "${file.name}" é muito grande (${formatBytes(file.size)}). O limite é 5 MB.`);
          continue;
        }
        aceitas.push({
          id: novoId(),
          nome_arquivo: file.name,
          mime_type: file.type || 'image/jpeg',
          tamanho_bytes: file.size,
          base64: await fileToBase64(file),
          legenda: '',
        });
      }
      if (aceitas.length > 0) onMidiasChange([...midias, ...aceitas]);
    } catch (error) {
      console.error('Error reading image:', error);
      toast.error('Não foi possível abrir essa foto. Tente outra.');
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
            className={`${bigInput} resize-y leading-relaxed`}
            placeholder={
              'Olá! A bandeira da conta de luz mudou para vermelha neste mês.\n\nIsso quer dizer que a energia ficou mais cara...'
            }
          />
          <div className="flex flex-wrap items-center justify-between gap-2 mt-2">
            <p className="text-sm text-muted">Escreva como se estivesse falando com uma pessoa só.</p>
            <span className="text-sm text-faint font-tabular">{mensagem.length} letras</span>
          </div>
        </div>

        <div className="flex items-start gap-3 p-4 rounded-lg border-2 border-info/30 bg-info-soft">
          <Lightbulb className="w-5 h-5 text-info shrink-0 mt-0.5" />
          <p className="text-base text-muted leading-relaxed">
            <strong className="font-semibold text-fg">O texto não sai igual para todo mundo.</strong> O
            sistema muda algumas palavras em cada envio, mantendo o mesmo significado. Isso evita que o
            WhatsApp entenda como propaganda em massa e bloqueie o número.
          </p>
        </div>

        <div className="rounded-lg border-2 border-edge p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h3 className="flex items-center gap-2.5 text-base font-semibold text-fg">
              <ImageIcon className="w-5 h-5 text-muted" />
              Fotos
              <span className="text-muted font-normal">(opcional)</span>
            </h3>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={reading}
              className={chipButton}
            >
              {reading ? <Spinner className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
              {reading ? 'Abrindo...' : 'Escolher fotos'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED}
              multiple
              onChange={handleFiles}
              className="hidden"
            />
          </div>

          {midias.length === 0 ? (
            <p className="text-base text-muted">Nenhuma foto escolhida. Pode enviar só com texto.</p>
          ) : (
            <div className="space-y-3">
              {midias.map(midia => (
                <div key={midia.id} className="flex gap-4 items-center">
                  <img
                    src={midiaPreview(midia)}
                    alt=""
                    className="shrink-0 w-16 h-16 rounded-lg border border-edge object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      value={midia.legenda}
                      onChange={e =>
                        onMidiasChange(
                          midias.map(m => (m.id === midia.id ? { ...m, legenda: e.target.value } : m)),
                        )
                      }
                      className={`${bigInput} py-2.5 text-base`}
                      placeholder="Escrever algo sobre a foto (opcional)"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => onMidiasChange(midias.filter(m => m.id !== midia.id))}
                    className="shrink-0 p-3 rounded-lg text-danger hover:bg-danger-soft transition-colors"
                    aria-label={`Tirar a foto ${midia.nome_arquivo}`}
                    title="Tirar esta foto"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-lg border-2 border-edge p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h3 className="flex items-center gap-2.5 text-base font-semibold text-fg">
              <Link2 className="w-5 h-5 text-muted" />
              Links
              <span className="text-muted font-normal">(opcional)</span>
            </h3>
            <button
              type="button"
              onClick={() => onLinksChange([...links, { id: novoId(), titulo: '', url: '' }])}
              className={chipButton}
            >
              <Plus className="w-4 h-4" />
              Adicionar link
            </button>
          </div>

          {links.length === 0 ? (
            <p className="text-base text-muted">Nenhum link.</p>
          ) : (
            <div className="space-y-3">
              {links.map(link => (
                <div key={link.id} className="flex gap-3 items-center">
                  <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-[1fr_1.5fr] gap-2">
                    <input
                      type="text"
                      value={link.titulo}
                      onChange={e =>
                        onLinksChange(
                          links.map(l => (l.id === link.id ? { ...l, titulo: e.target.value } : l)),
                        )
                      }
                      className={`${bigInput} py-2.5 text-base`}
                      placeholder="Nome do link"
                    />
                    <input
                      type="url"
                      value={link.url}
                      onChange={e =>
                        onLinksChange(links.map(l => (l.id === link.id ? { ...l, url: e.target.value } : l)))
                      }
                      className={`${bigInput} py-2.5 text-base`}
                      placeholder="https://..."
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => onLinksChange(links.filter(l => l.id !== link.id))}
                    className="shrink-0 p-3 rounded-lg text-danger hover:bg-danger-soft transition-colors"
                    aria-label="Tirar este link"
                    title="Tirar este link"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="xl:sticky xl:top-2">
        <MessagePreview mensagem={mensagem} midias={midias} links={links} />
      </div>
    </div>
  );
}
