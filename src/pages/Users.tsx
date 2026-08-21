import { useEffect, useMemo, useState } from 'react';
import {
  supabase,
  Profile,
  UserStats,
  DeviceCategory,
  SubscriptionPlan,
  PROFILE_COLUMNS,
  planLabel,
  isPaidPlan,
} from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';
import {
  Search,
  Filter,
  Crown,
  User as UserIcon,
  ChevronRight,
  Cpu,
  AlertTriangle,
  ShieldAlert,
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';
import Panel from '../components/ui/Panel';
import Badge from '../components/ui/Badge';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import UserDetailPanel from '../components/UserDetailPanel';
import SplitView from '../components/ui/SplitView';
import { inputClass, selectClass, splitItemClass } from '../components/ui/classes';

interface UserRow extends Profile {
  stats?: UserStats;
}

type SortKey = 'recent' | 'devices' | 'lastLogin' | 'logins';

const deviceCountOf = (user: UserRow) => user.stats?.total_devices ?? 0;
/** Estourou o limite do plano — usa mais dispositivos do que o plano permite. */
const isOverLimit = (user: UserRow) => deviceCountOf(user) > user.device_limit;
/** Bateu exatamente o teto do plano — candidato natural a upgrade. */
const isAtLimit = (user: UserRow) => deviceCountOf(user) === user.device_limit;

export default function Users() {
  const toast = useToast();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [categories, setCategories] = useState<Record<string, DeviceCategory>>({});
  const [plans, setPlans] = useState<Record<string, SubscriptionPlan>>({});
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [stateFilter, setStateFilter] = useState<string>('all');
  const [engagementFilter, setEngagementFilter] = useState<'all' | 'overLimit' | 'atLimit' | 'neverLoggedIn'>(
    'all',
  );
  const [sortKey, setSortKey] = useState<SortKey>('recent');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const [profilesResult, statsResult, categoriesResult, plansResult] = await Promise.all([
        supabase
          .from('profiles')
          .select(PROFILE_COLUMNS)
          .order('created_at', { ascending: false })
          .returns<Profile[]>(),
        supabase.from('user_stats_view').select('*'),
        supabase.from('device_categories').select('id, name, icon'),
        supabase.from('subscription_plans').select('*'),
      ]);

      if (profilesResult.error) throw profilesResult.error;

      const statsByUser: Record<string, UserStats> = {};
      if (statsResult.error) {
        console.error('Error loading user stats:', statsResult.error);
      } else {
        for (const row of statsResult.data || []) {
          statsByUser[row.user_id] = row;
        }
      }

      if (categoriesResult.error) {
        console.error('Error loading device categories:', categoriesResult.error);
      } else {
        const catMap: Record<string, DeviceCategory> = {};
        for (const row of categoriesResult.data || []) {
          catMap[row.id] = row;
        }
        setCategories(catMap);
      }

      if (plansResult.error) {
        console.error('Error loading subscription plans:', plansResult.error);
      } else {
        const planMap: Record<string, SubscriptionPlan> = {};
        for (const row of plansResult.data || []) {
          planMap[row.plan_name] = row;
        }
        setPlans(planMap);
      }

      const merged: UserRow[] = (profilesResult.data || []).map(p => ({
        ...p,
        stats: statsByUser[p.id],
      }));

      setUsers(merged);
      setSelectedUserId(prev => prev ?? merged[0]?.id ?? null);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Não foi possível carregar os usuários.');
    } finally {
      setLoading(false);
    }
  };

  // Os planos do filtro saem da própria base, não de uma lista fixa — assim
  // valores legados como 'premium' continuam filtráveis.
  const usedPlans = useMemo(() => [...new Set(users.map(u => u.plan).filter(Boolean))].sort(), [users]);

  const states = useMemo(
    () => [...new Set(users.map(u => u.state).filter((s): s is string => Boolean(s)))].sort(),
    [users],
  );

  const filteredUsers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    const list = users.filter(user => {
      if (term) {
        const haystack = [user.full_name, user.email, user.phone, user.city, user.state]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      if (planFilter !== 'all' && user.plan !== planFilter) return false;
      if (stateFilter !== 'all' && user.state !== stateFilter) return false;
      if (engagementFilter === 'overLimit' && !isOverLimit(user)) return false;
      if (engagementFilter === 'atLimit' && !isAtLimit(user)) return false;
      if (engagementFilter === 'neverLoggedIn' && user.login_count > 0) return false;
      return true;
    });

    const bySortKey = (a: UserRow, b: UserRow) => {
      if (sortKey === 'devices') return deviceCountOf(b) - deviceCountOf(a);
      if (sortKey === 'logins') return (b.login_count ?? 0) - (a.login_count ?? 0);
      if (sortKey === 'lastLogin') {
        const aTime = a.last_login_at ? new Date(a.last_login_at).getTime() : 0;
        const bTime = b.last_login_at ? new Date(b.last_login_at).getTime() : 0;
        return bTime - aTime;
      }
      // 'recent': profiles já vêm ordenados por created_at desc do banco
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    };

    // Quem estourou o limite sobe para o topo em qualquer ordenação — são os
    // casos que exigem ação (upgrade de plano ou revisão de dispositivos).
    return [...list].sort((a, b) => {
      const priority = Number(isOverLimit(b)) - Number(isOverLimit(a));
      return priority !== 0 ? priority : bySortKey(a, b);
    });
  }, [users, searchTerm, planFilter, stateFilter, engagementFilter, sortKey]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-9 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  const freeUsers = users.filter(u => !isPaidPlan(u.plan)).length;
  const paidUsers = users.filter(u => isPaidPlan(u.plan)).length;
  // Pagou mas o perfil continua no gratuito — receita que não virou plano.
  const paymentWithoutPlan = users.filter(
    u => !isPaidPlan(u.plan) && (u.subscription_status || u.subscription_end_date),
  ).length;

  const totalDevices = users.reduce((sum, u) => sum + deviceCountOf(u), 0);
  const usersOverLimit = users.filter(isOverLimit).length;
  const usersAtLimit = users.filter(isAtLimit).length;
  const neverLoggedIn = users.filter(u => (u.login_count ?? 0) === 0).length;
  const avgDevices = users.length > 0 ? Math.round((totalDevices / users.length) * 10) / 10 : 0;

  const formatLastLogin = (value: string | null) => {
    if (!value) return 'Nunca logou';
    return new Date(value).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const selectedUser = filteredUsers.find(u => u.id === selectedUserId) || filteredUsers[0] || null;

  return (
    // Bloco de topo com altura natural; o SplitView consome a altura restante.
    <div className="flex flex-col gap-6 lg:h-full lg:min-h-0">
      <PageHeader
        eyebrow="Base de Usuários"
        title="Usuários"
        subtitle="Contas, dispositivos conectados e histórico de acesso, tudo em um lugar"
        actions={
          <span className="bg-volt text-volt-ink px-4 py-2 rounded-md font-display font-bold text-lg leading-none shadow-lg shadow-volt/20">
            {users.length}
          </span>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard index={0} icon={UserIcon} accent="info" label="Plano Gratuito" value={freeUsers} />
        <StatCard
          index={1}
          icon={Crown}
          accent="warning"
          label="Planos Pagos"
          value={paidUsers}
          sublabel={paymentWithoutPlan > 0 ? `${paymentWithoutPlan} pagou sem virar plano` : undefined}
        />
        <StatCard
          index={2}
          icon={Cpu}
          accent="volt"
          label="Dispositivos Conectados"
          value={totalDevices}
          sublabel={`${avgDevices} em média por conta`}
        />
        <StatCard
          index={3}
          icon={AlertTriangle}
          accent="danger"
          label="Estouraram o Limite"
          value={usersOverLimit}
          sublabel={`${usersAtLimit} exatamente no teto do plano`}
        />
      </div>

      {usersOverLimit > 0 && (
        <button
          onClick={() => setEngagementFilter(engagementFilter === 'overLimit' ? 'all' : 'overLimit')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border text-left transition-colors ${
            engagementFilter === 'overLimit'
              ? 'border-danger bg-danger-soft'
              : 'border-danger/40 bg-danger-soft hover:border-danger'
          }`}
        >
          <ShieldAlert className="w-5 h-5 text-danger shrink-0" />
          <span className="flex-1 text-sm text-fg">
            <strong className="font-semibold text-danger">
              {usersOverLimit} {usersOverLimit === 1 ? 'conta estourou' : 'contas estouraram'} o limite do
              plano
            </strong>
            <span className="text-muted">
              {' '}
              — mais dispositivos do que o plano permite.{' '}
              {engagementFilter === 'overLimit'
                ? 'Clique para ver todas as contas.'
                : 'Clique para filtrar só elas.'}
            </span>
          </span>
        </button>
      )}

      <Panel className="p-5 space-y-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-faint" />
          <input
            type="text"
            placeholder="Buscar por nome, email, telefone ou cidade..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className={`${inputClass} pl-10`}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <select value={planFilter} onChange={e => setPlanFilter(e.target.value)} className={selectClass}>
            <option value="all">Todos os Planos</option>
            {usedPlans.map(plan => (
              <option key={plan} value={plan}>
                {planLabel(plan, plans)}
              </option>
            ))}
          </select>

          <select value={stateFilter} onChange={e => setStateFilter(e.target.value)} className={selectClass}>
            <option value="all">Todos os Estados</option>
            {states.map(state => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>

          <select
            value={engagementFilter}
            onChange={e => setEngagementFilter(e.target.value as typeof engagementFilter)}
            className={selectClass}
          >
            <option value="all">Toda Atividade</option>
            <option value="overLimit">Estouraram o Limite</option>
            <option value="atLimit">No Limite de Dispositivos</option>
            <option value="neverLoggedIn">Nunca Fizeram Login</option>
          </select>

          <select
            value={sortKey}
            onChange={e => setSortKey(e.target.value as SortKey)}
            className={selectClass}
          >
            <option value="recent">Mais Recentes</option>
            <option value="devices">Ordenar por Dispositivos</option>
            <option value="lastLogin">Ordenar por Último Login</option>
            <option value="logins">Ordenar por Nº de Logins</option>
          </select>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted">
          <Filter className="w-3.5 h-3.5 shrink-0" />
          <span>
            Mostrando {filteredUsers.length} de {users.length} usuários
            {neverLoggedIn > 0 && ` · ${neverLoggedIn} nunca fizeram login`}
          </span>
        </div>
      </Panel>

      {filteredUsers.length === 0 ? (
        <Panel>
          <EmptyState
            icon={UserIcon}
            title="Nenhum usuário encontrado"
            description="Tente ajustar seus critérios de busca ou filtro."
          />
        </Panel>
      ) : (
        <div className="lg:flex-1 lg:min-h-0">
          <SplitView
            listLabel={`${filteredUsers.length} usuários cadastrados`}
            list={filteredUsers.map(user => {
              const isSelected = selectedUser?.id === user.id;
              const deviceCount = deviceCountOf(user);
              const over = isOverLimit(user);
              const atLimit = isAtLimit(user);

              return (
                <button
                  key={user.id}
                  onClick={() => setSelectedUserId(user.id)}
                  className={splitItemClass(isSelected, over)}
                >
                  <div className="shrink-0 h-9 w-9 bg-volt-soft rounded-full flex items-center justify-center">
                    <span className="text-volt font-semibold text-sm">
                      {user.full_name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-fg truncate">{user.full_name || 'Sem nome'}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge
                        variant={over ? 'danger' : atLimit ? 'warning' : 'neutral'}
                        icon={over ? <AlertTriangle className="w-3 h-3" /> : <Cpu className="w-3 h-3" />}
                      >
                        {deviceCount}/{user.device_limit}
                      </Badge>
                      <span className="text-[11px] text-faint truncate">
                        {formatLastLogin(user.last_login_at)}
                      </span>
                    </div>
                  </div>
                  {isPaidPlan(user.plan) && (
                    <Crown
                      className="w-3.5 h-3.5 text-warning shrink-0"
                      aria-label={planLabel(user.plan, plans)}
                    />
                  )}
                  <ChevronRight
                    className={`w-4 h-4 shrink-0 transition-colors ${isSelected ? 'text-volt' : 'text-faint'}`}
                  />
                </button>
              );
            })}
            detail={
              selectedUser && (
                <UserDetailPanel
                  user={selectedUser}
                  stats={selectedUser.stats}
                  categories={categories}
                  plans={plans}
                />
              )
            }
          />
        </div>
      )}
    </div>
  );
}
