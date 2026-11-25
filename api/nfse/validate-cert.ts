import { parsePfxCertificate } from '../../server/sefinNacional';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
  try {
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
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      error: err?.message || 'Erro ao validar o Certificado Digital A1.',
    });
  }
}
