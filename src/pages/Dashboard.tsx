import { useEffect, useState } from 'react';
import { supabase, Profile, PROFILE_COLUMNS } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';
import { Users, Tag, MapPin, TicketCheck, Crown, Clock } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';
import Panel from '../components/ui/Panel';
import Skeleton from '../components/ui/Skeleton';
import UserGrowthPanel from '../components/UserGrowthPanel';

interface Stats {
  totalUsers: number;
  basicUsers: number;
  premiumUsers: number;
  promoCodesUsedThisMonth: number;
  activePromoCodes: number;
  newUsersThisMonth: number;
  newUsersLastMonth: number;
}

export default function Dashboard() {
  const toast = useToast();
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    basicUsers: 0,
    premiumUsers: 0,
    promoCodesUsedThisMonth: 0,
    activePromoCodes: 0,
    newUsersThisMonth: 0,
    newUsersLastMonth: 0,
  });
  const [allUsers, setAllUsers] = useState<Profile[]>([]);
  const [recentUsers, setRecentUsers] = useState<Profile[]>([]);
  const [stateDistribution, setStateDistribution] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [usersResult, promoCodesResult] = await Promise.all([
        supabase.from('profiles').select(PROFILE_COLUMNS).returns<Profile[]>(),
        supabase.from('promo_codes').select('*', { count: 'exact', head: true }).eq('is_active', true),
      ]);

      if (usersResult.error) throw usersResult.error;

      const users = usersResult.data || [];

      const basicUsers = users.filter(u => u.plan === 'free').length;
      const premiumUsers = users.filter(u => u.plan === 'premium').length;

      const stateCount = users.reduce((acc: Record<string, number>, user: Profile) => {
        if (user.state) {
          acc[user.state] = (acc[user.state] || 0) + 1;
        }
        return acc;
      }, {});

      const now = new Date();
      const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

      const newUsersThisMonth = users.filter(u => new Date(u.created_at) >= firstDayThisMonth).length;
      const newUsersLastMonth = users.filter(u => {
        const userDate = new Date(u.created_at);
        return userDate >= firstDayLastMonth && userDate < firstDayThisMonth;
      }).length;

      const usersWithPromoThisMonth = users.filter(
        u => u.promo_code_used && new Date(u.created_at) >= firstDayThisMonth,
      ).length;

      setStats({
        totalUsers: users.length,
        basicUsers,
        premiumUsers,
        promoCodesUsedThisMonth: usersWithPromoThisMonth,
        activePromoCodes: promoCodesResult.count || 0,
        newUsersThisMonth,
        newUsersLastMonth,
      });

      setAllUsers(users);
      setRecentUsers(
        [...users]
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 5),
      );
      setStateDistribution(stateCount);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Não foi possível carregar os dados do painel.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-9 w-64 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  const growthPercentage =
    stats.newUsersLastMonth > 0
      ? Math.round(((stats.newUsersThisMonth - stats.newUsersLastMonth) / stats.newUsersLastMonth) * 100)
      : stats.newUsersThisMonth > 0
        ? 100
        : 0;

  const topStates = Object.entries(stateDistribution)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  return (
    // O <main> não rola no desktop, então o painel gerencia o próprio scroll.
    <div className="space-y-6 lg:h-full lg:overflow-y-auto lg:overscroll-contain">
      <PageHeader
        eyebrow="Visão Geral"
        title="Painel de Controle"
        subtitle="Métricas em tempo real do sistema"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          index={0}
          icon={Users}
          accent="volt"
          label="Total de Usuários"
          value={stats.totalUsers}
          sublabel={`${stats.newUsersThisMonth} novos este mês${growthPercentage !== 0 ? ` · ${growthPercentage > 0 ? '+' : ''}${growthPercentage}%` : ''}`}
        />
        <StatCard
          index={1}
          icon={Users}
          accent="info"
          label="Plano Básico"
          value={stats.basicUsers}
          sublabel={`${stats.totalUsers > 0 ? Math.round((stats.basicUsers / stats.totalUsers) * 100) : 0}% do total`}
        />
        <StatCard
          index={2}
          icon={Crown}
          accent="warning"
          label="Plano Premium"
          value={stats.premiumUsers}
          sublabel={`${stats.totalUsers > 0 ? Math.round((stats.premiumUsers / stats.totalUsers) * 100) : 0}% do total`}
        />
        <StatCard
          index={3}
          icon={TicketCheck}
          accent="success"
          label="Códigos Usados"
          value={stats.promoCodesUsedThisMonth}
          sublabel="Neste mês"
        />
      </div>

      <UserGrowthPanel users={allUsers} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Panel className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <MapPin className="w-4 h-4 text-muted" />
            <h2 className="font-display font-bold text-xl text-fg leading-none">Estados</h2>
          </div>
          {topStates.length > 0 ? (
            <div className="space-y-4">
              {topStates.map(([state, count]) => (
                <div key={state} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted w-10">{state}</span>
                  <div className="flex items-center gap-3 flex-1 ml-4">
                    <div className="flex-1 rounded-full h-1.5 bg-edge">
                      <div
                        className="bg-volt h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${(count / stats.totalUsers) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold w-8 text-right text-fg font-tabular">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-center py-8 text-muted">Nenhum dado disponível</p>
          )}
        </Panel>

        <Panel className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <Tag className="w-4 h-4 text-muted" />
            <h2 className="font-display font-bold text-xl text-fg leading-none">Códigos</h2>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3.5 rounded-md border border-success/25 bg-success-soft">
              <span className="text-sm font-medium text-muted">Códigos Ativos</span>
              <span className="text-xl font-bold text-success font-tabular">{stats.activePromoCodes}</span>
            </div>
            <div className="flex items-center justify-between p-3.5 rounded-md border border-info/25 bg-info-soft">
              <span className="text-sm font-medium text-muted">Total de Usuários</span>
              <span className="text-xl font-bold text-info font-tabular">{stats.totalUsers}</span>
            </div>
            <div className="flex items-center justify-between p-3.5 rounded-md border border-edge bg-edge/20">
              <span className="text-sm font-medium text-muted">Média por Código</span>
              <span className="text-xl font-bold text-fg font-tabular">
                {stats.activePromoCodes > 0 ? Math.round(stats.totalUsers / stats.activePromoCodes) : 0}
              </span>
            </div>
          </div>
        </Panel>

        <Panel className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <Clock className="w-4 h-4 text-muted" />
            <h2 className="font-display font-bold text-xl text-fg leading-none">Cadastros Recentes</h2>
          </div>
          {recentUsers.length > 0 ? (
            <div className="space-y-4">
              {recentUsers.map(user => (
                <div key={user.id} className="flex items-center gap-3">
                  <div className="shrink-0 h-8 w-8 bg-volt-soft rounded-full flex items-center justify-center">
                    <span className="text-volt font-semibold text-xs">
                      {(user.full_name || user.email)[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-fg truncate">{user.full_name || user.email}</p>
                    <p className="text-xs text-faint truncate">{user.email}</p>
                  </div>
                  <span className="text-xs text-faint font-mono shrink-0">
                    {new Date(user.created_at).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                    })}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-center py-8 text-muted">Nenhum cadastro recente</p>
          )}
        </Panel>
      </div>
    </div>
  );
}
