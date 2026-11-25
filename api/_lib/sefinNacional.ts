import https from 'https';
import zlib from 'zlib';
import forge from 'node-forge';
import xmlCryptoPkg from 'xml-crypto';

const forgeLib: typeof forge = (forge as any)?.default || forge;
const SignedXml =
  (xmlCryptoPkg as any)?.SignedXml ||
  (xmlCryptoPkg as any)?.default?.SignedXml;

export type SefinEnvironment = 'HOMOLOGACAO' | 'PRODUCAO';

export interface ParsedPfxResult {
  privateKeyPem: string;
  certPem: string;
  caCertsPem: string[];
  rootCertsPem: string[];
  rawPfxBuffer: Buffer;
  passphrase: string;
  subjectCN: string;
  issuerCN: string;
  serialNumber: string;
  cnpj?: string;
  validFrom: string;
  validTo: string;
  isExpired: boolean;
  hasClientAuthEku: boolean;
  chainSubjects: string[];
  allCertSubjects: string[];
}

export interface SefinErrorItem {
  codigo: string;
  descricao: string;
  complemento?: string;
}

export interface DpsInput {
  rpsNumber: string;
  series?: string;
  issuedAt: string; // YYYY-MM-DD HH:mm:ss or ISO
  description: string;
  grossAmount: number;
  serviceCode: string; // e.g. "01.07" or "010701"
  effectiveTaxRate: number; // e.g. 6.0
  issRate: number;
  customer: {
    name: string;
    document: string;
    email?: string;
  };
  company: {
    corporateName: string;
    cnpj: string;
    municipalRegistration?: string;
    email?: string;
    phone?: string;
    mobile?: string;
    taxRegime: 'MEI' | 'SIMPLES_NACIONAL' | 'LUCRO_PRESUMIDO' | 'LUCRO_REAL';
    simplesApuracaoRegime?: string;
    serviceCode: string;
    address: {
      city: string;
      state: string;
      zipCode?: string;
      street?: string;
      number?: string;
      neighborhood?: string;
    };
  };
  environment: SefinEnvironment;
}

export interface SefinTransmitResult {
  success: boolean;
  httpStatus: number;
  environment: SefinEnvironment;
  endpointUrl: string;
  dpsId: string;
  signedDpsXml: string;
  dpsXmlGZipB64: string;
  chaveAcesso?: string;
  nfseNumber?: string;
  nfseXml?: string;
  authorizedAt?: string;
  portalUrl?: string;
  rawResponse: string;
  errors: SefinErrorItem[];
  message: string;
}

export interface SefinCancelResult {
  success: boolean;
  httpStatus: number;
  environment: SefinEnvironment;
  endpointUrl: string;
  eventId: string;
  signedEventXml: string;
  eventoXml?: string;
  rawResponse: string;
  errors: SefinErrorItem[];
  message: string;
}

export interface SefinConsultResult {
  success: boolean;
  httpStatus: number;
  environment: SefinEnvironment;
  chaveAcesso: string;
  nfseXml?: string;
  rawResponse: string;
  errors: SefinErrorItem[];
  message: string;
}

const SEFIN_HOSTS: Record<SefinEnvironment, { sefin: string; adn: string; portal: string }> = {
  HOMOLOGACAO: {
    sefin: 'sefin.producaorestrita.nfse.gov.br',
    adn: 'adn.producaorestrita.nfse.gov.br',
    portal: 'https://www.producaorestrita.nfse.gov.br/EmissorNacional',
  },
  PRODUCAO: {
    sefin: 'sefin.nfse.gov.br',
    adn: 'adn.nfse.gov.br',
    portal: 'https://www.nfse.gov.br/ConsultaPublica',
  },
};

const IBGE_CITY_CODES: Record<string, string> = {
  'anitapolis-sc': '4201109',
  'florianopolis-sc': '4205407',
  'sao jose-sc': '4216602',
  'palhoca-sc': '4211900',
  'blumenau-sc': '4202404',
  'joinville-sc': '4209102',
  'sao paulo-sp': '3550308',
  'rio de janeiro-rj': '3304557',
  'curitiba-pr': '4106902',
  'porto velho-ro': '1100205',
  'belo horizonte-mg': '3106200',
};

function normalizeKey(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function getIbgeCityCode(city?: string, state?: string): string {
  if (!city || !state) return '4201109'; // Anitápolis - SC
  const key = `${normalizeKey(city)}-${normalizeKey(state)}`;
  return IBGE_CITY_CODES[key] || '4201109';
}

export function escapeXml(value: string): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function digitsOnly(value?: string): string {
  return String(value ?? '').replace(/\D/g, '');
}

/**
 * Formats LC 116 service code to exact 6-digit cTribNac required by Padrão Nacional.
 * Example: "01.07" -> "010701", "010701" -> "010701", "08.02" -> "080201"
 */
export function normalizeCTribNac(rawCode?: string): string {
  const digits = digitsOnly(rawCode);
  if (digits.length === 6) return digits;
  if (digits.length === 4) return `${digits}01`;
  if (digits.length > 6) return digits.slice(0, 6);
  return '010701';
}

/**
 * Resolves certificate credentials from request payload or server environment variables.
 */
export function resolveCertCredentials(
  pfxBase64?: string,
  certPassword?: string
): { pfxBase64: string; certPassword: string; source: 'request' | 'env' } {
  if (pfxBase64 && pfxBase64.trim().length > 0) {
    return {
      pfxBase64: pfxBase64.trim(),
      certPassword: certPassword ?? '',
      source: 'request',
    };
  }
  const envPfx = process.env.NFSE_PFX_BASE64;
  const envPass = process.env.NFSE_CERT_PASSWORD;
  if (envPfx && envPfx.trim().length > 0) {
    return {
      pfxBase64: envPfx.trim(),
      certPassword: envPass ?? '',
      source: 'env',
    };
  }
  throw new Error(
    'Certificado Digital A1 (.pfx) não carregado. Carregue o arquivo .pfx e a senha em "Regimes Tributários" antes de transmitir.'
  );
}

export function hasServerEnvCert(): boolean {
  return Boolean(process.env.NFSE_PFX_BASE64 && process.env.NFSE_PFX_BASE64.trim().length > 0);
}

/**
 * Parses a PKCS#12 (.pfx / .p12) Base64 bundle using node-forge and extracts
 * the private key and matching end-entity X.509 certificate (EndCertOnly).
 */
export function parsePfxCertificate(pfxBase64: string, password: string): ParsedPfxResult {
  const cleanB64 = pfxBase64.includes(',') ? pfxBase64.split(',').pop()!.trim() : pfxBase64.trim();

  let pfx: forge.pkcs12.Pkcs12Pfx;
  try {
    const pfxDer = forgeLib.util.decode64(cleanB64);
    const pfxAsn1 = forgeLib.asn1.fromDer(pfxDer);
    pfx = forgeLib.pkcs12.pkcs12FromAsn1(pfxAsn1, false, password);
  } catch (err: any) {
    const msg = String(err?.message || '');
    if (msg.toLowerCase().includes('mac') || msg.toLowerCase().includes('password') || msg.toLowerCase().includes('invalid')) {
      throw new Error('Senha do Certificado Digital A1 incorreta ou arquivo .pfx corrompido.');
    }
    throw new Error(`Não foi possível ler o Certificado Digital A1 (.pfx): ${msg}`);
  }

  let privateKey: forge.pki.PrivateKey | null = null;
  let keyLocalKeyId: string | null = null;
  const certs: Array<{ cert: forge.pki.Certificate; localKeyId: string | null }> = [];

  for (const safeContent of pfx.safeContents) {
    for (const safeBag of safeContent.safeBags) {
      const localKeyIdAttr = safeBag.attributes?.localKeyId?.[0] || null;
      if (
        (safeBag.type === forgeLib.pki.oids.pkcs8ShroudedKeyBag || safeBag.type === forgeLib.pki.oids.keyBag) &&
        safeBag.key
      ) {
        privateKey = safeBag.key;
        keyLocalKeyId = localKeyIdAttr;
      }
      if (safeBag.type === forgeLib.pki.oids.certBag && safeBag.cert) {
        certs.push({ cert: safeBag.cert, localKeyId: localKeyIdAttr });
      }
    }
  }

  if (!privateKey) {
    throw new Error('O arquivo .pfx não contém uma chave privada válida.');
  }
  if (certs.length === 0) {
    throw new Error('O arquivo .pfx não contém nenhum certificado X.509 válido.');
  }

  // Match end-entity certificate to private key by RSA public key modulus FIRST (100% exact)
  const privRsa = privateKey as forge.pki.rsa.PrivateKey;
  let endEntityCert = certs.find(c => {
    const pub = c.cert.publicKey as forge.pki.rsa.PublicKey;
    return Boolean(pub?.n && privRsa?.n && pub.n.equals(privRsa.n));
  })?.cert;
  if (!endEntityCert && keyLocalKeyId) {
    endEntityCert = certs.find(c => c.localKeyId === keyLocalKeyId)?.cert;
  }
  if (!endEntityCert) {
    endEntityCert = certs[0].cert;
  }

  // Build RFC 5246 ordered intermediate chain (leaf -> direct issuer -> parent issuer),
  // strictly excluding any self-signed Root CA (Microsoft IIS rejects out-of-order/root chains with 403.16)
  const otherCerts = certs.map(c => c.cert).filter(c => c !== endEntityCert);
  const orderedIntermediates: forge.pki.Certificate[] = [];
  let currentCert = endEntityCert;
  for (let depth = 0; depth < 6; depth++) {
    const currentIssuerHash = currentCert.issuer?.hash;
    if (!currentIssuerHash) break;
    const issuerCert = otherCerts.find(c => {
      if (orderedIntermediates.includes(c)) return false;
      const isSelfSigned = c.subject?.hash && c.issuer?.hash && c.subject.hash === c.issuer.hash;
      if (isSelfSigned) return false;
      return c.subject?.hash === currentIssuerHash;
    });
    if (!issuerCert) break;
    orderedIntermediates.push(issuerCert);
    currentCert = issuerCert;
  }

  const caCertsPem = orderedIntermediates.map(c => forgeLib.pki.certificateToPem(c));
  const chainSubjects = orderedIntermediates.map(c => String(c.subject.getField('CN')?.value || 'Intermediária'));

  const rootCerts = otherCerts.filter(
    c => c.subject?.hash && c.issuer?.hash && c.subject.hash === c.issuer.hash
  );
  const rootCertsPem = rootCerts.map(c => forgeLib.pki.certificateToPem(c));
  const allCertSubjects = certs.map(c => {
    const s = String(c.cert.subject.getField('CN')?.value || '?');
    const i = String(c.cert.issuer.getField('CN')?.value || '?');
    return `${s} (emissor: ${i})`;
  });

  const extKeyUsage: any = endEntityCert.getExtension('extKeyUsage');
  const hasClientAuthEku = extKeyUsage ? Boolean(extKeyUsage.clientAuth) : true;

  const privateKeyPem = forgeLib.pki.privateKeyToPem(privateKey);
  const certPem = forgeLib.pki.certificateToPem(endEntityCert);

  const subjectCN = String(endEntityCert.subject.getField('CN')?.value || 'Certificado ICP-Brasil');
  const issuerCN = String(endEntityCert.issuer.getField('CN')?.value || 'Autoridade Certificadora ICP-Brasil');
  const serialNumber = endEntityCert.serialNumber || '';

  const cnpjMatch = subjectCN.match(/(\d{14})/);
  const cnpj = cnpjMatch ? cnpjMatch[1] : undefined;

  const validFrom = endEntityCert.validity.notBefore.toISOString();
  const validTo = endEntityCert.validity.notAfter.toISOString();
  const isExpired = endEntityCert.validity.notAfter.getTime() < Date.now();

  return {
    privateKeyPem,
    certPem,
    caCertsPem,
    rootCertsPem,
    rawPfxBuffer: Buffer.from(cleanB64, 'base64'),
    passphrase: password,
    subjectCN,
    issuerCN,
    serialNumber,
    cnpj,
    validFrom,
    validTo,
    isExpired,
    hasClientAuthEku,
    chainSubjects,
    allCertSubjects,
  };
}

/**
 * Formats a Brazil/Brasilia timestamp (-03:00) for dhEmi / dhEvento.
 */
function formatBrasiliaIso(date: Date = new Date()): string {
  const utcMs = date.getTime();
  const brt = new Date(utcMs - 3 * 60 * 60 * 1000);
  const yyyy = brt.getUTCFullYear();
  const mm = String(brt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(brt.getUTCDate()).padStart(2, '0');
  const hh = String(brt.getUTCHours()).padStart(2, '0');
  const mi = String(brt.getUTCMinutes()).padStart(2, '0');
  const ss = String(brt.getUTCSeconds()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}-03:00`;
}

/**
 * Builds the official Padrão Nacional DPS XML (versao 1.00) strictly following the XSD element order.
 */
export function buildDpsXml(input: DpsInput): { dpsId: string; xml: string } {
  const tpAmb = input.environment === 'PRODUCAO' ? '1' : '2';
  const cLocEmi = getIbgeCityCode(input.company.address?.city, input.company.address?.state);
  const cnpjPrest = digitsOnly(input.company.cnpj).padStart(14, '0').slice(-14);
  const imPrest = digitsOnly(input.company.municipalRegistration);
  const serieNum = Math.max(1, parseInt(digitsOnly(input.series || '1') || '1', 10));
  const nDpsNum = Math.max(1, parseInt(digitsOnly(input.rpsNumber || '1') || '1', 10));

  const serieStr = String(serieNum);
  const nDpsStr = String(nDpsNum);

  // TSIdDPS: "DPS" + cLocEmi(7) + tpInsc(1: "2"=CNPJ) + nInsc(14) + serie(5) + nDPS(15) = 48 chars
  const dpsId = `DPS${cLocEmi}2${cnpjPrest}${serieStr.padStart(5, '0')}${nDpsStr.padStart(15, '0')}`;

  // Use current Brasilia time for dhEmi so Sefin doesn't reject future/stale timestamps
  const nowBrtIso = formatBrasiliaIso(new Date());
  const dCompet = nowBrtIso.slice(0, 10);

  // Tax regime tags for Simples Nacional / MEI / Normal
  let opSimpNac = '3'; // 3 = Optante ME/EPP
  if (input.company.taxRegime === 'MEI') opSimpNac = '2';
  else if (input.company.taxRegime !== 'SIMPLES_NACIONAL') opSimpNac = '1';

  let regApTribSNTag = '';
  if (opSimpNac === '3') {
    let regAp = '1';
    if (input.company.simplesApuracaoRegime?.includes('ISSQN pela NFS-e')) regAp = '2';
    else if (input.company.simplesApuracaoRegime?.includes('federais e municipal pela NFS-e')) regAp = '3';
    regApTribSNTag = `<regApTribSN>${regAp}</regApTribSN>`;
  }

  const foneDigits = digitsOnly(input.company.mobile || input.company.phone).slice(0, 20);
  const foneTag = foneDigits.length >= 6 ? `<fone>${foneDigits}</fone>` : '';
  const emailPrest = input.company.email ? `<email>${escapeXml(input.company.email)}</email>` : '';
  const imTag = imPrest ? `<IM>${imPrest}</IM>` : '';

  // Customer (Tomador)
  const customerDocDigits = digitsOnly(input.customer.document);
  let tomaTag = '';
  if (customerDocDigits.length === 14) {
    tomaTag = `<toma><CNPJ>${customerDocDigits}</CNPJ><xNome>${escapeXml(input.customer.name || 'TOMADOR NAO IDENTIFICADO')}</xNome>${input.customer.email ? `<email>${escapeXml(input.customer.email)}</email>` : ''}</toma>`;
  } else if (customerDocDigits.length === 11) {
    tomaTag = `<toma><CPF>${customerDocDigits}</CPF><xNome>${escapeXml(input.customer.name || 'CONSUMIDOR FINAL')}</xNome>${input.customer.email ? `<email>${escapeXml(input.customer.email)}</email>` : ''}</toma>`;
  }

  const cTribNac = normalizeCTribNac(input.serviceCode || input.company.serviceCode);
  const xDescServ = escapeXml(input.description || 'Licenciamento e acesso a plataforma de conteudo digital').slice(0, 2000);
  const vServ = Number(input.grossAmount || 0).toFixed(2);

  // totTrib block according to Simples Nacional / MEI / Normal
  let totTribTag = '';
  if (opSimpNac === '3') {
    const pSn = Number(input.effectiveTaxRate || 6.0).toFixed(2);
    totTribTag = `<totTrib><pTotTribSN>${pSn}</pTotTribSN></totTrib>`;
  } else if (opSimpNac === '2') {
    totTribTag = `<totTrib><indTotTrib>0</indTotTrib></totTrib>`;
  } else {
    const vFed = (input.grossAmount * 0.1133).toFixed(2);
    const vMun = (input.grossAmount * ((input.issRate || 2) / 100)).toFixed(2);
    totTribTag = `<totTrib><vTotTrib><vTotTribFed>${vFed}</vTotTribFed><vTotTribEst>0.00</vTotTribEst><vTotTribMun>${vMun}</vTotTribMun></vTotTrib></totTrib>`;
  }

  // Minified XML without unnecessary whitespace or namespace prefixes (strict Sefin requirement)
  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<DPS xmlns="http://www.sped.fazenda.gov.br/nfse" versao="1.00">` +
    `<infDPS Id="${dpsId}">` +
    `<tpAmb>${tpAmb}</tpAmb>` +
    `<dhEmi>${nowBrtIso}</dhEmi>` +
    `<verAplic>TributoFlow_1.0</verAplic>` +
    `<serie>${serieStr}</serie>` +
    `<nDPS>${nDpsStr}</nDPS>` +
    `<dCompet>${dCompet}</dCompet>` +
    `<tpEmit>1</tpEmit>` +
    `<cLocEmi>${cLocEmi}</cLocEmi>` +
    `<prest>` +
    `<CNPJ>${cnpjPrest}</CNPJ>` +
    `${imTag}` +
    `${foneTag}` +
    `${emailPrest}` +
    `<regTrib>` +
    `<opSimpNac>${opSimpNac}</opSimpNac>` +
    `${regApTribSNTag}` +
    `<regEspTrib>0</regEspTrib>` +
    `</regTrib>` +
    `</prest>` +
    `${tomaTag}` +
    `<serv>` +
    `<locPrest><cLocPrestacao>${cLocEmi}</cLocPrestacao></locPrest>` +
    `<cServ><cTribNac>${cTribNac}</cTribNac><xDescServ>${xDescServ}</xDescServ></cServ>` +
    `</serv>` +
    `<valores>` +
    `<vServPrest><vServ>${vServ}</vServ></vServPrest>` +
    `<trib>` +
    `<tribMun><tribISSQN>1</tribISSQN><tpRetISSQN>1</tpRetISSQN></tribMun>` +
    `${totTribTag}` +
    `</trib>` +
    `</valores>` +
    `</infDPS>` +
    `</DPS>`;

  return { dpsId, xml };
}

/**
 * Signs an XML element (infDPS or infPedReg) using genuine XMLDSig Enveloped RSA-SHA256 + C14N.
 */
export function signXmlEnveloped(
  xml: string,
  targetLocalName: 'infDPS' | 'infPedReg',
  parentLocalName: 'DPS' | 'pedRegEvento',
  privateKeyPem: string,
  certPem: string
): string {
  const sig = new SignedXml({
    privateKey: privateKeyPem,
    publicCert: certPem,
    canonicalizationAlgorithm: 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315',
    signatureAlgorithm: 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256',
  });

  sig.addReference({
    xpath: `//*[local-name(.)='${targetLocalName}']`,
    transforms: [
      'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
      'http://www.w3.org/TR/2001/REC-xml-c14n-20010315',
    ],
    digestAlgorithm: 'http://www.w3.org/2001/04/xmlenc#sha256',
  });

  sig.computeSignature(xml, {
    location: {
      reference: `//*[local-name(.)='${parentLocalName}']`,
      action: 'append',
    },
  });

  return sig.getSignedXml();
}

interface MtlsAttemptResult {
  statusCode: number;
  headers: Record<string, any>;
  bodyBuffer: Buffer;
  tlsModeUsed: string;
  attemptedModes: string[];
  strategyLogs: string[];
}

function isIisHtml403(statusCode: number, bodyBuffer: Buffer): boolean {
  if (statusCode !== 403) return false;
  const text = bodyBuffer.toString('utf8', 0, Math.min(bodyBuffer.length, 400)).toLowerCase();
  return text.includes('<html') || text.includes('403 - forbidden');
}

function execHttpOverAgent(options: {
  hostname: string;
  path: string;
  method: 'GET' | 'POST';
  agent: https.Agent;
  connectionHeader: 'keep-alive' | 'close';
  body?: string;
  accept?: string;
}): Promise<{ statusCode: number; headers: Record<string, any>; bodyBuffer: Buffer }> {
  return new Promise((resolve, reject) => {
    const bodyBuf = options.body ? Buffer.from(options.body, 'utf8') : undefined;
    const headers: Record<string, string | number> = {
      Accept: options.accept || 'application/json',
      'User-Agent': 'TributoFlow-NFSe-Nacional/1.0',
      Connection: options.connectionHeader,
    };
    if (bodyBuf) {
      headers['Content-Type'] = 'application/json; charset=utf-8';
      headers['Content-Length'] = bodyBuf.length;
    }

    const req = https.request(
      {
        hostname: options.hostname,
        port: 443,
        path: options.path,
        method: options.method,
        agent: options.agent,
        headers,
        timeout: 25000,
      },
      res => {
        const chunks: Buffer[] = [];
        res.on('data', chunk => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode || 0,
            headers: res.headers,
            bodyBuffer: Buffer.concat(chunks),
          });
        });
      }
    );

    req.on('timeout', () => {
      req.destroy(new Error('Tempo limite excedido ao conectar nos servidores da Sefin Nacional (25s).'));
    });

    req.on('error', err => {
      reject(err);
    });

    if (bodyBuf) {
      req.write(bodyBuf);
    }
    req.end();
  });
}

async function singleMtlsRequest(options: {
  hostname: string;
  path: string;
  method: 'GET' | 'POST';
  agentOptions: https.AgentOptions;
  body?: string;
  accept?: string;
  preAuthPath?: string;
}): Promise<{ statusCode: number; headers: Record<string, any>; bodyBuffer: Buffer }> {
  const usePreAuth = Boolean(options.method === 'POST' && options.preAuthPath);
  const agent = new https.Agent({
    ...options.agentOptions,
    keepAlive: usePreAuth,
    maxSockets: 1,
    maxCachedSessions: 0,
    minVersion: 'TLSv1.2',
    maxVersion: 'TLSv1.2',
    ALPNProtocols: ['http/1.1'],
  });

  try {
    if (usePreAuth && options.preAuthPath) {
      // Zero-body GET lets Microsoft IIS complete TLS 1.2 client-cert renegotiation cleanly
      // before sending the large POST DPS body on the exact same authenticated keep-alive socket
      const preRes = await execHttpOverAgent({
        hostname: options.hostname,
        path: options.preAuthPath,
        method: 'GET',
        agent,
        connectionHeader: 'keep-alive',
        accept: 'application/json',
      });
      if (isIisHtml403(preRes.statusCode, preRes.bodyBuffer)) {
        return preRes;
      }
    }

    return await execHttpOverAgent({
      hostname: options.hostname,
      path: options.path,
      method: options.method,
      agent,
      connectionHeader: 'close',
      body: options.body,
      accept: options.accept,
    });
  } finally {
    agent.destroy();
  }
}

/**
 * Performs an mTLS HTTPS request strictly against allowlisted government hosts.
 * Uses an isolated TLSv1.2 HTTP/1.1 agent (with zero-body GET pre-auth before POST)
 * and automatically tries compatible client-cert formats if Microsoft IIS returns an HTML 403.
 */
async function mtlsRequest(options: {
  hostname: string;
  path: string;
  method: 'GET' | 'POST';
  certPem: string;
  privateKeyPem: string;
  caCertsPem?: string[];
  rootCertsPem?: string[];
  rawPfxBuffer?: Buffer;
  passphrase?: string;
  body?: string;
  accept?: string;
  preAuthPath?: string;
}): Promise<MtlsAttemptResult> {
  const allowedHosts = new Set([
    'sefin.producaorestrita.nfse.gov.br',
    'sefin.nfse.gov.br',
    'adn.producaorestrita.nfse.gov.br',
    'adn.nfse.gov.br',
  ]);

  if (!allowedHosts.has(options.hostname)) {
    throw new Error('Host de destino não permitido.');
  }

  const strategies: Array<{ name: string; agentOptions: https.AgentOptions }> = [
    {
      name: 'leaf-only',
      agentOptions: {
        cert: options.certPem,
        key: options.privateKeyPem,
      },
    },
  ];

  if (options.caCertsPem && options.caCertsPem.length > 0) {
    strategies.push({
      name: 'ordered-chain',
      agentOptions: {
        cert: [options.certPem, ...options.caCertsPem].join('\n'),
        key: options.privateKeyPem,
      },
    });
  }

  if (options.rootCertsPem && options.rootCertsPem.length > 0) {
    strategies.push({
      name: 'full-chain-with-root',
      agentOptions: {
        cert: [options.certPem, ...(options.caCertsPem || []), ...options.rootCertsPem].join('\n'),
        key: options.privateKeyPem,
      },
    });
  }

  if (options.rawPfxBuffer && options.rawPfxBuffer.length > 0) {
    strategies.push({
      name: 'raw-pfx',
      agentOptions: {
        pfx: options.rawPfxBuffer,
        passphrase: options.passphrase ?? '',
      },
    });
  }

  const attemptedModes: string[] = [];
  const strategyLogs: string[] = [];
  let lastResult: { statusCode: number; headers: Record<string, any>; bodyBuffer: Buffer } | null = null;
  let lastMode = strategies[0].name;

  for (const strategy of strategies) {
    attemptedModes.push(strategy.name);
    lastMode = strategy.name;
    try {
      const res = await singleMtlsRequest({
        hostname: options.hostname,
        path: options.path,
        method: options.method,
        agentOptions: strategy.agentOptions,
        body: options.body,
        accept: options.accept,
        preAuthPath: options.preAuthPath,
      });
      lastResult = res;
      strategyLogs.push(`${strategy.name}: HTTP ${res.statusCode}`);
      if (!isIisHtml403(res.statusCode, res.bodyBuffer)) {
        return { ...res, tlsModeUsed: strategy.name, attemptedModes, strategyLogs };
      }
    } catch (err: any) {
      strategyLogs.push(`${strategy.name}: ERRO (${err?.code || err?.message || 'falha TLS'})`);
      if (strategy.name === 'raw-pfx' && lastResult) {
        break;
      }
      if (!lastResult && strategy === strategies[strategies.length - 1]) {
        throw err;
      }
    }
  }

  if (!lastResult) {
    throw new Error('Falha ao estabelecer conexão mTLS com a Sefin Nacional.');
  }

  return { ...lastResult, tlsModeUsed: lastMode, attemptedModes, strategyLogs };
}

function parseSefinErrors(parsedJson: any): SefinErrorItem[] {
  if (!parsedJson || typeof parsedJson !== 'object') return [];
  const rawList = parsedJson.erros || parsedJson.Erros || parsedJson.errors || [];
  if (Array.isArray(rawList)) {
    return rawList.map((e: any) => ({
      codigo: String(e.Codigo || e.codigo || e.code || 'ERRO'),
      descricao: String(e.Descricao || e.descricao || e.message || JSON.stringify(e)),
      complemento: e.Complemento || e.complemento || undefined,
    }));
  }
  if (parsedJson.erro || parsedJson.Erro) {
    const e = parsedJson.erro || parsedJson.Erro;
    return [
      {
        codigo: String(e.Codigo || e.codigo || 'ERRO'),
        descricao: String(e.Descricao || e.descricao || String(e)),
        complemento: e.Complemento || e.complemento || undefined,
      },
    ];
  }
  if (parsedJson.mensagem || parsedJson.message || parsedJson.title) {
    return [
      {
        codigo: String(parsedJson.status || 'HTTP'),
        descricao: String(parsedJson.mensagem || parsedJson.message || parsedJson.title),
      },
    ];
  }
  return [];
}

function tryGunzipBase64(b64?: string): string | undefined {
  if (!b64 || typeof b64 !== 'string') return undefined;
  try {
    const buf = Buffer.from(b64, 'base64');
    return zlib.gunzipSync(buf).toString('utf8');
  } catch {
    return undefined;
  }
}

function extractTagValue(xml: string | undefined, tagName: string): string | undefined {
  if (!xml) return undefined;
  const match = xml.match(new RegExp(`<${tagName}[^>]*>([^<]+)</${tagName}>`));
  return match ? match[1].trim() : undefined;
}

/**
 * Transmits a DPS XML to the real Sefin Nacional API (Produção Restrita or Produção).
 */
export async function transmitDpsToSefin(
  input: DpsInput,
  pfxBase64?: string,
  certPassword?: string
): Promise<SefinTransmitResult> {
  const env: SefinEnvironment = input.environment === 'PRODUCAO' ? 'PRODUCAO' : 'HOMOLOGACAO';
  const hostCfg = SEFIN_HOSTS[env];
  const endpointPath = '/SefinNacional/nfse';
  const endpointUrl = `https://${hostCfg.sefin}${endpointPath}`;

  // 1. Resolve & parse A1 certificate
  const creds = resolveCertCredentials(pfxBase64, certPassword);
  const parsedCert = parsePfxCertificate(creds.pfxBase64, creds.certPassword);
  if (parsedCert.isExpired) {
    throw new Error(`O Certificado Digital A1 está expirado desde ${parsedCert.validTo.slice(0, 10)}.`);
  }

  // 2. Build DPS XML
  const { dpsId, xml: rawDpsXml } = buildDpsXml({ ...input, environment: env });

  // 3. Sign DPS XML with real XMLDSig RSA-SHA256
  const signedDpsXml = signXmlEnveloped(
    rawDpsXml,
    'infDPS',
    'DPS',
    parsedCert.privateKeyPem,
    parsedCert.certPem
  );

  // 4. Compress with GZip + Base64
  const gzipped = zlib.gzipSync(Buffer.from(signedDpsXml, 'utf8'), { level: 9 });
  const dpsXmlGZipB64 = gzipped.toString('base64');

  // 5. Transmit via mTLS POST to Sefin Nacional (with zero-body GET pre-auth for IIS TLS 1.2 renegotiation)
  const payload = JSON.stringify({ dpsXmlGZipB64 });
  const ibgeForPreAuth = getIbgeCityCode(input.company.address?.city, input.company.address?.state);
  const response = await mtlsRequest({
    hostname: hostCfg.sefin,
    path: endpointPath,
    method: 'POST',
    certPem: parsedCert.certPem,
    privateKeyPem: parsedCert.privateKeyPem,
    caCertsPem: parsedCert.caCertsPem,
    rootCertsPem: parsedCert.rootCertsPem,
    rawPfxBuffer: parsedCert.rawPfxBuffer,
    passphrase: parsedCert.passphrase,
    body: payload,
    preAuthPath: `/SefinNacional/parametros_municipais/${ibgeForPreAuth}/convenio`,
  });

  const rawResponse = response.bodyBuffer.toString('utf8');
  let parsedJson: any = null;
  try {
    parsedJson = JSON.parse(rawResponse);
  } catch {
    // Non-JSON response (e.g. IIS 403 or gateway error page)
  }

  const errors = parseSefinErrors(parsedJson);
  const nfseXmlB64 = parsedJson?.nfseXmlGZipB64 || parsedJson?.NfseXmlGZipB64 || undefined;
  const nfseXml = tryGunzipBase64(nfseXmlB64);
  const xmlChaveMatch = nfseXml?.match(/<infNFSe[^>]*Id="NFS([A-Za-z0-9]{40,60})"/);
  const chaveAcesso =
    parsedJson?.chaveAcesso ||
    parsedJson?.ChaveAcesso ||
    xmlChaveMatch?.[1] ||
    undefined;
  const nfseNumber = extractTagValue(nfseXml, 'nNFSe') || extractTagValue(nfseXml, 'nDFSe');
  const dhProc = parsedJson?.dataHoraProcessamento || extractTagValue(nfseXml, 'dhProc') || formatBrasiliaIso();

  const isAuthorized =
    response.statusCode >= 200 &&
    response.statusCode < 300 &&
    Boolean(chaveAcesso || nfseXml) &&
    errors.length === 0;

  if (isAuthorized) {
    return {
      success: true,
      httpStatus: response.statusCode,
      environment: env,
      endpointUrl,
      dpsId,
      signedDpsXml,
      dpsXmlGZipB64,
      chaveAcesso,
      nfseNumber: nfseNumber || input.rpsNumber,
      nfseXml,
      authorizedAt: dhProc,
      portalUrl: chaveAcesso
        ? `${hostCfg.portal}${env === 'PRODUCAO' ? `?chave=${chaveAcesso}` : ''}`
        : hostCfg.portal,
      rawResponse,
      errors: [],
      message:
        env === 'HOMOLOGACAO'
          ? `NFS-e de TESTE autorizada na Produção Restrita (Sefin Nacional)! Chave: ${chaveAcesso}`
          : `NFS-e OFICIAL autorizada pela Sefin Nacional! Chave: ${chaveAcesso}`,
    };
  }

  if (isIisHtml403(response.statusCode, response.bodyBuffer)) {
    const diagDesc =
      `O servidor IIS da Sefin Nacional (${hostCfg.sefin}) recusou a autenticação do Certificado Digital A1 com HTTP 403 Forbidden. ` +
      `Tentativas mTLS: [${response.strategyLogs.join(' | ')}]. ` +
      `Certificados no .pfx (${parsedCert.allCertSubjects.length}): ${parsedCert.allCertSubjects.join(' ; ')}. ` +
      (env === 'HOMOLOGACAO'
        ? 'Use o botão "Testar Conexão mTLS (Homologação + Produção)" em Regimes Tributários para verificar sem emitir nota se o servidor de Produção já aceita este certificado.'
        : 'Verifique se o certificado e-CNPJ A1 está ativo, não revogado e com cadeia ICP-Brasil válida.');

    return {
      success: false,
      httpStatus: 403,
      environment: env,
      endpointUrl,
      dpsId,
      signedDpsXml,
      dpsXmlGZipB64,
      rawResponse,
      errors: [{ codigo: 'IIS_403_MTLS', descricao: diagDesc }],
      message: diagDesc,
    };
  }

  const errorSummary =
    errors.length > 0
      ? errors.map(e => `[${e.codigo}] ${e.descricao}${e.complemento ? ` (${e.complemento})` : ''}`).join(' | ')
      : `HTTP ${response.statusCode}: ${rawResponse.slice(0, 300) || 'Resposta vazia da Sefin Nacional'}`;

  return {
    success: false,
    httpStatus: response.statusCode,
    environment: env,
    endpointUrl,
    dpsId,
    signedDpsXml,
    dpsXmlGZipB64,
    rawResponse,
    errors: errors.length > 0 ? errors : [{ codigo: `HTTP_${response.statusCode}`, descricao: errorSummary }],
    message: `Rejeitada pela Sefin Nacional (${env}): ${errorSummary}`,
  };
}

/**
 * Transmits a real Cancellation Event (e101101) to Sefin Nacional.
 */
export async function cancelNfseOnSefin(params: {
  chaveAcesso: string;
  cnpjAutor: string;
  motivoCode?: '1' | '2' | '9';
  motivoDesc: string;
  environment: SefinEnvironment;
  pfxBase64?: string;
  certPassword?: string;
}): Promise<SefinCancelResult> {
  const cleanChave = params.chaveAcesso.trim();
  if (!/^[A-Za-z0-9]{40,60}$/.test(cleanChave)) {
    throw new Error('Chave de acesso da NFS-e inválida para cancelamento na Sefin Nacional.');
  }

  const env: SefinEnvironment = params.environment === 'PRODUCAO' ? 'PRODUCAO' : 'HOMOLOGACAO';
  const hostCfg = SEFIN_HOSTS[env];
  const endpointPath = `/SefinNacional/nfse/${cleanChave}/eventos`;
  const endpointUrl = `https://${hostCfg.sefin}${endpointPath}`;

  const creds = resolveCertCredentials(params.pfxBase64, params.certPassword);
  const parsedCert = parsePfxCertificate(creds.pfxBase64, creds.certPassword);

  const cnpjAutor = digitsOnly(params.cnpjAutor).padStart(14, '0').slice(-14);
  const nPedRegEvento = '001';
  const eventId = `PRE${cleanChave}101101${nPedRegEvento}`;
  const dhEvento = formatBrasiliaIso(new Date());
  const cMotivo = params.motivoCode || '2';
  const xMotivo = escapeXml(params.motivoDesc || 'Cancelamento solicitado pelo prestador/cliente').slice(0, 255);

  const rawEventXml =
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<pedRegEvento xmlns="http://www.sped.fazenda.gov.br/nfse" versao="1.00">` +
    `<infPedReg Id="${eventId}">` +
    `<tpAmb>${env === 'PRODUCAO' ? '1' : '2'}</tpAmb>` +
    `<verAplic>TributoFlow_1.0</verAplic>` +
    `<dhEvento>${dhEvento}</dhEvento>` +
    `<CNPJAutor>${cnpjAutor}</CNPJAutor>` +
    `<chNFSe>${cleanChave}</chNFSe>` +
    `<nPedRegEvento>${nPedRegEvento}</nPedRegEvento>` +
    `<e101101>` +
    `<xDesc>Cancelamento de NFS-e</xDesc>` +
    `<cMotivo>${cMotivo}</cMotivo>` +
    `<xMotivo>${xMotivo}</xMotivo>` +
    `</e101101>` +
    `</infPedReg>` +
    `</pedRegEvento>`;

  const signedEventXml = signXmlEnveloped(
    rawEventXml,
    'infPedReg',
    'pedRegEvento',
    parsedCert.privateKeyPem,
    parsedCert.certPem
  );

  const pedidoRegistroEventoXmlGZipB64 = zlib
    .gzipSync(Buffer.from(signedEventXml, 'utf8'), { level: 9 })
    .toString('base64');

  const response = await mtlsRequest({
    hostname: hostCfg.sefin,
    path: endpointPath,
    method: 'POST',
    certPem: parsedCert.certPem,
    privateKeyPem: parsedCert.privateKeyPem,
    caCertsPem: parsedCert.caCertsPem,
    rawPfxBuffer: parsedCert.rawPfxBuffer,
    passphrase: parsedCert.passphrase,
    body: JSON.stringify({ pedidoRegistroEventoXmlGZipB64 }),
  });

  const rawResponse = response.bodyBuffer.toString('utf8');
  let parsedJson: any = null;
  try {
    parsedJson = JSON.parse(rawResponse);
  } catch {
    // ignore
  }

  const errors = parseSefinErrors(parsedJson);
  const eventoXml = tryGunzipBase64(parsedJson?.eventoXmlGZipB64 || parsedJson?.EventoXmlGZipB64);
  const ok = response.statusCode >= 200 && response.statusCode < 300 && errors.length === 0;

  return {
    success: ok,
    httpStatus: response.statusCode,
    environment: env,
    endpointUrl,
    eventId,
    signedEventXml,
    eventoXml,
    rawResponse,
    errors,
    message: ok
      ? `Evento de cancelamento (101101) registrado na Sefin Nacional (${env})!`
      : `Falha ao cancelar na Sefin Nacional: ${errors.map(e => `[${e.codigo}] ${e.descricao}`).join(' | ') || rawResponse.slice(0, 200)}`,
  };
}

/**
 * Consults an existing NFS-e on Sefin Nacional by its 50-digit access key.
 */
export async function consultNfseOnSefin(params: {
  chaveAcesso: string;
  environment: SefinEnvironment;
  pfxBase64?: string;
  certPassword?: string;
}): Promise<SefinConsultResult> {
  const cleanChave = params.chaveAcesso.trim();
  if (!/^[A-Za-z0-9]{40,60}$/.test(cleanChave)) {
    throw new Error('Chave de acesso inválida.');
  }

  const env: SefinEnvironment = params.environment === 'PRODUCAO' ? 'PRODUCAO' : 'HOMOLOGACAO';
  const hostCfg = SEFIN_HOSTS[env];
  const creds = resolveCertCredentials(params.pfxBase64, params.certPassword);
  const parsedCert = parsePfxCertificate(creds.pfxBase64, creds.certPassword);

  const response = await mtlsRequest({
    hostname: hostCfg.sefin,
    path: `/SefinNacional/nfse/${cleanChave}`,
    method: 'GET',
    certPem: parsedCert.certPem,
    privateKeyPem: parsedCert.privateKeyPem,
    caCertsPem: parsedCert.caCertsPem,
    rawPfxBuffer: parsedCert.rawPfxBuffer,
    passphrase: parsedCert.passphrase,
  });

  const rawResponse = response.bodyBuffer.toString('utf8');
  let parsedJson: any = null;
  try {
    parsedJson = JSON.parse(rawResponse);
  } catch {
    // ignore
  }

  const errors = parseSefinErrors(parsedJson);
  const nfseXml = tryGunzipBase64(parsedJson?.nfseXmlGZipB64 || parsedJson?.NfseXmlGZipB64);
  const ok = response.statusCode >= 200 && response.statusCode < 300 && Boolean(nfseXml);

  return {
    success: ok,
    httpStatus: response.statusCode,
    environment: env,
    chaveAcesso: cleanChave,
    nfseXml,
    rawResponse,
    errors,
    message: ok
      ? `NFS-e localizada e confirmada na Sefin Nacional (${env})!`
      : `Consulta retornou HTTP ${response.statusCode}: ${errors.map(e => `[${e.codigo}] ${e.descricao}`).join(' | ') || rawResponse.slice(0, 200)}`,
  };
}

/**
 * Downloads the official government DANFSe PDF directly from ADN Nacional via mTLS.
 */
export async function fetchOfficialDanfsePdf(params: {
  chaveAcesso: string;
  environment: SefinEnvironment;
  pfxBase64?: string;
  certPassword?: string;
}): Promise<{ success: boolean; httpStatus: number; pdfBase64?: string; message: string }> {
  const cleanChave = params.chaveAcesso.trim();
  if (!/^[A-Za-z0-9]{40,60}$/.test(cleanChave)) {
    throw new Error('Chave de acesso inválida.');
  }

  const env: SefinEnvironment = params.environment === 'PRODUCAO' ? 'PRODUCAO' : 'HOMOLOGACAO';
  const hostCfg = SEFIN_HOSTS[env];
  const creds = resolveCertCredentials(params.pfxBase64, params.certPassword);
  const parsedCert = parsePfxCertificate(creds.pfxBase64, creds.certPassword);

  const response = await mtlsRequest({
    hostname: hostCfg.adn,
    path: `/danfse/${cleanChave}`,
    method: 'GET',
    certPem: parsedCert.certPem,
    privateKeyPem: parsedCert.privateKeyPem,
    caCertsPem: parsedCert.caCertsPem,
    rawPfxBuffer: parsedCert.rawPfxBuffer,
    passphrase: parsedCert.passphrase,
    accept: 'application/pdf',
  });

  if (response.statusCode >= 200 && response.statusCode < 300 && response.bodyBuffer.length > 100) {
    return {
      success: true,
      httpStatus: response.statusCode,
      pdfBase64: response.bodyBuffer.toString('base64'),
      message: 'DANFSe oficial obtido com sucesso do ADN Nacional.',
    };
  }

  return {
    success: false,
    httpStatus: response.statusCode,
    message: `ADN Nacional retornou HTTP ${response.statusCode}: ${response.bodyBuffer.toString('utf8').slice(0, 200)}`,
  };
}

export interface SefinEnvProbeResult {
  environment: SefinEnvironment;
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
  certificate: {
    subjectCN: string;
    issuerCN: string;
    cnpj?: string;
    validTo: string;
    hasClientAuthEku: boolean;
    allCertSubjects: string[];
  };
  homologacao: SefinEnvProbeResult;
  producao: SefinEnvProbeResult;
}

/**
 * Performs a 100% READ-ONLY mTLS GET test against BOTH Homologação and Produção
 * (consulting municipal convenio parameters for Anitápolis/SC IBGE 4201109 — NEVER emits any invoice).
 */
export async function testSefinConnection(params: {
  ibgeCode?: string;
  pfxBase64?: string;
  certPassword?: string;
}): Promise<SefinConnectionTestResult> {
  const cleanIbge = digitsOnly(params.ibgeCode || '4201109').slice(0, 7) || '4201109';
  const creds = resolveCertCredentials(params.pfxBase64, params.certPassword);
  const parsedCert = parsePfxCertificate(creds.pfxBase64, creds.certPassword);

  const probeEnv = async (env: SefinEnvironment): Promise<SefinEnvProbeResult> => {
    const hostCfg = SEFIN_HOSTS[env];
    const path = `/SefinNacional/parametros_municipais/${cleanIbge}/convenio`;
    const endpointUrl = `https://${hostCfg.sefin}${path}`;
    try {
      const res = await mtlsRequest({
        hostname: hostCfg.sefin,
        path,
        method: 'GET',
        certPem: parsedCert.certPem,
        privateKeyPem: parsedCert.privateKeyPem,
        caCertsPem: parsedCert.caCertsPem,
        rootCertsPem: parsedCert.rootCertsPem,
        rawPfxBuffer: parsedCert.rawPfxBuffer,
        passphrase: parsedCert.passphrase,
      });
      const text = res.bodyBuffer.toString('utf8');
      const isHtml403 = isIisHtml403(res.statusCode, res.bodyBuffer);
      return {
        environment: env,
        hostname: hostCfg.sefin,
        endpointUrl,
        authenticated: !isHtml403 && res.statusCode > 0 && res.statusCode !== 401 && res.statusCode !== 403,
        httpStatus: res.statusCode,
        tlsModeUsed: res.tlsModeUsed,
        strategyLogs: res.strategyLogs,
        responsePreview: isHtml403 ? 'HTTP 403 IIS (Certificado recusado no mTLS)' : text.slice(0, 400),
      };
    } catch (err: any) {
      return {
        environment: env,
        hostname: hostCfg.sefin,
        endpointUrl,
        authenticated: false,
        httpStatus: 0,
        tlsModeUsed: 'none',
        strategyLogs: [`ERRO: ${err?.message || 'Falha de conexão'}`],
        responsePreview: err?.message || 'Falha de conexão',
      };
    }
  };

  const [homologacao, producao] = await Promise.all([
    probeEnv('HOMOLOGACAO'),
    probeEnv('PRODUCAO'),
  ]);

  return {
    success: homologacao.authenticated || producao.authenticated,
    certificate: {
      subjectCN: parsedCert.subjectCN,
      issuerCN: parsedCert.issuerCN,
      cnpj: parsedCert.cnpj,
      validTo: parsedCert.validTo,
      hasClientAuthEku: parsedCert.hasClientAuthEku,
      allCertSubjects: parsedCert.allCertSubjects,
    },
    homologacao,
    producao,
  };
}

