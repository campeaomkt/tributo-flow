import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import {
  parsePfxCertificate,
  hasServerEnvCert,
  transmitDpsToSefin,
  cancelNfseOnSefin,
  consultNfseOnSefin,
  fetchOfficialDanfsePdf,
  testSefinConnection,
} from './api/_lib/sefinNacional.js';
import { fetchRealKiwifySales, hasServerKiwifyEnv } from './api/_lib/kiwifyApi.js';

async function startServer() {
  const app = express();
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Support JSON and URL encoded bodies from Kiwify/Hotmart webhooks and PFX payloads
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // In-memory store for recently received webhook events
  const receivedWebhooks: any[] = [];

  // Health check endpoint
  app.get('/api/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  // Check if a server-side A1 certificate is configured via environment variables
  app.get('/api/nfse/cert-status', (req: Request, res: Response) => {
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
  });

  // Validate a user-uploaded .pfx/.p12 certificate and password (returns metadata only, never secrets)
  app.post('/api/nfse/validate-cert', (req: Request, res: Response) => {
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
  });

  // Read-only mTLS connection diagnostic against both Homologação and Produção (never emits any invoice)
  app.post('/api/nfse/test-connection', async (req: Request, res: Response) => {
    try {
      const { ibgeCode, pfxBase64, certPassword } = req.body || {};
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
  });

  // Transmit DPS to real Sefin Nacional API (Produção Restrita / Produção) via mTLS
  app.post('/api/nfse/transmit', async (req: Request, res: Response) => {
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
  });

  // Cancel authorized NFS-e via Event e101101 on Sefin Nacional
  app.post('/api/nfse/cancel', async (req: Request, res: Response) => {
    try {
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
    } catch (err: any) {
      return res.status(400).json({
        success: false,
        httpStatus: 0,
        errors: [{ codigo: 'CANCEL_ERR', descricao: err?.message || 'Erro ao cancelar na Sefin Nacional.' }],
        message: err?.message || 'Erro ao cancelar na Sefin Nacional.',
      });
    }
  });

  // Consult NFS-e directly on Sefin Nacional by chaveAcesso
  app.post('/api/nfse/consult', async (req: Request, res: Response) => {
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
  });

  // Download official government DANFSe PDF from ADN Nacional
  app.post('/api/nfse/danfse', async (req: Request, res: Response) => {
    try {
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
    } catch (err: any) {
      return res.status(400).json({
        success: false,
        httpStatus: 0,
        message: err?.message || 'Erro ao baixar DANFSe oficial do ADN Nacional.',
      });
    }
  });

  // Real Kiwify Public API v1 status & sync
  app.get('/api/kiwify/status', (_req: Request, res: Response) => {
    return res.status(200).json({ configured: hasServerKiwifyEnv() });
  });

  app.post('/api/kiwify/sync', async (req: Request, res: Response) => {
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
  });

  // Query received webhook events for frontend live sync
  app.get('/api/webhooks/history', (req: Request, res: Response) => {
    res.status(200).json({ events: receivedWebhooks.slice(-50) });
  });

  // Real Webhook handler for Kiwify (POST, GET, HEAD)
  // Kiwify test sends a POST request with test payload
  app.all(['/api/webhooks/kiwify', '/api/webhooks/kiwify/*'], (req: Request, res: Response) => {
    const timestamp = new Date().toISOString();
    const eventData = {
      platform: 'kiwify',
      method: req.method,
      query: req.query,
      headers: req.headers,
      body: req.body,
      receivedAt: timestamp,
    };

    receivedWebhooks.unshift(eventData);
    if (receivedWebhooks.length > 100) receivedWebhooks.pop();

    console.log(`[TributoFlow] Webhook Kiwify recebido (${req.method}):`, req.body);

    // Kiwify requires HTTP 200 or 201 to consider the webhook test valid!
    return res.status(200).json({
      success: true,
      status: 'received',
      platform: 'kiwify',
      message: 'Webhook recebido e processado com sucesso pelo TributoFlow',
      receivedAt: timestamp,
    });
  });

  // Real Webhook handler for Hotmart
  app.all(['/api/webhooks/hotmart', '/api/webhooks/hotmart/*'], (req: Request, res: Response) => {
    const timestamp = new Date().toISOString();
    const eventData = {
      platform: 'hotmart',
      method: req.method,
      query: req.query,
      body: req.body,
      receivedAt: timestamp,
    };

    receivedWebhooks.unshift(eventData);
    if (receivedWebhooks.length > 100) receivedWebhooks.pop();

    console.log(`[TributoFlow] Webhook Hotmart recebido (${req.method}):`, req.body);

    return res.status(200).json({
      success: true,
      status: 'received',
      platform: 'hotmart',
      receivedAt: timestamp,
    });
  });

  // Generic webhook catcher for any other platform
  app.all(['/api/webhooks/:platform', '/api/webhooks/:platform/*'], (req: Request, res: Response) => {
    const timestamp = new Date().toISOString();
    const platform = req.params.platform;
    const eventData = {
      platform,
      method: req.method,
      body: req.body,
      receivedAt: timestamp,
    };

    receivedWebhooks.unshift(eventData);

    return res.status(200).json({
      success: true,
      status: 'received',
      platform,
      receivedAt: timestamp,
    });
  });

  // Mount Vite development server as middleware in dev
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`[TributoFlow] Servidor rodando na porta ${port}`);
  });
}

startServer().catch((err) => {
  console.error('[TributoFlow] Erro ao iniciar servidor:', err);
});
