import React from 'react';
import { useFiscal } from '../context/FiscalContext';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  FileText, 
  Users, 
  Package, 
  CalendarClock, 
  LayoutGrid, 
  Megaphone,
  Briefcase,
  Settings,
  Code2,
  Sparkles
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed }) => {
  const { currentView, setCurrentView, invoices } = useFiscal();

  const pendingCount = invoices.filter(i => i.status === 'PENDENTE').length;

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'vendas', label: 'Vendas', icon: ShoppingCart },
    { 
      id: 'notas', 
      label: 'Notas Fiscais', 
      icon: FileText,
      badge: pendingCount > 0 ? pendingCount : undefined 
    },
    { id: 'clientes', label: 'Clientes', icon: Users },
    { id: 'produtos', label: 'Produtos', icon: Package },
    { id: 'fechamento', label: 'Fechamento', icon: CalendarClock, highlight: true },
    { id: 'apps', label: 'Apps', icon: LayoutGrid },
    { id: 'portal_contador', label: 'Portal do Contador', icon: Briefcase, tag: 'Novo' },
    { id: 'configuracoes', label: 'Regimes Tributários', icon: Settings },
    { id: 'api_docs', label: 'API & Webhooks', icon: Code2 },
  ];

  return (
    <aside 
      className={`bg-[#2c0853] text-white flex flex-col shrink-0 transition-all duration-300 z-30 select-none ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 gap-3 border-b border-purple-900/40">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-500 to-emerald-400 flex items-center justify-center font-bold text-white shadow-lg shadow-purple-950/50">
          <Sparkles className="w-5 h-5 text-amber-300" />
        </div>
        {!collapsed && (
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-xl font-extrabold tracking-tight text-white font-sans">Tributo<span className="text-emerald-400">Flow</span></span>
            </div>
            <span className="text-[10px] uppercase font-semibold text-purple-300 tracking-wider -mt-0.5">
              Inteligência Fiscal
            </span>
          </div>
        )}
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl font-medium text-sm transition-all duration-150 relative group ${
                isActive
                  ? 'bg-white text-[#2c0853] font-semibold shadow-md'
                  : 'text-purple-200 hover:text-white hover:bg-white/10'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-[#ff2e93]' : 'text-purple-300 group-hover:text-white'}`} />
              
              {!collapsed && (
                <span className="truncate flex-1 text-left">{item.label}</span>
              )}

              {!collapsed && item.badge && (
                <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-amber-500 text-white shrink-0">
                  {item.badge}
                </span>
              )}

              {!collapsed && item.tag && (
                <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                  {item.tag}
                </span>
              )}

              {collapsed && item.badge && (
                <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-[#2c0853]" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Refer & Earn Banner */}
      {!collapsed && (
        <div className="p-4 mx-3 mb-4 rounded-xl bg-gradient-to-br from-purple-900/60 to-purple-800/40 border border-purple-700/40 text-purple-200 text-xs">
          <div className="flex items-center gap-2 text-white font-semibold mb-1">
            <Sparkles className="w-4 h-4 text-pink-400" />
            <span>Indique e ganhe</span>
          </div>
          <p className="text-purple-300 text-[11px] leading-relaxed">
            Ganhe 20% recorrente indicando produtores digitais e contadores.
          </p>
        </div>
      )}

      {/* Footer Info */}
      <div className="p-4 border-t border-purple-900/40 text-xs text-purple-300/80 flex items-center justify-between">
        {!collapsed ? (
          <div>
            <p className="font-semibold text-white">TributoFlow v3.0</p>
            <p className="text-[10px] text-purple-300">NFS-e ABRASF & NF-e 4.0</p>
          </div>
        ) : (
          <Megaphone className="w-5 h-5 mx-auto text-purple-400" />
        )}
      </div>
    </aside>
  );
};
