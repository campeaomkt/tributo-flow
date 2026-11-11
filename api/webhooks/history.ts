import fs from 'fs';
import path from 'path';

const TMP_FILE = path.join('/tmp', 'tributoflow_webhooks.json');

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  let events: any[] = [];

  // 1. Try global memory
  if (Array.isArray((global as any).__tributoflow_webhooks)) {
    events = [...(global as any).__tributoflow_webhooks];
  }

  // 2. Try tmp file
  try {
    if (fs.existsSync(TMP_FILE)) {
      const fileData = fs.readFileSync(TMP_FILE, 'utf-8');
      const parsed = JSON.parse(fileData);
      if (Array.isArray(parsed)) {
        // Merge without duplicates
        parsed.forEach(p => {
          if (!events.some(e => e.order_ref === p.order_ref && e.receivedAt === p.receivedAt)) {
            events.push(p);
          }
        });
      }
    }
  } catch (err) {
    // Ignore read error
  }

  return res.status(200).json({
    success: true,
    count: events.length,
    events: events.slice(-50),
  });
}
