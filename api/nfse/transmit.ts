import { transmitDpsToSefin } from '../_lib/sefinNacional.js';

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
    const { dpsInput, pfxBase64, certPassword } = getJsonBody(req);
    if (!dpsInput || typeof dpsInput !== 'object') {
      return res.status(400).json({ success: false, message: 'Dados da DPS não enviados.' });
    }
    const result = await transmitDpsToSefin(dpsInput, pfxBase64, certPassword);
    return res.status(200).json(result);
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      httpStatus: 0,
      errors: [{ codigo: 'CLIENT_ERR', descricao: err?.message || 'Erro na transmissão para a Sefin Nacional.' }],
      message: err?.message || 'Erro na transmissão para a Sefin Nacional.',
    });
  }
}
