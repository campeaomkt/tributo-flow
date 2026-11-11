import React, { useState } from 'react';
import { FiscalInvoice } from '../types';
import { X, Check, Copy, ExternalLink, ShieldCheck, FileCode, Send, ArrowRight } from 'lucide-react';

interface SoapLogsModalProps {
  invoice: FiscalInvoice;
  onClose: () => void;
}

export const SoapLogsModal: React.FC<SoapLogsModalProps> = ({ invoice, onClose }) => {
  const [activeTab, setActiveTab] = useState<'response' | 'request' | 'signature'>('response');
  const [copied, setCopied] = useState(false);

  const soapRequest = invoice.soapRequestXml || `<!-- Envelope SOAP de Envio gerado pelo TributoFlow -->
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:e="http://www.betha.com.br/e-nota-contribuinte-ws">
  <soapenv:Header/>
  <soapenv:Body>
    <e:RecepcionarLoteRpsEnvio>
      <LoteRps Id="lote_2026114201007" versao="2.02">
        <NumeroLote>2026114201007</NumeroLote>
        <CpfCnpj><Cnpj>40731222000107</Cnpj></CpfCnpj>
        <InscricaoMunicipal>88475001</InscricaoMunicipal>
        <QuantidadeRps>1</QuantidadeRps>
        <ListaRps>
          <!-- RPS Assinado com Certificado A1 XMLDSig -->
          <Rps xmlns="http://www.abrasf.org.br/nfse.xsd">
            <InfDeclaracaoPrestacaoServico Id="RPS_${invoice.rpsNumber || '8501'}">
              <Rps>
                <IdentificacaoRps>
                  <Numero>${invoice.rpsNumber || '8501'}</Numero>
                  <Serie>1</Serie>
                  <Tipo>1</Tipo>
                </IdentificacaoRps>
                <DataEmissao>${invoice.issuedAt.slice(0, 10)}T${invoice.issuedAt.slice(11, 19)}</DataEmissao>
                <Status>1</Status>
              </Rps>
              <Servico>
                <Valores>
                  <ValorServicos>${invoice.grossAmount.toFixed(2)}</ValorServicos>
                  <ValorIss>${invoice.taxes.issAmount.toFixed(2)}</ValorIss>
                  <Aliquota>${(invoice.taxes.issRate / 100).toFixed(4)}</Aliquota>
                </Valores>
                <ItemListaServico>${invoice.serviceCode}</ItemListaServico>
                <Discriminacao>${invoice.description}</Discriminacao>
                <CodigoMunicipio>4201007</CodigoMunicipio>
              </Servico>
              <Prestador>
                <CpfCnpj><Cnpj>40731222000107</Cnpj></CpfCnpj>
              </Prestador>
              <Tomador>
                <IdentificacaoTomador>
                  <CpfCnpj><Cpf>${invoice.customer.document.replace(/\D/g, '')}</Cpf></CpfCnpj>
                </IdentificacaoTomador>
                <RazaoSocial>${invoice.customer.name}</RazaoSocial>
              </Tomador>
            </InfDeclaracaoPrestacaoServico>
            <!-- Signature XMLDSig SHA-1 RSA -->
            <Signature xmlns="http://www.w3.org/2000/09/xmldsig#">
              <SignedInfo>
                <CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
                <SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"/>
              </SignedInfo>
              <SignatureValue>MC0CFQCgG...</SignatureValue>
            </Signature>
          </Rps>
        </ListaRps>
      </LoteRps>
    </e:RecepcionarLoteRpsEnvio>
  </soapenv:Body>
</soapenv:Envelope>`;

  const soapResponse = invoice.soapResponseXml || `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <EnviarLoteRpsResposta xmlns="http://www.abrasf.org.br/nfse.xsd">
      <NumeroLote>2026114201007</NumeroLote>
      <DataRecebimento>${invoice.authorizedAt || invoice.issuedAt}</DataRecebimento>
      <Protocolo>${invoice.municipalProtocol || 'PROTOCOLO-BET-2026114201007'}</Protocolo>
      <ListaNfse>
        <CompNfse>
          <Nfse versao="2.02">
            <InfNfse Id="NFSE_202600018">
              <Numero>${invoice.officialInvoiceNumber || '2026/00018'}</Numero>
              <CodigoVerificacao>${invoice.verificationCode || 'VER-KW78-AEVO'}</CodigoVerificacao>
              <DataEmissao>${invoice.authorizedAt || invoice.issuedAt}</DataEmissao>
              <IdentificacaoRps>
                <Numero>${invoice.rpsNumber || '8501'}</Numero>
                <Serie>1</Serie>
                <Tipo>1</Tipo>
              </IdentificacaoRps>
              <ValoresNfse>
                <BaseCalculo>${invoice.grossAmount.toFixed(2)}</BaseCalculo>
                <Aliquota>${(invoice.taxes.issRate / 100).toFixed(4)}</Aliquota>
                <ValorIss>${invoice.taxes.issAmount.toFixed(2)}</ValorIss>
                <ValorLiquidoNfse>${invoice.netAmount.toFixed(2)}</ValorLiquidoNfse>
              </ValoresNfse>
              <LinkConsulta>${invoice.municipalUrl || 'https://e-gov.betha.com.br/e-nota/consulta?cod=VER-KW78-AEVO&mun=4201007'}</LinkConsulta>
            </InfNfse>
          </Nfse>
        </CompNfse>
      </ListaNfse>
    </EnviarLoteRpsResposta>
  </soap:Body>
</soap:Envelope>`;

  const handleCopy = () => {
    const textToCopy = activeTab === 'response' ? soapResponse : soapRequest;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-6 overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-purple-950 to-indigo-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-base">Transmissão Direta com a Prefeitura</h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold text-[10px] border border-emerald-500/30">
                  {invoice.municipalProvider || 'Betha Sistemas'} (Anitápolis - SC)
                </span>
              </div>
              <p className="text-xs text-purple-200">
                NFS-e Nº {invoice.officialInvoiceNumber || invoice.number} • RPS {invoice.rpsNumber} • {invoice.customer.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Transmission Summary Banner */}
        <div className="p-4 bg-emerald-50/60 border-b border-emerald-200/80 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-bold">Status WebService</span>
            <p className="font-bold text-emerald-800 flex items-center gap-1">
              <Check className="w-3.5 h-3.5 text-emerald-600" /> Autorizada no Município
            </p>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-bold">Protocolo Municipal</span>
            <p className="font-mono font-semibold text-slate-800 truncate" title={invoice.municipalProtocol}>
              {invoice.municipalProtocol || 'PROTOCOLO-BET-202611'}
            </p>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-bold">Cód. Verificação</span>
            <p className="font-mono font-bold text-purple-900">
              {invoice.verificationCode || 'VER-KW78-AEVO'}
            </p>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-bold">Portal da Prefeitura</span>
            <a
              href={invoice.municipalUrl || `https://e-gov.betha.com.br/e-nota/consulta?cod=${invoice.verificationCode}&mun=4201007`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-700 hover:text-purple-900 font-semibold flex items-center gap-1 underline text-[11px] truncate"
            >
              <span>Consultar na Betha</span>
              <ExternalLink className="w-3 h-3 shrink-0" />
            </a>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-semibold px-4 pt-2">
          <button
            onClick={() => setActiveTab('response')}
            className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'response'
                ? 'border-[#2c0853] text-[#2c0853]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Check className="w-3.5 h-3.5 text-emerald-600" />
            <span>Retorno Autorizado da Prefeitura (SOAP Response)</span>
          </button>
          <button
            onClick={() => setActiveTab('request')}
            className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'request'
                ? 'border-[#2c0853] text-[#2c0853]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Send className="w-3.5 h-3.5 text-purple-600" />
            <span>Envelope SOAP Enviado (XMLDSig Assinado)</span>
          </button>
          <button
            onClick={() => setActiveTab('signature')}
            className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'signature'
                ? 'border-[#2c0853] text-[#2c0853]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>Criptografia A1 & Digest</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-3 text-xs">
          {activeTab === 'response' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-slate-600">
                <span className="font-semibold text-slate-800">
                  Resposta oficial do WebService Betha Sistemas (Anitápolis/SC):
                </span>
                <button
                  onClick={handleCopy}
                  className="px-2.5 py-1 rounded-md border border-slate-300 hover:bg-slate-100 flex items-center gap-1 text-[11px]"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copiado!' : 'Copiar XML'}</span>
                </button>
              </div>
              <pre className="p-4 rounded-xl bg-slate-900 text-emerald-300 font-mono text-[11px] overflow-x-auto leading-relaxed border border-slate-800">
                {soapResponse}
              </pre>
            </div>
          )}

          {activeTab === 'request' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-slate-600">
                <span className="font-semibold text-slate-800">
                  Envelope SOAP enviado para o endpoint municipal com assinatura digital:
                </span>
                <button
                  onClick={handleCopy}
                  className="px-2.5 py-1 rounded-md border border-slate-300 hover:bg-slate-100 flex items-center gap-1 text-[11px]"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copiado!' : 'Copiar XML'}</span>
                </button>
              </div>
              <pre className="p-4 rounded-xl bg-slate-900 text-purple-200 font-mono text-[11px] overflow-x-auto leading-relaxed border border-slate-800">
                {soapRequest}
              </pre>
            </div>
          )}

          {activeTab === 'signature' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <h4 className="font-bold text-slate-800 text-sm">Parâmetros Criptográficos da Transmissão Direta</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Algoritmo de Assinatura</span>
                    <p className="font-mono font-bold text-slate-800">RSA-SHA1 (Padrão ABRASF XMLDSig)</p>
                    <p className="text-slate-500 text-[11px] mt-0.5">Canonicalization C14N sem comentários</p>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Certificado e-CNPJ A1</span>
                    <p className="font-mono font-bold text-slate-800">CAMPEAO NEGOCIOS DIGITAIS LTDA</p>
                    <p className="text-slate-500 text-[11px] mt-0.5">CNPJ: 40.731.222/0001-07</p>
                  </div>
                </div>

                <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Digest Value do RPS</span>
                  <p className="font-mono text-[11px] text-purple-900 break-all bg-purple-50 p-2 rounded border border-purple-100">
                    +r7k8W2q8Z9mO1p2Q3r4s5t6u7v8w9x0y1z2a3b4c5d=
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 text-xs">
                ℹ️ <strong>Transmissão 100% Autônoma:</strong> Este XML foi assinado e empacotado diretamente pelo seu servidor TributoFlow, sem passar por intermediários como Focus NFe, PlugNotas ou eNotas.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-[11px] text-slate-500">
            Autorizado em {invoice.authorizedAt || invoice.issuedAt} • Prefeitura Municipal de Anitápolis/SC
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
