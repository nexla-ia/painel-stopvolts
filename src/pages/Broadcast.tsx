import { useEffect, useMemo, useState } from 'react';
import { supabase, Profile, PROFILE_COLUMNS } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import {
  MidiaCampanha,
  LinkCampanha,
  buildBroadcastPayload,
  sendBroadcast,
  normalizePhone,
  podeReceber,
  estimatePayloadBytes,
  formatBytes,
  BROADCAST_WEBHOOK_URL,
} from '../lib/broadcast';
import {
  Search,
  Send,
  Users,
  PhoneOff,
  CheckSquare,
  Square,
  Code2,
  ChevronDown,
  AlertTriangle,
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';
import Panel from '../components/ui/Panel';
import Badge from '../components/ui/Badge';
import Skeleton from '../components/ui/Skeleton';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Spinner from '../components/ui/Spinner';
import BroadcastComposer from '../components/BroadcastComposer';
import { inputClass, selectClass } from '../components/ui/classes';

export default function Broadcast() {
  const { profile } = useAuth();
  const toast = useToast();

  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [stateFilter, setStateFilter] = useState('all');

  const [titulo, setTitulo] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [midias, setMidias] = useState<MidiaCampanha[]>([]);
  const [links, setLinks] = useState<LinkCampanha[]>([]);

  const [showPayload, setShowPayload] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(PROFILE_COLUMNS)
        .order('created_at', { ascending: false })
        .returns<Profile[]>();

      if (error) throw error;

      const loaded = data || [];
      setUsers(loaded);
      // Começa com todo mundo que tem telefone marcado — o caso comum é o
      // disparo geral, e desmarcar é mais rápido do que marcar 43 contatos.
      setSelectedIds(new Set(loaded.filter(podeReceber).map(u => u.id)));
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Não foi possível carregar os contatos.');
    } finally {
      setLoading(false);
    }
  };

  const states = useMemo(
    () => [...new Set(users.map(u => u.state).filter((s): s is string => Boolean(s)))].sort(),
    [users],
  );
  const plans = useMemo(() => [...new Set(users.map(u => u.plan).filter(Boolean))].sort(), [users]);

  const visibleUsers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return users.filter(user => {
      if (term) {
        const haystack = [user.full_name, user.email, user.phone, user.city, user.state]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      if (planFilter !== 'all' && user.plan !== planFilter) return false;
      if (stateFilter !== 'all' && user.state !== stateFilter) return false;
      return true;
    });
  }, [users, searchTerm, planFilter, stateFilter]);

  const contactable = useMemo(() => users.filter(podeReceber), [users]);
  const selectedUsers = useMemo(
    () => contactable.filter(u => selectedIds.has(u.id)),
    [contactable, selectedIds],
  );
  const semTelefone = users.length - contactable.length;

  const payload = useMemo(
    () =>
      buildBroadcastPayload({
        titulo,
        mensagem,
        midias,
        links,
        contatos: selectedUsers,
        enviadoPor: profile?.email ?? 'desconhecido',
        agora: new Date(),
      }),
    [titulo, mensagem, midias, links, selectedUsers, profile?.email],
  );

  const toggle = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Marcar/desmarcar age só sobre o que está filtrado na tela, para o botão
  // não mexer em contatos que o admin não está vendo.
  const visibleContactable = visibleUsers.filter(podeReceber);
  const allVisibleSelected =
    visibleContactable.length > 0 && visibleContactable.every(u => selectedIds.has(u.id));

  const toggleAllVisible = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      for (const user of visibleContactable) {
        if (allVisibleSelected) next.delete(user.id);
        else next.add(user.id);
      }
      return next;
    });
  };

  const pesoEnvio = estimatePayloadBytes(midias, selectedUsers.length, mensagem);
  const canSend = selectedUsers.length > 0 && mensagem.trim().length > 0 && !sending;

  const handleSend = async () => {
    setSending(true);
    try {
      const result = await sendBroadcast(payload);
      if (result.ok) {
        toast.success(`Campanha enviada com ${payload.total_contatos} contatos.`);
        setConfirming(false);
      } else {
        toast.error(result.detalhe);
      }
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-9 w-72 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 lg:h-full lg:min-h-0">
      <PageHeader
        eyebrow="Comunicação"
        title="Envio de Informações"
        subtitle="Monte uma campanha e dispare todos os contatos de uma vez para o n8n"
        actions={
          <button
            onClick={() => setConfirming(true)}
            disabled={!canSend}
            className="flex items-center gap-2 px-4 py-2.5 bg-volt text-volt-ink rounded-md hover:bg-volt-strong transition-colors font-semibold text-sm shadow-lg shadow-volt/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
            Enviar para {selectedUsers.length}
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          index={0}
          icon={CheckSquare}
          accent="volt"
          label="Selecionados"
          value={selectedUsers.length}
          sublabel={`de ${contactable.length} contatos com telefone`}
        />
        <StatCard index={1} icon={Users} accent="info" label="Total de Contas" value={users.length} />
        <StatCard
          index={2}
          icon={PhoneOff}
          accent="warning"
          label="Sem Telefone"
          value={semTelefone}
          sublabel="Não podem receber"
        />
      </div>

      {pesoEnvio > 8 * 1024 * 1024 && (
        <div className="flex items-start gap-2.5 px-4 py-3 rounded-lg border border-warning/40 bg-warning-soft">
          <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
          <p className="text-sm text-muted">
            <strong className="font-semibold text-fg">
              O envio está com cerca de {formatBytes(pesoEnvio)}.
            </strong>{' '}
            As fotos vão em base64 dentro do JSON. Servidores costumam recusar corpos muito grandes — se o
            webhook responder erro, remova ou comprima alguma imagem.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6 lg:flex-1 lg:min-h-0">
        <Panel className="overflow-hidden flex flex-col lg:h-full lg:min-h-0 max-h-[70vh] lg:max-h-none">
          <div className="p-4 border-b border-edge shrink-0 space-y-3">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-faint" />
              <input
                type="text"
                placeholder="Buscar contato..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className={`${inputClass} pl-10 py-2 text-sm`}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={planFilter}
                onChange={e => setPlanFilter(e.target.value)}
                className={`${selectClass} py-2 text-sm`}
              >
                <option value="all">Todos os planos</option>
                {plans.map(plan => (
                  <option key={plan} value={plan}>
                    {plan}
                  </option>
                ))}
              </select>
              <select
                value={stateFilter}
                onChange={e => setStateFilter(e.target.value)}
                className={`${selectClass} py-2 text-sm`}
              >
                <option value="all">Todos os estados</option>
                {states.map(state => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={toggleAllVisible}
              disabled={visibleContactable.length === 0}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md border border-edge text-sm font-medium text-fg hover:bg-edge/30 transition-colors disabled:opacity-50"
            >
              {allVisibleSelected ? <Square className="w-4 h-4" /> : <CheckSquare className="w-4 h-4" />}
              {allVisibleSelected ? 'Desmarcar' : 'Marcar'} {visibleContactable.length} visíveis
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain divide-y divide-edge">
            {visibleUsers.map(user => {
              const contactable = podeReceber(user);
              const checked = selectedIds.has(user.id);

              return (
                <label
                  key={user.id}
                  className={`flex items-center gap-3 px-4 py-2.5 transition-colors ${
                    contactable ? 'cursor-pointer hover:bg-edge/20' : 'opacity-55 cursor-not-allowed'
                  } ${checked ? 'bg-volt-soft' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={!contactable}
                    onChange={() => toggle(user.id)}
                    className="shrink-0 w-4 h-4 accent-volt"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-fg truncate">{user.full_name || 'Sem nome'}</p>
                    <p className="text-xs text-faint truncate font-tabular">
                      {contactable ? normalizePhone(user.phone) : 'Sem telefone cadastrado'}
                    </p>
                  </div>
                  {user.state && (
                    <span className="text-[11px] text-faint shrink-0 font-mono">{user.state}</span>
                  )}
                </label>
              );
            })}
            {visibleUsers.length === 0 && (
              <p className="text-sm text-muted text-center py-10">Nenhum contato bate com o filtro.</p>
            )}
          </div>
        </Panel>

        <Panel className="p-6 overflow-y-auto overscroll-contain lg:h-full lg:min-h-0">
          <BroadcastComposer
            titulo={titulo}
            onTituloChange={setTitulo}
            mensagem={mensagem}
            onMensagemChange={setMensagem}
            midias={midias}
            onMidiasChange={setMidias}
            links={links}
            onLinksChange={setLinks}
          />

          <div className="mt-4 border border-edge rounded-md">
            <button
              type="button"
              onClick={() => setShowPayload(v => !v)}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-edge/20 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-muted" />
                <span className="font-display font-bold text-sm text-fg uppercase tracking-wide">
                  JSON enviado ao n8n
                </span>
              </span>
              <ChevronDown
                className={`w-4 h-4 text-faint transition-transform ${showPayload ? 'rotate-180' : ''}`}
              />
            </button>
            {showPayload && (
              <div className="border-t border-edge">
                <p className="px-4 pt-3 text-xs text-faint break-all">
                  POST <span className="font-mono">{BROADCAST_WEBHOOK_URL}</span>
                </p>
                <pre className="p-4 overflow-x-auto text-[11px] leading-relaxed font-mono text-muted max-h-80 overflow-y-auto overscroll-contain">
                  {JSON.stringify(
                    {
                      ...payload,
                      campanha: {
                        ...payload.campanha,
                        // O base64 real vai inteiro no envio; aqui só o resumo,
                        // senão o preview fica ilegível.
                        midias: payload.campanha.midias.map(m => ({
                          ...m,
                          base64: `<${formatBytes(m.base64.length)} em base64>`,
                        })),
                      },
                      contatos: payload.contatos.slice(0, 3),
                    },
                    null,
                    2,
                  )}
                  {payload.contatos.length > 3 &&
                    `\n\n… e mais ${payload.contatos.length - 3} contatos no mesmo array.`}
                </pre>
              </div>
            )}
          </div>
        </Panel>
      </div>

      {confirming && (
        <ConfirmDialog
          title="Enviar campanha"
          description={
            <>
              A campanha vai para o n8n com{' '}
              <span className="font-semibold text-fg">{payload.total_contatos} contatos</span> num único envio
              {payload.campanha.midias.length > 0 && `, ${payload.campanha.midias.length} foto(s)`}
              {payload.campanha.links.length > 0 && ` e ${payload.campanha.links.length} link(s)`}.
            </>
          }
          warning="O n8n vai disparar mensagens reais para esses números. Confira a lista antes de confirmar."
          confirmLabel="Enviar agora"
          pendingLabel="Enviando..."
          pending={sending}
          onConfirm={handleSend}
          onCancel={() => setConfirming(false)}
        />
      )}

      {sending && (
        <div className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 px-4 py-3 rounded-md border border-edge bg-elevated shadow-lg">
          <Spinner className="w-4 h-4 text-volt" />
          <span className="text-sm text-fg">Enviando campanha...</span>
        </div>
      )}

      <div className="lg:hidden">
        <Badge variant="neutral">{selectedUsers.length} contatos selecionados</Badge>
      </div>
    </div>
  );
}
