import { ChangeEvent, useRef, useState } from 'react';
import {
  MidiaCampanha,
  LinkCampanha,
  MENSAGEM_BASE_INSTRUCAO,
  fileToBase64,
  midiaPreview,
  formatBytes,
} from '../lib/broadcast';
import { useToast } from '../contexts/ToastContext';
import { Image as ImageIcon, Link2, Plus, Trash2, Upload, ShieldAlert } from 'lucide-react';
import Spinner from './ui/Spinner';
import { inputClass, labelClass } from './ui/classes';

/** Limite por imagem. Base64 infla ~33%, então 5 MB viram ~6,7 MB no JSON. */
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ACCEPTED = 'image/jpeg,image/png,image/webp,image/gif';

interface BroadcastComposerProps {
  titulo: string;
  onTituloChange: (value: string) => void;
  mensagem: string;
  onMensagemChange: (value: string) => void;
  midias: MidiaCampanha[];
  onMidiasChange: (value: MidiaCampanha[]) => void;
  links: LinkCampanha[];
  onLinksChange: (value: LinkCampanha[]) => void;
}

function Section({
  icon: Icon,
  title,
  action,
  children,
}: {
  icon: typeof ImageIcon;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-edge rounded-md p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-muted" />
          <h3 className="font-display font-bold text-sm text-fg uppercase tracking-wide">{title}</h3>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

const addButtonClass =
  'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold text-volt hover:bg-volt-soft transition-colors disabled:opacity-50';

export default function BroadcastComposer({
  titulo,
  onTituloChange,
  mensagem,
  onMensagemChange,
  midias,
  onMidiasChange,
  links,
  onLinksChange,
}: BroadcastComposerProps) {
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
      const aceitos: MidiaCampanha[] = [];

      for (const file of files) {
        if (file.size > MAX_FILE_BYTES) {
          toast.error(`"${file.name}" tem ${formatBytes(file.size)} e passa do limite de 5 MB.`);
          continue;
        }
        aceitos.push({
          id: novoId(),
          nome_arquivo: file.name,
          mime_type: file.type || 'image/jpeg',
          tamanho_bytes: file.size,
          base64: await fileToBase64(file),
          legenda: '',
        });
      }

      if (aceitos.length > 0) onMidiasChange([...midias, ...aceitos]);
    } catch (error) {
      console.error('Error reading image:', error);
      toast.error('Não foi possível ler a imagem.');
    } finally {
      setReading(false);
    }
  };

  const pesoMidias = midias.reduce((sum, m) => sum + m.tamanho_bytes, 0);

  return (
    <div className="space-y-4">
      <div>
        <label className={labelClass} htmlFor="campanha-titulo">
          Nome da campanha
        </label>
        <input
          id="campanha-titulo"
          type="text"
          value={titulo}
          onChange={e => onTituloChange(e.target.value)}
          className={inputClass}
          placeholder="Ex: Aviso de bandeira vermelha em setembro"
        />
        <p className="text-xs text-faint mt-1.5">
          Serve para identificar o disparo no n8n. Não é enviado ao cliente.
        </p>
      </div>

      <div>
        <label className={labelClass} htmlFor="campanha-mensagem">
          Mensagem base
        </label>
        <textarea
          id="campanha-mensagem"
          value={mensagem}
          onChange={e => onMensagemChange(e.target.value)}
          rows={7}
          className={`${inputClass} resize-y leading-relaxed`}
          placeholder={
            'Olá! A bandeira tarifária mudou para vermelha neste mês.\n\nIsso significa um acréscimo na sua conta de luz...'
          }
        />
        <div className="flex items-center justify-between gap-3 mt-1.5">
          <p className="text-xs text-faint">Escreva o conteúdo; o n8n gera as variações.</p>
          <span className="text-xs text-faint font-tabular shrink-0">{mensagem.length} caracteres</span>
        </div>
      </div>

      <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-md border border-warning/40 bg-warning-soft">
        <ShieldAlert className="w-4 h-4 text-warning shrink-0 mt-0.5" />
        <p className="text-xs text-muted">
          <strong className="font-semibold text-fg">Este texto é uma base, não o envio final.</strong>{' '}
          {MENSAGEM_BASE_INSTRUCAO.split('. ').slice(1).join('. ')}
        </p>
      </div>

      <Section
        icon={ImageIcon}
        title="Fotos"
        action={
          <div className="flex items-center gap-2">
            {midias.length > 0 && (
              <span className="text-xs text-faint font-tabular">{formatBytes(pesoMidias)}</span>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={reading}
              className={addButtonClass}
            >
              {reading ? <Spinner className="w-3.5 h-3.5" /> : <Upload className="w-3.5 h-3.5" />}
              {reading ? 'Lendo...' : 'Adicionar fotos'}
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
        }
      >
        {midias.length === 0 ? (
          <p className="text-sm text-muted py-2">
            Nenhuma foto. As imagens vão em base64 no próprio JSON — o n8n converte para binário no envio.
          </p>
        ) : (
          <div className="space-y-3">
            {midias.map(midia => (
              <div key={midia.id} className="flex gap-3 items-start">
                <div className="shrink-0 w-14 h-14 rounded-md border border-edge bg-edge/20 overflow-hidden">
                  <img src={midiaPreview(midia)} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm font-medium text-fg truncate">{midia.nome_arquivo}</p>
                    <span className="text-xs text-faint font-tabular shrink-0">
                      {formatBytes(midia.tamanho_bytes)}
                    </span>
                  </div>
                  <input
                    type="text"
                    value={midia.legenda}
                    onChange={e =>
                      onMidiasChange(
                        midias.map(m => (m.id === midia.id ? { ...m, legenda: e.target.value } : m)),
                      )
                    }
                    className={`${inputClass} py-2 text-sm`}
                    placeholder="Legenda (opcional)"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => onMidiasChange(midias.filter(m => m.id !== midia.id))}
                  className="shrink-0 p-2 rounded-md text-danger hover:bg-danger-soft transition-colors"
                  aria-label={`Remover ${midia.nome_arquivo}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section
        icon={Link2}
        title="Links"
        action={
          <button
            type="button"
            onClick={() => onLinksChange([...links, { id: novoId(), titulo: '', url: '' }])}
            className={addButtonClass}
          >
            <Plus className="w-3.5 h-3.5" />
            Adicionar
          </button>
        }
      >
        {links.length === 0 ? (
          <p className="text-sm text-muted py-2">Nenhum link.</p>
        ) : (
          <div className="space-y-3">
            {links.map(link => (
              <div key={link.id} className="flex gap-3 items-start">
                <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-[1fr_1.6fr] gap-2">
                  <input
                    type="text"
                    value={link.titulo}
                    onChange={e =>
                      onLinksChange(links.map(l => (l.id === link.id ? { ...l, titulo: e.target.value } : l)))
                    }
                    className={`${inputClass} py-2 text-sm`}
                    placeholder="Título"
                  />
                  <input
                    type="url"
                    value={link.url}
                    onChange={e =>
                      onLinksChange(links.map(l => (l.id === link.id ? { ...l, url: e.target.value } : l)))
                    }
                    className={`${inputClass} py-2 text-sm`}
                    placeholder="https://..."
                  />
                </div>
                <button
                  type="button"
                  onClick={() => onLinksChange(links.filter(l => l.id !== link.id))}
                  className="shrink-0 p-2 rounded-md text-danger hover:bg-danger-soft transition-colors"
                  aria-label="Remover link"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
