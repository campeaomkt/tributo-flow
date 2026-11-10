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
  ArrowRight
} from 'lucide-react';

export const VendasView: React.FC = () => {
  const { sales, invoices, setSelectedInvoiceForDanfe, emitInvoice, simulateRefund, setIsSimulatorOpen } = useFiscal();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'approved' | 'refunded'>('ALL');

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
        <button
          onClick={() => setIsSimulatorOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#2c0853] hover:bg-[#3d0b72] text-white text-xs font-semibold shadow-xs"
        >
          <Zap className="w-4 h-4 text-amber-300" />
          <span>Simular Venda Webhook</span>
        </button>
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
                    <td className="px-4 py-3 text-right whitespace-nowrap">
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
    </div>
  );
};
