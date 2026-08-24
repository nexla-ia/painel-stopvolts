import { useMemo, useState } from 'react';
import { Profile, isPaidPlan } from '../../lib/supabase';
import { podeReceber, normalizePhone } from '../../lib/broadcast';
import { Search, Users, Check, PhoneOff, MapPin } from 'lucide-react';
import { bigInput } from './ui';

interface RecipientsStepProps {
  users: Profile[];
  selectedIds: Set<string>;
  onChange: (ids: Set<string>) => void;
}

/** Formata o telefone como a pessoa está acostumada a ver: (41) 99965-4389. */
function telefoneLegivel(raw: string | null) {
  const normalizado = normalizePhone(raw);
  if (!normalizado) return 'Sem telefone';
  const semPais = normalizado.slice(2);
  const ddd = semPais.slice(0, 2);
  const numero = semPais.slice(2);
  const meio = numero.length === 9 ? 5 : 4;
  return `(${ddd}) ${numero.slice(0, meio)}-${numero.slice(meio)}`;
}

export default function RecipientsStep({ users, selectedIds, onChange }: RecipientsStepProps) {
  const [busca, setBusca] = useState('');

  const contactable = useMemo(() => users.filter(podeReceber), [users]);
  const semTelefone = users.length - contactable.length;

  const estados = useMemo(
    () => [...new Set(contactable.map(u => u.state).filter((s): s is string => Boolean(s)))].sort(),
    [contactable],
  );

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return contactable;
    return contactable.filter(u =>
      [u.full_name, u.email, u.phone, u.city, u.state]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(termo),
    );
  }, [contactable, busca]);

  const selecionarTodos = () => onChange(new Set(contactable.map(u => u.id)));
  const limpar = () => onChange(new Set());
  const selecionarPagos = () => onChange(new Set(contactable.filter(u => isPaidPlan(u.plan)).map(u => u.id)));
  const selecionarEstado = (uf: string) =>
    onChange(new Set(contactable.filter(u => u.state === uf).map(u => u.id)));

  const alternar = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  };

  const selecionados = contactable.filter(u => selectedIds.has(u.id)).length;

  const atalhoClass = (ativo: boolean) =>
    `px-4 py-2.5 rounded-lg text-base font-medium border-2 transition-colors ${
      ativo ? 'border-volt bg-volt-soft text-volt' : 'border-edge text-fg hover:bg-edge/30'
    }`;

  const todosMarcados = selecionados === contactable.length && contactable.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4 p-5 rounded-lg border-2 border-volt/30 bg-volt-soft">
        <Users className="w-8 h-8 text-volt shrink-0" />
        <div className="flex-1 min-w-[12rem]">
          <p className="text-2xl font-display font-bold text-fg leading-none">
            {selecionados} {selecionados === 1 ? 'pessoa vai receber' : 'pessoas vão receber'}
          </p>
          <p className="text-base text-muted mt-1.5">
            De {contactable.length} contatos que têm telefone cadastrado.
          </p>
        </div>
      </div>

      <div>
        <p className="text-base font-semibold text-fg mb-3">Atalhos</p>
        <div className="flex flex-wrap gap-2.5">
          <button type="button" onClick={selecionarTodos} className={atalhoClass(todosMarcados)}>
            Todos ({contactable.length})
          </button>
          <button type="button" onClick={selecionarPagos} className={atalhoClass(false)}>
            Só planos pagos ({contactable.filter(u => isPaidPlan(u.plan)).length})
          </button>
          {estados.slice(0, 6).map(uf => (
            <button
              key={uf}
              type="button"
              onClick={() => selecionarEstado(uf)}
              className={atalhoClass(false)}
            >
              <MapPin className="w-4 h-4 inline mr-1.5 -mt-0.5" />
              {uf} ({contactable.filter(u => u.state === uf).length})
            </button>
          ))}
          <button type="button" onClick={limpar} className={atalhoClass(selecionados === 0)}>
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
            placeholder="Procurar uma pessoa pelo nome..."
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
                  <span
                    className={`shrink-0 w-7 h-7 rounded-md border-2 flex items-center justify-center transition-colors ${
                      marcado ? 'bg-volt border-volt' : 'border-edge-strong bg-ink'
                    }`}
                  >
                    {marcado && <Check className="w-5 h-5 text-volt-ink" strokeWidth={3} />}
                  </span>
                  <input
                    type="checkbox"
                    checked={marcado}
                    onChange={() => alternar(user.id)}
                    className="sr-only"
                  />
                  <span className="flex-1 min-w-0">
                    <span className="block text-base font-medium text-fg truncate">
                      {user.full_name || 'Sem nome'}
                    </span>
                    <span className="block text-base text-muted font-tabular">
                      {telefoneLegivel(user.phone)}
                    </span>
                  </span>
                  {user.state && <span className="shrink-0 text-sm text-faint font-mono">{user.state}</span>}
                </label>
              );
            })}

            {visiveis.length === 0 && (
              <p className="text-center text-base text-muted py-12">Ninguém encontrado com esse nome.</p>
            )}
          </div>
        </div>
      </div>

      {semTelefone > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-lg border-2 border-edge bg-edge/15">
          <PhoneOff className="w-5 h-5 text-faint shrink-0 mt-0.5" />
          <p className="text-base text-muted">
            <strong className="font-semibold text-fg">
              {semTelefone} {semTelefone === 1 ? 'conta não aparece' : 'contas não aparecem'} nesta lista.
            </strong>{' '}
            {semTelefone === 1 ? 'Ela não tem' : 'Elas não têm'} telefone cadastrado, então não{' '}
            {semTelefone === 1 ? 'pode' : 'podem'} receber mensagem.
          </p>
        </div>
      )}
    </div>
  );
}
