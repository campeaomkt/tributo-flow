import { fetchOfficialDanfsePdf } from '../_lib/sefinNacional.js';

function getJsonBody(req: any): Record<string, any> {
  if (!req?.body) return {};
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return req.body;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }
  try {
    const { chaveAcesso, environment, pfxBase64, certPassword } = getJsonBody(req);
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
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      httpStatus: 0,
      message: err?.message || 'Erro ao baixar DANFSe oficial do ADN Nacional.',
    });
  }
}
