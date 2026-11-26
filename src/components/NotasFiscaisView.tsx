import React, { useState } from 'react';
import { useFiscal } from '../context/FiscalContext';
import { FiscalInvoice, InvoiceStatus, FiscalEnvironment, Sale } from '../types';
import {
  Search,
  Clock,
  AlertCircle,
  ShieldCheck,
  Zap,
  Code2,
  Check,
  Loader2,
  Download,
  RefreshCw,
  KeyRound,
  AlertTriangle,
  Play,
  Pause,
  Calendar,
  Settings,
} from 'lucide-react';
import { downloadFile } from '../services/exportService';
import { generateNfseXml } from '../services/taxCalculator';
import { EditSaleModal } from './EditSaleModal';

export const NotasFiscaisView: React.FC = () => {
  const {
    invoices,
    sales,
    platforms,
    transmitInvoiceDirect,
    cancelInvoice,
    consultInvoiceSefin,
    downloadOfficialDanfsePdf,
    company,
    updateCompany,
    hasLoadedCert,
    certSource,
    autoTransmitState,
    runAutoTransmitNow,
    clearAutoTransmitFailures,
    setCurrentView,
    setSelectedInvoiceForDanfe,
    setSelectedInvoiceForSoapLogs,
    setSelectedPlatformForModal,
  } = useFiscal();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | InvoiceStatus>('ALL');
  const [platformFilter, setPlatformFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 50;
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [cancelModalInvoice, setCancelModalInvoice] = useState<FiscalInvoice | null>(null);
  const [cancelReason, setCancelReason] = useState('Cancelamento solicitado pelo cliente');
  const [isCancelling, setIsCancelling] = useState(false);
  const [transmittingId, setTransmittingId] = useState<string | null>(null);
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);
  const [feedbackBanner, setFeedbackBanner] = useState<{
    type: 'success' | 'error' | 'info';
    title: string;
    message: string;
    invoiceForLogs?: FiscalInvoice;
  } | null>(null);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);

  const currentEnv: FiscalEnvironment = company.fiscalEnvironment || 'HOMOLOGACAO';

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

  const totalPages = Math.max(1, Math.ceil(filteredInvoices.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedInvoices = filteredInvoices.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

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

  const handleToggleEnvironment = (env: FiscalEnvironment) => {
    updateCompany({ fiscalEnvironment: env, municipalProvider: 'PADRAO_NACIONAL' });
    setFeedbackBanner({
      type: 'info',
      title: env === 'HOMOLOGACAO' ? 'Ambiente alterado para HOMOLOGAÇÃO (Produção Restrita)' : 'Ambiente alterado para PRODUÇÃO OFICIAL',
      message:
        env === 'HOMOLOGACAO'
          ? 'As transmissões agora irão para sefin.producaorestrita.nfse.gov.br (testes reais sem validade fiscal).'
          : 'Atenção: as transmissões agora irão para sefin.nfse.gov.br com validade fiscal oficial.',
    });
  };

  const handleDirectTransmit = async (invoiceId: string) => {
    if (!hasLoadedCert) {
      setFeedbackBanner({
        type: 'error',
        title: 'Certificado Digital A1 (.pfx) não carregado na sessão',
        message: 'Vá em "Regimes Tributários", selecione seu arquivo .pfx e digite a senha para assinar e transmitir à Sefin Nacional.',
      });
      return;
    }

    setTransmittingId(invoiceId);
    setFeedbackBanner(null);
    try {
      const res = await transmitInvoiceDirect(invoiceId, 'PADRAO_NACIONAL', currentEnv);
      const baseInv = invoices.find(i => i.id === invoiceId);
      const updatedSnapshot: FiscalInvoice | undefined = baseInv
        ? {
            ...baseInv,
            status: res.success ? 'EMITIDA' : 'PENDENTE',
            environment: res.environment,
            municipalProvider: 'PADRAO_NACIONAL',
            municipalProtocol: res.municipalProtocol,
            officialInvoiceNumber: res.officialNumber,
            municipalAuthCode: res.chaveAcesso || res.municipalAuthCode,
            chaveAcessoNacional: res.chaveAcesso,
            dpsId: res.dpsId,
            nfseXmlNacional: res.nfseXml,
            sefinEndpointUrl: res.endpointUrl,
            municipalUrl: res.municipalUrl,
            soapRequestXml: res.soapRequestXml,
            soapResponseXml: res.soapResponseXml,
            signedXml: res.signedXml,
            sefinErrors: res.errors,
            lastTransmissionError: res.success ? undefined : res.message,
          }
        : undefined;

      if (res.success) {
        setFeedbackBanner({
          type: 'success',
          title:
            res.environment === 'HOMOLOGACAO'
              ? 'NFS-e de TESTE autorizada na Produção Restrita (Sefin Nacional)!'
              : 'NFS-e OFICIAL autorizada pela Sefin Nacional!',
          message: `Chave de Acesso: ${res.chaveAcesso} • Número: ${res.officialNumber}`,
          invoiceForLogs: updatedSnapshot,
        });
        if (updatedSnapshot) {
          setSelectedInvoiceForSoapLogs(updatedSnapshot);
        }
      } else {
        setFeedbackBanner({
          type: 'error',
          title: `Rejeição / Retorno da Sefin Nacional (HTTP ${res.httpStatus || 'Erro'})`,
          message: res.message,
          invoiceForLogs: updatedSnapshot,
        });
      }
    } catch (err: any) {
      setFeedbackBanner({
        type: 'error',
        title: 'Falha ao comunicar com a API da Sefin Nacional',
        message: err?.message || 'Erro desconhecido ao enviar DPS.',
      });
    } finally {
      setTransmittingId(null);
    }
  };

  const handleBatchTransmit = async () => {
    const pendingSelected = selectedIds.filter(id => {
      const inv = invoices.find(i => i.id === id);
      return inv?.status === 'PENDENTE';
    });

    if (pendingSelected.length === 0) {
      setFeedbackBanner({
        type: 'info',
        title: 'Nenhuma nota pendente selecionada',
        message: 'Selecione uma ou mais notas com status PENDENTE para transmitir à Sefin Nacional.',
      });
      return;
    }

    for (const id of pendingSelected) {
      await handleDirectTransmit(id);
    }
    setSelectedIds([]);
  };

  const handleConsultSefin = async (inv: FiscalInvoice) => {
    setActionBusyId(inv.id);
    try {
      const res = await consultInvoiceSefin(inv.id);
      setFeedbackBanner({
        type: res.success ? 'success' : 'error',
        title: res.success ? 'Consulta confirmada na Sefin Nacional' : 'Retorno da consulta na Sefin Nacional',
        message: res.message,
        invoiceForLogs: inv,
      });
    } catch (err: any) {
      setFeedbackBanner({
        type: 'error',
        title: 'Erro ao consultar na Sefin Nacional',
        message: err?.message || 'Falha na consulta.',
      });
    } finally {
      setActionBusyId(null);
    }
  };

  const handleDownloadDanfsePdf = async (inv: FiscalInvoice) => {
    setActionBusyId(inv.id);
    try {
      const res = await downloadOfficialDanfsePdf(inv.id);
      setFeedbackBanner({
        type: res.success ? 'success' : 'error',
        title: res.success ? 'DANFSe Oficial (PDF) baixado' : 'Não foi possível baixar o DANFSe PDF',
        message: res.message,
      });
    } catch (err: any) {
      setFeedbackBanner({
        type: 'error',
        title: 'Erro ao baixar DANFSe do ADN Nacional',
        message: err?.message || 'Falha no download.',
      });
    } finally {
      setActionBusyId(null);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelModalInvoice) return;
    setIsCancelling(true);
    try {
      const res = await cancelInvoice(cancelModalInvoice.id, cancelReason);
      setFeedbackBanner({
        type: res.success ? 'success' : 'error',
        title: res.success ? 'Evento de Cancelamento (e101101) Concluído' : 'Cancelamento rejeitado pela Sefin Nacional',
        message: res.message,
      });
      if (res.success) {
        setCancelModalInvoice(null);
      }
    } catch (err: any) {
      setFeedbackBanner({
        type: 'error',
        title: 'Erro ao transmitir cancelamento',
        message: err?.message || 'Falha inesperada.',
      });
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Gestão de Notas Fiscais (NFS-e Nacional)</h1>
          <p className="text-xs text-slate-500">
            Transmissão real para a API oficial da Sefin Nacional (Anitápolis/SC • IBGE 4201109 • IM {company.municipalRegistration || '1618'})
          </p>
        </div>

        {/* Batch Actions */}
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2 bg-purple-50 p-2 rounded-xl border border-purple-200">
            <span className="text-xs font-bold text-purple-900 px-2">
              {selectedIds.length} selecionadas
            </span>
            <button
              onClick={handleBatchTransmit}
              disabled={Boolean(transmittingId)}
              className="px-3 py-1.5 rounded-lg bg-[#2c0853] hover:bg-[#3d0b72] text-white text-xs font-semibold disabled:opacity-50"
            >
              Transmitir Selecionadas ({currentEnv === 'HOMOLOGACAO' ? 'Teste' : 'Produção'})
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

      {/* Sefin Nacional Direct Engine Banner + Environment Toggle */}
      <div className="bg-gradient-to-r from-slate-900 via-purple-950 to-indigo-950 text-white rounded-2xl p-4 sm:p-5 shadow-sm border border-purple-900/50 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-bold text-sm text-white">API Oficial Sefin Nacional (Emissor Nacional)</h3>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px] border border-emerald-500/40">
                ● mTLS + XMLDSig RSA-SHA256
              </span>
              <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-200 font-semibold text-[10px] border border-purple-400/30">
                Anitápolis/SC • IM {company.municipalRegistration || '1618'}
              </span>
            </div>
            <p className="text-xs text-purple-200 mt-1 leading-relaxed">
              Endpoint ativo:{' '}
              <code className="text-white font-mono bg-white/10 px-1.5 py-0.5 rounded">
                {currentEnv === 'PRODUCAO'
                  ? 'https://sefin.nfse.gov.br/SefinNacional/nfse'
                  : 'https://sefin.producaorestrita.nfse.gov.br/SefinNacional/nfse'}
              </code>
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
              {hasLoadedCert ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-200 border border-emerald-500/30 font-semibold">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  Certificado A1 pronto ({certSource === 'server_env' ? 'Servidor .env' : company.certificateFileName || 'Sessão Segura'})
                </span>
              ) : (
                <button
                  onClick={() => setCurrentView('configuracoes')}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-400/40 font-semibold transition-colors"
                >
                  <KeyRound className="w-3.5 h-3.5 text-amber-300" />
                  Carregar Certificado A1 (.pfx + senha) para transmitir →
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Live Environment Switcher */}
        <div className="flex flex-col items-start lg:items-end gap-1.5 shrink-0">
          <span className="text-[10px] text-purple-300 uppercase font-bold tracking-wider">Ambiente de Transmissão</span>
          <div className="flex items-center p-1 rounded-xl bg-white/10 border border-white/15 text-xs font-bold">
            <button
              type="button"
              onClick={() => handleToggleEnvironment('HOMOLOGACAO')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                currentEnv === 'HOMOLOGACAO'
                  ? 'bg-amber-400 text-slate-950 shadow-xs'
                  : 'text-purple-200 hover:text-white'
              }`}
            >
              Homologação (Testes)
            </button>
            <button
              type="button"
              onClick={() => handleToggleEnvironment('PRODUCAO')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                currentEnv === 'PRODUCAO'
                  ? 'bg-emerald-500 text-slate-950 shadow-xs'
                  : 'text-purple-200 hover:text-white'
              }`}
            >
              Produção (Oficial)
            </button>
          </div>
          <span className="text-[10px] text-purple-200/90">
            {currentEnv === 'HOMOLOGACAO'
              ? 'Modo seguro: Produção Restrita sem valor fiscal'
              : 'Validade jurídica oficial no nfse.gov.br'}
          </span>
        </div>
      </div>

      {/* Automatic In-App Transmission Queue Panel */}
      {(() => {
        const kiwifyPlatform = platforms.find(p => p.id === 'kiwify');
        const triggerLabels: Record<string, string> = {
          on_created: 'Na geração da venda',
          on_warranty_expired: `Após garantia de ${kiwifyPlatform?.warrantyDays ?? 7} dias`,
          on_payment_approved: 'Após aprovação do pagamento',
          manual: 'Manual (Não emitir automaticamente)',
        };
        const activeTrigger = kiwifyPlatform?.trigger || 'on_warranty_expired';
        const isAutoOn = Boolean(company.autoTransmitEnabled);
        const cutoffDate =
          company.autoTransmitStartDate ||
          `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;

        return (
          <div
            className={`rounded-2xl border p-4 sm:p-5 shadow-xs transition-colors ${
              isAutoOn
                ? 'bg-emerald-50/70 border-emerald-200'
                : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      autoTransmitState.isRunning
                        ? 'bg-emerald-500 animate-ping'
                        : isAutoOn
                        ? 'bg-emerald-500'
                        : 'bg-slate-300'
                    }`}
                  />
                  <h3 className="text-sm font-bold text-slate-900">
                    Transmissão Automática (enquanto o app estiver aberto)
                  </h3>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      isAutoOn
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    {autoTransmitState.isRunning
                      ? 'Transmitindo fila...'
                      : isAutoOn
                      ? 'ATIVA'
                      : 'PAUSADA'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 text-purple-800 border border-purple-200">
                    Regra Kiwify: {triggerLabels[activeTrigger]}
                  </span>
                  {kiwifyPlatform?.cancelOnRefund !== false && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                      Auto-cancelamento em estorno/reembolso/chargeback: ATIVO
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-600">
                  Verifica a fila a cada 30s (e sincroniza a Kiwify a cada 2 min nos últimos 30 dias), emitindo conforme seu gatilho e enviando cancelamento oficial (e101101) na Sefin se houver reembolso, estorno ou chargeback.
                  {kiwifyPlatform && (
                    <button
                      type="button"
                      onClick={() => setSelectedPlatformForModal(kiwifyPlatform)}
                      className="ml-2 inline-flex items-center gap-1 text-purple-700 hover:text-purple-900 font-semibold underline"
                    >
                      <Settings className="w-3 h-3" />
                      Alterar regra
                    </button>
                  )}
                </p>

                {activeTrigger === 'manual' && (
                  <p className="text-xs text-amber-700 font-semibold">
                    Atenção: na Kiwify você selecionou "Não emitir automaticamente (Apenas sob demanda)". Altere a regra para "Após período de garantia" ou "Após aprovação do pagamento" para a fila transmitir.
                  </p>
                )}

                {!hasLoadedCert && (
                  <p className="text-xs text-amber-700 font-semibold">
                    Carregue seu Certificado A1 nas Configurações Fiscais (ou nas variáveis da Vercel) para a transmissão automática funcionar.
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
                  <Calendar className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                  <label className="text-slate-600 font-medium whitespace-nowrap">
                    Vendas a partir de:
                  </label>
                  <input
                    type="date"
                    value={cutoffDate}
                    onChange={e =>
                      updateCompany({ autoTransmitStartDate: e.target.value || cutoffDate })
                    }
                    title="Proteção contra duplicidade: só emite automaticamente vendas a partir desta data (protege vendas antigas da Spedy)"
                    className="font-mono text-xs font-semibold text-slate-800 focus:outline-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => updateCompany({ autoTransmitEnabled: !isAutoOn })}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition-colors ${
                    isAutoOn
                      ? 'bg-amber-500 hover:bg-amber-600 text-white'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  {isAutoOn ? (
                    <>
                      <Pause className="w-3.5 h-3.5" />
                      Pausar Automático
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      Ativar Automático
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Live queue telemetry & manual run controls */}
            <div className="mt-3 pt-3 border-t border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex flex-wrap items-center gap-3 text-slate-700">
                <span className="font-semibold">
                  Elegíveis agora na fila:{' '}
                  <strong className="text-purple-800">{autoTransmitState.eligibleCount}</strong>
                </span>
                <span className="text-slate-300">•</span>
                <span>
                  Autorizadas nesta sessão:{' '}
                  <strong className="text-emerald-700">{autoTransmitState.transmittedSessionCount}</strong>
                </span>
                {(autoTransmitState.eligibleCancelCount > 0 || autoTransmitState.cancelledSessionCount > 0) && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span className="text-amber-700 font-semibold">
                      Estornos p/ cancelar: {autoTransmitState.eligibleCancelCount} (canceladas: {autoTransmitState.cancelledSessionCount})
                    </span>
                  </>
                )}
                {autoTransmitState.failedSessionCount > 0 && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span className="text-rose-700 font-semibold">
                      Falhas nesta sessão: {autoTransmitState.failedSessionCount}
                    </span>
                  </>
                )}
                {autoTransmitState.lastMessage && (
                  <>
                    <span className="text-slate-300 hidden md:inline">•</span>
                    <span className="text-slate-500 truncate max-w-md">
                      {autoTransmitState.isRunning && (
                        <Loader2 className="w-3 h-3 inline mr-1 animate-spin text-purple-600" />
                      )}
                      {autoTransmitState.lastMessage}
                    </span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {autoTransmitState.failedSessionCount > 0 && (
                  <button
                    type="button"
                    onClick={clearAutoTransmitFailures}
                    className="px-2.5 py-1 rounded-lg border border-rose-200 bg-white hover:bg-rose-50 text-rose-700 text-[11px] font-semibold transition-colors"
                  >
                    Reenfileirar Falhas
                  </button>
                )}
                {isAutoOn && (
                  <button
                    type="button"
                    onClick={() => void runAutoTransmitNow()}
                    disabled={autoTransmitState.isRunning || !hasLoadedCert}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-emerald-300 bg-white hover:bg-emerald-50 text-emerald-800 text-[11px] font-bold transition-colors disabled:opacity-50"
                  >
                    {autoTransmitState.isRunning ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3 h-3" />
                    )}
                    Verificar Fila Agora
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Feedback Banner (Success / Rejection / Info) */}
      {feedbackBanner && (
        <div
          className={`p-4 rounded-xl border text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs ${
            feedbackBanner.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
              : feedbackBanner.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-950'
              : 'bg-blue-50 border-blue-200 text-blue-950'
          }`}
        >
          <div className="flex items-start gap-2.5">
            {feedbackBanner.type === 'success' ? (
              <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : feedbackBanner.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-bold">{feedbackBanner.title}</p>
              <p className="mt-0.5 leading-relaxed break-all">{feedbackBanner.message}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {feedbackBanner.invoiceForLogs && (
              <button
                onClick={() => setSelectedInvoiceForSoapLogs(feedbackBanner.invoiceForLogs!)}
                className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 font-semibold text-[11px] flex items-center gap-1"
              >
                <Code2 className="w-3.5 h-3.5 text-purple-700" />
                <span>Ver XML / Resposta Sefin</span>
              </button>
            )}
            {!hasLoadedCert && feedbackBanner.type === 'error' && (
              <button
                onClick={() => setCurrentView('configuracoes')}
                className="px-3 py-1.5 rounded-lg bg-[#2c0853] hover:bg-[#3d0b72] text-white font-semibold text-[11px]"
              >
                Carregar .pfx
              </button>
            )}
            <button
              onClick={() => setFeedbackBanner(null)}
              className="px-2 py-1 text-slate-500 hover:text-slate-900 font-bold text-[11px]"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Pesquisar por número, DPS/RPS, tomador, CPF ou produto..."
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
                <th className="px-4 py-3.5">Número / DPS</th>
                <th className="px-4 py-3.5">Data / Previsão</th>
                <th className="px-4 py-3.5">Tomador</th>
                <th className="px-4 py-3.5">Origem</th>
                <th className="px-4 py-3.5 text-right">Valor Bruto</th>
                <th className="px-4 py-3.5 text-right">Tributos (SN)</th>
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
                paginatedInvoices.map(inv => {
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
                        <span className="font-bold text-purple-900 block">
                          {inv.status === 'EMITIDA' ? `#${inv.officialInvoiceNumber || inv.number}` : `DPS #${inv.rpsNumber}`}
                        </span>
                        <span className="text-[10px] text-slate-400 block">Série {inv.series || '1'} • nº {inv.rpsNumber}</span>
                        {inv.status === 'EMITIDA' && (
                          <span
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold border mt-1 ${
                              inv.environment === 'HOMOLOGACAO'
                                ? 'bg-amber-50 text-amber-800 border-amber-300'
                                : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            }`}
                          >
                            {inv.environment === 'HOMOLOGACAO' ? '🧪 Sefin TESTE' : '🏛️ Sefin OFICIAL'}
                          </span>
                        )}
                        {inv.lastTransmissionError && inv.status === 'PENDENTE' && (
                          <button
                            onClick={() => setSelectedInvoiceForSoapLogs(inv)}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-50 text-rose-700 border border-rose-200 mt-1 hover:bg-rose-100"
                            title={inv.lastTransmissionError}
                          >
                            ⚠ Ver rejeição Sefin
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">
                        {inv.status === 'PENDENTE' && inv.scheduledFor ? (
                          <div>
                            <span className="text-amber-700 font-semibold flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" /> Aguardando envio
                            </span>
                            <span className="text-[10px] text-slate-400 block">{inv.issuedAt.slice(0, 16)}</span>
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
                          <button
                            onClick={() => handleDirectTransmit(inv.id)}
                            disabled={transmittingId === inv.id}
                            className={`px-2.5 py-1.5 rounded font-bold text-[11px] inline-flex items-center gap-1 shadow-xs disabled:opacity-50 ${
                              currentEnv === 'HOMOLOGACAO'
                                ? 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            }`}
                            title={
                              currentEnv === 'HOMOLOGACAO'
                                ? 'Transmitir DPS de TESTE para Produção Restrita (sefin.producaorestrita.nfse.gov.br)'
                                : 'Transmitir DPS OFICIAL para Produção (sefin.nfse.gov.br)'
                            }
                          >
                            {transmittingId === inv.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Zap className="w-3 h-3" />
                            )}
                            <span>
                              {transmittingId === inv.id
                                ? 'Transmitindo...'
                                : currentEnv === 'HOMOLOGACAO'
                                ? 'Testar na Sefin'
                                : 'Transmitir Oficial'}
                            </span>
                          </button>
                        )}
                        {(inv.status === 'EMITIDA' || inv.soapRequestXml || inv.lastTransmissionError) && (
                          <button
                            onClick={() => setSelectedInvoiceForSoapLogs(inv)}
                            className="px-2.5 py-1 rounded border border-purple-300 bg-purple-50 hover:bg-purple-100 text-purple-900 font-bold text-[11px] inline-flex items-center gap-1"
                            title="Ver XML DPS Assinado (XMLDSig) e Retorno real da Sefin Nacional"
                          >
                            <Code2 className="w-3 h-3 text-purple-700" />
                            <span>Logs Sefin</span>
                          </button>
                        )}
                        {inv.status === 'EMITIDA' && inv.chaveAcessoNacional && (
                          <>
                            <button
                              onClick={() => handleDownloadDanfsePdf(inv)}
                              disabled={actionBusyId === inv.id}
                              className="px-2 py-1 rounded border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-semibold text-[11px] inline-flex items-center gap-1"
                              title="Baixar DANFSe oficial (PDF) direto do ADN Nacional"
                            >
                              <Download className="w-3 h-3" />
                              <span>PDF</span>
                            </button>
                            <button
                              onClick={() => handleConsultSefin(inv)}
                              disabled={actionBusyId === inv.id}
                              className="p-1 rounded border border-slate-200 hover:bg-slate-100 text-slate-600"
                              title="Consultar status ao vivo na Sefin Nacional"
                            >
                              <RefreshCw className={`w-3 h-3 ${actionBusyId === inv.id ? 'animate-spin' : ''}`} />
                            </button>
                          </>
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
                          title="Visualizar prévia DANFSE"
                        >
                          Ver
                        </button>
                        <button
                          onClick={() => {
                            const xml = inv.nfseXmlNacional || inv.signedXml || generateNfseXml(inv, company);
                            downloadFile(xml, `NFSe_${inv.officialInvoiceNumber || inv.number}.xml`, 'application/xml');
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
                            title="Transmitir evento de cancelamento (e101101) na Sefin Nacional"
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

        {filteredInvoices.length > PAGE_SIZE && (
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>
              Mostrando <strong>{(safePage - 1) * PAGE_SIZE + 1}</strong>–
              <strong>{Math.min(safePage * PAGE_SIZE, filteredInvoices.length)}</strong> de{' '}
              <strong>{filteredInvoices.length}</strong> notas fiscais
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="px-3 py-1 rounded border border-slate-300 bg-white hover:bg-slate-100 font-semibold disabled:opacity-40"
              >
                Anterior
              </button>
              <span className="font-mono font-bold text-slate-800">
                Página {safePage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="px-3 py-1 rounded border border-slate-300 bg-white hover:bg-slate-100 font-semibold disabled:opacity-40"
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Cancel Modal */}
      {cancelModalInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="font-bold text-base text-slate-900">
              Cancelar NFS-e #{cancelModalInvoice.officialInvoiceNumber || cancelModalInvoice.number}
            </h3>
            <p className="text-xs text-slate-500">
              O TributoFlow assinará e transmitirá o evento oficial <strong>e101101 (Cancelamento de NFS-e)</strong> diretamente para a API da Sefin Nacional.
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Motivo do Cancelamento (mín. 15 caracteres):
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
                disabled={isCancelling}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold"
              >
                Voltar
              </button>
              <button
                onClick={handleConfirmCancel}
                disabled={isCancelling}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
              >
                {isCancelling && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{isCancelling ? 'Cancelando na Sefin...' : 'Confirmar Cancelamento'}</span>
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
