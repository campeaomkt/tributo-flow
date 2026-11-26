// Consolidated Vercel Serverless Function for all /api/nfse/* routes
// Keeps total Vercel Serverless Functions well under the Hobby plan 12-function limit.
import {
  parsePfxCertificate,
  hasServerEnvCert,
  transmitDpsToSefin,
  cancelNfseOnSefin,
  consultNfseOnSefin,
  fetchOfficialDanfsePdf,
  testSefinConnection,
} from '../_lib/sefinNacional.js';

function resolveAction(req: any): string {
  const fromQuery = req.query?.action;
  if (typeof fromQuery === 'string' && fromQuery.trim()) {
    return fromQuery.trim();
  }
  if (Array.isArray(fromQuery) && fromQuery[0]) {
    return String(fromQuery[0]).trim();
  }
  const urlPath = String(req.url || '').split('?')[0];
  const parts = urlPath.split('/').filter(Boolean);
  return parts[parts.length - 1] || '';
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const action = resolveAction(req);

  try {
    switch (action) {
      case 'cert-status': {
        const configured = hasServerEnvCert();
        if (!configured) {
          return res.status(200).json({ configured: false });
        }
        try {
          const parsed = parsePfxCertificate(
            process.env.NFSE_PFX_BASE64 || '',
            process.env.NFSE_CERT_PASSWORD || ''
          );
          return res.status(200).json({
            configured: true,
            subjectCN: parsed.subjectCN,
            issuerCN: parsed.issuerCN,
            cnpj: parsed.cnpj,
            validFrom: parsed.validFrom,
            validTo: parsed.validTo,
            isExpired: parsed.isExpired,
          });
        } catch (err: any) {
          return res.status(200).json({
            configured: false,
            error: err?.message || 'Certificado de ambiente inválido',
          });
        }
      }

      case 'validate-cert': {
        if (req.method !== 'POST') {
          return res.status(405).json({ success: false, error: 'Use método POST.' });
        }
        const { pfxBase64, password } = req.body || {};
        if (typeof pfxBase64 !== 'string' || !pfxBase64.trim()) {
          return res.status(400).json({ success: false, error: 'Arquivo .pfx/.p12 não fornecido.' });
        }
        if (typeof password !== 'string' || !password.trim()) {
          return res.status(400).json({ success: false, error: 'Senha do certificado obrigatória.' });
        }
        const parsed = parsePfxCertificate(pfxBase64, password);
        return res.status(200).json({
          success: true,
          subjectCN: parsed.subjectCN,
          issuerCN: parsed.issuerCN,
          serialNumber: parsed.serialNumber,
          cnpj: parsed.cnpj,
          validFrom: parsed.validFrom,
          validTo: parsed.validTo,
          isExpired: parsed.isExpired,
        });
      }

      case 'test-connection': {
        if (req.method !== 'POST') {
          return res.status(405).json({ success: false, error: 'Use método POST.' });
        }
        const { ibgeCode, pfxBase64, certPassword } = req.body || {};
        const result = await testSefinConnection({
          ibgeCode: typeof ibgeCode === 'string' ? ibgeCode : '4201109',
          pfxBase64,
          certPassword,
        });
        return res.status(200).json(result);
      }

      case 'transmit': {
        if (req.method !== 'POST') {
          return res.status(405).json({ success: false, message: 'Use método POST.' });
        }
        const { dpsInput, pfxBase64, certPassword } = req.body || {};
        if (!dpsInput || typeof dpsInput !== 'object') {
          return res.status(400).json({ success: false, message: 'Dados da DPS não enviados.' });
        }
        const result = await transmitDpsToSefin(dpsInput, pfxBase64, certPassword);
        return res.status(200).json(result);
      }

      case 'cancel': {
        if (req.method !== 'POST') {
          return res.status(405).json({ success: false, message: 'Use método POST.' });
        }
        const { chaveAcesso, cnpjAutor, motivoCode, motivoDesc, environment, pfxBase64, certPassword } = req.body || {};
        if (typeof chaveAcesso !== 'string' || !chaveAcesso.trim()) {
          return res.status(400).json({ success: false, message: 'Chave de acesso da NFS-e é obrigatória.' });
        }
        const result = await cancelNfseOnSefin({
          chaveAcesso,
          cnpjAutor: String(cnpjAutor || ''),
          motivoCode: motivoCode === '1' || motivoCode === '2' || motivoCode === '9' ? motivoCode : '2',
          motivoDesc: String(motivoDesc || 'Cancelamento solicitado'),
          environment: environment === 'PRODUCAO' ? 'PRODUCAO' : 'HOMOLOGACAO',
          pfxBase64,
          certPassword,
        });
        return res.status(200).json(result);
      }

      case 'consult': {
        if (req.method !== 'POST') {
          return res.status(405).json({ success: false, message: 'Use método POST.' });
        }
        const { chaveAcesso, environment, pfxBase64, certPassword } = req.body || {};
        if (typeof chaveAcesso !== 'string' || !chaveAcesso.trim()) {
          return res.status(400).json({ success: false, message: 'Chave de acesso obrigatória.' });
        }
        const result = await consultNfseOnSefin({
          chaveAcesso,
          environment: environment === 'PRODUCAO' ? 'PRODUCAO' : 'HOMOLOGACAO',
          pfxBase64,
          certPassword,
        });
        return res.status(200).json(result);
      }

      case 'danfse': {
        if (req.method !== 'POST') {
          return res.status(405).json({ success: false, message: 'Use método POST.' });
        }
        const { chaveAcesso, environment, pfxBase64, certPassword } = req.body || {};
        if (typeof chaveAcesso !== 'string' || !chaveAcesso.trim()) {
          return res.status(400).json({ success: false, message: 'Chave de acesso obrigatória.' });
        }
        const result = await fetchOfficialDanfsePdf({
          chaveAcesso,
          environment: environment === 'PRODUCAO' ? 'PRODUCAO' : 'HOMOLOGACAO',
          pfxBase64,
          certPassword,
        });
        return res.status(200).json(result);
      }

      default:
        return res.status(404).json({
          success: false,
          error: `Rota NFS-e desconhecida: ${action}`,
        });
    }
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      httpStatus: 0,
      error: err?.message || 'Erro no processamento da requisição NFS-e.',
      message: err?.message || 'Erro no processamento da requisição NFS-e.',
      errors: [{ codigo: 'CLIENT_ERR', descricao: err?.message || 'Erro interno NFS-e.' }],
    });
  }
}
