// Consolidated Vercel Serverless Function for /api/kiwify/* routes (status & sync)
import { fetchRealKiwifySales, hasServerKiwifyEnv } from '../_lib/kiwifyApi.js';

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

  if (action === 'status') {
    return res.status(200).json({
      configured: hasServerKiwifyEnv(),
    });
  }

  if (action === 'sync') {
    if (req.method !== 'POST') {
      return res.status(405).json({ success: false, error: 'Use método POST.' });
    }
    try {
      const { clientId, clientSecret, accountId, startDate, endDate, includeUnpaid } = req.body || {};
      const result = await fetchRealKiwifySales({
        credentials: { clientId, clientSecret, accountId },
        startDate: typeof startDate === 'string' ? startDate : undefined,
        endDate: typeof endDate === 'string' ? endDate : undefined,
        includeUnpaid: Boolean(includeUnpaid),
      });
      return res.status(200).json(result);
    } catch (err: any) {
      return res.status(400).json({
        success: false,
        source: 'kiwify_public_api',
        totalFetched: 0,
        sales: [],
        error: err?.message || 'Erro ao sincronizar vendas reais da API da Kiwify.',
      });
    }
  }

  return res.status(404).json({
    success: false,
    error: `Rota Kiwify desconhecida: ${action}`,
  });
}
