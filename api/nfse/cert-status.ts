import { parsePfxCertificate, hasServerEnvCert } from '../_lib/sefinNacional.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const configured = hasServerEnvCert();
    if (!configured) {
      return res.status(200).json({ configured: false });
    }
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
