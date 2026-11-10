import React, { useState } from 'react';
import { useFiscal } from '../context/FiscalContext';
import { 
  Menu, 
  Bell, 
  HelpCircle, 
  ChevronDown, 
  Zap, 
  Building2, 
  RotateCcw,
  CheckCircle2,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';

interface NavbarProps {
  onToggleSidebar: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar }) => {
  const { company, setIsSimulatorOpen, setCurrentView, resetToDefault } = useFiscal();
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Left side: Hamburger + Company Selector */}
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          title="Alternar menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
          <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center border border-purple-200 shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800 text-sm tracking-tight font-sans">
                {company.corporateName}
              </span>
              <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                {company.taxRegime === 'SIMPLES_NACIONAL' ? 'Simples Nacional' : company.taxRegime}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>CNPJ: {company.cnpj}</span>
              <span>•</span>
              <span className="text-emerald-600 flex items-center gap-1 font-medium">
                <ShieldCheck className="w-3.5 h-3.5" /> Certificado A1 Válido
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side: Actions & User Info */}
      <div className="flex items-center gap-3">
        {/* Simulator Button */}
        <button
          onClick={() => setIsSimulatorOpen(true)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-medium text-xs shadow-sm shadow-purple-600/30 transition-all transform active:scale-95"
        >
          <Zap className="w-4 h-4 text-amber-300 animate-pulse" />
          <span>Simular Venda Webhook</span>
        </button>

        {/* Portal do Contador Link */}
        <button
          onClick={() => setCurrentView('portal_contador')}
          className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5 text-purple-600" />
          <span>Link do Contador</span>
        </button>

        {/* Help icon */}
        <button 
          onClick={() => alert("Central de Ajuda TributoFlow: Documentação completa para emissão de notas fiscais, regras de alíquotas do Simples Nacional/Lucro Presumido e integração com Kiwify e Hotmart.")}
          className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          title="Central de Ajuda"
        >
          <HelpCircle className="w-5 h-5" />
        </button>

        {/* Notifications */}
        <div className="relative">
          <button 
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="p-2 text-slate-500 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors relative"
            title="Notificações fiscais"
          >
            <Bell className="w-5 h-5" />
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 p-4 z-50 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="font-bold text-slate-800 text-sm">Notificações Recentes</span>
                <span className="text-[10px] text-purple-600 font-semibold cursor-pointer">Marcar como lidas</span>
              </div>
              <div className="py-4 text-center text-slate-400 text-xs">
                Nenhuma notificação pendente no momento.
              </div>
            </div>
          )}
        </div>

        {/* User profile */}
        <div className="relative pl-2 border-l border-slate-200">
          <button
            onClick={() => setUserDropdownOpen(!userDropdownOpen)}
            className="flex items-center gap-2.5 p-1 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-violet-600 text-white font-bold text-xs flex items-center justify-center shadow-sm">
              TF
            </div>
            <div className="hidden lg:block text-left">
              <p className="text-xs font-semibold text-slate-800 leading-tight">Minha Conta</p>
              <p className="text-[10px] text-slate-400">Administrador</p>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </button>

          {userDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 text-xs">
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="font-semibold text-slate-800">Eliab Campos dos Santos</p>
                <p className="text-slate-500 text-[11px]">campeao.mkt.user@gmail.com</p>
              </div>
              <button
                onClick={() => {
                  setCurrentView('configuracoes');
                  setUserDropdownOpen(false);
                }}
                className="w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2"
              >
                <Building2 className="w-4 h-4 text-slate-400" />
                <span>Dados da Empresa e Fiscais</span>
              </button>
              <button
                onClick={() => {
                  setCurrentView('apps');
                  setUserDropdownOpen(false);
                }}
                className="w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2"
              >
                <Zap className="w-4 h-4 text-slate-400" />
                <span>Minhas Integrações</span>
              </button>
              <button
                onClick={() => {
                  if (confirm('Deseja resetar os dados demonstrativos para o estado original?')) {
                    resetToDefault();
                  }
                  setUserDropdownOpen(false);
                }}
                className="w-full text-left px-4 py-2 hover:bg-rose-50 text-rose-600 flex items-center gap-2 border-t border-slate-100"
              >
                <RotateCcw className="w-4 h-4 text-rose-500" />
                <span>Resetar Dados Demo</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
