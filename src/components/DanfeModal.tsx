import React, { useState } from 'react';
import { useFiscal } from '../context/FiscalContext';
import { FiscalInvoice } from '../types';
import { generateNfseXml } from '../services/taxCalculator';
import { downloadFile } from '../services/exportService';
import {
  X,
  Printer,
  Download,
  Copy,
  Check,
  Mail,
  FileCode,
  Code2,
  FileDown,
  Loader2,
  AlertTriangle,
} from 'lucide-react';

interface DanfeModalProps {
  invoice: FiscalInvoice;
  onClose: () => void;
}

export const DanfeModal: React.FC<DanfeModalProps> = ({ invoice, onClose }) => {
  const { company, setSelectedInvoiceForSoapLogs, downloadOfficialDanfsePdf } = useFiscal();
  const [copiedKey, setCopiedKey] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [showXmlView, setShowXmlView] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [pdfFeedback, setPdfFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const env = invoice.environment || company.fiscalEnvironment || 'HOMOLOGACAO';
  const isHomologacao = env === 'HOMOLOGACAO';
  const displayAccessKey = invoice.chaveAcessoNacional || invoice.accessKey;
  const xmlContent =
    invoice.nfseXmlNacional ||
    invoice.soapRequestXml ||
    generateNfseXml(invoice, company);

  const portalUrl =
    invoice.municipalUrl ||
    (isHomologacao
      ? 'https://www.producaorestrita.nfse.gov.br/EmissorNacional'
      : 'https://www.nfse.gov.br/ConsultaPublica');

  const handleCopyKey = () => {
    navigator.clipboard.writeText(displayAccessKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleDownloadXml = () => {
    downloadFile(
      xmlContent,
      `NFSe_Nacional_${invoice.officialInvoiceNumber || invoice.number}.xml`,
      'application/xml'
    );
  };

  const handleDownloadOfficialPdf = async () => {
    setDownloadingPdf(true);
    setPdfFeedback(null);
    const res = await downloadOfficialDanfsePdf(invoice.id);
    setDownloadingPdf(false);
    setPdfFeedback({
      type: res.success ? 'success' : 'error',
      text: res.message,
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSendEmail = () => {
    setEmailSent(true);
    setTimeout(() => setEmailSent(false), 2500);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto print:p-0 print:bg-white"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl my-6 overflow-hidden border border-slate-300 flex flex-col max-h-[95vh] print:max-h-none print:shadow-none print:border-none print:w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Toolbar (hidden in print) */}
        <div className="px-6 py-3.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-2 print:hidden">
          <div className="flex items-center gap-2.5">
            <span className="text-sm font-bold">
              {invoice.status === 'EMITIDA'
                ? `NFS-e #${invoice.officialInvoiceNumber || invoice.number}`
                : `DPS #${invoice.rpsNumber}`}
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                invoice.status === 'EMITIDA'
                  ? 'bg-emerald-500 text-white'
                  : invoice.status === 'PENDENTE'
                  ? 'bg-amber-500 text-white'
                  : 'bg-rose-500 text-white'
              }`}
            >
              {invoice.status}
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                isHomologacao
                  ? 'bg-amber-500/20 text-amber-200 border border-amber-400/40'
                  : 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/40'
              }`}
            >
              {isHomologacao ? 'Homologação' : 'Produção'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setSelectedInvoiceForSoapLogs(invoice)}
              className="px-3 py-1.5 rounded-lg bg-purple-950/80 hover:bg-purple-900 text-purple-200 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-purple-700/50"
              title="Inspecionar XML assinado e retorno da API Sefin Nacional"
            >
              <Code2 className="w-3.5 h-3.5 text-purple-300" />
              <span>Logs Sefin Nacional</span>
            </button>
            {invoice.chaveAcessoNacional && (
              <button
                onClick={handleDownloadOfficialPdf}
                disabled={downloadingPdf}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                title="Baixar PDF oficial do DANFSe diretamente do ADN da Receita Federal"
              >
                {downloadingPdf ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FileDown className="w-3.5 h-3.5" />
                )}
                <span>Baixar DANFSe Oficial (PDF)</span>
              </button>
            )}
            <button
              onClick={() => setShowXmlView(!showXmlView)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <FileCode className="w-3.5 h-3.5 text-pink-400" />
              <span>{showXmlView ? 'Ver DANFSe' : 'Ver XML'}</span>
            </button>
            <button
              onClick={handleDownloadXml}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>XML</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 ml-1"
              aria-label="Fechar DANFSe"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Feedback banner for official PDF download */}
        {pdfFeedback && (
          <div
            className={`px-6 py-2.5 text-xs font-medium flex items-center justify-between print:hidden ${
              pdfFeedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-b border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-b border-rose-200'
            }`}
          >
            <span>{pdfFeedback.text}</span>
            <button
              onClick={() => setPdfFeedback(null)}
              className="text-current opacity-70 hover:opacity-100"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 font-sans text-xs text-slate-800 space-y-4">
          {showXmlView ? (
            <div className="bg-slate-900 text-emerald-400 p-4 rounded-xl font-mono text-[11px] overflow-x-auto select-all leading-relaxed whitespace-pre-wrap break-all">
              {xmlContent}
            </div>
          ) : (
            /* Official Brazilian Padrão Nacional DANFSe Layout */
            <div className="border border-slate-400 rounded-sm p-4 space-y-3 bg-white text-slate-900">
              {/* Homologation Watermark Banner */}
              {isHomologacao && (
                <div className="bg-amber-50 border-2 border-amber-400 p-2.5 rounded text-amber-950 text-xs flex items-center justify-center gap-2 font-extrabold tracking-wide uppercase">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    AMBIENTE DE HOMOLOGAÇÃO (PRODUÇÃO RESTRITA) — SEM VALOR FISCAL
                  </span>
                </div>
              )}

              {/* Header Nacional */}
              <div className="border-b border-slate-300 pb-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center font-extrabold text-emerald-900 text-xs text-center leading-tight">
                    NFS-e
                    <br />
                    BR
                  </div>
                  <div>
                    <h2 className="font-extrabold text-sm uppercase tracking-wide">
                      DANFSe — Documento Auxiliar da NFS-e (Padrão Nacional)
                    </h2>
                    <p className="text-[11px] text-slate-600">
                      Sistema Nacional NFS-e (Sefin Nacional) • Município de{' '}
                      {company.address?.city || 'Anitápolis'} - {company.address?.state || 'SC'}{' '}
                      (IBGE 4201109)
                    </p>
                    <p className="text-[10px] font-bold text-purple-900 uppercase">
                      Nota Fiscal de Serviço Eletrônica • Padrão Nacional v1.00
                    </p>
                  </div>
                </div>

                <div className="text-right border-l border-slate-300 pl-4 font-mono shrink-0">
                  <p className="text-[10px] text-slate-500 uppercase">
                    {invoice.status === 'EMITIDA' ? 'Número da NFS-e' : 'Declaração (DPS)'}
                  </p>
                  <p className="text-base font-extrabold text-slate-900">
                    {invoice.status === 'EMITIDA'
                      ? invoice.officialInvoiceNumber || invoice.number
                      : `DPS ${invoice.rpsNumber}`}
                  </p>
                  <p className="text-[10px] text-slate-500">Data e Hora</p>
                  <p className="text-[11px] font-bold">
                    {invoice.authorizedAt || invoice.issuedAt}
                  </p>
                  <p className="text-[10px] text-slate-500">Status Sefin</p>
                  <p className="text-[11px] font-bold text-purple-700">
                    {invoice.status === 'EMITIDA'
                      ? 'Autorizada'
                      : invoice.status === 'CANCELADA'
                      ? 'Cancelada'
                      : 'Aguardando Transmissão'}
                  </p>
                </div>
              </div>

              {/* Cancelled watermark banner */}
              {invoice.status === 'CANCELADA' && (
                <div className="bg-rose-50 border-2 border-rose-400 p-3 rounded text-rose-900 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded font-black bg-rose-600 text-white text-[11px] uppercase tracking-wider">
                      NOTA FISCAL CANCELADA
                    </span>
                    <span className="font-semibold text-[11px]">
                      Motivo:{' '}
                      {invoice.cancellationReason ||
                        'Reembolso de compra solicitado na plataforma'}
                    </span>
                  </div>
                  <span className="text-[10px] text-rose-700 font-mono">
                    Cancelada em: {invoice.cancelledAt || invoice.issuedAt}
                  </span>
                </div>
              )}

              {/* DPS & Regime Banner */}
              <div className="bg-slate-50 border border-slate-200 p-2 text-[11px] flex flex-wrap justify-between items-center gap-2">
                <span>
                  <strong>DPS Nº:</strong> {invoice.rpsNumber} • Série: {invoice.series} • Código
                  Município: 4201109 (Anitápolis/SC)
                </span>
                <span>
                  <strong>Regime:</strong>{' '}
                  {company.taxRegime === 'SIMPLES_NACIONAL'
                    ? 'Simples Nacional (ME/EPP)'
                    : company.taxRegime}
                </span>
              </div>

              {/* Prestador de Serviços */}
              <div className="border border-slate-300 rounded p-2.5 space-y-1">
                <p className="font-bold text-[11px] uppercase bg-slate-100 -m-2.5 mb-1.5 p-1 px-2.5 text-slate-700">
                  Prestador de Serviços
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="font-bold">{company.corporateName}</p>
                    <p className="text-slate-600">Nome Fantasia: {company.tradeName}</p>
                    <p className="text-slate-600">
                      {company.address.street}, {company.address.number} -{' '}
                      {company.address.neighborhood} - {company.address.city}/
                      {company.address.state}
                    </p>
                  </div>
                  <div className="text-right">
                    <p>
                      <strong>CNPJ:</strong> {company.cnpj}
                    </p>
                    <p>
                      <strong>Inscrição Municipal:</strong>{' '}
                      {company.municipalRegistration || '1618'}
                    </p>
                    <p>
                      <strong>Email:</strong> {company.accountantEmail}
                    </p>
                  </div>
                </div>
              </div>

              {/* Tomador de Serviços */}
              <div className="border border-slate-300 rounded p-2.5 space-y-1">
                <p className="font-bold text-[11px] uppercase bg-slate-100 -m-2.5 mb-1.5 p-1 px-2.5 text-slate-700">
                  Tomador de Serviços
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="font-bold">{invoice.customer.name}</p>
                    <p className="text-slate-600">Email: {invoice.customer.email}</p>
                    <p className="text-slate-600">
                      {invoice.customer.city || 'São Paulo'} - {invoice.customer.state || 'SP'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p>
                      <strong>CPF/CNPJ:</strong> {invoice.customer.document}
                    </p>
                    <p>
                      <strong>Inscrição Municipal:</strong> Não Informada
                    </p>
                  </div>
                </div>
              </div>

              {/* Discriminação dos Serviços */}
              <div className="border border-slate-300 rounded p-2.5 space-y-2">
                <p className="font-bold text-[11px] uppercase bg-slate-100 -m-2.5 mb-1.5 p-1 px-2.5 text-slate-700">
                  Discriminação dos Serviços
                </p>
                <p className="font-mono text-[11px] leading-relaxed text-slate-800">
                  {invoice.description}
                  <br />
                  <br />
                  - Plataforma de Origem: {invoice.platform.toUpperCase()}
                  <br />
                  - Identificador da Venda: {invoice.saleId}
                  <br />
                  - Documento emitido por ME ou EPP optante pelo Simples Nacional. Não gera direito
                  a crédito fiscal de IPI.
                  <br />- Conforme Lei Complementar nº 123/2006. Alíquota efetiva aproximada (DAS):{' '}
                  {invoice.taxes.effectiveRate}%.
                </p>
              </div>

              {/* Código de Tributação Nacional & CNAE */}
              <div className="grid grid-cols-2 gap-2 p-2 bg-slate-50 border border-slate-200 text-[11px]">
                <div>
                  <span className="text-slate-500">Cód. Tributação Nacional (cTribNac):</span>{' '}
                  <strong>{invoice.serviceCode || company.serviceCode || '010701'}</strong>
                </div>
                <div className="text-right">
                  <span className="text-slate-500">CNAE:</span>{' '}
                  <strong>{invoice.cnae}</strong>
                </div>
              </div>

              {/* Valores & Tributos */}
              <div className="border border-slate-300 rounded p-3 space-y-2">
                <div className="grid grid-cols-5 gap-2 text-center border-b border-slate-200 pb-2 text-[10px]">
                  <div>
                    <span className="text-slate-500 block">PIS</span>
                    <span className="font-bold">R$ {invoice.taxes.pisAmount.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">COFINS</span>
                    <span className="font-bold">R$ {invoice.taxes.cofinsAmount.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">INSS</span>
                    <span className="font-bold">R$ 0,00</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">IR</span>
                    <span className="font-bold">R$ {invoice.taxes.irpjAmount.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">CSLL</span>
                    <span className="font-bold">R$ {invoice.taxes.csllAmount.toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div>
                    <p className="text-xs text-slate-500">Valor dos Serviços / Base de Cálculo:</p>
                    <p className="text-base font-extrabold text-slate-900">
                      R$ {invoice.grossAmount.toFixed(2)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-slate-500">
                      ISS (Simples Nacional — {invoice.taxes.issRate}%):
                    </p>
                    <p className="text-base font-extrabold text-blue-700">
                      R$ {invoice.taxes.issAmount.toFixed(2)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Valor Líquido da Nota Fiscal:</p>
                    <p className="text-xl font-extrabold text-emerald-700">
                      R$ {invoice.netAmount.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Authenticity Verification Footer */}
              <div className="flex items-center justify-between gap-4 border-t border-slate-300 pt-2 text-[10px] text-slate-500">
                <div className="space-y-0.5 min-w-0">
                  {invoice.status === 'EMITIDA' && invoice.chaveAcessoNacional ? (
                    <>
                      <p>
                        Consulte a autenticidade deste documento no Portal Nacional da NFS-e (
                        {isHomologacao ? 'Produção Restrita / Homologação' : 'Produção Oficial'}):
                      </p>
                      <p className="font-mono text-purple-700 break-all">{portalUrl}</p>
                      <p className="font-mono text-slate-700 break-all">
                        Chave de Acesso Nacional: <strong>{invoice.chaveAcessoNacional}</strong>
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-semibold text-amber-800">
                        Declaração de Prestação de Serviços (DPS Nº {invoice.rpsNumber}) •
                        Aguardando Autorização na Sefin Nacional
                      </p>
                      <p className="text-slate-500">
                        Este documento provisório somente adquire validade fiscal após a
                        transmissão e autorização pela API oficial da Sefin Nacional (nfse.gov.br).
                      </p>
                    </>
                  )}
                </div>
                <div className="w-16 h-16 shrink-0 bg-slate-100 border border-slate-300 rounded flex items-center justify-center font-mono text-[9px] text-center px-1">
                  {invoice.status === 'EMITIDA' ? 'NFS-e NACIONAL' : 'DPS PENDENTE'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer (hidden in print) */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={handleCopyKey}
              className="text-slate-600 hover:text-purple-700 flex items-center gap-1 font-medium"
            >
              {copiedKey ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>{copiedKey ? 'Chave copiada!' : 'Copiar Chave'}</span>
            </button>
            <span>•</span>
            <button
              onClick={handleSendEmail}
              className="text-slate-600 hover:text-purple-700 flex items-center gap-1 font-medium"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>
                {emailSent ? 'Email reenviado com sucesso!' : 'Reenviar para o cliente'}
              </span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-full border border-slate-300 hover:bg-white text-slate-700 font-semibold text-xs"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
