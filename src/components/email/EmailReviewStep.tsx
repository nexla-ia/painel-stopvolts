import { useState } from 'react';
import { Profile } from '../../lib/supabase';
import { primeiroNome } from '../../lib/email';
import { formatBytes } from '../../lib/broadcast';
import { Users, Mail, CheckCircle2, AlertTriangle, ChevronLeft, ChevronRight, Search } from 'lucide-react';

interface EmailReviewStepProps {
  assunto: string;
  assuntoDe: (user: Profile) => string;
  htmlDe: (user: Profile) => string;
  destinatarios: Profile[];
  /** Tamanho aproximado do envio, em bytes. */
  peso: number;
}

export default function EmailReviewStep({
  assunto,
  assuntoDe,
  htmlDe,
  destinatarios,
  peso,
}: EmailReviewStepProps) {
  const [indice, setIndice] = useState(0);
  const [busca, setBusca] = useState('');

  const posicao = Math.min(indice, Math.max(destinatarios.length - 1, 0));
  const pessoa = destinatarios[posicao] ?? null;
  const pesado = peso > 8 * 1024 * 1024;

  const termo = busca.trim().toLowerCase();
  const listados = termo
    ? destinatarios.filter(d =>
        [d.full_name, d.email].filter(Boolean).join(' ').toLowerCase().includes(termo),
      )
    : destinatarios;

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3.5 p-5 rounded-lg border-2 border-success/30 bg-success-soft">
        <CheckCircle2 className="w-6 h-6 text-success shrink-0 mt-0.5" />
        <div>
          <p className="text-lg font-semibold text-fg">Está tudo pronto.</p>
          <p className="text-base text-muted mt-1">
            Confira o e-mail abaixo. Use as setas para ver como chega para cada pessoa.
          </p>
        </div>
      </div>

      {/* Prévia em largura cheia: 480px do e-mail + margem não cabem numa coluna estreita */}
      <div className="rounded-xl border-2 border-edge overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 bg-edge/20 border-b border-edge">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wider text-faint">Assunto</p>
            <p className="text-base font-semibold text-fg truncate">
              {pessoa ? assuntoDe(pessoa) : assunto || 'Sem assunto'}
            </p>
          </div>

          {destinatarios.length > 0 && (
            <div className="flex items-center gap-2 shrink-0">
              <div className="text-right">
                <p className="text-sm font-medium text-fg truncate max-w-[14rem]">
                  {pessoa?.full_name || 'Sem nome'}
                </p>
                <p className="text-xs text-muted truncate max-w-[14rem]">{pessoa?.email}</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setIndice(i => Math.max(0, i - 1))}
                  disabled={posicao === 0}
                  className="p-2 rounded-lg text-fg hover:bg-edge/50 disabled:opacity-30 transition-colors"
                  aria-label="Pessoa anterior"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-sm text-muted font-tabular tabular-nums w-14 text-center">
                  {posicao + 1} / {destinatarios.length}
                </span>
                <button
                  type="button"
                  onClick={() => setIndice(i => Math.min(destinatarios.length - 1, i + 1))}
                  disabled={posicao >= destinatarios.length - 1}
                  className="p-2 rounded-lg text-fg hover:bg-edge/50 disabled:opacity-30 transition-colors"
                  aria-label="Próxima pessoa"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {pessoa ? (
          // iframe isola o CSS do e-mail para não brigar com o do painel
          <iframe
            title="Como o e-mail chega"
            srcDoc={htmlDe(pessoa)}
            sandbox=""
            className="w-full h-[34rem] bg-white border-0"
          />
        ) : (
          <p className="text-center text-base text-muted py-20">Ninguém selecionado.</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="flex items-center gap-3.5 p-4 rounded-lg border-2 border-edge">
          <Users className="w-6 h-6 text-muted shrink-0" />
          <div className="min-w-0">
            <p className="text-2xl font-display font-bold text-fg leading-none font-tabular">
              {destinatarios.length}
            </p>
            <p className="text-sm text-muted mt-1">
              {destinatarios.length === 1 ? 'pessoa recebe' : 'pessoas recebem'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3.5 p-4 rounded-lg border-2 border-edge">
          <Mail className="w-6 h-6 text-muted shrink-0" />
          <div className="min-w-0">
            <p className="text-2xl font-display font-bold text-fg leading-none font-tabular">
              {destinatarios.length}
            </p>
            <p className="text-sm text-muted mt-1">e-mails, um por pessoa</p>
          </div>
        </div>

        <div className="flex items-center gap-3.5 p-4 rounded-lg border-2 border-edge">
          <CheckCircle2 className="w-6 h-6 text-muted shrink-0" />
          <div className="min-w-0">
            <p className="text-2xl font-display font-bold text-fg leading-none font-tabular">
              {formatBytes(peso)}
            </p>
            <p className="text-sm text-muted mt-1">tamanho do envio</p>
          </div>
        </div>
      </div>

      {/* Lista de quem recebe, em vez de nomes corridos separados por ponto */}
      <div className="rounded-lg border-2 border-edge overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-edge bg-edge/15">
          <p className="text-base font-semibold text-fg">
            Quem vai receber{' '}
            <span className="text-muted font-normal">
              ({listados.length}
              {termo && ` de ${destinatarios.length}`})
            </span>
          </p>

          {destinatarios.length > 8 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-faint" />
              <input
                type="text"
                value={busca}
                onChange={e => setBusca(e.target.value)}
                placeholder="Procurar na lista"
                aria-label="Procurar destinatário"
                className="pl-9 pr-3 py-2 w-56 max-w-full text-sm rounded-md bg-ink border border-edge text-fg placeholder-faint outline-none focus:border-volt focus:ring-2 focus:ring-volt/20 transition-colors"
              />
            </div>
          )}
        </div>

        <div className="max-h-64 overflow-y-auto overscroll-contain">
          <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
            {listados.map(d => {
              const eOExibido = pessoa?.id === d.id;
              return (
                <li key={d.id} className="border-b border-r border-edge">
                  <button
                    type="button"
                    onClick={() => setIndice(destinatarios.findIndex(x => x.id === d.id))}
                    className={`w-full text-left px-4 py-3 transition-colors ${
                      eOExibido ? 'bg-volt-soft' : 'hover:bg-edge/20'
                    }`}
                    title="Ver o e-mail desta pessoa"
                  >
                    <span className="block text-sm font-medium text-fg truncate">
                      {d.full_name || 'Sem nome'}
                    </span>
                    <span className="block text-sm text-muted truncate">{d.email}</span>
                  </button>
                </li>
              );
            })}
          </ul>

          {listados.length === 0 && (
            <p className="text-center text-base text-muted py-10">Ninguém com esse nome na lista.</p>
          )}
        </div>
      </div>

      {pesado && (
        <div className="flex items-start gap-3.5 p-4 rounded-lg border-2 border-warning/40 bg-warning-soft">
          <AlertTriangle className="w-6 h-6 text-warning shrink-0 mt-0.5" />
          <p className="text-base text-muted">
            <strong className="font-semibold text-fg">O envio ficou grande ({formatBytes(peso)}).</strong> Um
            e-mail é montado para cada pessoa, então o tamanho cresce junto com a lista. Se falhar, envie em
            duas partes.
          </p>
        </div>
      )}

      <p className="text-sm text-faint text-center">
        {pessoa && `Mostrando o e-mail de ${primeiroNome(pessoa.full_name) || pessoa.email}.`} Clique em
        qualquer nome da lista para ver o e-mail daquela pessoa.
      </p>
    </div>
  );
}
