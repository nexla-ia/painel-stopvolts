import { useMemo, useState } from 'react';
import { Profile, isPaidPlan } from '../../lib/supabase';
import { podeReceberEmail } from '../../lib/email';
import { Search, Users, Check, MailX, MapPin } from 'lucide-react';
import { bigInput } from '../broadcast/ui';

interface EmailRecipientsStepProps {
  users: Profile[];
  selectedIds: Set<string>;
  onChange: (ids: Set<string>) => void;
}

export default function EmailRecipientsStep({ users, selectedIds, onChange }: EmailRecipientsStepProps) {
  const [busca, setBusca] = useState('');

  const alcancaveis = useMemo(() => users.filter(podeReceberEmail), [users]);
  const semEmail = users.length - alcancaveis.length;

  const estados = useMemo(
    () => [...new Set(alcancaveis.map(u => u.state).filter((s): s is string => Boolean(s)))].sort(),
    [alcancaveis],
  );

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return alcancaveis;
    return alcancaveis.filter(u =>
      [u.full_name, u.email, u.city, u.state].filter(Boolean).join(' ').toLowerCase().includes(termo),
    );
  }, [alcancaveis, busca]);

  const alternar = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  };

  const selecionados = alcancaveis.filter(u => selectedIds.has(u.id)).length;
  const todosMarcados = selecionados === alcancaveis.length && alcancaveis.length > 0;

  const atalhoClass = (ativo: boolean) =>
    `px-4 py-2.5 rounded-lg text-base font-medium border-2 transition-colors ${
      ativo ? 'border-volt bg-volt-soft text-volt' : 'border-edge text-fg hover:bg-edge/30'
    }`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4 p-5 rounded-lg border-2 border-volt/30 bg-volt-soft">
        <Users className="w-8 h-8 text-volt shrink-0" />
        <div className="flex-1 min-w-[12rem]">
          <p className="text-2xl font-display font-bold text-fg leading-none">
            {selecionados} {selecionados === 1 ? 'pessoa vai receber' : 'pessoas vão receber'}
          </p>
          <p className="text-base text-muted mt-1.5">De {alcancaveis.length} contas com e-mail válido.</p>
        </div>
      </div>

      <div>
        <p className="text-base font-semibold text-fg mb-3">Atalhos</p>
        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={() => onChange(new Set(alcancaveis.map(u => u.id)))}
            className={atalhoClass(todosMarcados)}
          >
            Todos ({alcancaveis.length})
          </button>
          <button
            type="button"
            onClick={() => onChange(new Set(alcancaveis.filter(u => isPaidPlan(u.plan)).map(u => u.id)))}
            className={atalhoClass(false)}
          >
            Só planos pagos ({alcancaveis.filter(u => isPaidPlan(u.plan)).length})
          </button>
          {estados.slice(0, 6).map(uf => (
            <button
              key={uf}
              type="button"
              onClick={() => onChange(new Set(alcancaveis.filter(u => u.state === uf).map(u => u.id)))}
              className={atalhoClass(false)}
            >
              <MapPin className="w-4 h-4 inline mr-1.5 -mt-0.5" />
              {uf} ({alcancaveis.filter(u => u.state === uf).length})
            </button>
          ))}
          <button
            type="button"
            onClick={() => onChange(new Set())}
            className={atalhoClass(selecionados === 0)}
          >
            Desmarcar todos
          </button>
        </div>
      </div>

      <div>
        <div className="relative mb-3">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-faint" />
          <input
            type="text"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Procurar por nome ou e-mail..."
            className={`${bigInput} pl-12`}
          />
        </div>

        <div className="rounded-lg border-2 border-edge overflow-hidden">
          <div className="max-h-[26rem] overflow-y-auto overscroll-contain divide-y divide-edge">
            {visiveis.map(user => {
              const marcado = selectedIds.has(user.id);
              return (
                <label
                  key={user.id}
                  className={`flex items-center gap-4 px-5 py-4 cursor-pointer transition-colors ${
                    marcado ? 'bg-volt-soft' : 'hover:bg-edge/20'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={marcado}
                    onChange={() => alternar(user.id)}
                    className="peer sr-only"
                  />
                  <span
                    className={`shrink-0 w-7 h-7 rounded-md border-2 flex items-center justify-center transition-colors peer-focus-visible:ring-4 peer-focus-visible:ring-volt/40 ${
                      marcado ? 'bg-volt border-volt' : 'border-edge-strong bg-ink'
                    }`}
                  >
                    {marcado && <Check className="w-5 h-5 text-volt-ink" strokeWidth={3} />}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-base font-medium text-fg truncate">
                      {user.full_name || 'Sem nome'}
                    </span>
                    <span className="block text-base text-muted truncate">{user.email}</span>
                  </span>
                  {user.state && <span className="shrink-0 text-sm text-faint font-mono">{user.state}</span>}
                </label>
              );
            })}

            {visiveis.length === 0 && (
              <p className="text-center text-base text-muted py-12">Ninguém encontrado.</p>
            )}
          </div>
        </div>
      </div>

      {semEmail > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-lg border-2 border-edge bg-edge/15">
          <MailX className="w-5 h-5 text-faint shrink-0 mt-0.5" />
          <p className="text-base text-muted">
            <strong className="font-semibold text-fg">
              {semEmail} {semEmail === 1 ? 'conta ficou' : 'contas ficaram'} de fora
            </strong>{' '}
            por não {semEmail === 1 ? 'ter' : 'terem'} um e-mail válido cadastrado.
          </p>
        </div>
      )}
    </div>
  );
}
