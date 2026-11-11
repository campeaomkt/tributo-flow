// Vercel Serverless Function for Kiwify Webhooks
// Compatible with Vercel, Netlify and Node environments

export default async function handler(req: any, res: any) {
  // CORS configuration for webhook tests and browser calls
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-kiwify-signature'
  );

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const timestamp = new Date().toISOString();
  const body = req.body || {};

  console.log(`[TributoFlow Vercel Webhook] Kiwify ${req.method} recebido:`, JSON.stringify(body).slice(0, 300));

  const eventData = {
    platform: 'kiwify',
    method: req.method,
    body: body,
    receivedAt: timestamp,
    order_ref: body?.order?.order_ref || body?.order_ref || null,
  };

  // 1. Save to global memory
  if (!Array.isArray((global as any).__tributoflow_webhooks)) {
    (global as any).__tributoflow_webhooks = [];
  }
  (global as any).__tributoflow_webhooks.unshift(eventData);
  if ((global as any).__tributoflow_webhooks.length > 100) {
    (global as any).__tributoflow_webhooks.pop();
  }

  // 2. Save to /tmp
  try {
    const fs = await import('fs');
    const path = await import('path');
    const tmpFile = path.join('/tmp', 'tributoflow_webhooks.json');
    let list: any[] = [];
    if (fs.existsSync(tmpFile)) {
      try {
        list = JSON.parse(fs.readFileSync(tmpFile, 'utf-8'));
      } catch (e) {}
    }
    list.unshift(eventData);
    if (list.length > 100) list.pop();
    fs.writeFileSync(tmpFile, JSON.stringify(list));
  } catch (err) {
    // Non-fatal if /tmp is restricted
  }

  // Kiwify requires HTTP 200 or 201 to consider the webhook delivery and test successful
  return res.status(200).json({
    success: true,
    status: 'received',
    platform: 'kiwify',
    message: 'Webhook Kiwify recebido com sucesso pelo TributoFlow!',
    receivedAt: timestamp,
    order_ref: body?.order?.order_ref || body?.order_ref || null,
  });
}
