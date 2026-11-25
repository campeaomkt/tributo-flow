import React, { useState } from 'react';
import { FiscalInvoice } from '../types';
import { useFiscal } from '../context/FiscalContext';
import {
  X,
  Check,
  Copy,
  ExternalLink,
  ShieldCheck,
  Send,
  AlertTriangle,
  Clock,
  Globe,
  FileCode,
} from 'lucide-react';

interface SoapLogsModalProps {
  invoice: FiscalInvoice;
  onClose: () => void;
}

export const SoapLogsModal: React.FC<SoapLogsModalProps> = ({ invoice, onClose }) => {
  const { company } = useFiscal();
  const [activeTab, setActiveTab] = useState<'response' | 'request' | 'signature'>('response');
  const [copied, setCopied] = useState(false);

  const env = invoice.environment || company.fiscalEnvironment || 'HOMOLOGACAO';
  const isHomologacao = env === 'HOMOLOGACAO';
  const isAuthorized = invoice.status === 'EMITIDA' && Boolean(invoice.chaveAcessoNacional);
  const hasErrors = Boolean(
    invoice.lastTransmissionError || (invoice.sefinErrors && invoice.sefinErrors.length > 0)
  );

  const defaultEndpoint = isHomologacao
    ? 'https://sefin.producaorestrita.nfse.gov.br/SefinNacional/nfse'
    : 'https://sefin.nfse.gov.br/SefinNacional/nfse';

  const portalUrl =
    invoice.municipalUrl ||
    (isHomologacao
      ? 'https://www.producaorestrita.nfse.gov.br/EmissorNacional'
      : 'https://www.nfse.gov.br/ConsultaPublica');

  const responsePayload =
    invoice.nfseXmlNacional ||
    invoice.soapResponseXml ||
    '';

  const requestPayload = invoice.soapRequestXml || '';

  const handleCopy = () => {
    const textToCopy = activeTab === 'response' ? responsePayload : requestPayload;
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl my-6 overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-purple-950 to-indigo-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-bold text-base">Logs da API Sefin Nacional (NFS-e)</h2>
                <span
                  className={`px-2 py-0.5 rounded-full font-semibold text-[10px] border ${
                    isHomologacao
                      ? 'bg-amber-500/20 text-amber-200 border-amber-400/40'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  }`}
                >
                  {isHomologacao ? 'Homologação (Produção Restrita)' : 'Produção Oficial'}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-white/10 text-slate-200 font-medium text-[10px]">
                  Anitápolis/SC • IBGE 4201109
                </span>
              </div>
              <p className="text-xs text-purple-200 mt-0.5">
                {invoice.officialInvoiceNumber
                  ? `NFS-e Nº ${invoice.officialInvoiceNumber}`
                  : `DPS #${invoice.rpsNumber}`}{' '}
                • Tomador: {invoice.customer.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Fechar logs"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Transmission Summary Banner */}
        <div
          className={`p-4 border-b grid grid-cols-1 md:grid-cols-4 gap-3 text-xs ${
            isAuthorized
              ? 'bg-emerald-50/70 border-emerald-200'
              : hasErrors
              ? 'bg-rose-50/70 border-rose-200'
              : 'bg-amber-50/70 border-amber-200'
          }`}
        >
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-bold block">
              Status Sefin Nacional
            </span>
            {isAuthorized ? (
              <p className="font-bold text-emerald-800 flex items-center gap-1 mt-0.5">
                <Check className="w-3.5 h-3.5 text-emerald-600" /> Autorizada Oficialmente
              </p>
            ) : hasErrors ? (
              <p className="font-bold text-rose-800 flex items-center gap-1 mt-0.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" /> Rejeitada na Sefin
              </p>
            ) : (
              <p className="font-bold text-amber-800 flex items-center gap-1 mt-0.5">
                <Clock className="w-3.5 h-3.5 text-amber-600" /> Aguardando Transmissão
              </p>
            )}
          </div>

          <div className="md:col-span-2">
            <span className="text-[10px] text-slate-500 uppercase font-bold block">
              {invoice.chaveAcessoNacional ? 'Chave de Acesso Nacional (50 dígitos)' : 'Identificador DPS'}
            </span>
            <p
              className="font-mono font-semibold text-slate-800 text-[11px] break-all mt-0.5"
              title={invoice.chaveAcessoNacional || invoice.dpsId || ''}
            >
              {invoice.chaveAcessoNacional || invoice.dpsId || 'Gerada no momento da transmissão'}
            </p>
          </div>

          <div>
            <span className="text-[10px] text-slate-500 uppercase font-bold block">
              Portal Nacional NFS-e
            </span>
            <a
              href={portalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-700 hover:text-purple-900 font-semibold flex items-center gap-1 underline text-[11px] mt-0.5"
            >
              <span>{isHomologacao ? 'Abrir Produção Restrita' : 'Consultar no Portal'}</span>
              <ExternalLink className="w-3 h-3 shrink-0" />
            </a>
          </div>
        </div>

        {/* Real Sefin Rejection Errors */}
        {hasErrors && (
          <div className="px-6 py-3 bg-rose-50 border-b border-rose-200 text-xs text-rose-900 space-y-1.5">
            <p className="font-bold flex items-center gap-1.5 text-rose-800">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              Retorno de validação da Sefin Nacional:
            </p>
            {invoice.sefinErrors && invoice.sefinErrors.length > 0 ? (
              <ul className="list-disc pl-5 space-y-1">
                {invoice.sefinErrors.map((err, idx) => (
                  <li key={`${err.codigo}-${idx}`}>
                    <span className="font-mono font-bold text-rose-950">[{err.codigo}]</span>{' '}
                    <span>{err.descricao}</span>
                    {err.complemento && (
                      <span className="text-rose-700"> — {err.complemento}</span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-rose-800">{invoice.lastTransmissionError}</p>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-semibold px-4 pt-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('response')}
            className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'response'
                ? 'border-[#2c0853] text-[#2c0853]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileCode className="w-3.5 h-3.5 text-emerald-600" />
            <span>Retorno Sefin Nacional (XML / JSON)</span>
          </button>
          <button
            onClick={() => setActiveTab('request')}
            className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'request'
                ? 'border-[#2c0853] text-[#2c0853]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Send className="w-3.5 h-3.5 text-purple-600" />
            <span>DPS XML Assinado (XMLDSig RSA-SHA256)</span>
          </button>
          <button
            onClick={() => setActiveTab('signature')}
            className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'signature'
                ? 'border-[#2c0853] text-[#2c0853]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>Parâmetros mTLS & Assinatura A1</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-3 text-xs">
          {activeTab === 'response' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-slate-600">
                <span className="font-semibold text-slate-800">
                  Resposta real recebida da API Sefin Nacional:
                </span>
                {responsePayload && (
                  <button
                    onClick={handleCopy}
                    className="px-2.5 py-1 rounded-md border border-slate-300 hover:bg-slate-100 flex items-center gap-1 text-[11px]"
                  >
                    {copied ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copied ? 'Copiado!' : 'Copiar Retorno'}</span>
                  </button>
                )}
              </div>
              {responsePayload ? (
                <pre className="p-4 rounded-xl bg-slate-900 text-emerald-300 font-mono text-[11px] overflow-x-auto leading-relaxed border border-slate-800 whitespace-pre-wrap break-all">
                  {responsePayload}
                </pre>
              ) : (
                <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-center space-y-1">
                  <p className="font-semibold text-slate-800">
                    Nenhuma transmissão realizada ainda para esta DPS.
                  </p>
                  <p className="text-[11px]">
                    Clique em <strong>Testar na Sefin</strong> (Homologação) ou{' '}
                    <strong>Transmitir Oficial</strong> (Produção) na tela de Notas Fiscais para
                    gravar o retorno real da API governamental aqui.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'request' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-slate-600">
                <span className="font-semibold text-slate-800">
                  XML da DPS (versão 1.00) assinado digitalmente e enviado compactado em GZip + Base64:
                </span>
                {requestPayload && (
                  <button
                    onClick={handleCopy}
                    className="px-2.5 py-1 rounded-md border border-slate-300 hover:bg-slate-100 flex items-center gap-1 text-[11px]"
                  >
                    {copied ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copied ? 'Copiado!' : 'Copiar XML'}</span>
                  </button>
                )}
              </div>
              {requestPayload ? (
                <pre className="p-4 rounded-xl bg-slate-900 text-purple-200 font-mono text-[11px] overflow-x-auto leading-relaxed border border-slate-800 whitespace-pre-wrap break-all">
                  {requestPayload}
                </pre>
              ) : (
                <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-center space-y-1">
                  <p className="font-semibold text-slate-800">
                    XML assinado ainda não foi gerado.
                  </p>
                  <p className="text-[11px]">
                    O XML da DPS é montado e assinado com seu Certificado Digital A1 no servidor
                    no instante da transmissão.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'signature' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <h4 className="font-bold text-slate-800 text-sm">
                  Parâmetros Técnicos da Integração Sefin Nacional
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-400">
                      Assinatura Digital XMLDSig
                    </span>
                    <p className="font-mono font-bold text-slate-800">
                      RSA-SHA256 + Digest SHA-256
                    </p>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      Enveloped Signature + Canonicalization C14N (Padrão Nacional v1.00)
                    </p>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-400">
                      Transporte & Autenticação
                    </span>
                    <p className="font-mono font-bold text-slate-800">
                      HTTPS mTLS (e-CNPJ A1) + GZip/Base64
                    </p>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      Conexão direta exclusivamente aos domínios oficiais nfse.gov.br
                    </p>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-400">
                      Prestador Configurado
                    </span>
                    <p className="font-mono font-bold text-slate-800">{company.corporateName}</p>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      CNPJ: {company.cnpj} • IM: {company.municipalRegistration || '1618'} • IBGE: 4201109
                    </p>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-400">
                      Endpoint Sefin Utilizado
                    </span>
                    <p className="font-mono text-[11px] font-semibold text-purple-900 break-all mt-0.5 flex items-start gap-1">
                      <Globe className="w-3.5 h-3.5 shrink-0 mt-0.5 text-purple-600" />
                      <span>{invoice.sefinEndpointUrl || defaultEndpoint}</span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 text-xs">
                <strong>Transmissão Direta Oficial:</strong> O TributoFlow assina a DPS com seu
                Certificado Digital A1 no servidor e transmite diretamente para a API REST da Sefin
                Nacional (Receita Federal / CNM / ABRASF), sem intermediários pagos.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-[11px] text-slate-500">
            {invoice.authorizedAt
              ? `Autorizada em ${invoice.authorizedAt}`
              : `Emitida/Criada em ${invoice.issuedAt}`}{' '}
            • Sefin Nacional — Anitápolis/SC (IBGE 4201109)
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-full bg-[#2c0853] hover:bg-[#3d0b72] text-white font-semibold text-xs transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
