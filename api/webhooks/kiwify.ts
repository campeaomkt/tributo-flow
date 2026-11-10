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
