// Vercel Serverless Function for Hotmart Webhooks

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const timestamp = new Date().toISOString();

  return res.status(200).json({
    success: true,
    status: 'received',
    platform: 'hotmart',
    message: 'Webhook Hotmart recebido com sucesso pelo TributoFlow!',
    receivedAt: timestamp,
  });
}
