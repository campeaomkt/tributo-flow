import React from 'react';
import { useFiscal } from '../context/FiscalContext';
import { PlatformConfig } from '../types';
import { 
  CheckCircle2, 
  Settings2, 
  Zap, 
  ExternalLink, 
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Plus
} from 'lucide-react';

export const AppsView: React.FC = () => {
  const { platforms, setSelectedPlatformForModal, setIsSimulatorOpen } = useFiscal();

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Apps & Plataformas de Vendas</h1>
          <p className="text-xs text-slate-500">
            Conecte suas plataformas digitais (Kiwify, Hotmart, etc.) para emissão 100% automática a cada venda
          </p>
        </div>
        <button
          onClick={() => setIsSimulatorOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#2c0853] hover:bg-[#3d0b72] text-white text-xs font-semibold shadow-xs"
        >
          <Zap className="w-4 h-4 text-amber-300" />
          <span>Simular Venda Webhook</span>
        </button>
      </div>

      {/* Guide Banner */}
      <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 flex items-start gap-3">
        <div className="p-2 rounded-lg bg-purple-100 text-purple-700 shrink-0">
          <Zap className="w-5 h-5" />
        </div>
        <div className="text-xs text-purple-900 leading-relaxed">
          <p className="font-semibold text-purple-950 text-sm mb-0.5">
            Como funciona a automação fiscal TributoFlow:
          </p>
          <p className="text-purple-800">
            1. Você conecta suas plataformas inserindo o Client ID/Secret e a URL de webhook gerada pelo TributoFlow.
            <br />
            2. Assim que o pagamento é aprovado, a venda é capturada e enfileirada ou emitida instantaneamente.
            <br />
            3. Se você configurar período de garantia (ex: 7 dias), a nota aguarda a garantia para evitar emissão e cancelamento desnecessários de impostos.
            <br />
            4. No final do mês, seu contador acessa o <strong>Portal do Contador</strong> e baixa todos os XMLs e relatórios com 1 clique!
          </p>
        </div>
      </div>

      {/* Platform Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {platforms.map(platform => {
          const isKiwify = platform.id === 'kiwify';
          const isHotmart = platform.id === 'hotmart';

          return (
            <div
              key={platform.id}
              className={`bg-white rounded-xl border transition-all duration-200 overflow-hidden flex flex-col justify-between ${
                platform.enabled 
                  ? 'border-purple-200 shadow-sm hover:shadow-md' 
                  : 'border-slate-200 opacity-80 hover:opacity-100'
              }`}
            >
              <div className="p-5 space-y-4">
                {/* Header card */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-lg text-slate-700 shadow-xs">
                      {isKiwify ? '🥝' : isHotmart ? '🔥' : platform.id === 'stripe' ? '💳' : '📦'}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-base">{platform.name}</h3>
                      <p className="text-[11px] text-slate-400 line-clamp-1">{platform.tagline}</p>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      platform.enabled
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-slate-100 text-slate-500 border border-slate-200'
                    }`}
                  >
                    {platform.enabled ? 'Ativo' : 'Desativado'}
                  </span>
                </div>

                {/* Details */}
                <div className="space-y-2 text-xs text-slate-600 bg-slate-50/70 p-3 rounded-lg border border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Modelo:</span>
                    <span className="font-semibold text-slate-800">{platform.invoiceModel}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Regra de Emissão:</span>
                    <span className="font-semibold text-purple-700 text-right truncate max-w-[150px]">
                      {platform.trigger === 'on_payment_approved'
                        ? 'Na aprovação'
                        : platform.trigger === 'on_warranty_expired'
                        ? `Após garantia (${platform.warrantyDays}d)`
                        : 'Manual'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Auto-cancelar reembolso:</span>
                    <span className={`font-semibold ${platform.cancelOnRefund ? 'text-emerald-700' : 'text-slate-500'}`}>
                      {platform.cancelOnRefund ? 'Sim' : 'Não'}
                    </span>
                  </div>
                  {platform.enabled && platform.totalSalesProcessed !== undefined && (
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                      <span className="text-slate-500">Total processado:</span>
                      <span className="font-bold text-slate-900">{platform.totalSalesProcessed} vendas</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => setSelectedPlatformForModal(platform)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-slate-200 hover:border-purple-300 hover:bg-purple-50 text-slate-700 hover:text-purple-700 text-xs font-semibold transition-colors shadow-xs"
                >
                  <Settings2 className="w-3.5 h-3.5 text-purple-600" />
                  <span>Configurar</span>
                </button>
                {platform.enabled && (
                  <button
                    onClick={() => setIsSimulatorOpen(true)}
                    className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-medium"
                    title="Simular venda nessa plataforma"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    <span>Testar</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
