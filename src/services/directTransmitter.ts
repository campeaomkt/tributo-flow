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

async function safeParseJson<T = any>(res: Response): Promise<{ ok: boolean; status: number; data?: T; rawText?: string }> {
  const rawText = await res.text();
  try {
    return { ok: true, status: res.status, data: JSON.parse(rawText) as T, rawText };
  } catch {
    return { ok: false, status: res.status, rawText };
  }
}

/**
 * Checks if a server-side A1 certificate is configured via environment variables.
 */
export async function fetchServerCertStatus(): Promise<ServerCertStatus> {
  try {
    const res = await fetch('/api/nfse/cert-status');
    const parsed = await safeParseJson<ServerCertStatus>(res);
    if (!res.ok || !parsed.ok || !parsed.data) return { configured: false };
    return parsed.data;
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
  try {
    const res = await fetch('/api/nfse/validate-cert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pfxBase64, password }),
    });
    const parsed = await safeParseJson<CertValidationResult>(res);
    if (!parsed.ok || !parsed.data) {
      return {
        success: false,
        error: `Erro HTTP ${res.status} no servidor ao validar o certificado (${(parsed.rawText || 'resposta inválida').slice(0, 120)}).`,
      };
    }
    return parsed.data;
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Falha de comunicação com o servidor ao validar o certificado.',
    };
  }
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
      reformaTributariaEnabled: company.reformaTributariaEnabled !== false,
      cNbs: company.cNbs || '115013000',
      ibsCbsFinNfse: company.ibsCbsFinNfse || '0',
      ibsCbsIndFinal: company.ibsCbsIndFinal || '1',
      ibsCbsIndOp: company.ibsCbsIndOp || '100301',
      ibsCbsIndDest: company.ibsCbsIndDest || '0',
      ibsCbsCst: company.ibsCbsCst || '000',
      ibsCbsClassTrib: company.ibsCbsClassTrib || '000001',
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

  const parsed = await safeParseJson<any>(res);
  const data = parsed.ok && parsed.data ? parsed.data : {
    success: false,
    httpStatus: res.status,
    errors: [
      {
        codigo: `HTTP_${res.status}`,
        descricao: `Erro HTTP ${res.status} no servidor ao transmitir para a Sefin Nacional: ${(parsed.rawText || '').slice(0, 180)}`,
      },
    ],
    message: `Erro HTTP ${res.status} no servidor ao transmitir para a Sefin Nacional.`,
  };

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
  const parsed = await safeParseJson<any>(res);
  if (!parsed.ok || !parsed.data) {
    return {
      success: false,
      httpStatus: res.status,
      message: `Erro HTTP ${res.status} no servidor ao cancelar na Sefin Nacional.`,
    };
  }
  return parsed.data;
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
  const parsed = await safeParseJson<any>(res);
  if (!parsed.ok || !parsed.data) {
    return {
      success: false,
      httpStatus: res.status,
      chaveAcesso: params.chaveAcesso,
      message: `Erro HTTP ${res.status} no servidor ao consultar na Sefin Nacional.`,
    };
  }
  return parsed.data;
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
  const parsed = await safeParseJson<any>(res);
  if (!parsed.ok || !parsed.data) {
    return {
      success: false,
      httpStatus: res.status,
      message: `Erro HTTP ${res.status} no servidor ao baixar DANFSe oficial.`,
    };
  }
  return parsed.data;
}

export interface SefinEnvProbeResult {
  environment: FiscalEnvironment;
  hostname: string;
  endpointUrl: string;
  authenticated: boolean;
  httpStatus: number;
  tlsModeUsed: string;
  strategyLogs: string[];
  responsePreview: string;
}

export interface SefinConnectionTestResult {
  success: boolean;
  error?: string;
  certificate?: {
    subjectCN: string;
    issuerCN: string;
    cnpj?: string;
    validTo: string;
    hasClientAuthEku: boolean;
    allCertSubjects: string[];
  };
  homologacao?: SefinEnvProbeResult;
  producao?: SefinEnvProbeResult;
}

/**
 * 100% Read-only mTLS connection diagnostic against BOTH Homologação and Produção
 * (queries municipal convenio for IBGE 4201109 — never emits any invoice).
 */
export async function testSefinMtlsConnection(params: {
  ibgeCode?: string;
  pfxBase64?: string;
  certPassword?: string;
}): Promise<SefinConnectionTestResult> {
  try {
    const res = await fetch('/api/nfse/test-connection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const parsed = await safeParseJson<SefinConnectionTestResult>(res);
    if (!parsed.ok || !parsed.data) {
      return {
        success: false,
        error: `Erro HTTP ${res.status} ao testar mTLS na Sefin Nacional (${(parsed.rawText || 'resposta inválida').slice(0, 140)}).`,
      };
    }
    return parsed.data;
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Falha de rede ao executar o teste de conexão mTLS.',
    };
  }
}

export interface RealKiwifySaleDto {
  externalId: string;
  reference: string;
  status: 'approved' | 'refunded' | 'chargedback' | 'pending' | 'refused';
  rawStatus: string;
  productId: string;
  productName: string;
  amount: number;
  netAmount: number;
  currency: string;
  paymentMethod: 'PIX' | 'CARTAO_CREDITO' | 'BOLETO';
  installments: number;
  createdAt: string;
  paidAt: string;
  customer: {
    id: string;
    name: string;
    document: string;
    email: string;
    phone?: string;
    city: string;
    state: string;
  };
}

export interface KiwifyApiSyncResponse {
  success: boolean;
  source: 'kiwify_public_api';
  period?: { startDate: string; endDate: string };
  totalFetched: number;
  sales: RealKiwifySaleDto[];
  error?: string;
}

export async function fetchKiwifyServerStatus(): Promise<{ configured: boolean }> {
  try {
    const res = await fetch('/api/kiwify/status');
    const parsed = await safeParseJson<{ configured: boolean }>(res);
    if (!res.ok || !parsed.ok || !parsed.data) return { configured: false };
    return parsed.data;
  } catch {
    return { configured: false };
  }
}

export async function syncKiwifySalesFromApi(params: {
  clientId?: string;
  clientSecret?: string;
  accountId?: string;
  startDate?: string;
  endDate?: string;
}): Promise<KiwifyApiSyncResponse> {
  try {
    const res = await fetch('/api/kiwify/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const parsed = await safeParseJson<KiwifyApiSyncResponse>(res);
    if (!parsed.ok || !parsed.data) {
      return {
        success: false,
        source: 'kiwify_public_api',
        totalFetched: 0,
        sales: [],
        error: `Erro HTTP ${res.status} ao consultar /api/kiwify/sync (${(parsed.rawText || 'resposta inválida').slice(0, 140)}).`,
      };
    }
    return parsed.data;
  } catch (err: any) {
    return {
      success: false,
      source: 'kiwify_public_api',
      totalFetched: 0,
      sales: [],
      error: err?.message || 'Falha de comunicação com o servidor ao sincronizar com a Kiwify.',
    };
  }
}


