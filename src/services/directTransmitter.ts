import { FiscalInvoice, CompanySettings, MunicipalProvider, FiscalEnvironment } from '../types';

export interface SefinErrorItem {
  codigo: string;
  descricao: string;
  complemento?: string;
}

export interface DirectTransmissionResult {
  success: boolean;
  httpStatus: number;
  officialNumber: string;
  municipalProtocol: string;
  municipalAuthCode: string;
  municipalUrl: string;
  authorizedAt: string;
  provider: MunicipalProvider;
  environment: FiscalEnvironment;
  endpointUrl: string;
  dpsId: string;
  chaveAcesso?: string;
  nfseXml?: string;
  soapRequestXml: string;
  soapResponseXml: string;
  signedXml: string;
  errors: SefinErrorItem[];
  message: string;
}

export interface CertValidationResult {
  success: boolean;
  subjectCN?: string;
  issuerCN?: string;
  serialNumber?: string;
  cnpj?: string;
  validFrom?: string;
  validTo?: string;
  isExpired?: boolean;
  error?: string;
}

export interface ServerCertStatus {
  configured: boolean;
  subjectCN?: string;
  issuerCN?: string;
  cnpj?: string;
  validFrom?: string;
  validTo?: string;
  isExpired?: boolean;
  error?: string;
}

/**
 * Checks if a server-side A1 certificate is configured via environment variables.
 */
export async function fetchServerCertStatus(): Promise<ServerCertStatus> {
  try {
    const res = await fetch('/api/nfse/cert-status');
    if (!res.ok) return { configured: false };
    return await res.json();
  } catch {
    return { configured: false };
  }
}

/**
 * Validates a .pfx/.p12 certificate file and password on the backend using node-forge.
 */
export async function validatePfxCertificate(
  pfxBase64: string,
  password: string
): Promise<CertValidationResult> {
  const res = await fetch('/api/nfse/validate-cert', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pfxBase64, password }),
  });
  const data = await res.json();
  return data;
}

/**
 * Real transmission to the official Sefin Nacional REST API via server-side mTLS proxy.
 */
export async function transmitDirectToPrefeitura(
  invoice: FiscalInvoice,
  company: CompanySettings,
  provider: MunicipalProvider = 'PADRAO_NACIONAL',
  environment: FiscalEnvironment = company.fiscalEnvironment || 'HOMOLOGACAO',
  pfxBase64?: string,
  certPassword?: string
): Promise<DirectTransmissionResult> {
  const dpsInput = {
    rpsNumber: invoice.rpsNumber || '1',
    series: invoice.series || '1',
    issuedAt: invoice.issuedAt,
    description: invoice.description || invoice.productName,
    grossAmount: invoice.grossAmount,
    serviceCode: invoice.serviceCode || company.serviceCode || '010701',
    effectiveTaxRate: invoice.taxes?.effectiveRate ?? 6.0,
    issRate: invoice.taxes?.issRate ?? company.defaultIssRate ?? 2.0,
    customer: {
      name: invoice.customer.name,
      document: invoice.customer.document,
      email: invoice.customer.email,
    },
    company: {
      corporateName: company.corporateName,
      cnpj: company.cnpj,
      municipalRegistration: company.municipalRegistration,
      email: company.email,
      phone: company.phone,
      mobile: company.mobile,
      taxRegime: company.taxRegime,
      simplesApuracaoRegime: company.simplesApuracaoRegime,
      serviceCode: company.serviceCode || '010701',
      address: company.address,
    },
    environment,
  };

  const res = await fetch('/api/nfse/transmit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      dpsInput,
      pfxBase64: pfxBase64 || undefined,
      certPassword: certPassword || undefined,
    }),
  });

  const data = await res.json();

  return {
    success: Boolean(data.success),
    httpStatus: data.httpStatus ?? res.status,
    officialNumber: data.nfseNumber || invoice.number,
    municipalProtocol: data.chaveAcesso || data.dpsId || '',
    municipalAuthCode: data.chaveAcesso || '',
    municipalUrl:
      data.portalUrl ||
      (environment === 'PRODUCAO'
        ? 'https://www.nfse.gov.br/ConsultaPublica'
        : 'https://www.producaorestrita.nfse.gov.br/EmissorNacional'),
    authorizedAt: data.authorizedAt || new Date().toISOString(),
    provider: 'PADRAO_NACIONAL',
    environment,
    endpointUrl: data.endpointUrl || '',
    dpsId: data.dpsId || '',
    chaveAcesso: data.chaveAcesso,
    nfseXml: data.nfseXml,
    soapRequestXml: data.signedDpsXml || '',
    soapResponseXml: data.nfseXml || data.rawResponse || '',
    signedXml: data.signedDpsXml || '',
    errors: Array.isArray(data.errors) ? data.errors : [],
    message: data.message || (data.success ? 'NFS-e autorizada pela Sefin Nacional.' : 'Falha na transmissão.'),
  };
}

/**
 * Real cancellation via Event e101101 on Sefin Nacional API.
 */
export async function cancelNfseDirect(params: {
  chaveAcesso: string;
  cnpjAutor: string;
  motivoDesc: string;
  motivoCode?: '1' | '2' | '9';
  environment: FiscalEnvironment;
  pfxBase64?: string;
  certPassword?: string;
}): Promise<{
  success: boolean;
  httpStatus: number;
  message: string;
  rawResponse?: string;
  signedEventXml?: string;
  errors?: SefinErrorItem[];
}> {
  const res = await fetch('/api/nfse/cancel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return await res.json();
}

/**
 * Real consultation of an NFS-e by chaveAcesso directly on Sefin Nacional.
 */
export async function consultNfseDirect(params: {
  chaveAcesso: string;
  environment: FiscalEnvironment;
  pfxBase64?: string;
  certPassword?: string;
}): Promise<{
  success: boolean;
  httpStatus: number;
  chaveAcesso: string;
  nfseXml?: string;
  rawResponse?: string;
  errors?: SefinErrorItem[];
  message: string;
}> {
  const res = await fetch('/api/nfse/consult', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return await res.json();
}

/**
 * Downloads the official government DANFSe PDF directly from ADN Nacional.
 */
export async function downloadOfficialDanfse(params: {
  chaveAcesso: string;
  environment: FiscalEnvironment;
  pfxBase64?: string;
  certPassword?: string;
}): Promise<{ success: boolean; httpStatus: number; pdfBase64?: string; message: string }> {
  const res = await fetch('/api/nfse/danfse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return await res.json();
}
