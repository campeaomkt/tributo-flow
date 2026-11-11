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

export default function App() {
  return (
    <FiscalProvider>
      <MainLayout />
    </FiscalProvider>
  );
}
