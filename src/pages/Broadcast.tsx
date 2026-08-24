import { useEffect, useMemo, useState } from 'react';
import { supabase, Profile, PROFILE_COLUMNS } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import {
  MidiaCampanha,
  LinkCampanha,
  buildBroadcastPayload,
  sendBroadcast,
  podeReceber,
} from '../lib/broadcast';
import { Informativo, listarInformativos, salvarInformativo, TABELA_AUSENTE } from '../lib/informativos';
import { ArrowLeft, ArrowRight, Send, Check, PenLine, Users, ClipboardCheck, History } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Panel from '../components/ui/Panel';
import Skeleton from '../components/ui/Skeleton';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import ComposeStep from '../components/broadcast/ComposeStep';
import RecipientsStep from '../components/broadcast/RecipientsStep';
import ReviewStep from '../components/broadcast/ReviewStep';
import HistoryPanel from '../components/broadcast/HistoryPanel';
import { primaryButton, secondaryButton } from '../components/broadcast/ui';

type Aba = 'novo' | 'historico';

const PASSOS = [
  { numero: 1, titulo: 'Escrever', descricao: 'A mensagem e as fotos', icon: PenLine },
  { numero: 2, titulo: 'Escolher', descricao: 'Quem vai receber', icon: Users },
  { numero: 3, titulo: 'Conferir', descricao: 'Revisar e enviar', icon: ClipboardCheck },
] as const;

export default function Broadcast() {
  const { profile } = useAuth();
  const toast = useToast();

  const [aba, setAba] = useState<Aba>('novo');
  const [passo, setPasso] = useState(1);

  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [titulo, setTitulo] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [midias, setMidias] = useState<MidiaCampanha[]>([]);
  const [links, setLinks] = useState<LinkCampanha[]>([]);

  const [informativos, setInformativos] = useState<Informativo[]>([]);
  const [historicoLoading, setHistoricoLoading] = useState(true);
  const [historicoErro, setHistoricoErro] = useState<string | null>(null);

  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    carregarContatos();
    carregarHistorico();
  }, []);

  const carregarContatos = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(PROFILE_COLUMNS)
        .order('full_name', { ascending: true })
        .returns<Profile[]>();

      if (error) throw error;

      const carregados = data || [];
      setUsers(carregados);
      // Já começa com todo mundo marcado: o caso comum é o aviso geral.
      setSelectedIds(new Set(carregados.filter(podeReceber).map(u => u.id)));
    } catch (error) {
      console.error('Error loading contacts:', error);
      toast.error('Não foi possível carregar a lista de pessoas.');
    } finally {
      setLoading(false);
    }
  };

  const carregarHistorico = async () => {
    setHistoricoLoading(true);
    const resultado = await listarInformativos();
    if (resultado.ok) {
      setInformativos(resultado.dados);
      setHistoricoErro(null);
    } else {
      setHistoricoErro(resultado.motivo);
    }
    setHistoricoLoading(false);
  };

  const destinatarios = useMemo(
    () => users.filter(u => podeReceber(u) && selectedIds.has(u.id)),
    [users, selectedIds],
  );

  const payload = useMemo(
    () =>
      buildBroadcastPayload({
        titulo,
        mensagem,
        midias,
        links,
        contatos: destinatarios,
        enviadoPor: profile?.email ?? 'desconhecido',
        agora: new Date(),
      }),
    [titulo, mensagem, midias, links, destinatarios, profile?.email],
  );

  const podeAvancar = passo === 1 ? mensagem.trim().length > 0 : destinatarios.length > 0;

  const limparFormulario = () => {
    setTitulo('');
    setMensagem('');
    setMidias([]);
    setLinks([]);
    setSelectedIds(new Set(users.filter(podeReceber).map(u => u.id)));
    setPasso(1);
  };

  const handleEnviar = async () => {
    setEnviando(true);
    try {
      const resultado = await sendBroadcast(payload);

      // O histórico registra a tentativa em qualquer caso — inclusive a que
      // falhou, para ficar claro o que foi tentado e por que não deu certo.
      const salvo = await salvarInformativo({
        titulo,
        mensagem,
        midias,
        links,
        contatos: payload.contatos,
        status: resultado.ok ? 'enviado' : 'falhou',
        erro: resultado.ok ? null : resultado.detalhe,
        enviadoPor: profile?.email ?? null,
      });

      if (!salvo.ok && salvo.motivo !== TABELA_AUSENTE) {
        console.error('Informativo não registrado no histórico:', salvo.motivo);
      }

      setConfirmando(false);

      if (resultado.ok) {
        toast.success(
          `Informativo enviado para ${payload.total_contatos} ${
            payload.total_contatos === 1 ? 'pessoa' : 'pessoas'
          }.`,
        );
        limparFormulario();
        setAba('historico');
      } else {
        toast.error(resultado.detalhe);
      }

      await carregarHistorico();
    } finally {
      setEnviando(false);
    }
  };

  const usarComoBase = (info: Informativo) => {
    setTitulo(info.titulo);
    setMensagem(info.mensagem);
    setLinks(info.links.map((l, i) => ({ id: `${Date.now()}-${i}`, titulo: l.titulo, url: l.url })));
    // As fotos não voltam: o histórico guarda só o nome dos arquivos, não a
    // imagem em si. Quem for reenviar escolhe as fotos de novo.
    setMidias([]);
    setPasso(1);
    setAba('novo');
    if (info.midias.length > 0) {
      toast.info('O texto foi copiado. As fotos precisam ser escolhidas de novo.');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-80" />
        <Skeleton className="h-24" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  const abaClass = (ativa: boolean) =>
    `flex items-center gap-2.5 px-5 py-3 text-base font-semibold rounded-lg transition-colors ${
      ativa ? 'bg-volt text-volt-ink shadow-md shadow-volt/20' : 'text-muted hover:text-fg hover:bg-edge/30'
    }`;

  return (
    <div className="space-y-6 lg:h-full lg:overflow-y-auto lg:overscroll-contain">
      <PageHeader
        eyebrow="Comunicação"
        title="Informativos"
        subtitle="Envie um aviso para seus clientes pelo WhatsApp"
      />

      <div className="flex flex-wrap gap-2 p-1.5 rounded-xl bg-edge/25 w-fit">
        <button type="button" onClick={() => setAba('novo')} className={abaClass(aba === 'novo')}>
          <PenLine className="w-5 h-5" />
          Novo informativo
        </button>
        <button type="button" onClick={() => setAba('historico')} className={abaClass(aba === 'historico')}>
          <History className="w-5 h-5" />
          Já enviados
          {informativos.length > 0 && (
            <span
              className={`px-2 py-0.5 rounded-md text-sm font-bold ${
                aba === 'historico' ? 'bg-volt-ink/15' : 'bg-edge/60'
              }`}
            >
              {informativos.length}
            </span>
          )}
        </button>
      </div>

      {aba === 'historico' ? (
        <Panel className="p-6">
          <HistoryPanel
            informativos={informativos}
            loading={historicoLoading}
            erro={historicoErro}
            onReenviar={usarComoBase}
          />
        </Panel>
      ) : (
        <>
          <ol className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {PASSOS.map(p => {
              const atual = passo === p.numero;
              const concluido = passo > p.numero;
              const Icon = p.icon;

              return (
                <li key={p.numero}>
                  <button
                    type="button"
                    onClick={() => (p.numero < passo ? setPasso(p.numero) : undefined)}
                    disabled={p.numero > passo}
                    aria-current={atual ? 'step' : undefined}
                    className={`w-full flex items-center gap-4 p-4 rounded-lg border-2 text-left transition-colors ${
                      atual
                        ? 'border-volt bg-volt-soft'
                        : concluido
                          ? 'border-success/40 bg-success-soft cursor-pointer hover:border-success'
                          : 'border-edge opacity-60 cursor-not-allowed'
                    }`}
                  >
                    <span
                      className={`shrink-0 w-11 h-11 rounded-full flex items-center justify-center font-display font-bold text-lg ${
                        atual
                          ? 'bg-volt text-volt-ink'
                          : concluido
                            ? 'bg-success text-white'
                            : 'bg-edge/60 text-faint'
                      }`}
                    >
                      {concluido ? <Check className="w-6 h-6" strokeWidth={3} /> : p.numero}
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-2 text-lg font-semibold text-fg">
                        <Icon className="w-4 h-4 text-muted" />
                        {p.titulo}
                      </span>
                      <span className="block text-sm text-muted mt-0.5">{p.descricao}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>

          <Panel className="p-6 sm:p-8">
            {passo === 1 && (
              <ComposeStep
                titulo={titulo}
                onTituloChange={setTitulo}
                mensagem={mensagem}
                onMensagemChange={setMensagem}
                midias={midias}
                onMidiasChange={setMidias}
                links={links}
                onLinksChange={setLinks}
              />
            )}

            {passo === 2 && (
              <RecipientsStep users={users} selectedIds={selectedIds} onChange={setSelectedIds} />
            )}

            {passo === 3 && (
              <ReviewStep
                titulo={titulo}
                mensagem={mensagem}
                midias={midias}
                links={links}
                destinatarios={destinatarios}
              />
            )}
          </Panel>

          <div className="flex flex-wrap items-center justify-between gap-4 pb-2">
            <button
              type="button"
              onClick={() => setPasso(p => Math.max(1, p - 1))}
              disabled={passo === 1}
              className={secondaryButton}
            >
              <ArrowLeft className="w-5 h-5" />
              Voltar
            </button>

            {passo < 3 ? (
              <button
                type="button"
                onClick={() => setPasso(p => p + 1)}
                disabled={!podeAvancar}
                className={primaryButton}
              >
                Continuar
                <ArrowRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmando(true)}
                disabled={destinatarios.length === 0 || enviando}
                className={primaryButton}
              >
                <Send className="w-5 h-5" />
                Enviar para {destinatarios.length} {destinatarios.length === 1 ? 'pessoa' : 'pessoas'}
              </button>
            )}
          </div>

          {passo === 1 && !podeAvancar && (
            <p className="text-base text-muted text-right -mt-2">Escreva a mensagem para continuar.</p>
          )}
        </>
      )}

      {confirmando && (
        <ConfirmDialog
          title="Enviar agora?"
          description={
            <>
              A mensagem vai ser enviada para{' '}
              <span className="font-semibold text-fg">
                {destinatarios.length} {destinatarios.length === 1 ? 'pessoa' : 'pessoas'}
              </span>{' '}
              pelo WhatsApp.
            </>
          }
          warning="Depois de enviar não é possível voltar atrás."
          confirmLabel="Sim, enviar"
          pendingLabel="Enviando..."
          pending={enviando}
          onConfirm={handleEnviar}
          onCancel={() => setConfirmando(false)}
        />
      )}
    </div>
  );
}
