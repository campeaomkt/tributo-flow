import React, { useState } from 'react';
import { useFiscal } from '../context/FiscalContext';
import { 
  FileCheck, 
  AlertCircle, 
  Clock, 
  CheckCircle, 
  Calendar, 
  ArrowRight,
  TrendingUp,
  Download,
  Zap,
  ExternalLink,
  Info
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const { 
    invoices, 
    sales, 
    dateFilter, 
    setDateFilter, 
    emitBatchInvoices, 
    setCurrentView,
    setSelectedInvoiceForDanfe,
    setIsSimulatorOpen 
  } = useFiscal();

  const [showBanner, setShowBanner] = useState(true);
  const [activeDateModal, setActiveDateModal] = useState(false);
  const [hoveredMonth, setHoveredMonth] = useState<number | null>(null);

  // Calculate stats for current filter (default is today / month)
  const pendingInvoices = invoices.filter(i => i.status === 'PENDENTE');
  const emittedInvoices = invoices.filter(i => i.status === 'EMITIDA');
  const cancelledInvoices = invoices.filter(i => i.status === 'CANCELADA');
  const approvedSales = sales.filter(s => s.status === 'approved');

  // Exact card values matching screenshot or live state
  const totalEmittedAmount = emittedInvoices.reduce((acc, i) => acc + i.grossAmount, 0);
  const totalCancelledAmount = cancelledInvoices.reduce((acc, i) => acc + i.grossAmount, 0);
  const totalPendingAmount = pendingInvoices.reduce((acc, i) => acc + i.grossAmount, 0);
  const totalApprovedSalesAmount = approvedSales.reduce((acc, s) => acc + s.amount, 0);

  // Dynamic monthly data aggregated from actual sales and invoices
  const monthsList = [
    { key: '01', month: 'jan', fullMonth: 'Janeiro' },
    { key: '02', month: 'fev', fullMonth: 'Fevereiro' },
    { key: '03', month: 'mar', fullMonth: 'Março' },
    { key: '04', month: 'abr', fullMonth: 'Abril' },
    { key: '05', month: 'mai', fullMonth: 'Maio' },
    { key: '06', month: 'jun', fullMonth: 'Junho' },
    { key: '07', month: 'jul', fullMonth: 'Julho' },
    { key: '08', month: 'ago', fullMonth: 'Agosto' },
    { key: '09', month: 'set', fullMonth: 'Setembro' },
    { key: '10', month: 'out', fullMonth: 'Outubro' },
    { key: '11', month: 'nov', fullMonth: 'Novembro' },
    { key: '12', month: 'dez', fullMonth: 'Dezembro' },
  ];

  const monthlyData = monthsList.map(m => {
    const monthSales = sales.filter(s => s.createdAt.includes(`-${m.key}-`));
    const monthInvoices = invoices.filter(i => i.issuedAt.includes(`-${m.key}-`) && i.status === 'EMITIDA');
    const vendasTotal = monthSales.reduce((acc, s) => acc + s.amount, 0);
    const notasTotal = monthInvoices.reduce((acc, i) => acc + i.grossAmount, 0);

    return {
      month: m.month,
      vendas: vendasTotal,
      notas: notasTotal,
      fullMonth: `${m.fullMonth} / 2026`,
    };
  });

  const handleEmitAllPending = () => {
    const pendingIds = pendingInvoices.map(i => i.id);
    if (pendingIds.length === 0) return;
    if (confirm(`Deseja emitir e transmitir imediatamente todas as ${pendingIds.length} notas pendentes no valor de R$ ${totalPendingAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}?`)) {
      emitBatchInvoices(pendingIds);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Warning/Status Banner */}
      {showBanner && (
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${sales.length > 0 ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'}`} />
            <p className="text-sm text-slate-800">
              <strong className="font-semibold text-slate-900">TributoFlow pronto para emissão fiscal.</strong> Conecte suas plataformas (Kiwify, Hotmart) na aba <strong>Apps</strong> para começar a emitir notas fiscais automaticamente a cada venda aprovada.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setCurrentView('apps')}
              className="px-4 py-2 rounded-lg bg-[#2c0853] hover:bg-[#3d0b72] text-white text-xs font-semibold shadow-xs transition-colors"
            >
              Conectar Plataformas
            </button>
            <button
              onClick={() => setIsSimulatorOpen(true)}
              className="px-4 py-2 rounded-lg border border-purple-300 bg-white hover:bg-purple-50 text-purple-900 text-xs font-medium transition-colors"
            >
              Simular Venda Teste
            </button>
          </div>
        </div>
      )}

      {/* Header with Title and Date Picker */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight font-sans">Dashboard</h1>
          <p className="text-xs text-slate-500">
            Visão consolidada em tempo real de emissões, faturamento e pendências fiscais
          </p>
        </div>

        {/* Date range control */}
        <div className="relative">
          <button
            onClick={() => setActiveDateModal(!activeDateModal)}
            className="flex items-center gap-2.5 px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium shadow-xs transition-colors"
          >
            <span>{dateFilter.label}</span>
            <Calendar className="w-4 h-4 text-slate-400" />
          </button>

          {activeDateModal && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 p-3 z-30 text-xs">
              <p className="font-semibold text-slate-800 mb-2">Filtrar Período:</p>
              <div className="space-y-1">
                {[
                  { label: 'Hoje (29/10/2026)', start: '2026-10-29', end: '2026-10-29' },
                  { label: 'Últimos 7 dias', start: '2026-10-22', end: '2026-10-29' },
                  { label: 'Este mês (Outubro/2026)', start: '2026-10-01', end: '2026-10-31' },
                  { label: 'Mês anterior (Setembro/2026)', start: '2026-09-01', end: '2026-09-30' },
                  { label: 'Ano de 2026 consolidado', start: '2026-01-01', end: '2026-12-31' },
                ].map((opt) => (
                  <button
                    key={opt.label}
                    onClick={() => {
                      setDateFilter({ start: opt.start, end: opt.end, label: opt.label });
                      setActiveDateModal(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-purple-50 hover:text-purple-700 text-slate-600 transition-colors"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4 Stat Cards Matching Screenshot */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Notas emitidas (Cyan) */}
        <div className="bg-[#00b4c8] text-white rounded-xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[140px]">
          <div>
            <div className="flex items-center gap-2 mb-3 text-cyan-50">
              <FileCheck className="w-4 h-4 opacity-90" />
              <span className="text-xs font-semibold uppercase tracking-wider">Notas emitidas</span>
            </div>
            <div className="text-3xl font-extrabold tracking-tight">
              R$ {totalEmittedAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="text-xs text-cyan-100 font-medium mt-2">
            {emittedInvoices.length === 0 ? 'Nenhuma nota emitida' : `${emittedInvoices.length} notas emitidas com sucesso`}
          </div>
        </div>

        {/* 2. Notas canceladas (Red) */}
        <div className="bg-[#f03d3d] text-white rounded-xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[140px]">
          <div>
            <div className="flex items-center gap-2 mb-3 text-rose-100">
              <AlertCircle className="w-4 h-4 opacity-90" />
              <span className="text-xs font-semibold uppercase tracking-wider">Notas canceladas</span>
            </div>
            <div className="text-3xl font-extrabold tracking-tight">
              R$ {totalCancelledAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="text-xs text-rose-100 font-medium mt-2">
            {cancelledInvoices.length === 0 ? 'Nenhuma nota cancelada' : `${cancelledInvoices.length} notas canceladas`}
          </div>
        </div>

        {/* 3. Notas pendentes (Orange) */}
        <div className="bg-[#f59e0b] text-white rounded-xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[140px]">
          <div>
            <div className="flex items-center gap-2 mb-3 text-amber-100">
              <Clock className="w-4 h-4 opacity-90" />
              <span className="text-xs font-semibold uppercase tracking-wider">Notas pendentes</span>
            </div>
            <div className="text-3xl font-extrabold tracking-tight">
              R$ {totalPendingAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-amber-100 font-medium">
              {pendingInvoices.length} {pendingInvoices.length === 1 ? 'nota pendente' : 'notas pendentes'}
            </span>
            {pendingInvoices.length > 0 && (
              <button
                onClick={handleEmitAllPending}
                className="px-2 py-0.5 rounded bg-white text-amber-800 hover:bg-amber-50 text-[10px] font-bold shadow-xs transition-colors"
                title="Emitir agora sem esperar o fim da garantia"
              >
                Emitir agora
              </button>
            )}
          </div>
        </div>

        {/* 4. Vendas aprovadas (Green) */}
        <div className="bg-[#10b981] text-white rounded-xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[140px]">
          <div>
            <div className="flex items-center gap-2 mb-3 text-emerald-100">
              <CheckCircle className="w-4 h-4 opacity-90" />
              <span className="text-xs font-semibold uppercase tracking-wider">Vendas aprovadas</span>
            </div>
            <div className="text-3xl font-extrabold tracking-tight">
              R$ {totalApprovedSalesAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="text-xs text-emerald-100 font-medium mt-2">
            {approvedSales.length} {approvedSales.length === 1 ? 'venda aprovada' : 'vendas aprovadas'}
          </div>
        </div>
      </div>

      {/* Interactive Line Chart: "Vendas x Notas" */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-base font-bold text-slate-800">Vendas x Notas</h2>
            <p className="text-xs text-slate-500">Comparativo acumulado mensal de faturamento e notas fiscais geradas</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#1e40af]" />
              <span className="text-slate-600">Vendas</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#f59e0b]" />
              <span className="text-slate-600">Notas</span>
            </div>
          </div>
        </div>

        {/* SVG Graphic with dynamic curve matching the screenshot */}
        <div className="relative w-full h-64">
          <svg className="w-full h-full overflow-visible" viewBox="0 0 1000 240" preserveAspectRatio="none">
            {/* Grid lines */}
            <line x1="50" y1="20" x2="980" y2="20" stroke="#f1f5f9" strokeDasharray="4 4" strokeWidth="1" />
            <line x1="50" y1="100" x2="980" y2="100" stroke="#f1f5f9" strokeDasharray="4 4" strokeWidth="1" />
            <line x1="50" y1="180" x2="980" y2="180" stroke="#f1f5f9" strokeDasharray="4 4" strokeWidth="1" />

            {/* Y axis labels */}
            <text x="40" y="25" textAnchor="end" className="text-[11px] fill-slate-400 font-sans">60000</text>
            <text x="40" y="105" textAnchor="end" className="text-[11px] fill-slate-400 font-sans">30000</text>
            <text x="40" y="185" textAnchor="end" className="text-[11px] fill-slate-400 font-sans">0</text>

            {/* Dynamic Lines computed from monthlyData */}
            {monthlyData.some(d => d.vendas > 0) ? (
              <>
                <polyline
                  fill="none"
                  stroke="#1e40af"
                  strokeWidth="2.5"
                  points={monthlyData.map((d, index) => {
                    const x = 60 + (index * (920 / 11));
                    const maxVal = Math.max(1000, ...monthlyData.map(m => Math.max(m.vendas, m.notas)));
                    const y = 180 - (d.vendas / maxVal) * 150;
                    return `${x},${y}`;
                  }).join(' ')}
                />
                <polyline
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="2.5"
                  points={monthlyData.map((d, index) => {
                    const x = 60 + (index * (920 / 11));
                    const maxVal = Math.max(1000, ...monthlyData.map(m => Math.max(m.vendas, m.notas)));
                    const y = 180 - (d.notas / maxVal) * 150;
                    return `${x},${y}`;
                  }).join(' ')}
                />
              </>
            ) : (
              /* Flat baseline at 0 */
              <line x1="60" y1="180" x2="980" y2="180" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="6 6" />
            )}

            {/* Data points */}
            {monthlyData.map((d, index) => {
              const x = 60 + (index * (920 / 11));
              return (
                <g key={d.month} className="cursor-pointer" onMouseEnter={() => setHoveredMonth(index)}>
                  <line x1={x} y1="20" x2={x} y2="180" stroke="#f8fafc" strokeWidth="1" />
                  <circle cx={x} cy={180 - (d.vendas / 65000) * 160} r="4" fill="#1e40af" className="transition-all hover:r-6" />
                  <circle cx={x} cy={180 - (d.notas / 65000) * 160} r="4" fill="#f59e0b" className="transition-all hover:r-6" />
                </g>
              );
            })}
          </svg>

          {/* Month labels underneath */}
          <div className="flex justify-between pl-10 pr-2 pt-2 border-t border-slate-100">
            {monthlyData.map((d, index) => (
              <span 
                key={d.month} 
                className={`text-[11px] font-medium transition-colors ${
                  hoveredMonth === index ? 'text-purple-700 font-bold' : 'text-slate-400'
                }`}
              >
                {d.month}.
              </span>
            ))}
          </div>

          {/* Hover tooltip */}
          {hoveredMonth !== null && (
            <div className="absolute top-2 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white text-xs px-3 py-2 rounded-lg shadow-xl pointer-events-none flex items-center gap-4 z-10">
              <span className="font-semibold">{monthlyData[hoveredMonth].fullMonth}:</span>
              <span className="text-blue-300">Vendas: R$ {monthlyData[hoveredMonth].vendas.toLocaleString('pt-BR')}</span>
              <span className="text-amber-300">Notas: R$ {monthlyData[hoveredMonth].notas.toLocaleString('pt-BR')}</span>
            </div>
          )}
        </div>
      </div>

      {/* Two side-by-side Tables Matching Screenshot */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Produtos mais Vendidos */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-sm">Produtos mais Vendidos</h3>
            <button 
              onClick={() => setCurrentView('produtos')}
              className="text-xs text-purple-600 hover:text-purple-800 font-medium flex items-center gap-1"
            >
              Ver todos <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="p-0">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3">Produto</th>
                  <th className="px-4 py-3 text-center">Qtde</th>
                  <th className="px-4 py-3 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sales.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-slate-400">
                      Nenhum produto vendido ainda. Conecte sua plataforma de vendas para iniciar.
                    </td>
                  </tr>
                ) : (
                  Array.from(
                    sales.reduce((map, sale) => {
                      const current = map.get(sale.productName) || { name: sale.productName, count: 0, total: 0 };
                      current.count += 1;
                      current.total += sale.amount;
                      map.set(sale.productName, current);
                      return map;
                    }, new Map<string, { name: string; count: number; total: number }>()).values()
                  ).slice(0, 5).map(prod => (
                    <tr key={prod.name} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3.5 font-medium text-slate-800">
                        {prod.name}
                      </td>
                      <td className="px-4 py-3.5 text-center text-slate-600">{prod.count}</td>
                      <td className="px-4 py-3.5 text-right font-semibold text-slate-900">
                        R$ {prod.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Vendas por Canal */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-sm">Vendas por Canal</h3>
            <button 
              onClick={() => setCurrentView('apps')}
              className="text-xs text-purple-600 hover:text-purple-800 font-medium flex items-center gap-1"
            >
              Configurar canais <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="p-0">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3">Canal</th>
                  <th className="px-4 py-3 text-center">Qtde</th>
                  <th className="px-4 py-3 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sales.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-slate-400">
                      Nenhuma venda registrada nos canais integrados.
                    </td>
                  </tr>
                ) : (
                  Array.from(
                    sales.reduce((map, sale) => {
                      const current = map.get(sale.platform) || { platform: sale.platform, count: 0, total: 0 };
                      current.count += 1;
                      current.total += sale.amount;
                      map.set(sale.platform, current);
                      return map;
                    }, new Map<string, { platform: string; count: number; total: number }>()).values()
                  ).map(canal => (
                    <tr key={canal.platform} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3.5 font-medium text-slate-800 flex items-center gap-2 capitalize">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        {canal.platform}
                      </td>
                      <td className="px-4 py-3.5 text-center text-slate-600">{canal.count}</td>
                      <td className="px-4 py-3.5 text-right font-semibold text-slate-900">
                        R$ {canal.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Quick live queue of pending items with preview */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              Fila de Notas Pendentes (Aguardando Garantia)
            </h3>
            <p className="text-xs text-slate-500">
              Essas notas estão no período de garantia de 7 dias e serão emitidas automaticamente na expiração, protegendo contra cancelamentos.
            </p>
          </div>
          <button
            onClick={() => setCurrentView('notas')}
            className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-700"
          >
            Gerenciar todas as {pendingInvoices.length} notas
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
              <tr>
                <th className="px-3 py-2.5">RPS / Prevista</th>
                <th className="px-3 py-2.5">Cliente</th>
                <th className="px-3 py-2.5">Produto</th>
                <th className="px-3 py-2.5">Plataforma</th>
                <th className="px-3 py-2.5 text-right">Valor</th>
                <th className="px-3 py-2.5 text-center">Previsão</th>
                <th className="px-3 py-2.5 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pendingInvoices.slice(0, 5).map(inv => (
                <tr key={inv.id} className="hover:bg-slate-50/70">
                  <td className="px-3 py-2.5 font-mono text-purple-700 font-semibold">#{inv.rpsNumber}</td>
                  <td className="px-3 py-2.5">
                    <p className="font-medium text-slate-800">{inv.customer.name}</p>
                    <p className="text-[10px] text-slate-400">{inv.customer.document}</p>
                  </td>
                  <td className="px-3 py-2.5 text-slate-600 max-w-xs truncate">{inv.productName}</td>
                  <td className="px-3 py-2.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                      {inv.platform}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-bold text-slate-900">
                    R$ {inv.grossAmount.toFixed(2)}
                  </td>
                  <td className="px-3 py-2.5 text-center text-[11px] text-amber-700 font-medium">
                    {inv.scheduledFor || 'Na garantia'}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <button
                      onClick={() => setSelectedInvoiceForDanfe(inv)}
                      className="text-purple-600 hover:text-purple-900 font-medium"
                    >
                      Ver RPS
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
