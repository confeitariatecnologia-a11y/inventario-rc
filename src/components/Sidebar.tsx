import { useState } from 'react';
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
  ClipboardCheck,
  Laptop,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Shield,
  KeyRound,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { ChangePasswordModal } from '@/components';

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

interface NavGroup {
  title: string;
  items: {
    to: string;
    label: string;
    icon: typeof LayoutDashboard;
    end?: boolean;
    badge?: string;
    subItems?: { to: string; label: string }[];
  }[];
}

export default function Sidebar({ mobileOpen, onCloseMobile }: SidebarProps) {
  const { user, access, signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [openSubMenus, setOpenSubMenus] = useState<Record<string, boolean>>({
    '/ordens-servico': false,
    '/ti-software': false,
  });
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  const userInitials = (access?.full_name || user?.email || 'U')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const roleLabel =
    access?.role === 'admin'
      ? 'Administrador Master'
      : access?.role === 'gestor'
      ? 'Gestor de Loja'
      : access?.role === 'tecnico'
      ? 'Técnico de Campo'
      : access?.role === 'auditor'
      ? 'Auditor de Estoque'
      : 'Consulta Geral';

  const navGroups: NavGroup[] = [
    {
      title: 'PRINCIPAL',
      items: [
        { to: '/', label: 'Início', icon: LayoutDashboard, end: true },
        { to: '/inventario', label: 'Inventário', icon: Boxes },
        {
          to: '/ordens-servico',
          label: 'Ordens de Serviço',
          icon: Wrench,
          badge: 'SLA',
        },
        {
          to: '/auditoria-campo',
          label: 'Auditoria em Campo',
          icon: ClipboardCheck,
        },
      ],
    },
    {
      title: 'TI & GESTÃO',
      items: [
        {
          to: '/ti-software',
          label: 'Módulo de TI & Licenças',
          icon: Laptop,
        },
        {
          to: '/qr-code',
          label: 'QR Code & Etiquetas',
          icon: QrCode,
        },
        {
          to: '/relatorios',
          label: 'Relatórios & Contábil',
          icon: BarChart3,
        },
        {
          to: '/documentacao',
          label: 'Documentação Técnica',
          icon: FileText,
        },
      ],
    },
    {
      title: 'SISTEMA',
      items: [
        {
          to: '/configuracoes',
          label: 'Configurações',
          icon: Settings,
        },
      ],
    },
  ];

  function toggleSubMenu(to: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setOpenSubMenus((prev) => ({ ...prev, [to]: !prev[to] }));
  }

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-30 lg:hidden animate-fade-in"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed lg:static top-0 left-0 h-full bg-slate-900 text-slate-300 z-40 flex flex-col transition-all duration-300 ease-in-out border-r border-slate-800/80 shadow-2xl ${
          mobileOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'
        } ${collapsed ? 'lg:w-[76px]' : 'lg:w-64'}`}
      >
        {/* Collapse Toggle Button (Desktop) - Floating on Edge */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex absolute -right-3.5 top-6 items-center justify-center w-7 h-7 rounded-full bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors shadow-sm z-50"
          title={collapsed ? 'Expandir Menu' : 'Recolher Menu'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        {/* Header with Brand */}
        <div className="h-18 flex items-center justify-between px-3.5 py-3 border-b border-slate-800/80 bg-slate-950/40 relative">
          <div className={`flex items-center gap-3 min-w-0 overflow-hidden ${collapsed ? 'mx-auto' : ''}`}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-primary-500/25 flex-shrink-0">
              <Boxes className="w-5 h-5" />
            </div>
            {!collapsed && (
              <div className="min-w-0 animate-fade-in">
                <span className="font-extrabold text-white text-sm tracking-tight flex items-center gap-1.5">
                  Richesse <span className="px-1.5 py-0.2 text-[9px] font-bold bg-primary-500/20 text-primary-400 border border-primary-500/30 rounded">PRO</span>
                </span>
                <p className="text-[11px] text-slate-400 truncate">Gestão Patrimonial & TI</p>
              </div>
            )}
          </div>

          <div className="flex items-center">
            {/* Close Button (Mobile) */}
            <button
              onClick={onCloseMobile}
              className="lg:hidden text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              aria-label="Fechar menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* User Card (Expanded Mode) */}
        {!collapsed ? (
          <div className="p-3 mx-3 my-2.5 rounded-xl bg-slate-800/50 border border-slate-800 flex items-center gap-3 animate-fade-in">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-primary-600 to-indigo-500 flex items-center justify-center font-bold text-xs text-white shadow-sm flex-shrink-0">
              {userInitials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white truncate">{access?.full_name || 'Usuário'}</p>
              <p className="text-[10px] text-primary-400 font-medium truncate flex items-center gap-1">
                <Shield className="w-2.5 h-2.5" />
                {roleLabel}
              </p>
            </div>
          </div>
        ) : (
          <div className="py-3 flex justify-center border-b border-slate-800/60">
            <div
              className="w-9 h-9 rounded-full bg-gradient-to-tr from-primary-600 to-indigo-500 flex items-center justify-center font-bold text-xs text-white shadow-sm cursor-pointer"
              title={`${access?.full_name || 'Usuário'} (${roleLabel})`}
            >
              {userInitials}
            </div>
          </div>
        )}

        {/* Navigation Groups */}
        <nav className="flex-1 px-2.5 py-2 space-y-4 overflow-y-auto overflow-x-hidden custom-scrollbar">
          {navGroups.map((group) => {
            const filteredItems = group.items.filter(
              (item) => item.to !== '/configuracoes' || access?.role === 'admin'
            );
            if (filteredItems.length === 0) return null;

            return (
              <div key={group.title} className="space-y-1">
                {/* Group Title */}
                {!collapsed ? (
                  <p className="px-3 text-[10px] font-bold text-slate-500 tracking-wider uppercase mb-1.5 animate-fade-in">
                    {group.title}
                  </p>
                ) : (
                  <div className="w-full h-px bg-slate-800/80 my-2" />
                )}

                {/* Items */}
                {filteredItems.map((item) => {
                  const Icon = item.icon;
                  const hasSub = Boolean(item.subItems && item.subItems.length > 0);
                  const isSubOpen = openSubMenus[item.to];

                  return (
                    <div key={item.to} className="relative group">
                      <NavLink
                        to={item.to}
                        end={item.end}
                        onClick={onCloseMobile}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 group ${
                            isActive
                              ? 'bg-primary-600 text-white shadow-md shadow-primary-600/30'
                              : 'text-slate-400 hover:bg-slate-800/80 hover:text-white'
                          } ${collapsed ? 'justify-center px-0' : ''}`
                        }
                      >
                        <Icon className="w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-105" strokeWidth={2} />
                        
                        {!collapsed && (
                          <span className="flex-1 truncate animate-fade-in">{item.label}</span>
                        )}

                        {!collapsed && item.badge && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-primary-500/30 text-primary-300 border border-primary-400/20">
                            {item.badge}
                          </span>
                        )}

                        {!collapsed && hasSub && (
                          <button
                            type="button"
                            onClick={(e) => toggleSubMenu(item.to, e)}
                            className="p-0.5 rounded text-slate-400 hover:text-white"
                          >
                            <ChevronDown
                              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                                isSubOpen ? 'rotate-180' : ''
                              }`}
                            />
                          </button>
                        )}
                      </NavLink>

                      {/* Tooltip in Collapsed Mode (Figma Style) */}
                      {collapsed && (
                        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-3 py-1.5 bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-xl border border-slate-700 pointer-events-none opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50 whitespace-nowrap">
                          {item.label}
                          {item.badge && (
                            <span className="ml-1.5 px-1 py-0.2 rounded text-[9px] bg-primary-500 text-white">
                              {item.badge}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Footer with Logout & Theme style action */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/40 space-y-1">
          <button
            type="button"
            onClick={() => setIsPasswordModalOpen(true)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800/80 hover:text-white transition-colors ${
              collapsed ? 'justify-center px-0' : ''
            }`}
            title="Alterar Senha"
          >
            <KeyRound className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span className="truncate">Alterar Senha</span>}
          </button>
          <button
            type="button"
            onClick={signOut}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors ${
              collapsed ? 'justify-center px-0' : ''
            }`}
            title="Encerrar Sessão"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span className="truncate">Sair do Sistema</span>}
          </button>
        </div>
      </aside>

      <ChangePasswordModal 
        isOpen={isPasswordModalOpen} 
        onClose={() => setIsPasswordModalOpen(false)} 
      />
    </>
  );
}
