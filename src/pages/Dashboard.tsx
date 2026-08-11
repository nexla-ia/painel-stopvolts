import { useEffect, useState } from 'react';
import { supabase, Profile } from '../lib/supabase';
import { Users, Tag, TrendingUp, MapPin, TicketCheck } from 'lucide-react';

interface Stats {
  totalUsers: number;
  basicUsers: number;
  premiumUsers: number;
  promoCodesUsedThisMonth: number;
  activePromoCodes: number;
  newUsersThisMonth: number;
  newUsersLastMonth: number;
}

interface DashboardProps {
  darkMode: boolean;
}

export default function Dashboard({ darkMode }: DashboardProps) {
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
  const [stateDistribution, setStateDistribution] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [
        usersResult,
        promoCodesResult,
      ] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase.from('promo_codes').select('*', { count: 'exact', head: true }).eq('is_active', true),
      ]);

      const users = usersResult.data || [];

      const basicUsers = users.filter(u => u.plan === 'basic').length;
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

      const usersWithPromoThisMonth = users.filter(u =>
        u.promo_code && new Date(u.created_at) >= firstDayThisMonth
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
      setStateDistribution(stateCount);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const growthPercentage = stats.newUsersLastMonth > 0
    ? Math.round(((stats.newUsersThisMonth - stats.newUsersLastMonth) / stats.newUsersLastMonth) * 100)
    : 0;

  const topStates = Object.entries(stateDistribution)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Painel de Controle</h1>
        <p className={`mt-1 ${darkMode ? 'text-slate-300' : 'text-gray-600'}`}>Visão geral do sistema</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className={`rounded-xl p-6 transition-all ${darkMode ? 'bg-slate-800/50 backdrop-blur-sm border border-slate-700 hover:bg-slate-800/70' : 'bg-white border border-gray-200 shadow-sm hover:shadow-md'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="bg-blue-600 p-3 rounded-lg">
              <Users className="w-6 h-6 text-white" />
            </div>
            <TrendingUp className={`w-5 h-5 ${growthPercentage >= 0 ? 'text-green-400' : 'text-red-400'}`} />
          </div>
          <p className={`text-sm mb-1 ${darkMode ? 'text-slate-400' : 'text-gray-600'}`}>Total de Usuários</p>
          <p className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{stats.totalUsers}</p>
          <p className={`text-xs mt-2 ${darkMode ? 'text-slate-500' : 'text-gray-500'}`}>
            {stats.newUsersThisMonth} novos este mês
            {growthPercentage !== 0 && (
              <span className={`ml-1 ${growthPercentage >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                ({growthPercentage > 0 ? '+' : ''}{growthPercentage}%)
              </span>
            )}
          </p>
        </div>

        <div className={`rounded-xl p-6 transition-all ${darkMode ? 'bg-slate-800/50 backdrop-blur-sm border border-slate-700 hover:bg-slate-800/70' : 'bg-white border border-gray-200 shadow-sm hover:shadow-md'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="bg-green-600 p-3 rounded-lg">
              <Users className="w-6 h-6 text-white" />
            </div>
          </div>
          <p className={`text-sm mb-1 ${darkMode ? 'text-slate-400' : 'text-gray-600'}`}>Plano Básico</p>
          <p className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{stats.basicUsers}</p>
          <p className={`text-xs mt-2 ${darkMode ? 'text-slate-500' : 'text-gray-500'}`}>
            {stats.totalUsers > 0 ? Math.round((stats.basicUsers / stats.totalUsers) * 100) : 0}% do total
          </p>
        </div>

        <div className={`rounded-xl p-6 transition-all ${darkMode ? 'bg-slate-800/50 backdrop-blur-sm border border-slate-700 hover:bg-slate-800/70' : 'bg-white border border-gray-200 shadow-sm hover:shadow-md'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="bg-yellow-600 p-3 rounded-lg">
              <Users className="w-6 h-6 text-white" />
            </div>
          </div>
          <p className={`text-sm mb-1 ${darkMode ? 'text-slate-400' : 'text-gray-600'}`}>Plano Premium</p>
          <p className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{stats.premiumUsers}</p>
          <p className={`text-xs mt-2 ${darkMode ? 'text-slate-500' : 'text-gray-500'}`}>
            {stats.totalUsers > 0 ? Math.round((stats.premiumUsers / stats.totalUsers) * 100) : 0}% do total
          </p>
        </div>

        <div className={`rounded-xl p-6 transition-all ${darkMode ? 'bg-slate-800/50 backdrop-blur-sm border border-slate-700 hover:bg-slate-800/70' : 'bg-white border border-gray-200 shadow-sm hover:shadow-md'}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="bg-purple-600 p-3 rounded-lg">
              <TicketCheck className="w-6 h-6 text-white" />
            </div>
          </div>
          <p className={`text-sm mb-1 ${darkMode ? 'text-slate-400' : 'text-gray-600'}`}>Códigos Usados</p>
          <p className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{stats.promoCodesUsedThisMonth}</p>
          <p className={`text-xs mt-2 ${darkMode ? 'text-slate-500' : 'text-gray-500'}`}>
            Neste mês
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={`rounded-xl p-6 ${darkMode ? 'bg-slate-800/50 backdrop-blur-sm border border-slate-700' : 'bg-white border border-gray-200 shadow-sm'}`}>
          <div className="flex items-center gap-2 mb-6">
            <MapPin className={`w-5 h-5 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`} />
            <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Estados com Mais Usuários</h2>
          </div>
          {topStates.length > 0 ? (
            <div className="space-y-4">
              {topStates.map(([state, count]) => (
                <div key={state} className="flex items-center justify-between">
                  <span className={`text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>{state}</span>
                  <div className="flex items-center gap-3 flex-1 ml-4">
                    <div className={`flex-1 rounded-full h-2 ${darkMode ? 'bg-slate-700' : 'bg-gray-200'}`}>
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${(count / stats.totalUsers) * 100}%` }}
                      ></div>
                    </div>
                    <span className={`text-sm font-bold w-8 text-right ${darkMode ? 'text-white' : 'text-gray-900'}`}>{count}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className={`text-sm text-center py-8 ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Nenhum dado disponível</p>
          )}
        </div>

        <div className={`rounded-xl p-6 ${darkMode ? 'bg-slate-800/50 backdrop-blur-sm border border-slate-700' : 'bg-white border border-gray-200 shadow-sm'}`}>
          <div className="flex items-center gap-2 mb-6">
            <Tag className={`w-5 h-5 ${darkMode ? 'text-slate-300' : 'text-gray-700'}`} />
            <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Resumo de Códigos</h2>
          </div>
          <div className="space-y-4">
            <div className={`flex items-center justify-between p-4 rounded-lg border ${darkMode ? 'bg-green-600/20 border-green-600/30' : 'bg-green-50 border-green-200'}`}>
              <span className={`text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>Códigos Ativos</span>
              <span className={`text-2xl font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>{stats.activePromoCodes}</span>
            </div>
            <div className={`flex items-center justify-between p-4 rounded-lg border ${darkMode ? 'bg-blue-600/20 border-blue-600/30' : 'bg-blue-50 border-blue-200'}`}>
              <span className={`text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>Total de Usuários</span>
              <span className={`text-2xl font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>{stats.totalUsers}</span>
            </div>
            <div className={`flex items-center justify-between p-4 rounded-lg border ${darkMode ? 'bg-slate-700/50 border-slate-600' : 'bg-gray-50 border-gray-200'}`}>
              <span className={`text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-gray-700'}`}>Média por Código</span>
              <span className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {stats.activePromoCodes > 0 ? Math.round(stats.totalUsers / stats.activePromoCodes) : 0}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
