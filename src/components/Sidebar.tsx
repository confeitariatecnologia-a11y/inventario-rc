import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Boxes,
  Wrench,
  FileText,
  BarChart3,
  QrCode,
  Settings,
  X,
  LogOut,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const navItems = [
  { to: '/', label: 'Início', icon: LayoutDashboard, end: true },
  { to: '/inventario', label: 'Inventário', icon: Boxes },
  { to: '/manutencao', label: 'Manutenção', icon: Wrench },
  { to: '/documentacao', label: 'Documentação', icon: FileText },
  { to: '/qr-code', label: 'QR Code', icon: QrCode },
  { to: '/relatorios', label: 'Relatórios', icon: BarChart3 },
  { to: '/configuracoes', label: 'Configurações', icon: Settings },
];

export default function Sidebar({ mobileOpen, onCloseMobile }: SidebarProps) {
  const { user, signOut } = useAuth();

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 z-30 lg:hidden animate-fade-in"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed lg:static top-0 left-0 h-full w-64 bg-slate-900 text-slate-300 z-40 flex flex-col transition-transform duration-300 ease-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Logo header */}
        <div className="h-20 flex items-center justify-between px-4 border-b border-slate-800">
          <div className="flex-1 flex items-center justify-center">
            <img
              src="/ChatGPT_Image_27_de_jul._de_2026,_14_45_58.png"
              alt="Sendix Inventario"
              className="h-12 w-auto object-contain"
              style={{ filter: 'brightness(0) invert(1)' }}
            />
          </div>
          <button
            onClick={onCloseMobile}
            className="lg:hidden text-slate-400 hover:text-white p-1 rounded flex-shrink-0"
            aria-label="Fechar menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onCloseMobile}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium group ${
                    isActive
                      ? 'bg-primary-600 text-white shadow-md'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                <Icon className="w-5 h-5 flex-shrink-0" strokeWidth={2} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-sm font-semibold text-slate-300">
              GR
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">Grupo Richesse</p>
              <p className="text-slate-500 text-xs truncate">F&B · Confeitaria</p>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-slate-400 text-xs truncate">{user?.email ?? 'Usuário'}</p>
            </div>
            <button
              type="button"
              onClick={signOut}
              className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-200 bg-slate-800 rounded-lg hover:bg-slate-700"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
