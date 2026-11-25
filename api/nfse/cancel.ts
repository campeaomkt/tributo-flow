import { cancelNfseOnSefin } from '../_lib/sefinNacional.js';

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
    const { chaveAcesso, cnpjAutor, motivoCode, motivoDesc, environment, pfxBase64, certPassword } = getJsonBody(req);
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
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      httpStatus: 0,
      errors: [{ codigo: 'CANCEL_ERR', descricao: err?.message || 'Erro ao cancelar na Sefin Nacional.' }],
      message: err?.message || 'Erro ao cancelar na Sefin Nacional.',
    });
  }
}
