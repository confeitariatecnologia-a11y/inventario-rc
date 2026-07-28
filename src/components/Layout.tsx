import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Menu, Bell } from 'lucide-react';
import Sidebar from './Sidebar';

const ROUTE_TITLES: Record<string, { title: string; subtitle?: string }> = {
  '/': { title: 'Painel de Controle', subtitle: 'Visão geral dos ativos e documentação' },
  '/inventario': { title: 'Inventário', subtitle: 'Gestão de ativos físicos e de sistema' },
  '/manutencao': { title: 'Manutenção', subtitle: 'Ativos em manutenção e preventivas' },
  '/documentacao': { title: 'Documentação', subtitle: 'SOPs e documentação técnica' },
  '/qr-code': { title: 'QR Code', subtitle: 'Geração e leitura de QR Code' },
  '/relatorios': { title: 'Relatórios', subtitle: 'Análise consolidada do inventário' },
  '/configuracoes': { title: 'Configurações', subtitle: 'Unidades, categorias e sistema' },
};

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const routeInfo =
    ROUTE_TITLES[location.pathname] ||
    (location.pathname.startsWith('/inventario/')
      ? { title: 'Detalhes do Ativo', subtitle: 'Ficha técnica e histórico' }
      : location.pathname.startsWith('/documentacao/')
      ? { title: 'Documento', subtitle: 'Documento técnico ou SOP' }
      : { title: 'Richesse', subtitle: 'Sistema de Inventário & Documentação' });

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">
      <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-6 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-lg text-slate-600 hover:bg-slate-100"
              aria-label="Abrir menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-base lg:text-lg font-semibold text-slate-900 truncate">{routeInfo.title}</h1>
              {routeInfo.subtitle && (
                <p className="text-xs text-slate-500 truncate hidden sm:block">{routeInfo.subtitle}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button className="relative p-2 rounded-lg text-slate-600 hover:bg-slate-100" aria-label="Notificações">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-orange-500 rounded-full ring-2 ring-white" />
            </button>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-sm font-semibold text-white">
              GR
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
