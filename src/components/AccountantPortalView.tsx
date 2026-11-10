import React, { useState } from 'react';
import { useFiscal } from '../context/FiscalContext';
import { downloadInvoicesZip, generateAccountantCsv, downloadFile } from '../services/exportService';
import { generateNfseXml } from '../services/taxCalculator';
import { 
  Building2, 
  FileArchive, 
  FileSpreadsheet, 
  Download, 
  ShieldCheck, 
  Calendar, 
  Calculator,
  CheckCircle2,
  Lock,
  ArrowLeft,
  FileCode,
  FileText
} from 'lucide-react';

export const AccountantPortalView: React.FC = () => {
  const { company, invoices, setCurrentView, setSelectedInvoiceForDanfe } = useFiscal();
  const [selectedMonth, setSelectedMonth] = useState<number>(11);
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [isZipping, setIsZipping] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const targetPrefix = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
  const monthInvoices = invoices.filter(inv => inv.issuedAt.startsWith(targetPrefix));
  const emittedInvoices = monthInvoices.filter(i => i.status === 'EMITIDA');

  const filteredInvoices = emittedInvoices.filter(inv => 
    inv.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.customer.document.includes(searchTerm) ||
    inv.number.includes(searchTerm)
  );

  const grossRevenue = emittedInvoices.reduce((acc, i) => acc + i.grossAmount, 0);
  const totalTaxes = emittedInvoices.reduce((acc, i) => acc + i.taxes.totalTax, 0);
  const totalIss = emittedInvoices.reduce((acc, i) => acc + i.taxes.issAmount, 0);
  const effectiveRate = grossRevenue > 0 ? ((totalTaxes / grossRevenue) * 100).toFixed(2) : '0.00';

  const handleDownloadZip = async () => {
    setIsZipping(true);
    try {
      await downloadInvoicesZip(emittedInvoices, company, `contabilidade_${selectedMonth}_${selectedYear}`);
    } finally {
      setIsZipping(false);
    }
  };

  const handleExportCsv = (format: 'DOMINIO' | 'CONTMATIC' | 'GENERICO') => {
    const csv = generateAccountantCsv(emittedInvoices, company, format);
    downloadFile(csv, `TributoFlow_Contabilidade_${format}_${selectedMonth}_${selectedYear}.csv`, 'text/csv;charset=utf-8;');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Return to Admin Banner */}
      <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900 text-white text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>
            Você está visualizando o <strong>Portal do Contador</strong> (Modo Acesso Otimizado para Contabilidade).
          </span>
        </div>
        <button
          onClick={() => setCurrentView('dashboard')}
          className="flex items-center gap-1 text-slate-300 hover:text-white font-medium underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Voltar ao Painel Geral
        </button>
      </div>

      {/* Header Profile */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xl border border-purple-200 shrink-0">
            <Building2 className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">{company.corporateName}</h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                {company.taxRegime}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-1">
              <span>CNPJ: <strong className="text-slate-700">{company.cnpj}</strong></span>
              <span>CCM / Inscr. Municipal: <strong className="text-slate-700">{company.municipalRegistration}</strong></span>
              <span>Município: <strong className="text-slate-700">São Paulo - SP (3550308)</strong></span>
            </div>
          </div>
        </div>

        {/* Month Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">Competência:</span>
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(Number(e.target.value))}
            className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white font-bold text-xs text-slate-800 focus:ring-2 focus:ring-purple-600 outline-none"
          >
            <option value={11}>Novembro / 2026 (Atual)</option>
            <option value={10}>Outubro / 2026</option>
            <option value={9}>Setembro / 2026</option>
            <option value={8}>Agosto / 2026</option>
          </select>
        </div>
      </div>

      {/* Fiscal Calculation Summary for Accountant */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-purple-600" />
            <h2 className="font-bold text-slate-800 text-base">Memória de Cálculo Fiscal ({selectedMonth}/2026)</h2>
          </div>
          <span className="text-xs text-slate-400">Padrão Receita Federal / LC 123/2006</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <p className="text-[11px] text-slate-500">Receita Bruta do Mês</p>
            <p className="text-lg font-bold text-slate-900 mt-0.5">
              R$ {grossRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <p className="text-[11px] text-slate-500">RBT12 Acumulado (12m)</p>
            <p className="text-lg font-bold text-slate-900 mt-0.5">
              R$ {company.rbt12.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <p className="text-[11px] text-slate-500">Fator R (Folha / RBT12)</p>
            <p className="text-lg font-bold text-emerald-700 mt-0.5 flex items-center gap-1">
              30.0% <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </p>
            <p className="text-[10px] text-emerald-600 font-semibold">&gt;= 28% -&gt; Anexo III</p>
          </div>

          <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200">
            <p className="text-[11px] text-purple-900 font-medium">Alíquota Efetiva Simples</p>
            <p className="text-lg font-extrabold text-purple-700 mt-0.5">
              {effectiveRate}%
            </p>
            <p className="text-[10px] text-purple-600">Com dedução da faixa</p>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200">
            <p className="text-[11px] text-emerald-900 font-medium">Previsão Guia DAS</p>
            <p className="text-lg font-extrabold text-emerald-700 mt-0.5">
              R$ {totalTaxes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-emerald-600">ISS incluso: R$ {totalIss.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Direct Batch Download Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={handleDownloadZip}
          disabled={isZipping || emittedInvoices.length === 0}
          className="flex items-center justify-between p-5 rounded-2xl bg-[#2c0853] hover:bg-[#3d0b72] disabled:bg-slate-300 text-white shadow-md transition-all text-left"
        >
          <div>
            <span className="p-2.5 rounded-xl bg-white/10 inline-block mb-3">
              <FileArchive className="w-6 h-6 text-pink-300" />
            </span>
            <p className="font-bold text-base">Baixar Todos os XMLs (.ZIP)</p>
            <p className="text-xs text-purple-200 mt-1">
              {emittedInvoices.length} arquivos XML das NFS-e assinadas
            </p>
          </div>
          <Download className="w-5 h-5 text-purple-300" />
        </button>

        <button
          onClick={() => handleExportCsv('DOMINIO')}
          className="flex items-center justify-between p-5 rounded-2xl bg-white border border-slate-200 hover:border-purple-300 hover:bg-purple-50/30 text-slate-800 shadow-xs transition-all text-left"
        >
          <div>
            <span className="p-2.5 rounded-xl bg-blue-50 text-blue-700 inline-block mb-3">
              <FileSpreadsheet className="w-6 h-6" />
            </span>
            <p className="font-bold text-base">Arquivo Domínio Sistemas</p>
            <p className="text-xs text-slate-500 mt-1">
              CSV formatado para importação direta no Domínio
            </p>
          </div>
          <Download className="w-5 h-5 text-slate-400" />
        </button>

        <button
          onClick={() => handleExportCsv('GENERICO')}
          className="flex items-center justify-between p-5 rounded-2xl bg-white border border-slate-200 hover:border-purple-300 hover:bg-purple-50/30 text-slate-800 shadow-xs transition-all text-left"
        >
          <div>
            <span className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 inline-block mb-3">
              <FileText className="w-6 h-6" />
            </span>
            <p className="font-bold text-base">Relatório Consolidado Excel</p>
            <p className="text-xs text-slate-500 mt-1">
              Planilha detalhada com clientes, faturamento e tributos
            </p>
          </div>
          <Download className="w-5 h-5 text-slate-400" />
        </button>
      </div>

      {/* Invoices List with Search */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-800 text-sm">
              Listagem Completa de Notas Fiscais ({filteredInvoices.length} notas emitidas)
            </h3>
            <p className="text-xs text-slate-400">Transmissão ABRASF padrão Prefeitura de São Paulo</p>
          </div>
          <input
            type="text"
            placeholder="Buscar por cliente, CPF/CNPJ ou NF..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full sm:w-64 px-3.5 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-600"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
              <tr>
                <th className="px-4 py-3">Número / RPS</th>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Tomador / Documento</th>
                <th className="px-4 py-3">Serviço / CNAE</th>
                <th className="px-4 py-3 text-right">Valor Serviços</th>
                <th className="px-4 py-3 text-right">ISSQN</th>
                <th className="px-4 py-3 text-center">XML</th>
                <th className="px-4 py-3 text-right">Visualizar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInvoices.map(inv => (
                <tr key={inv.id} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3 font-mono font-bold text-purple-700">
                    NF #{inv.number}
                    <span className="block text-[10px] text-slate-400 font-normal">RPS: {inv.rpsNumber}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                    {inv.issuedAt.slice(0, 10)}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-800">{inv.customer.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{inv.customer.document}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-[11px] text-slate-700">{inv.serviceCode}</span>
                    <span className="block text-[10px] text-slate-400 truncate max-w-[160px]">{inv.productName}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-slate-900">
                    R$ {inv.grossAmount.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right text-blue-700 font-medium">
                    R$ {inv.taxes.issAmount.toFixed(2)} ({inv.taxes.issRate}%)
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => {
                        const xml = generateNfseXml(inv, company);
                        downloadFile(xml, `NFSe_${inv.number}.xml`, 'application/xml');
                      }}
                      className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-[10px] font-semibold"
                      title="Baixar XML desta nota"
                    >
                      .XML
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setSelectedInvoiceForDanfe(inv)}
                      className="text-purple-600 hover:text-purple-900 font-bold"
                    >
                      Ver DANFSE
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
