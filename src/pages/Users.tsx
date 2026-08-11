import { useEffect, useMemo, useState } from 'react';
import { supabase, Profile } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';
import { Search, Filter, Crown, User as UserIcon, ShieldCheck } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';
import Panel from '../components/ui/Panel';
import Badge from '../components/ui/Badge';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import { inputClass, selectClass } from '../components/ui/classes';

export default function Users() {
  const toast = useToast();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [stateFilter, setStateFilter] = useState<string>('all');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Não foi possível carregar os usuários.');
    } finally {
      setLoading(false);
    }
  };

  const states = useMemo(
    () => [...new Set(users.map(u => u.state).filter((s): s is string => Boolean(s)))].sort(),
    [users]
  );

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      if (
        searchTerm &&
        !user.email.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !user.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        return false;
      }
      if (planFilter !== 'all' && user.plan !== planFilter) return false;
      if (stateFilter !== 'all' && user.state !== stateFilter) return false;
      return true;
    });
  }, [users, searchTerm, planFilter, stateFilter]);

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

  const planStats = {
    free: users.filter(u => u.plan === 'free').length,
    premium: users.filter(u => u.plan === 'premium').length,
  };

  const roleStats = {
    admin: users.filter(u => u.role === 'admin').length,
    user: users.filter(u => u.role === 'user').length,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Base de Usuários"
        title="Usuários"
        subtitle="Gerenciar todos os usuários cadastrados"
        actions={
          <span className="bg-volt text-volt-ink px-4 py-2 rounded-md font-display font-bold text-lg leading-none shadow-lg shadow-volt/20">
            {users.length}
          </span>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard index={0} icon={UserIcon} accent="info" label="Plano Básico" value={planStats.free} />
        <StatCard index={1} icon={Crown} accent="warning" label="Plano Premium" value={planStats.premium} />
        <StatCard index={2} icon={ShieldCheck} accent="danger" label="Administradores" value={roleStats.admin} />
        <StatCard index={3} icon={UserIcon} accent="success" label="Usuários Comuns" value={roleStats.user} />
      </div>

      <Panel className="p-5">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-faint" />
            <input
              type="text"
              placeholder="Buscar por email ou nome..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className={`${inputClass} pl-10`}
            />
          </div>

          <div className="flex gap-3">
            <select value={planFilter} onChange={e => setPlanFilter(e.target.value)} className={selectClass}>
              <option value="all">Todos os Planos</option>
              <option value="free">Básico</option>
              <option value="premium">Premium</option>
            </select>

            <select value={stateFilter} onChange={e => setStateFilter(e.target.value)} className={selectClass}>
              <option value="all">Todos os Estados</option>
              {states.map(state => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 text-sm text-muted">
          <Filter className="w-3.5 h-3.5" />
          <span>
            Mostrando {filteredUsers.length} de {users.length} usuários
          </span>
        </div>
      </Panel>

      <Panel className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-edge bg-edge/10">
              <tr>
                {['Usuário', 'Contato', 'Localização', 'Plano', 'Perfil', 'Registrado'].map(header => (
                  <th
                    key={header}
                    className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-faint"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-edge">
              {filteredUsers.map(user => (
                <tr key={user.id} className="transition-colors hover:bg-edge/10">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="shrink-0 h-9 w-9 bg-volt-soft rounded-full flex items-center justify-center">
                        <span className="text-volt font-semibold text-sm">
                          {user.full_name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                        </span>
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-fg">{user.full_name || 'Sem nome'}</div>
                        <div className="text-sm text-faint">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-muted">{user.phone || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-muted">
                      {user.city && user.state ? `${user.city}, ${user.state}` : user.state || user.city || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant={user.plan === 'premium' ? 'warning' : 'info'} icon={user.plan === 'premium' && <Crown className="w-3 h-3" />}>
                      {user.plan === 'premium' ? 'Premium' : 'Básico'}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant={user.role === 'admin' ? 'danger' : 'success'} icon={<UserIcon className="w-3 h-3" />}>
                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-faint">
                    {new Date(user.created_at).toLocaleDateString('pt-BR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <EmptyState
            icon={UserIcon}
            title="Nenhum usuário encontrado"
            description="Tente ajustar seus critérios de busca ou filtro."
          />
        )}
      </Panel>
    </div>
  );
}
