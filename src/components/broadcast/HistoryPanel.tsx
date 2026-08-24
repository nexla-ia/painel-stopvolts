import { useState } from 'react';
import { Informativo, TABELA_AUSENTE } from '../../lib/informativos';
import {
  Users,
  Image as ImageIcon,
  Link2,
  ChevronDown,
  CheckCircle2,
  XCircle,
  Inbox,
  Database,
  RotateCcw,
} from 'lucide-react';
import Badge from '../ui/Badge';
import Skeleton from '../ui/Skeleton';
import { secondaryButton } from './ui';

interface HistoryPanelProps {
  informativos: Informativo[];
  loading: boolean;
  erro: string | null;
  onReenviar: (info: Informativo) => void;
}

function formatarData(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function HistoryPanel({ informativos, loading, erro, onReenviar }: HistoryPanelProps) {
  const [abertoId, setAbertoId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  if (erro === TABELA_AUSENTE) {
    return (
      <div className="text-center py-14 px-6 rounded-lg border-2 border-dashed border-edge">
        <Database className="w-10 h-10 text-faint mx-auto mb-4" />
        <p className="text-lg font-semibold text-fg">O histórico ainda não está ligado</p>
        <p className="text-base text-muted mt-2 max-w-md mx-auto leading-relaxed">
          Falta criar a tabela <span className="font-mono text-sm">informativos</span> no banco. Enquanto
          isso, os envios funcionam normalmente — só não ficam guardados aqui.
        </p>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="text-center py-14 px-6 rounded-lg border-2 border-danger/30 bg-danger-soft">
        <XCircle className="w-10 h-10 text-danger mx-auto mb-4" />
        <p className="text-lg font-semibold text-fg">Não foi possível carregar o histórico</p>
        <p className="text-base text-muted mt-2">{erro}</p>
      </div>
    );
  }

  if (informativos.length === 0) {
    return (
      <div className="text-center py-16 px-6 rounded-lg border-2 border-dashed border-edge">
        <Inbox className="w-10 h-10 text-faint mx-auto mb-4" />
        <p className="text-lg font-semibold text-fg">Nenhum informativo enviado ainda</p>
        <p className="text-base text-muted mt-2">
          Quando você enviar o primeiro, ele aparece aqui com a data e quem recebeu.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {informativos.map(info => {
        const aberto = abertoId === info.id;
        const enviado = info.status === 'enviado';

        return (
          <div key={info.id} className="rounded-lg border-2 border-edge overflow-hidden">
            <button
              type="button"
              onClick={() => setAbertoId(aberto ? null : info.id)}
              className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-edge/20 transition-colors"
            >
              <span
                className={`shrink-0 w-11 h-11 rounded-lg flex items-center justify-center ${
                  enviado ? 'bg-success-soft' : 'bg-danger-soft'
                }`}
              >
                {enviado ? (
                  <CheckCircle2 className="w-6 h-6 text-success" />
                ) : (
                  <XCircle className="w-6 h-6 text-danger" />
                )}
              </span>

              <span className="flex-1 min-w-0">
                <span className="block text-lg font-semibold text-fg truncate">{info.titulo}</span>
                <span className="block text-base text-muted">{formatarData(info.created_at)}</span>
              </span>

              <span className="hidden sm:flex items-center gap-2 shrink-0">
                <Badge variant={enviado ? 'success' : 'danger'}>{enviado ? 'Enviado' : 'Falhou'}</Badge>
                <Badge variant="neutral" icon={<Users className="w-3 h-3" />}>
                  {info.total_contatos}
                </Badge>
              </span>

              <ChevronDown
                className={`w-5 h-5 text-faint shrink-0 transition-transform ${aberto ? 'rotate-180' : ''}`}
              />
            </button>

            {aberto && (
              <div className="border-t border-edge p-5 space-y-4">
                <div>
                  <p className="text-sm uppercase tracking-wider text-faint mb-2">Mensagem enviada</p>
                  <p className="text-base text-fg whitespace-pre-wrap leading-relaxed">{info.mensagem}</p>
                </div>

                {info.midias.length > 0 && (
                  <div>
                    <p className="text-sm uppercase tracking-wider text-faint mb-2">
                      <ImageIcon className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
                      Fotos
                    </p>
                    <p className="text-base text-muted">{info.midias.map(m => m.nome_arquivo).join(' · ')}</p>
                  </div>
                )}

                {info.links.length > 0 && (
                  <div>
                    <p className="text-sm uppercase tracking-wider text-faint mb-2">
                      <Link2 className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
                      Links
                    </p>
                    <div className="space-y-1">
                      {info.links.map((l, i) => (
                        <p key={i} className="text-base break-all">
                          {l.titulo && <span className="text-fg">{l.titulo}: </span>}
                          <span className="text-info">{l.url}</span>
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-sm uppercase tracking-wider text-faint mb-2">
                    Quem recebeu ({info.total_contatos})
                  </p>
                  <p className="text-base text-muted leading-relaxed max-h-32 overflow-y-auto overscroll-contain">
                    {info.contatos.map(c => c.nome).join(' · ')}
                  </p>
                </div>

                {!enviado && info.erro && (
                  <div className="p-4 rounded-lg border-2 border-danger/30 bg-danger-soft">
                    <p className="text-base text-muted">
                      <strong className="font-semibold text-fg">O que deu errado:</strong> {info.erro}
                    </p>
                  </div>
                )}

                <button type="button" onClick={() => onReenviar(info)} className={secondaryButton}>
                  <RotateCcw className="w-5 h-5" />
                  Usar como base para um novo
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
