import { ReactNode, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  Zap,
  Users,
  Tag,
  LogOut,
  Menu,
  X,
  LayoutDashboard,
  Moon,
  Sun,
  DollarSign
} from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
  darkMode: boolean;
  setDarkMode: (value: boolean) => void;
}

export default function Layout({ children, currentPage, onNavigate, darkMode, setDarkMode }: LayoutProps) {
  const { signOut, profile } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigation = [
    { id: 'dashboard', name: 'Painel', icon: LayoutDashboard },
    { id: 'users', name: 'Usuários', icon: Users },
    { id: 'promo-codes', name: 'Códigos Promocionais', icon: Tag },
    { id: 'tariffs', name: 'Tarifas', icon: DollarSign },
  ];

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900' : 'bg-gray-50'}`}>
      <div className={`lg:hidden ${darkMode ? 'bg-slate-800/50 backdrop-blur-sm border-b border-slate-700' : 'bg-white border-b border-gray-200'} px-4 py-3 flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Energy Admin</span>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className={`p-2 rounded-lg ${darkMode ? 'hover:bg-slate-700/50 text-white' : 'hover:bg-gray-100 text-gray-900'}`}
        >
          {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      <div className="flex">
        <aside
          className={`
            fixed lg:sticky lg:top-0 inset-y-0 left-0 z-50 lg:h-screen
            w-64 ${darkMode ? 'bg-slate-800/95 backdrop-blur-sm border-r border-slate-700' : 'bg-white border-r border-gray-200'}
            transform transition-transform duration-300 ease-in-out
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}
        >
          <div className="h-full flex flex-col overflow-y-auto">
            <div className={`p-6 ${darkMode ? 'border-b border-slate-700' : 'border-b border-gray-200'}`}>
              <div className="flex items-center gap-3">
                <div className="bg-blue-600 p-2 rounded-lg">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Energy Admin</h1>
                  <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-600'}`}>Sistema de Gestão</p>
                </div>
              </div>
            </div>

            <nav className="flex-1 p-4 space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onNavigate(item.id);
                      setSidebarOpen(false);
                    }}
                    className={`
                      w-full flex items-center gap-3 px-4 py-3 rounded-lg
                      transition-colors font-medium
                      ${isActive
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/50'
                        : darkMode
                          ? 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                          : 'text-gray-700 hover:bg-gray-50'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5" />
                    {item.name}
                  </button>
                );
              })}
            </nav>

            <div className={`mt-auto p-4 ${darkMode ? 'border-t border-slate-700' : 'border-t border-gray-200'}`}>
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg mb-3 font-medium text-sm transition-colors ${
                  darkMode
                    ? 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {darkMode ? (
                  <>
                    <Sun className="w-4 h-4" />
                    Modo Claro
                  </>
                ) : (
                  <>
                    <Moon className="w-4 h-4" />
                    Modo Escuro
                  </>
                )}
              </button>
              <div className={`px-4 py-2 rounded-lg mb-2 ${darkMode ? 'bg-slate-700/50' : 'bg-gray-50'}`}>
                <p className={`text-xs mb-0.5 ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>Conectado como</p>
                <p className={`text-sm font-semibold truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {profile?.email}
                </p>
              </div>
              <button
                onClick={signOut}
                className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg transition-colors font-semibold text-sm ${
                  darkMode
                    ? 'text-red-400 hover:bg-red-500/10 hover:text-red-300'
                    : 'text-red-600 hover:bg-red-50'
                }`}
              >
                <LogOut className="w-4 h-4" />
                Sair da Conta
              </button>
            </div>
          </div>
        </aside>

        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <main className="flex-1 p-4 lg:p-8 min-h-screen">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
