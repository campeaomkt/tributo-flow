import { testSefinConnection } from '../_lib/sefinNacional.js';

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
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
  try {
    const { ibgeCode, pfxBase64, certPassword } = getJsonBody(req);
    const result = await testSefinConnection({
      ibgeCode: typeof ibgeCode === 'string' ? ibgeCode : '4201109',
      pfxBase64,
      certPassword,
    });
    return res.status(200).json(result);
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      error: err?.message || 'Erro ao testar conexão mTLS com a Sefin Nacional.',
    });
  }
}
