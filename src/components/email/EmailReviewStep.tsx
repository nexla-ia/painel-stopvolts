import { useState } from 'react';
import { Profile } from '../../lib/supabase';
import { primeiroNome } from '../../lib/email';
import { formatBytes } from '../../lib/broadcast';
import { Users, Mail, CheckCircle2, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';

interface EmailReviewStepProps {
  titulo: string;
  assuntoDe: (user: Profile) => string;
  htmlDe: (user: Profile) => string;
  destinatarios: Profile[];
  /** Tamanho aproximado do envio, em bytes. */
  peso: number;
}

function Resumo({
  icon: Icon,
  valor,
  rotulo,
}: {
  icon: typeof Users;
  valor: string | number;
  rotulo: string;
}) {
  return (
    <div className="flex items-center gap-3.5 p-4 rounded-lg border-2 border-edge">
      <Icon className="w-6 h-6 text-muted shrink-0" />
      <div className="min-w-0">
        <p className="text-2xl font-display font-bold text-fg leading-none font-tabular">{valor}</p>
        <p className="text-sm text-muted mt-1">{rotulo}</p>
      </div>
    </div>
  );
}

export default function EmailReviewStep({
  titulo,
  assuntoDe,
  htmlDe,
  destinatarios,
  peso,
}: EmailReviewStepProps) {
  const [indice, setIndice] = useState(0);

  const pessoa = destinatarios[Math.min(indice, destinatarios.length - 1)] ?? null;
  const pesado = peso > 8 * 1024 * 1024;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_26rem] gap-8 items-start">
      <div className="space-y-6">
        <div className="flex items-start gap-3.5 p-5 rounded-lg border-2 border-success/30 bg-success-soft">
          <CheckCircle2 className="w-6 h-6 text-success shrink-0 mt-0.5" />
          <div>
            <p className="text-lg font-semibold text-fg">Está tudo pronto.</p>
            <p className="text-base text-muted mt-1">
              Cada pessoa recebe um e-mail com o nome dela. Confira ao lado antes de enviar.
            </p>
          </div>
        </div>

        <div>
          <p className="text-sm uppercase tracking-wider text-faint mb-1.5">Assunto interno</p>
          <p className="text-xl font-display font-bold text-fg">{titulo.trim() || 'Sem título'}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Resumo
            icon={Users}
            valor={destinatarios.length}
            rotulo={destinatarios.length === 1 ? 'pessoa recebe' : 'pessoas recebem'}
          />
          <Resumo icon={Mail} valor={destinatarios.length} rotulo="e-mails personalizados" />
          <Resumo icon={CheckCircle2} valor={formatBytes(peso)} rotulo="tamanho do envio" />
        </div>

        <div className="rounded-lg border-2 border-edge overflow-hidden">
          <p className="px-5 py-3 border-b border-edge bg-edge/15 text-base font-semibold text-fg">
            Quem vai receber
          </p>
          <div className="max-h-56 overflow-y-auto overscroll-contain p-5">
            <p className="text-base text-muted leading-relaxed">
              {destinatarios.map(d => d.full_name || d.email).join(' · ')}
            </p>
          </div>
        </div>

        {pesado && (
          <div className="flex items-start gap-3.5 p-4 rounded-lg border-2 border-warning/40 bg-warning-soft">
            <AlertTriangle className="w-6 h-6 text-warning shrink-0 mt-0.5" />
            <p className="text-base text-muted">
              <strong className="font-semibold text-fg">O envio ficou grande ({formatBytes(peso)}).</strong>{' '}
              Um e-mail é montado para cada pessoa, então o tamanho cresce junto com a lista. Se falhar, envie
              em duas partes.
            </p>
          </div>
        )}
      </div>

      <div className="xl:sticky xl:top-2">
        <div className="rounded-xl border-2 border-edge bg-edge/15 p-4">
          {/* Passar pelos destinatários mostra que cada um recebe o próprio nome */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <button
              type="button"
              onClick={() => setIndice(i => Math.max(0, i - 1))}
              disabled={indice === 0}
              className="p-2 rounded-lg text-fg hover:bg-edge/40 disabled:opacity-30 transition-colors"
              aria-label="Pessoa anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <p className="text-xs uppercase tracking-wider text-faint text-center">
              {pessoa ? `Como chega para ${primeiroNome(pessoa.full_name) || pessoa.email}` : 'Sem ninguém'}
              <span className="block text-faint/70 mt-0.5 normal-case tracking-normal">
                {destinatarios.length > 0 && `${indice + 1} de ${destinatarios.length}`}
              </span>
            </p>
            <button
              type="button"
              onClick={() => setIndice(i => Math.min(destinatarios.length - 1, i + 1))}
              disabled={indice >= destinatarios.length - 1}
              className="p-2 rounded-lg text-fg hover:bg-edge/40 disabled:opacity-30 transition-colors"
              aria-label="Próxima pessoa"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {pessoa && (
            <div className="rounded-lg border border-edge bg-panel overflow-hidden">
              <div className="px-4 py-3 border-b border-edge">
                <p className="text-xs text-faint mb-1">Assunto</p>
                <p className="text-base font-semibold text-fg break-words">{assuntoDe(pessoa)}</p>
                <p className="text-sm text-muted mt-2 truncate">{pessoa.email}</p>
              </div>
              <iframe
                title="Prévia do e-mail"
                srcDoc={htmlDe(pessoa)}
                sandbox=""
                className="w-full h-[26rem] bg-white border-0"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
