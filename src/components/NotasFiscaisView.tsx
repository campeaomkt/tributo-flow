import React, { useState } from 'react';
import { useFiscal } from '../context/FiscalContext';
import { FiscalInvoice, InvoiceStatus } from '../types';
import { 
  FileText, 
  Search, 
  Download, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Printer, 
  Send, 
  RotateCcw,
  Calendar,
  Filter,
  CheckSquare,
  Square,
  ShieldCheck,
  Zap,
  Code2,
  Check,
  Loader2,
  ExternalLink,
  Edit3
} from 'lucide-react';
import { downloadFile } from '../services/exportService';
import { generateNfseXml } from '../services/taxCalculator';
import { EditSaleModal } from './EditSaleModal';
import { Sale } from '../types';

export const NotasFiscaisView: React.FC = () => {
  const { 
    invoices, 
    sales,
    emitInvoice, 
    emitBatchInvoices, 
    transmitInvoiceDirect,
    cancelInvoice, 
    company, 
    setSelectedInvoiceForDanfe,
    setSelectedInvoiceForSoapLogs,
  } = useFiscal();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | InvoiceStatus>('ALL');
  const [platformFilter, setPlatformFilter] = useState<string>('ALL');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [cancelModalInvoice, setCancelModalInvoice] = useState<FiscalInvoice | null>(null);
  const [cancelReason, setCancelReason] = useState('Cancelamento solicitado pelo cliente');
  const [transmittingId, setTransmittingId] = useState<string | null>(null);
  const [transmissionSuccessMsg, setTransmissionSuccessMsg] = useState<string | null>(null);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = 
      inv.number.includes(searchTerm) ||
      inv.rpsNumber.includes(searchTerm) ||
      inv.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.customer.document.includes(searchTerm) ||
      inv.productName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || inv.status === statusFilter;
    const matchesPlatform = platformFilter === 'ALL' || inv.platform === platformFilter;

    return matchesSearch && matchesStatus && matchesPlatform;
  });

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredInvoices.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredInvoices.map(i => i.id));
    }
  };

  const toggleSelectId = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleEmitSelected = () => {
    const pendingSelected = selectedIds.filter(id => {
      const inv = invoices.find(i => i.id === id);
      return inv?.status === 'PENDENTE';
    });

    if (pendingSelected.length === 0) {
      alert('Selecione notas com status PENDENTE para emitir.');
      return;
    }

    emitBatchInvoices(pendingSelected);
    setSelectedIds([]);
  };

  const handleDirectTransmit = async (invoiceId: string) => {
    setTransmittingId(invoiceId);
    try {
      const res = await transmitInvoiceDirect(invoiceId);
      setTransmissionSuccessMsg(`NFS-e autorizada pela Prefeitura de Anitápolis/SC (Betha)! Protocolo: ${res.municipalProtocol} • Cód: ${res.municipalAuthCode}`);
      setTimeout(() => setTransmissionSuccessMsg(null), 5000);
      const updatedInv = invoices.find(i => i.id === invoiceId);
      if (updatedInv) {
        setSelectedInvoiceForSoapLogs({
          ...updatedInv,
          status: 'EMITIDA',
          municipalProtocol: res.municipalProtocol,
          officialInvoiceNumber: res.officialNumber,
          municipalAuthCode: res.municipalAuthCode,
          municipalUrl: res.municipalUrl,
          soapRequestXml: res.soapRequestXml,
          soapResponseXml: res.soapResponseXml,
          signedXml: res.signedXml,
        });
      }
    } catch (err: any) {
      alert(`Falha na transmissão direta: ${err.message || 'Erro desconhecido'}`);
    } finally {
      setTransmittingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Gestão de Notas Fiscais (NFS-e)</h1>
          <p className="text-xs text-slate-500">
            Acompanhe a transmissão em tempo real para a Prefeitura, emissões imediatas e notas em período de garantia
          </p>
        </div>

        {/* Batch Actions */}
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2 bg-purple-50 p-2 rounded-xl border border-purple-200">
            <span className="text-xs font-bold text-purple-900 px-2">
              {selectedIds.length} selecionadas
            </span>
            <button
              onClick={handleEmitSelected}
              className="px-3 py-1.5 rounded-lg bg-[#2c0853] hover:bg-[#3d0b72] text-white text-xs font-semibold"
            >
              Emitir Selecionadas
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="px-2 py-1 text-slate-500 hover:text-slate-700 text-xs"
            >
              Limpar
            </button>
          </div>
        )}
      </div>

      {/* Direct Municipal Transmission Active Engine Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-purple-950 to-indigo-950 text-white rounded-2xl p-4 sm:p-5 shadow-sm border border-purple-900/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-bold text-sm text-white">Transmissor Municipal Direto Autônomo</h3>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px] border border-emerald-500/40">
                ● Conectado à Betha Sistemas (Anitápolis - SC)
              </span>
              <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-200 font-semibold text-[10px] border border-purple-400/30">
                Sem API Intermediária / Sem Custo por Nota
              </span>
            </div>
            <p className="text-xs text-purple-200 mt-1 leading-relaxed">
              Assinatura digital XMLDSig com chave privada do Certificado A1 (<strong className="text-white">CNPJ 40.731.222/0001-07</strong>). Envio em lote RPS via SOAP WebService ABRASF v2.02 diretamente aos servidores da Prefeitura.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch md:self-auto shrink-0 text-xs">
          <div className="px-3 py-1.5 rounded-xl bg-white/10 text-slate-200 border border-white/10 text-center">
            <span className="text-[10px] text-purple-300 uppercase block font-bold">Ambiente</span>
            <span className="font-bold text-emerald-300">PRODUÇÃO</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-white/10 text-slate-200 border border-white/10 text-center">
            <span className="text-[10px] text-purple-300 uppercase block font-bold">Padrão XML</span>
            <span className="font-bold text-white">ABRASF 2.02</span>
          </div>
        </div>
      </div>

      {/* Success alert toast if transmitted */}
      {transmissionSuccessMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{transmissionSuccessMsg}</span>
          </div>
          <button 
            onClick={() => setTransmissionSuccessMsg(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-bold"
          >
            Dispensar
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Pesquisar por número, RPS, tomador, CPF ou produto..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-600 text-slate-800"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Tabs */}
          <div className="flex items-center p-1 bg-slate-100 rounded-lg">
            {(['ALL', 'EMITIDA', 'PENDENTE', 'CANCELADA'] as const).map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-md font-semibold transition-all ${
                  statusFilter === st
                    ? 'bg-white text-purple-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st === 'ALL' ? 'Todas' : st}
              </button>
            ))}
          </div>

          {/* Platform Filter */}
          <select
            value={platformFilter}
            onChange={e => setPlatformFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-300 bg-white font-medium text-slate-700"
          >
            <option value="ALL">Todas Plataformas</option>
            <option value="kiwify">Kiwify</option>
            <option value="hotmart">Hotmart</option>
            <option value="custom_api">API REST</option>
          </select>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
              <tr>
                <th className="px-4 py-3.5 w-10">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === filteredInvoices.length && filteredInvoices.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                  />
                </th>
                <th className="px-4 py-3.5">Número / RPS</th>
                <th className="px-4 py-3.5">Data / Previsão</th>
                <th className="px-4 py-3.5">Tomador</th>
                <th className="px-4 py-3.5">Origem</th>
                <th className="px-4 py-3.5 text-right">Valor Bruto</th>
                <th className="px-4 py-3.5 text-right">Tributos (Simples)</th>
                <th className="px-4 py-3.5 text-center">Status</th>
                <th className="px-4 py-3.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                    Nenhuma nota fiscal encontrada para o filtro atual.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map(inv => {
                  const isSelected = selectedIds.includes(inv.id);

                  return (
                    <tr 
                      key={inv.id} 
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isSelected ? 'bg-purple-50/40' : ''
                      }`}
                    >
                      <td className="px-4 py-3.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectId(inv.id)}
                          className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                        />
                      </td>
                      <td className="px-4 py-3.5 font-mono">
                        <span className="font-bold text-purple-900 block">#{inv.officialInvoiceNumber || inv.number}</span>
                        <span className="text-[10px] text-slate-400 block">RPS: {inv.rpsNumber}</span>
                        {inv.status === 'EMITIDA' && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-purple-50 text-purple-800 border border-purple-200 mt-1">
                            🏛️ Betha (Anitápolis/SC)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">
                        {inv.status === 'PENDENTE' && inv.scheduledFor ? (
                          <div>
                            <span className="text-amber-700 font-semibold flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" /> Na garantia
                            </span>
                            <span className="text-[10px] text-slate-400 block">{inv.scheduledFor}</span>
                          </div>
                        ) : (
                          inv.issuedAt.slice(0, 16)
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-slate-800">{inv.customer.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{inv.customer.document}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 uppercase">
                          {inv.platform}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-extrabold text-slate-900">
                        R$ {inv.grossAmount.toFixed(2)}
                      </td>
                      <td className="px-4 py-3.5 text-right font-medium text-purple-700">
                        R$ {inv.taxes.totalTax.toFixed(2)} ({inv.taxes.effectiveRate}%)
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            inv.status === 'EMITIDA'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : inv.status === 'PENDENTE'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-rose-100 text-rose-800 border border-rose-200'
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap space-x-1.5">
                        {inv.status === 'PENDENTE' && (
                          <>
                            <button
                              onClick={() => handleDirectTransmit(inv.id)}
                              disabled={transmittingId === inv.id}
                              className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] inline-flex items-center gap-1 shadow-xs disabled:opacity-50"
                              title="Transmitir direto para a Prefeitura de Anitápolis/SC (Betha Sistemas) sem custo de API"
                            >
                              {transmittingId === inv.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Zap className="w-3 h-3 text-amber-300" />
                              )}
                              <span>Transmitir Direto</span>
                            </button>
                            <button
                              onClick={() => emitInvoice(inv.id)}
                              className="px-2 py-1 rounded border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-[11px]"
                              title="Emitir internamente"
                            >
                              Emitir
                            </button>
                          </>
                        )}
                        {inv.status === 'EMITIDA' && (
                          <button
                            onClick={() => setSelectedInvoiceForSoapLogs(inv)}
                            className="px-2.5 py-1 rounded border border-purple-300 bg-purple-50 hover:bg-purple-100 text-purple-900 font-bold text-[11px] inline-flex items-center gap-1"
                            title="Ver Envelopes SOAP de Envio e Retorno da Prefeitura (Betha Sistemas)"
                          >
                            <Code2 className="w-3 h-3 text-purple-700" />
                            <span>Logs SOAP</span>
                          </button>
                        )}
                        <button
                          onClick={() => {
                            const foundSale = sales.find(s => s.invoiceId === inv.id || s.id === inv.saleId);
                            if (foundSale) setEditingSale(foundSale);
                          }}
                          className="px-2 py-1 rounded text-purple-700 hover:bg-purple-50 text-[11px] font-medium"
                          title="Ajustar valor real com Order Bump ou colar JSON da Kiwify"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => setSelectedInvoiceForDanfe(inv)}
                          className="px-2.5 py-1 rounded border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-[11px]"
                          title="Visualizar DANFSE"
                        >
                          Ver
                        </button>
                        <button
                          onClick={() => {
                            const xml = generateNfseXml(inv, company);
                            downloadFile(xml, `NFSe_${inv.number}.xml`, 'application/xml');
                          }}
                          className="px-2 py-1 rounded text-slate-500 hover:text-slate-800 text-[11px] font-mono"
                          title="Download XML"
                        >
                          .XML
                        </button>
                        {inv.status === 'EMITIDA' && (
                          <button
                            onClick={() => setCancelModalInvoice(inv)}
                            className="text-rose-600 hover:text-rose-800 text-[11px] font-medium"
                            title="Cancelar nota fiscal"
                          >
                            Cancelar
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cancel Modal */}
      {cancelModalInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="font-bold text-base text-slate-900">
              Cancelar Nota Fiscal #{cancelModalInvoice.number}
            </h3>
            <p className="text-xs text-slate-500">
              O cancelamento transmitirá a solicitação de cancelamento para a Prefeitura Municipal e registrará a anulação do fato gerador.
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Motivo do Cancelamento:
              </label>
              <textarea
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                rows={3}
                className="w-full p-2.5 rounded-lg border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setCancelModalInvoice(null)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold"
              >
                Voltar
              </button>
              <button
                onClick={() => {
                  cancelInvoice(cancelModalInvoice.id, cancelReason);
                  setCancelModalInvoice(null);
                }}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
              >
                Confirmar Cancelamento
              </button>
            </div>
          </div>
        </div>
      )}

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
