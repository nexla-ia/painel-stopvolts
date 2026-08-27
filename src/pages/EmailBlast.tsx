import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase, Profile, PROFILE_COLUMNS } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import {
  ConteudoEmail,
  CONTEUDO_PADRAO,
  ModoConteudo,
  aplicarVariaveis,
  buildEmailPayload,
  htmlParaTexto,
  montarHtml,
  montarTexto,
  podeReceberEmail,
  sendEmailBlast,
} from '../lib/email';
import { ArrowLeft, ArrowRight, Send, Check, PenLine, Users, ClipboardCheck } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Panel from '../components/ui/Panel';
import Skeleton from '../components/ui/Skeleton';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmailComposeStep from '../components/email/EmailComposeStep';
import EmailRecipientsStep from '../components/email/EmailRecipientsStep';
import EmailReviewStep from '../components/email/EmailReviewStep';
import { primaryButton, secondaryButton } from '../components/broadcast/ui';

const PASSOS = [
  { numero: 1, titulo: 'Escrever', descricao: 'O assunto e a mensagem', icon: PenLine },
  { numero: 2, titulo: 'Escolher', descricao: 'Quem vai receber', icon: Users },
  { numero: 3, titulo: 'Conferir', descricao: 'Revisar e enviar', icon: ClipboardCheck },
] as const;

export default function EmailBlast() {
  const { profile } = useAuth();
  const toast = useToast();

  const [passo, setPasso] = useState(1);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [titulo, setTitulo] = useState('');
  const [assunto, setAssunto] = useState('');
  const [modo, setModo] = useState<ModoConteudo>('escrever');
  const [conteudo, setConteudo] = useState<ConteudoEmail>(CONTEUDO_PADRAO);
  const [htmlCru, setHtmlCru] = useState('');

  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    carregarContatos();
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
      setSelectedIds(new Set(carregados.filter(podeReceberEmail).map(u => u.id)));
    } catch (error) {
      console.error('Error loading contacts:', error);
      toast.error('Não foi possível carregar a lista de pessoas.');
    } finally {
      setLoading(false);
    }
  };

  const destinatarios = useMemo(
    () => users.filter(u => podeReceberEmail(u) && selectedIds.has(u.id)),
    [users, selectedIds],
  );

  /**
   * Monta o HTML de uma pessoa. É o coração da tela: cada destinatário sai com
   * o próprio nome já dentro do HTML, e o n8n só precisa entregar.
   */
  const htmlDe = useCallback(
    (user: Profile) => {
      if (modo === 'html') return aplicarVariaveis(htmlCru, user);
      // Cada campo passa pelas variáveis antes de virar HTML
      return montarHtml({
        ...conteudo,
        titulo: aplicarVariaveis(conteudo.titulo, user),
        corpo: aplicarVariaveis(conteudo.corpo, user),
        botaoTexto: aplicarVariaveis(conteudo.botaoTexto, user),
        rodape: aplicarVariaveis(conteudo.rodape, user),
      });
    },
    [modo, htmlCru, conteudo],
  );

  const textoDe = useCallback(
    (user: Profile) => {
      if (modo === 'html') return htmlParaTexto(aplicarVariaveis(htmlCru, user));
      return montarTexto({
        ...conteudo,
        titulo: aplicarVariaveis(conteudo.titulo, user),
        corpo: aplicarVariaveis(conteudo.corpo, user),
        botaoTexto: aplicarVariaveis(conteudo.botaoTexto, user),
        rodape: aplicarVariaveis(conteudo.rodape, user),
      });
    },
    [modo, htmlCru, conteudo],
  );

  const assuntoDe = useCallback((user: Profile) => aplicarVariaveis(assunto, user).trim(), [assunto]);

  // Pessoa de exemplo para a prévia do passo 1
  const exemplo = destinatarios[0] ?? users.find(podeReceberEmail) ?? null;
  const htmlPrevia = useMemo(
    () =>
      exemplo
        ? htmlDe(exemplo)
        : '<p style="font-family:sans-serif;padding:24px;color:#888">Escreva a mensagem para ver a prévia.</p>',
    [exemplo, htmlDe],
  );

  // Cada pessoa leva uma cópia do HTML: o envio cresce com a lista.
  const peso = useMemo(() => {
    if (destinatarios.length === 0 || !exemplo) return 0;
    return htmlDe(exemplo).length * destinatarios.length;
  }, [destinatarios.length, exemplo, htmlDe]);

  const conteudoPreenchido = modo === 'html' ? htmlCru.trim().length > 0 : conteudo.corpo.trim().length > 0;
  const podeAvancar =
    passo === 1 ? assunto.trim().length > 0 && conteudoPreenchido : destinatarios.length > 0;

  const handleEnviar = async () => {
    setEnviando(true);
    try {
      const payload = buildEmailPayload({
        titulo,
        assunto,
        modo,
        htmlPara: htmlDe,
        textoPara: textoDe,
        destinatarios,
        enviadoPor: profile?.email ?? 'desconhecido',
        agora: new Date(),
      });

      const resultado = await sendEmailBlast(payload);
      setConfirmando(false);

      if (resultado.ok) {
        toast.success(
          `E-mail enviado para ${payload.total_destinatarios} ${
            payload.total_destinatarios === 1 ? 'pessoa' : 'pessoas'
          }.`,
        );
        setTitulo('');
        setAssunto('');
        setConteudo(CONTEUDO_PADRAO);
        setHtmlCru('');
        setPasso(1);
      } else {
        toast.error(resultado.detalhe);
      }
    } finally {
      setEnviando(false);
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

  return (
    <div className="space-y-6 lg:h-full lg:overflow-y-auto lg:overscroll-contain">
      <PageHeader
        eyebrow="Comunicação"
        title="E-mails"
        subtitle="Envie um e-mail personalizado com o nome de cada cliente"
      />

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
          <EmailComposeStep
            titulo={titulo}
            onTituloChange={setTitulo}
            assunto={assunto}
            onAssuntoChange={setAssunto}
            modo={modo}
            onModoChange={setModo}
            conteudo={conteudo}
            onConteudoChange={setConteudo}
            htmlCru={htmlCru}
            onHtmlCruChange={setHtmlCru}
            exemplo={exemplo}
            htmlPrevia={htmlPrevia}
          />
        )}

        {passo === 2 && (
          <EmailRecipientsStep users={users} selectedIds={selectedIds} onChange={setSelectedIds} />
        )}

        {passo === 3 && (
          <EmailReviewStep
            titulo={titulo}
            assuntoDe={assuntoDe}
            htmlDe={htmlDe}
            destinatarios={destinatarios}
            peso={peso}
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
        <p className="text-base text-muted text-right -mt-2">
          Preencha o assunto e a mensagem para continuar.
        </p>
      )}

      {confirmando && (
        <ConfirmDialog
          title="Enviar agora?"
          description={
            <>
              O e-mail vai ser enviado para{' '}
              <span className="font-semibold text-fg">
                {destinatarios.length} {destinatarios.length === 1 ? 'pessoa' : 'pessoas'}
              </span>
              , cada uma com o próprio nome.
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
