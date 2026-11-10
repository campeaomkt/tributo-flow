import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';

async function startServer() {
  const app = express();
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Support JSON and URL encoded bodies from Kiwify/Hotmart webhooks
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // In-memory store for recently received webhook events
  const receivedWebhooks: any[] = [];

  // Health check endpoint
  app.get('/api/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
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
