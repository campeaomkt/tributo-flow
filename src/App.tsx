import React, { useState } from 'react';
import { FiscalProvider, useFiscal } from './context/FiscalContext';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { VendasView } from './components/VendasView';
import { NotasFiscaisView } from './components/NotasFiscaisView';
import { FechamentoView } from './components/FechamentoView';
import { AppsView } from './components/AppsView';
import { AccountantPortalView } from './components/AccountantPortalView';
import { ConfiguracoesFiscaisView } from './components/ConfiguracoesFiscaisView';
import { ApiDocsView } from './components/ApiDocsView';
import { ProdutosView } from './components/ProdutosView';
import { ClientesView } from './components/ClientesView';
import { DanfeModal } from './components/DanfeModal';
import { IntegrationModal } from './components/IntegrationModal';
import { SimulatorModal } from './components/SimulatorModal';
import { CompanySettingsModal } from './components/CompanySettingsModal';
import { SoapLogsModal } from './components/SoapLogsModal';

const MainLayout: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { 
    currentView, 
    selectedInvoiceForDanfe, 
    setSelectedInvoiceForDanfe,
    selectedInvoiceForSoapLogs,
    setSelectedInvoiceForSoapLogs,
    selectedPlatformForModal,
    setSelectedPlatformForModal,
    isSimulatorOpen,
    setIsSimulatorOpen,
    isCompanyModalOpen,
    setIsCompanyModalOpen,
  } = useFiscal();

  return (
    <div className="flex h-screen bg-[#f8f9fc] overflow-hidden text-slate-800 font-sans">
      {/* Sidebar with TributoFlow branding */}
      <Sidebar 
        collapsed={sidebarCollapsed} 
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)} />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {currentView === 'dashboard' && <DashboardView />}
          {currentView === 'vendas' && <VendasView />}
          {currentView === 'notas' && <NotasFiscaisView />}
          {currentView === 'fechamento' && <FechamentoView />}
          {currentView === 'apps' && <AppsView />}
          {currentView === 'portal_contador' && <AccountantPortalView />}
          {currentView === 'configuracoes' && <ConfiguracoesFiscaisView />}
          {currentView === 'api_docs' && <ApiDocsView />}
          {currentView === 'produtos' && <ProdutosView />}
          {currentView === 'clientes' && <ClientesView />}
        </main>
      </div>

      {/* DANFSE Inspection Modal */}
      {selectedInvoiceForDanfe && (
        <DanfeModal
          invoice={selectedInvoiceForDanfe}
          onClose={() => setSelectedInvoiceForDanfe(null)}
        />
      )}

      {/* Platform Integration Settings Modal (Kiwify, Hotmart, etc.) */}
      {selectedPlatformForModal && (
        <IntegrationModal
          platform={selectedPlatformForModal}
          onClose={() => setSelectedPlatformForModal(null)}
        />
      )}

      {/* Interactive Webhook Simulator */}
      {isSimulatorOpen && (
        <SimulatorModal
          onClose={() => setIsSimulatorOpen(false)}
        />
      )}

      {/* Dados da Empresa Modal matching user screenshot */}
      {isCompanyModalOpen && (
        <CompanySettingsModal
          onClose={() => setIsCompanyModalOpen(false)}
        />
      )}

      {/* Direct Municipal SOAP Logs & XMLDSig Modal */}
      {selectedInvoiceForSoapLogs && (
        <SoapLogsModal
          invoice={selectedInvoiceForSoapLogs}
          onClose={() => setSelectedInvoiceForSoapLogs(null)}
        />
      )}
    </div>
  );
};

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || 'Erro inesperado na interface.',
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#f8f9fc] flex items-center justify-center p-6 font-sans text-slate-800">
          <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-lg p-6 space-y-4">
            <h1 className="text-lg font-bold text-slate-900">Ops! Ocorreu um erro inesperado</h1>
            <p className="text-sm text-slate-600">
              O aplicativo encontrou uma falha ao renderizar os dados locais. Suas credenciais salvas no cofre permanecem protegidas.
            </p>
            <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-xs font-mono text-rose-700 break-words">
              {this.state.errorMessage}
            </div>
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 bg-[#2c0853] hover:bg-[#3d0e70] text-white text-sm font-semibold py-2.5 px-4 rounded-xl transition-colors"
              >
                Recarregar aplicativo
              </button>
              <button
                onClick={() => {
                  try {
                    localStorage.removeItem('tributoflow_sales_v8');
                    localStorage.removeItem('tributoflow_invoices_v8');
                    localStorage.removeItem('tributoflow_sales_v7');
                    localStorage.removeItem('tributoflow_invoices_v7');
                  } catch {
                    // ignore
                  }
                  window.location.reload();
                }}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm font-medium transition-colors"
              >
                Limpar cache antigo
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  return (
    <AppErrorBoundary>
      <FiscalProvider>
        <MainLayout />
      </FiscalProvider>
    </AppErrorBoundary>
  );
}
