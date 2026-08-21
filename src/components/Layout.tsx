import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import {
  Zap,
  Users,
  Tag,
  LogOut,
  Menu,
  LayoutDashboard,
  Moon,
  Sun,
  DollarSign,
} from 'lucide-react';

const navigation = [
  { to: '/', label: 'Painel', icon: LayoutDashboard, end: true },
  { to: '/users', label: 'Usuários', icon: Users, end: false },
  { to: '/promo-codes', label: 'Códigos Promocionais', icon: Tag, end: false },
  { to: '/tariffs', label: 'Tarifas', icon: DollarSign, end: false },
];

export default function Layout() {
  const { signOut, profile } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navLinkClass = (isActive: boolean) =>
    `w-full flex items-center gap-3 px-4 py-2.5 rounded-md transition-colors text-sm font-medium ${
      isActive
        ? 'bg-volt text-volt-ink shadow-lg shadow-volt/20'
        : 'text-muted hover:bg-edge/40 hover:text-fg'
    }`;

  return (
    // App shell de altura fixa: a janela nunca rola. Só o <main> rola por dentro,
    // então a sidebar e o cabeçalho mobile ficam sempre visíveis.
    <div className="h-screen flex flex-col overflow-hidden bg-ink">
      <div className="lg:hidden bg-panel border-b border-edge px-4 py-3 flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center gap-2.5">
          <div className="bg-volt p-1.5 rounded-md">
            <Zap className="w-4 h-4 text-volt-ink" fill="currentColor" />
          </div>
          <span className="font-display font-bold text-lg text-fg leading-none">StopVolts</span>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="text-fg"
          aria-label="Abrir menu"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      <div className="flex flex-1 min-h-0">
        <aside
          className={`
            fixed lg:static inset-y-0 left-0 z-40 lg:h-full shrink-0
            w-64 bg-panel border-r border-edge
            transform transition-transform duration-300 ease-in-out
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}
        >
          <div className="h-full flex flex-col overflow-y-auto">
            <div className="p-6 border-b border-edge hidden lg:block">
              <div className="flex items-center gap-3">
                <div className="bg-volt p-2 rounded-md">
                  <Zap className="w-5 h-5 text-volt-ink" fill="currentColor" />
                </div>
                <div>
                  <h1 className="font-display font-bold text-xl text-fg leading-none">StopVolts</h1>
                  <p className="text-[11px] mt-0.5 font-mono uppercase tracking-wider text-faint">Painel Admin</p>
                </div>
              </div>
            </div>

            <nav className="flex-1 p-4 space-y-1">
              <p className="px-4 pb-2 text-[11px] font-semibold uppercase tracking-wider text-faint">Navegação</p>
              {navigation.map(item => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) => navLinkClass(isActive)}
                  >
                    <Icon className="w-[18px] h-[18px]" />
                    {item.label}
                  </NavLink>
                );
              })}
            </nav>

            <div className="mt-auto p-4 border-t border-edge">
              <button
                onClick={toggleDarkMode}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-md mb-3 font-medium text-sm text-muted bg-edge/30 hover:bg-edge/50 hover:text-fg transition-colors"
              >
                {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                {darkMode ? 'Modo Claro' : 'Modo Escuro'}
              </button>
              <div className="px-4 py-2.5 rounded-md mb-2 bg-edge/20">
                <p className="text-[11px] mb-0.5 text-faint">Conectado como</p>
                <p className="text-sm font-semibold truncate text-fg">{profile?.email}</p>
              </div>
              <button
                onClick={signOut}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md transition-colors font-semibold text-sm text-danger hover:bg-danger-soft"
              >
                <LogOut className="w-4 h-4" />
                Sair da Conta
              </button>
            </div>
          </div>
        </aside>

        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/60 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* No mobile o próprio <main> rola. No desktop ele fica travado e cada
            página decide o que rola por dentro — nas telas lista/detalhe só os
            dois painéis rolam, mantendo cabeçalho e filtros sempre visíveis. */}
        <main className="flex-1 min-w-0 overflow-y-auto lg:overflow-hidden p-4 lg:p-8">
          <div className="max-w-7xl mx-auto lg:h-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
