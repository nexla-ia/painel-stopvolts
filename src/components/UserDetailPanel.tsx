import { useEffect, useState } from 'react';
import {
  supabase,
  Profile,
  Device,
  DeviceCategory,
  UserStats,
  SubscriptionPlan,
  planLabel,
  isPaidPlan,
} from '../lib/supabase';
import Badge from './ui/Badge';
import Spinner from './ui/Spinner';
import { Mail, Crown, Calendar, LogIn, Zap, Cpu, Trophy, ShieldCheck, AlertTriangle } from 'lucide-react';

interface UserDetailPanelProps {
  user: Profile;
  stats?: UserStats;
  categories: Record<string, DeviceCategory>;
  plans: Record<string, SubscriptionPlan>;
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Mail;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-edge rounded-md p-4">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-muted" />
        <h3 className="font-display font-bold text-sm text-fg uppercase tracking-wide">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-faint mb-0.5">{label}</p>
      <p className="text-sm font-medium text-fg">{value}</p>
    </div>
  );
}

export default function UserDetailPanel({ user, stats, categories, plans }: UserDetailPanelProps) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(true);

  useEffect(() => {
    let active = true;
    setLoadingDevices(true);
    supabase
      .from('devices')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) console.error('Error loading devices:', error);
        setDevices(data || []);
        setLoadingDevices(false);
      });
    return () => {
      active = false;
    };
  }, [user.id]);

  const formatDateTime = (value: string | null) => {
    if (!value) return 'Nunca';
    return new Date(value).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (value: string | null) => {
    if (!value) return '-';
    return new Date(value).toLocaleDateString('pt-BR');
  };

  const location = user.city && user.state ? `${user.city}, ${user.state}` : user.state || user.city || '-';

  // O contador vem de user_stats_view (sem RLS); a lista vem de `devices` (com RLS).
  // Se a view conta dispositivos mas a lista volta vazia, é falta de permissão de
  // leitura para admin na tabela `devices` — não uma conta realmente sem aparelhos.
  const countedDevices = stats?.total_devices ?? 0;
  const devicesBlocked = !loadingDevices && devices.length === 0 && countedDevices > 0;
  const overLimit = countedDevices > user.device_limit;

  const paid = isPaidPlan(user.plan);
  const hasSubscription = Boolean(user.subscription_status || user.subscription_end_date);
  // Assinatura ativa registrada num perfil ainda marcado como gratuito indica
  // pagamento que não promoveu o plano — vale sinalizar em vez de esconder.
  const subscriptionMismatch = hasSubscription && !paid;

  return (
    <div className="space-y-5">
      {overLimit && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-md border border-danger/40 bg-danger-soft">
          <AlertTriangle className="w-5 h-5 text-danger shrink-0" />
          <p className="text-sm text-fg">
            <strong className="font-semibold text-danger">Estourou o limite do plano</strong>
            <span className="text-muted">
              {' '}
              — {countedDevices} dispositivos para um plano de {user.device_limit}.
            </span>
          </p>
        </div>
      )}

      <div className="flex items-center gap-4">
        <div className="shrink-0 h-14 w-14 bg-volt-soft rounded-full flex items-center justify-center">
          <span className="text-volt font-bold text-xl">
            {(user.full_name || user.email)[0].toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-display font-bold text-xl text-fg truncate">{user.full_name || 'Sem nome'}</h2>
          <p className="text-sm text-faint truncate">{user.email}</p>
          <div className="flex flex-wrap gap-2 mt-1.5">
            <Badge variant={paid ? 'warning' : 'info'} icon={paid && <Crown className="w-3 h-3" />}>
              {planLabel(user.plan, plans)}
            </Badge>
            <Badge
              variant={user.role === 'admin' ? 'danger' : 'success'}
              icon={<ShieldCheck className="w-3 h-3" />}
            >
              {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
            </Badge>
            <Badge variant={user.is_active ? 'success' : 'neutral'}>
              {user.is_active ? 'Ativo' : 'Inativo'}
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Section icon={Mail} title="Contato">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Telefone" value={user.phone || '-'} />
            <Field label="Localização" value={location} />
          </div>
        </Section>

        <Section icon={Calendar} title="Cadastro & Login">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Registrado em" value={formatDate(user.created_at)} />
            <Field label="Último Login" value={formatDateTime(user.last_login_at)} />
            <Field
              label="Nº de Logins"
              value={
                <span className="inline-flex items-center gap-1.5">
                  <LogIn className="w-3.5 h-3.5 text-muted" />
                  {user.login_count ?? 0}
                </span>
              }
            />
            <Field label="Código Promo Usado" value={user.promo_code_used || '-'} />
          </div>
        </Section>

        <Section icon={Crown} title="Plano & Assinatura">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Plano" value={planLabel(user.plan, plans)} />
            <Field label="Limite de Dispositivos" value={user.device_limit} />
            {hasSubscription ? (
              <>
                <Field label="Status da Assinatura" value={user.subscription_status || 'Não informado'} />
                <Field
                  label="Assinatura Expira em"
                  value={user.subscription_end_date ? formatDate(user.subscription_end_date) : 'Sem prazo'}
                />
              </>
            ) : (
              <div className="sm:col-span-2">
                <p className="text-[11px] uppercase tracking-wider text-faint mb-0.5">Assinatura</p>
                <p className="text-sm text-muted">
                  Nunca assinou — conta no plano gratuito, sem cobrança registrada.
                </p>
              </div>
            )}
          </div>

          {subscriptionMismatch && (
            <div className="flex items-start gap-2.5 mt-3 px-3 py-2.5 rounded-md border border-warning/40 bg-warning-soft">
              <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
              <p className="text-xs text-muted">
                <strong className="font-semibold text-fg">Assinatura sem plano correspondente.</strong> Existe
                registro de pagamento, mas o perfil continua marcado como gratuito.
              </p>
            </div>
          )}
        </Section>

        <Section icon={Zap} title="Consumo & Engajamento">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field
              label="Consumo Estimado"
              value={`${(stats?.estimated_monthly_kwh ?? 0).toFixed(1)} kWh/mês`}
            />
            <Field
              label="Custo Estimado"
              value={(stats?.estimated_monthly_cost ?? 0).toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              })}
            />
            <Field
              label="Conquistas"
              value={
                <span className="inline-flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-muted" />
                  {stats?.achievements_count ?? 0} · {stats?.total_points ?? 0} pts
                </span>
              }
            />
            <Field
              label="Posição no Ranking"
              value={stats?.leaderboard_rank ? `#${stats.leaderboard_rank}` : '-'}
            />
          </div>
        </Section>
      </div>

      <div className="border border-edge rounded-md p-4">
        <div className="flex items-center gap-2 mb-3">
          <Cpu className="w-4 h-4 text-muted" />
          <h3 className="font-display font-bold text-sm text-fg uppercase tracking-wide">
            Dispositivos Conectados ({devicesBlocked ? countedDevices : devices.length} / {user.device_limit})
          </h3>
        </div>

        {loadingDevices ? (
          <div className="flex justify-center py-6">
            <Spinner />
          </div>
        ) : devicesBlocked ? (
          <div className="flex items-start gap-3 px-4 py-3 rounded-md border border-warning/40 bg-warning-soft">
            <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
            <p className="text-sm text-muted">
              <strong className="font-semibold text-fg">
                {countedDevices} dispositivos contabilizados, mas a lista não pôde ser carregada.
              </strong>{' '}
              A tabela <code className="font-mono text-xs">devices</code> não libera leitura para
              administradores (RLS). É preciso criar a policy de admin no banco para os aparelhos aparecerem
              aqui.
            </p>
          </div>
        ) : devices.length === 0 ? (
          <p className="text-sm text-muted text-center py-6">Nenhum dispositivo cadastrado.</p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto overscroll-contain">
            {devices.map(device => (
              <div
                key={device.id}
                className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-md bg-edge/10 border border-edge"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-fg truncate">
                    {device.name}
                    {device.quantity > 1 && <span className="text-faint"> × {device.quantity}</span>}
                  </p>
                  <p className="text-xs text-faint truncate">
                    {device.category_id && categories[device.category_id]
                      ? categories[device.category_id].name
                      : 'Sem categoria'}
                    {device.brand ? ` · ${device.brand}` : ''}
                    {device.model ? ` ${device.model}` : ''}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-tabular text-fg">{device.power_watts} W</p>
                  <p className="text-xs text-faint font-tabular">
                    {device.hours_per_day}h/dia · {device.days_per_week}d/sem
                  </p>
                </div>
                <Badge variant={device.is_active ? 'success' : 'neutral'} className="shrink-0">
                  {device.is_active ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
