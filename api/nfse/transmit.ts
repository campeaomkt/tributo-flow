import { transmitDpsToSefin } from '../../server/sefinNacional';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }
  try {
    const { dpsInput, pfxBase64, certPassword } = req.body || {};
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
