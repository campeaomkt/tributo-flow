import { consultNfseOnSefin } from '../../server/sefinNacional';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }
  try {
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
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      httpStatus: 0,
      errors: [{ codigo: 'CONSULT_ERR', descricao: err?.message || 'Erro ao consultar na Sefin Nacional.' }],
      message: err?.message || 'Erro ao consultar na Sefin Nacional.',
    });
  }
}
