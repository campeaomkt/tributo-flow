import React, { useState } from 'react';
import { useFiscal } from '../context/FiscalContext';
import { 
  ShoppingCart, 
  Search, 
  CheckCircle, 
  Clock, 
  RotateCcw, 
  FileText, 
  Zap,
  ArrowRight,
  RefreshCw,
  Check,
  Edit3,
  AlertTriangle,
  Settings2,
  Loader2
} from 'lucide-react';
import { EditSaleModal } from './EditSaleModal';
import { Sale } from '../types';

export const VendasView: React.FC = () => {
  const { 
    sales, 
    invoices,
    platforms,
    setSelectedInvoiceForDanfe,
    setSelectedPlatformForModal,
    simulateRefund, 
    setIsSimulatorOpen,
    syncKiwifySales,
    isSyncingKiwify,
    hasKiwifySecret,
    kiwifyServerConfigured,
    kiwifySyncError,
  } = useFiscal();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'approved' | 'refunded'>('ALL');
  const [syncToast, setSyncToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);

  const kiwifyPlatform = platforms.find(p => p.id === 'kiwify') || null;

  const handleSyncKiwify = async () => {
    setSyncToast(null);
    const res = await syncKiwifySales();
    if (res.success) {
      setSyncToast({
        type: 'success',
        message: `Sincronização real com a API da Kiwify concluída! ${res.totalFetched} vendas reais carregadas (${res.addedCount} novas).`,
      });
      setTimeout(() => setSyncToast(null), 6000);
    } else {
      setSyncToast({
        type: 'error',
        message: res.error || 'Erro ao buscar vendas reais da Kiwify.',
      });
    }
  };

  const filteredSales = sales.filter(s => {
    const matchesSearch =
      s.externalSaleId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.customer.document.includes(searchTerm);

    const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Transações & Vendas</h1>
          <p className="text-xs text-slate-500">
            Monitoramento de todos os checkouts integrados (Kiwify, Hotmart, etc.) e status de emissão fiscal
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSyncKiwify}
            disabled={isSyncingKiwify}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-60"
            title="Buscar vendas reais diretamente na API oficial da Kiwify"
          >
            {isSyncingKiwify ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            <span>{isSyncingKiwify ? 'Sincronizando Kiwify...' : 'Sincronizar Kiwify (API Real)'}</span>
          </button>
          {kiwifyPlatform && (
            <button
              onClick={() => setSelectedPlatformForModal(kiwifyPlatform)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs"
            >
              <Settings2 className="w-3.5 h-3.5 text-purple-700" />
              <span>Credenciais Kiwify</span>
            </button>
          )}
        </div>
      </div>

      {/* Sync toast / API error */}
      {(syncToast || kiwifySyncError) && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            syncToast?.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-start gap-2">
            {syncToast?.type === 'success' ? (
              <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            )}
            <span>{syncToast?.message || kiwifySyncError}</span>
          </div>
          {syncToast?.type !== 'success' && kiwifyPlatform && (
            <button
              onClick={() => setSelectedPlatformForModal(kiwifyPlatform)}
              className="px-3 py-1.5 rounded-lg bg-rose-700 hover:bg-rose-800 text-white text-[11px] font-bold shrink-0"
            >
              Informar Client Secret Kiwify
            </button>
          )}
        </div>
      )}

      {/* Kiwify Live Sync Banner */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-900 via-teal-950 to-slate-900 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs border border-emerald-800/40">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`w-2.5 h-2.5 rounded-full ${hasKiwifySecret ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
            <span className="font-bold text-sm text-emerald-200">
              {kiwifyServerConfigured
                ? 'API Oficial Kiwify Conectada (Servidor Vercel)'
                : hasKiwifySecret
                ? 'API Oficial Kiwify Ativa na Sessão'
                : 'Conecte sua API Key Real da Kiwify'}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px] border border-emerald-500/30">
              {sales.length} {sales.length === 1 ? 'Venda Real' : 'Vendas Reais'}
            </span>
          </div>
          <p className="text-slate-300 text-[11px] mt-1">
            Total Faturado Real: <strong className="text-white">R$ {sales.reduce((acc, s) => acc + s.amount, 0).toFixed(2).replace('.', ',')}</strong>
            {' • '}Última venda: <strong>{sales.length > 0 ? `${sales[0].createdAt.slice(0, 16)} (${sales[0].externalSaleId})` : 'Nenhuma sincronizada ainda'}</strong>
            {kiwifyPlatform?.lastSync ? ` • Última sinc.: ${kiwifyPlatform.lastSync}` : ''}
          </p>
        </div>
        <div className="text-right shrink-0">
          <span className="text-[10px] text-emerald-300 uppercase block font-semibold">Fonte de Dados</span>
          <span className="font-mono text-[11px] text-white font-bold">public-api.kiwify.com/v1/sales</span>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por ID externo, produto, cliente ou CPF..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-600 text-slate-800"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center p-1 bg-slate-100 rounded-lg">
            {(['ALL', 'approved', 'refunded'] as const).map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-md font-semibold transition-all ${
                  statusFilter === st
                    ? 'bg-white text-purple-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st === 'ALL' ? 'Todas' : st === 'approved' ? 'Aprovadas' : 'Reembolsadas'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
              <tr>
                <th className="px-4 py-3">ID Venda</th>
                <th className="px-4 py-3">Data da Transação</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Produto</th>
                <th className="px-4 py-3">Plataforma</th>
                <th className="px-4 py-3">Pagamento</th>
                <th className="px-4 py-3 text-right">Valor</th>
                <th className="px-4 py-3 text-center">Status Venda</th>
                <th className="px-4 py-3 text-center">Nota Fiscal</th>
                <th className="px-4 py-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSales.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center">
                    <div className="max-w-md mx-auto space-y-3">
                      <ShoppingCart className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="font-bold text-slate-700 text-sm">
                        Nenhuma venda real da Kiwify carregada ainda
                      </p>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Dados fictícios foram removidos. Clique em <strong>Credenciais Kiwify</strong> para informar seu <strong>Client Secret</strong> real (ou configure as variáveis de ambiente na Vercel) e depois clique em <strong>Sincronizar Kiwify (API Real)</strong> para puxar todas as suas vendas reais diretamente da Kiwify.
                      </p>
                      <div className="flex items-center justify-center gap-2 pt-1">
                        {kiwifyPlatform && (
                          <button
                            onClick={() => setSelectedPlatformForModal(kiwifyPlatform)}
                            className="px-4 py-2 rounded-lg bg-[#2c0853] hover:bg-[#3d0b72] text-white text-xs font-bold"
                          >
                            Configurar API Real da Kiwify
                          </button>
                        )}
                        <button
                          onClick={handleSyncKiwify}
                          disabled={isSyncingKiwify}
                          className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-60"
                        >
                          {isSyncingKiwify ? 'Sincronizando...' : 'Sincronizar Agora'}
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
              {filteredSales.map(sale => {
                const linkedInvoice = invoices.find(i => i.id === sale.invoiceId);

                return (
                  <tr key={sale.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-slate-800">
                      {sale.externalSaleId}
                    </td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {sale.createdAt.slice(0, 16)}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-800">{sale.customer.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{sale.customer.document}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-700 max-w-xs truncate">
                      {sale.productName}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 uppercase">
                        {sale.platform}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-medium">
                      {sale.paymentMethod}
                    </td>
                    <td className="px-4 py-3 text-right font-extrabold text-slate-900">
                      R$ {sale.amount.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          sale.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {sale.status === 'approved' ? 'Aprovada' : 'Reembolsada'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {linkedInvoice ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              linkedInvoice.status === 'EMITIDA'
                                ? 'bg-emerald-100 text-emerald-800'
                                : linkedInvoice.status === 'PENDENTE'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {linkedInvoice.status}
                          </span>
                          <button
                            onClick={() => setSelectedInvoiceForDanfe(linkedInvoice)}
                            className="p-1 hover:bg-slate-100 rounded text-purple-700 font-mono text-[10px]"
                            title="Ver NFS-e"
                          >
                            #{linkedInvoice.number}
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[10px]">Não gerada</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap space-x-1.5">
                      <button
                        onClick={() => setEditingSale(sale)}
                        className="px-2.5 py-1 rounded border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-900 font-semibold text-[11px] inline-flex items-center gap-1 transition-colors"
                        title="Ajustar valor real, Order Bump ou colar JSON da Kiwify"
                      >
                        <Edit3 className="w-3 h-3 text-purple-600" />
                        <span>Editar / Order Bump</span>
                      </button>

                      {sale.status === 'approved' ? (
                        <button
                          onClick={() => {
                            if (confirm(`Deseja simular o reembolso da venda ${sale.externalSaleId}? Isso cancelará a nota fiscal automaticamente.`)) {
                              simulateRefund(sale.id);
                            }
                          }}
                          className="px-2.5 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold text-[11px] transition-colors"
                          title="Simular reembolso e cancelar nota fiscal"
                        >
                          Reembolsar
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Reembolsado</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Sale & Order Bump Modal */}
      {editingSale && (
        <EditSaleModal
          sale={editingSale}
          onClose={() => setEditingSale(null)}
        />
      )}
    </div>
  );
};
