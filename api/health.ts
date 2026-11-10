export default async function handler(req: any, res: any) {
  res.status(200).json({
    status: 'healthy',
    name: 'TributoFlow API',
    timestamp: new Date().toISOString()
  });
}
