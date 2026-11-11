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
  ShieldCheck, 
  QrCode,
  FileCode,
  ExternalLink,
  Code2
} from 'lucide-react';

interface DanfeModalProps {
  invoice: FiscalInvoice;
  onClose: () => void;
}

export const DanfeModal: React.FC<DanfeModalProps> = ({ invoice, onClose }) => {
  const { company, setSelectedInvoiceForSoapLogs } = useFiscal();
  const [copiedKey, setCopiedKey] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [showXmlView, setShowXmlView] = useState(false);

  const xmlContent = generateNfseXml(invoice, company);

  const handleCopyKey = () => {
    navigator.clipboard.writeText(invoice.accessKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleDownloadXml = () => {
    downloadFile(xmlContent, `NFSe_${invoice.number}.xml`, 'application/xml');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSendEmail = () => {
    setEmailSent(true);
    setTimeout(() => setEmailSent(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto print:p-0 print:bg-white">
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl my-6 overflow-hidden border border-slate-300 flex flex-col max-h-[95vh] print:max-h-none print:shadow-none print:border-none print:w-full"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Toolbar (hidden in print) */}
        <div className="px-6 py-3.5 bg-slate-900 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold">NFS-e #{invoice.number}</span>
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
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedInvoiceForSoapLogs(invoice)}
              className="px-3 py-1.5 rounded-lg bg-purple-950/80 hover:bg-purple-900 text-purple-200 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-purple-700/50"
              title="Inspecionar Envelopes SOAP e Assinatura Digital XMLDSig"
            >
              <Code2 className="w-3.5 h-3.5 text-purple-300" />
              <span>Logs SOAP (Betha)</span>
            </button>
            <button
              onClick={() => setShowXmlView(!showXmlView)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <FileCode className="w-3.5 h-3.5 text-pink-400" />
              <span>{showXmlView ? 'Ver DANFSE' : 'Ver XML'}</span>
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
              <span>Imprimir DANFSE</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 font-sans text-xs text-slate-800 space-y-4">
          {showXmlView ? (
            <div className="bg-slate-900 text-emerald-400 p-4 rounded-xl font-mono text-[11px] overflow-x-auto select-all leading-relaxed whitespace-pre">
              {xmlContent}
            </div>
          ) : (
            /* Official Brazilian DANFSE Layout */
            <div className="border border-slate-400 rounded-sm p-4 space-y-3 bg-white text-slate-900">
              {/* Header Municipal */}
              <div className="border-b border-slate-300 pb-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-purple-50 border border-purple-200 flex items-center justify-center font-bold text-purple-900">
                    SC
                  </div>
                  <div>
                    <h2 className="font-extrabold text-sm uppercase tracking-wide">
                      Prefeitura Municipal de {company.address?.city || 'Anitápolis'} - {company.address?.state || 'SC'}
                    </h2>
                    <p className="text-[11px] text-slate-600">Secretaria Municipal de Finanças e Tributação • Betha Sistemas</p>
                    <p className="text-[10px] font-bold text-purple-900 uppercase">
                      Nota Fiscal Eletrônica de Serviços - NFS-e (Padrão ABRASF)
                    </p>
                  </div>
                </div>

                <div className="text-right border-l border-slate-300 pl-4 font-mono">
                  <p className="text-[10px] text-slate-500 uppercase">Número da Nota</p>
                  <p className="text-base font-extrabold text-slate-900">{invoice.officialInvoiceNumber || invoice.number}</p>
                  <p className="text-[10px] text-slate-500">Data e Hora de Emissão</p>
                  <p className="text-[11px] font-bold">{invoice.issuedAt}</p>
                  <p className="text-[10px] text-slate-500">Código de Verificação</p>
                  <p className="text-[11px] font-bold text-purple-700">{invoice.verificationCode}</p>
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
                      Motivo: {invoice.cancellationReason || 'Reembolso de compra solicitado na plataforma'}
                    </span>
                  </div>
                  <span className="text-[10px] text-rose-700 font-mono">
                    Cancelada em: {invoice.cancelledAt || invoice.issuedAt}
                  </span>
                </div>
              )}

              {/* RPS & Status Banner */}
              <div className="bg-slate-50 border border-slate-200 p-2 text-[11px] flex justify-between items-center">
                <span>
                  <strong>RPS Nº:</strong> {invoice.rpsNumber} • Série: {invoice.series} • Tipo: 1 (RPS)
                </span>
                <span>
                  <strong>Regime:</strong> {company.taxRegime} (Optante pelo Simples Nacional)
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
                      {company.address.street}, {company.address.number} - {company.address.neighborhood} - {company.address.city}/{company.address.state}
                    </p>
                  </div>
                  <div className="text-right">
                    <p><strong>CNPJ:</strong> {company.cnpj}</p>
                    <p><strong>Inscrição Municipal:</strong> {company.municipalRegistration}</p>
                    <p><strong>Email:</strong> {company.accountantEmail}</p>
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
                    <p className="text-slate-600">{invoice.customer.city || 'São Paulo'} - {invoice.customer.state || 'SP'}</p>
                  </div>
                  <div className="text-right">
                    <p><strong>CPF/CNPJ:</strong> {invoice.customer.document}</p>
                    <p><strong>Inscrição Municipal:</strong> Não Informada</p>
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
                  - Documento emitido por ME ou EPP optante pelo Simples Nacional. Não gera direito a crédito fiscal de IPI.
                  <br />
                  - Conforme Lei Complementar nº 123/2006. Alíquota efetiva apurada: {invoice.taxes.effectiveRate}%.
                </p>
              </div>

              {/* Código de Tributação & CNAE */}
              <div className="grid grid-cols-2 gap-2 p-2 bg-slate-50 border border-slate-200 text-[11px]">
                <div>
                  <span className="text-slate-500">Código de Serviço:</span>{' '}
                  <strong>{invoice.serviceCode}</strong> - Suporte técnico e consultoria digital
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
                    <p className="text-xs text-slate-500">Valor dos Serviços / Base de Cálculo ISS:</p>
                    <p className="text-base font-extrabold text-slate-900">
                      R$ {invoice.grossAmount.toFixed(2)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-slate-500">Alíquota ISS ({invoice.taxes.issRate}%):</p>
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

              {/* QR Code and Authenticity Verification Footer */}
              <div className="flex items-center justify-between border-t border-slate-300 pt-2 text-[10px] text-slate-500">
                <div className="space-y-0.5">
                  <p>Consulte a autenticidade deste documento acessando o Portal Betha da Prefeitura de Anitápolis/SC:</p>
                  <p className="font-mono text-purple-700">
                    {invoice.municipalUrl || `https://e-gov.betha.com.br/e-nota/consulta?cod=${invoice.verificationCode}&mun=4201007`}
                  </p>
                  <p className="font-mono text-slate-600">
                    Protocolo Municipal: <strong>{invoice.municipalProtocol || 'PROTOCOLO-BET-2026114201007'}</strong> • Chave: {invoice.accessKey}
                  </p>
                </div>
                <div className="w-14 h-14 bg-slate-100 border border-slate-300 rounded flex items-center justify-center font-mono text-[9px] text-center">
                  [QR-CODE]
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
              {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey ? 'Chave copiada!' : 'Copiar Chave'}</span>
            </button>
            <span>•</span>
            <button
              onClick={handleSendEmail}
              className="text-slate-600 hover:text-purple-700 flex items-center gap-1 font-medium"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>{emailSent ? 'Email reenviado com sucesso!' : 'Reenviar para o cliente'}</span>
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
