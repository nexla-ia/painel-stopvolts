import { useEffect, useState } from 'react';
import { supabase, Profile } from '../lib/supabase';
import { Search, Filter, Crown, User as UserIcon } from 'lucide-react';

interface UsersProps {
  darkMode: boolean;
}

export default function Users({ darkMode }: UsersProps) {
  const [users, setUsers] = useState<Profile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [stateFilter, setStateFilter] = useState<string>('all');

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, planFilter, stateFilter]);

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
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = [...users];

    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (planFilter !== 'all') {
      filtered = filtered.filter(user => user.plan === planFilter);
    }

    if (stateFilter !== 'all') {
      filtered = filtered.filter(user => user.state === stateFilter);
    }

    setFilteredUsers(filtered);
  };

  const states = [...new Set(users.map(u => u.state).filter(Boolean))].sort();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const planStats = {
    basic: users.filter(u => u.plan === 'basic').length,
    premium: users.filter(u => u.plan === 'premium').length,
  };

  const roleStats = {
    admin: users.filter(u => u.role === 'admin').length,
    user: users.filter(u => u.role === 'user').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Usuários</h1>
          <p className={`mt-1 ${darkMode ? 'text-slate-300' : 'text-gray-600'}`}>Gerenciar todos os usuários cadastrados</p>
        </div>
        <div className="bg-blue-600 text-white px-5 py-2 rounded-lg font-semibold text-lg shadow-lg shadow-blue-600/50">
          {users.length} {users.length === 1 ? 'usuário' : 'usuários'}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`rounded-lg p-5 transition-all ${darkMode ? 'bg-slate-800/50 backdrop-blur-sm border border-slate-700 hover:bg-slate-800/70' : 'bg-white border border-gray-200 shadow-sm hover:shadow-md'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm mb-1 ${darkMode ? 'text-slate-400' : 'text-gray-600'}`}>Plano Básico</p>
              <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{planStats.basic}</p>
            </div>
            <div className="bg-blue-600 p-3 rounded-lg">
              <UserIcon className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>

        <div className={`rounded-lg p-5 transition-all ${darkMode ? 'bg-slate-800/50 backdrop-blur-sm border border-slate-700 hover:bg-slate-800/70' : 'bg-white border border-gray-200 shadow-sm hover:shadow-md'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm mb-1 ${darkMode ? 'text-slate-400' : 'text-gray-600'}`}>Plano Premium</p>
              <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{planStats.premium}</p>
            </div>
            <div className="bg-yellow-600 p-3 rounded-lg">
              <Crown className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>

        <div className={`rounded-lg p-5 transition-all ${darkMode ? 'bg-slate-800/50 backdrop-blur-sm border border-slate-700 hover:bg-slate-800/70' : 'bg-white border border-gray-200 shadow-sm hover:shadow-md'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm mb-1 ${darkMode ? 'text-slate-400' : 'text-gray-600'}`}>Administradores</p>
              <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{roleStats.admin}</p>
            </div>
            <div className="bg-red-600 p-3 rounded-lg">
              <UserIcon className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>

        <div className={`rounded-lg p-5 transition-all ${darkMode ? 'bg-slate-800/50 backdrop-blur-sm border border-slate-700 hover:bg-slate-800/70' : 'bg-white border border-gray-200 shadow-sm hover:shadow-md'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm mb-1 ${darkMode ? 'text-slate-400' : 'text-gray-600'}`}>Usuários Comuns</p>
              <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{roleStats.user}</p>
            </div>
            <div className="bg-green-600 p-3 rounded-lg">
              <UserIcon className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>
      </div>

      <div className={`rounded-lg p-5 ${darkMode ? 'bg-slate-800/50 backdrop-blur-sm border border-slate-700' : 'bg-white border border-gray-200 shadow-sm'}`}>
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${darkMode ? 'text-slate-400' : 'text-gray-400'}`} />
            <input
              type="text"
              placeholder="Buscar por email ou nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-10 pr-4 py-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                darkMode
                  ? 'bg-slate-700/50 border border-slate-600 text-white placeholder-slate-400'
                  : 'bg-white border border-gray-300 text-gray-900 placeholder-gray-400'
              }`}
            />
          </div>

          <div className="flex gap-3">
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className={`px-4 py-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                darkMode
                  ? 'bg-slate-700/50 border border-slate-600 text-white'
                  : 'bg-white border border-gray-300 text-gray-900'
              }`}
            >
              <option value="all">Todos os Planos</option>
              <option value="basic">Básico</option>
              <option value="premium">Premium</option>
            </select>

            <select
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              className={`px-4 py-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                darkMode
                  ? 'bg-slate-700/50 border border-slate-600 text-white'
                  : 'bg-white border border-gray-300 text-gray-900'
              }`}
            >
              <option value="all">Todos os Estados</option>
              {states.map(state => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
          </div>
        </div>

        <div className={`mt-4 flex items-center gap-2 text-sm ${darkMode ? 'text-slate-300' : 'text-gray-600'}`}>
          <Filter className="w-4 h-4" />
          <span>Mostrando {filteredUsers.length} de {users.length} usuários</span>
        </div>
      </div>

      <div className={`rounded-lg overflow-hidden ${darkMode ? 'bg-slate-800/50 backdrop-blur-sm border border-slate-700' : 'bg-white border border-gray-200 shadow-sm'}`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={`border-b ${darkMode ? 'bg-slate-700/50 border-slate-600' : 'bg-gray-50 border-gray-200'}`}>
              <tr>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                  Usuário
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                  Contato
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                  Localização
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                  Plano
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                  Perfil
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                  Registrado
                </th>
              </tr>
            </thead>
            <tbody className={`divide-y ${darkMode ? 'divide-slate-700' : 'divide-gray-200'}`}>
              {filteredUsers.map((user) => (
                <tr key={user.id} className={`transition-colors ${darkMode ? 'hover:bg-slate-700/30' : 'hover:bg-gray-50'}`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-blue-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold text-sm">
                          {user.full_name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                        </span>
                      </div>
                      <div className="ml-3">
                        <div className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {user.full_name || 'Sem nome'}
                        </div>
                        <div className={`text-sm ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`text-sm ${darkMode ? 'text-slate-300' : 'text-gray-900'}`}>{user.phone || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`text-sm ${darkMode ? 'text-slate-300' : 'text-gray-900'}`}>
                      {user.city && user.state ? `${user.city}, ${user.state}` : user.state || user.city || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium ${
                      user.plan === 'premium'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {user.plan === 'premium' && <Crown className="w-3 h-3" />}
                      {user.plan.charAt(0).toUpperCase() + user.plan.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium ${
                      user.role === 'admin'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-green-100 text-green-700'
                    }`}>
                      <UserIcon className="w-3 h-3" />
                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </span>
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                    {new Date(user.created_at).toLocaleDateString('pt-BR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <UserIcon className={`mx-auto h-12 w-12 ${darkMode ? 'text-slate-500' : 'text-gray-400'}`} />
            <h3 className={`mt-2 text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>Nenhum usuário encontrado</h3>
            <p className={`mt-1 text-sm ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Tente ajustar seus critérios de busca ou filtro.</p>
          </div>
        )}
      </div>
    </div>
  );
}
