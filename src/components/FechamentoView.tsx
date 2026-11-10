import React, { useState } from 'react';
import { useFiscal } from '../context/FiscalContext';
import { 
  downloadInvoicesZip, 
  generateAccountantCsv, 
  downloadFile 
} from '../services/exportService';
import { 
  Download, 
  FileArchive, 
  FileSpreadsheet, 
  Share2, 
  ExternalLink, 
  CheckCircle, 
  Calendar, 
  Calculator, 
  Building2,
  Mail,
  Copy,
  Check,
  Lock,
  ArrowRight
} from 'lucide-react';

export const FechamentoView: React.FC = () => {
  const { 
    company, 
    invoices, 
    monthlyClosings, 
    closeMonth, 
    setSelectedInvoiceForDanfe,
    setCurrentView 
  } = useFiscal();

  const [selectedMonth, setSelectedMonth] = useState<number>(11); // Novembro
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [copiedLink, setCopiedLink] = useState(false);
  const [emailSentNotice, setEmailSentNotice] = useState(false);
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);

  // Filter invoices for selected month
  const targetPrefix = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
  const monthInvoices = invoices.filter(inv => inv.issuedAt.startsWith(targetPrefix));

  const emittedMonthInvoices = monthInvoices.filter(i => i.status === 'EMITIDA');
  const cancelledMonthInvoices = monthInvoices.filter(i => i.status === 'CANCELADA');
  const pendingMonthInvoices = monthInvoices.filter(i => i.status === 'PENDENTE');

  const grossTotal = emittedMonthInvoices.reduce((acc, i) => acc + i.grossAmount, 0);
  const totalTaxes = emittedMonthInvoices.reduce((acc, i) => acc + i.taxes.totalTax, 0);
  const totalIss = emittedMonthInvoices.reduce((acc, i) => acc + i.taxes.issAmount, 0);
  const effectiveAvgRate = grossTotal > 0 ? ((totalTaxes / grossTotal) * 100).toFixed(2) : '0.00';

  const closingData = {
    year: selectedYear,
    month: selectedMonth,
    monthName: `Mês ${selectedMonth} / ${selectedYear}`,
    grossRevenue: grossTotal,
    netRevenue: grossTotal - totalTaxes,
    invoicesCount: emittedMonthInvoices.length,
    cancelledCount: cancelledMonthInvoices.length,
    estimatedTaxes: totalTaxes,
    simplesDasEstimate: totalTaxes,
    issDue: totalIss,
    isClosed: false,
    closedAt: undefined as string | undefined,
  };

  const accountantUrl = `https://tributoflow.com.br/portal-contador/${company.cnpj.replace(/\D/g, '')}?token=${company.accountantToken}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(accountantUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleSendEmailToAccountant = () => {
    setEmailSentNotice(true);
    setTimeout(() => setEmailSentNotice(false), 3000);
  };

  const handleDownloadZip = async () => {
    setIsDownloadingZip(true);
    try {
      await downloadInvoicesZip(emittedMonthInvoices, company, `${selectedMonth}_${selectedYear}`);
    } finally {
      setIsDownloadingZip(false);
    }
  };

  const handleExportCsv = (format: 'DOMINIO' | 'CONTMATIC' | 'OMIE' | 'GENERICO') => {
    const csv = generateAccountantCsv(emittedMonthInvoices, company, format);
    const filename = `TributoFlow_${format}_${selectedMonth}_${selectedYear}.csv`;
    downloadFile(csv, filename, 'text/csv;charset=utf-8;');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Fechamento Fiscal Mensal</h1>
          <p className="text-xs text-slate-500">
            Ambiente otimizado para conciliação contábil, exportação de lotes XML e apuração de tributos
          </p>
        </div>

        {/* Month Selector Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 rounded-xl">
          {[
            { month: 11, label: 'Nov/26 (Atual)' },
            { month: 10, label: 'Out/26' },
            { month: 9, label: 'Set/26' },
            { month: 8, label: 'Ago/26' },
          ].map(m => (
            <button
              key={m.month}
              onClick={() => setSelectedMonth(m.month)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedMonth === m.month
                  ? 'bg-white text-purple-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Accountant Direct Portal Card */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-950 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/30 text-purple-200 border border-purple-400/30">
                Acesso do Contador
              </span>
              <span className="text-xs text-purple-200">
                Contabilidade: <strong>{company.accountantName}</strong>
              </span>
            </div>
            <h2 className="text-lg font-bold text-white">
              Envie o link direto ou deixe seu contador acessar todo mês
            </h2>
            <p className="text-xs text-purple-200 leading-relaxed">
              Seu contador não precisa de login nem senha. Ele acessa um portal exclusivo protegido por token seguro onde baixa todos os XMLs em ZIP, relatórios do Domínio Sistemas e resumo do Simples Nacional com 1 clique.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto shrink-0">
            <button
              onClick={handleCopyLink}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white text-purple-950 hover:bg-purple-50 font-bold text-xs shadow-md transition-colors"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copiedLink ? 'Link Copiado!' : 'Copiar Link do Contador'}</span>
            </button>
            <button
              onClick={() => setCurrentView('portal_contador')}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-purple-800/80 hover:bg-purple-700/80 border border-purple-600 text-white font-semibold text-xs transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Ver Tela do Contador</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row for Selected Month */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs text-slate-500 font-medium">Faturamento Bruto ({selectedMonth}/2026)</p>
          <p className="text-2xl font-extrabold text-slate-800 mt-1">
            R$ {(closingData.grossRevenue || grossTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Base para apuração do Simples/Presumido
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs text-slate-500 font-medium">Notas Emitidas / Transmitidas</p>
          <p className="text-2xl font-extrabold text-emerald-600 mt-1">
            {emittedMonthInvoices.length > 0 ? emittedMonthInvoices.length : closingData.invoicesCount} notas
          </p>
          <p className="text-[11px] text-emerald-700 mt-1">
            {cancelledMonthInvoices.length} canceladas por reembolso
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs text-slate-500 font-medium">
            {company.taxRegime === 'SIMPLES_NACIONAL' ? 'Estimativa Guia DAS (Simples)' : 'Estimativa PIS/COFINS/IR'}
          </p>
          <p className="text-2xl font-extrabold text-purple-700 mt-1">
            R$ {(closingData.simplesDasEstimate || totalTaxes).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-purple-600 font-medium mt-1">
            Alíquota efetiva apurada: {effectiveAvgRate}%
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs text-slate-500 font-medium">ISSQN Devido ao Município</p>
          <p className="text-2xl font-extrabold text-blue-600 mt-1">
            R$ {(closingData.issDue || totalIss).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Prefeitura de São Paulo - Cód: {company.serviceCode}
          </p>
        </div>
      </div>

      {/* Accounting Software Batch Download Hub */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
        <div>
          <h2 className="text-base font-bold text-slate-800">
            Exportações Otimizadas para Contabilidade ({selectedMonth}/2026)
          </h2>
          <p className="text-xs text-slate-500">
            Clique no formato utilizado pelo seu escritório de contabilidade para baixar os arquivos prontos para importação direta.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Complete ZIP Package */}
          <div className="p-4 rounded-xl border-2 border-purple-200 bg-purple-50/50 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="p-2 rounded-lg bg-purple-600 text-white">
                  <FileArchive className="w-5 h-5" />
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-200 text-purple-900">
                  Recomendado
                </span>
              </div>
              <h3 className="font-bold text-slate-800 text-sm">Pacote Completo (.ZIP)</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Todos os arquivos XML das NFS-e assinadas + Relatório de conferência fiscal mensal em um único arquivo compactado.
              </p>
            </div>
            <button
              onClick={handleDownloadZip}
              disabled={isDownloadingZip || emittedMonthInvoices.length === 0}
              className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-lg bg-purple-700 hover:bg-purple-800 disabled:bg-slate-300 text-white font-bold text-xs shadow-xs transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>{isDownloadingZip ? 'Compactando...' : 'Baixar ZIP Completo'}</span>
            </button>
          </div>

          {/* Domínio Sistemas */}
          <div className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="p-2 rounded-lg bg-blue-100 text-blue-700">
                  <FileSpreadsheet className="w-5 h-5" />
                </span>
                <span className="text-[10px] font-bold text-slate-400">CSV Padrão</span>
              </div>
              <h3 className="font-bold text-slate-800 text-sm">Domínio Sistemas</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Layout de importação automática de notas fiscais de serviço prestado para o software Domínio (Thomson Reuters).
              </p>
            </div>
            <button
              onClick={() => handleExportCsv('DOMINIO')}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-blue-600" />
              <span>Exportar Domínio</span>
            </button>
          </div>

          {/* Contmatic Phoenix */}
          <div className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
                  <FileSpreadsheet className="w-5 h-5" />
                </span>
                <span className="text-[10px] font-bold text-slate-400">Layout TXT/CSV</span>
              </div>
              <h3 className="font-bold text-slate-800 text-sm">Contmatic Phoenix</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Estrutura de dados compatível com o módulo G5 Phoenix e Folha/Fiscal Contmatic.
              </p>
            </div>
            <button
              onClick={() => handleExportCsv('CONTMATIC')}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Exportar Contmatic</span>
            </button>
          </div>

          {/* Omie & ContaAzul */}
          <div className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="p-2 rounded-lg bg-amber-100 text-amber-700">
                  <FileSpreadsheet className="w-5 h-5" />
                </span>
                <span className="text-[10px] font-bold text-slate-400">ERP Contábil</span>
              </div>
              <h3 className="font-bold text-slate-800 text-sm">ContaAzul & Omie</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Planilha padronizada com clientes, CNPJ/CPF, alíquotas e faturamento para conciliação bancária e contábil.
              </p>
            </div>
            <button
              onClick={() => handleExportCsv('GENERICO')}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-amber-600" />
              <span>Exportar Excel/CSV</span>
            </button>
          </div>
        </div>

        {/* Status of Month Closing */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${closingData.isClosed ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
              {closingData.isClosed ? <CheckCircle className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">
                Status da Competência {selectedMonth}/2026: {closingData.isClosed ? 'Fechamento Homologado' : 'Em Aberto / Pré-fechamento'}
              </p>
              <p className="text-[11px] text-slate-500">
                {closingData.isClosed 
                  ? `Fechado e enviado à contabilidade em ${closingData.closedAt}`
                  : 'Você pode homologar o fechamento para travar alterações nas notas fiscais deste mês.'}
              </p>
            </div>
          </div>
          {!closingData.isClosed && (
            <button
              onClick={() => {
                if (confirm(`Deseja homologar e fechar o mês de ${selectedMonth}/2026? Isso confirma os totais com a contabilidade.`)) {
                  closeMonth(selectedYear, selectedMonth);
                }
              }}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shrink-0 transition-colors"
            >
              Homologar Fechamento Mensal
            </button>
          )}
        </div>
      </div>

      {/* Invoices List Table for this month */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-800 text-sm">
              Notas Fiscais da Competência ({selectedMonth}/2026)
            </h3>
            <p className="text-xs text-slate-400">
              {monthInvoices.length} registros fiscais encontrados
            </p>
          </div>
          <button
            onClick={() => handleExportCsv('GENERICO')}
            className="text-xs text-purple-600 hover:text-purple-800 font-semibold flex items-center gap-1"
          >
            <Download className="w-3.5 h-3.5" /> Baixar Relatório CSV
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
              <tr>
                <th className="px-4 py-3">Número NF</th>
                <th className="px-4 py-3">Emissão</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Plataforma</th>
                <th className="px-4 py-3 text-right">Valor Bruto</th>
                <th className="px-4 py-3 text-right">Impostos</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {monthInvoices.slice(0, 10).map(inv => (
                <tr key={inv.id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3 font-mono font-bold text-purple-700">
                    #{inv.number}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {inv.issuedAt.slice(0, 16)}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-800">{inv.customer.name}</p>
                    <p className="text-[10px] text-slate-400">{inv.customer.document}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 uppercase">
                      {inv.platform}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-slate-900">
                    R$ {inv.grossAmount.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right text-purple-700 font-medium">
                    R$ {inv.taxes.totalTax.toFixed(2)} ({inv.taxes.effectiveRate}%)
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        inv.status === 'EMITIDA'
                          ? 'bg-emerald-100 text-emerald-800'
                          : inv.status === 'PENDENTE'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setSelectedInvoiceForDanfe(inv)}
                      className="text-purple-600 hover:text-purple-900 font-semibold"
                    >
                      Ver DANFE
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
