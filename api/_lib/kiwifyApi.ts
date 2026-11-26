// Real Kiwify Public API v1 integration (OAuth 2.0 + /v1/sales)
// Vercel Node.js Serverless ESM & Express compatible — zero fake data.

export interface KiwifyCredentials {
  clientId?: string;
  clientSecret?: string;
  accountId?: string;
}

export interface RealKiwifySale {
  externalId: string;
  reference: string;
  status: 'approved' | 'refunded' | 'chargedback' | 'pending' | 'refused';
  rawStatus: string;
  productId: string;
  productName: string;
  amount: number; // BRL gross/charged amount
  netAmount: number; // BRL net amount after Kiwify fee
  currency: string;
  paymentMethod: 'PIX' | 'CARTAO_CREDITO' | 'BOLETO';
  installments: number;
  createdAt: string;
  paidAt: string;
  customer: {
    id: string;
    name: string;
    document: string;
    email: string;
    phone?: string;
    zipCode?: string;
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city: string;
    state: string;
  };
}

export interface KiwifySyncResult {
  success: boolean;
  source: 'kiwify_public_api';
  period: { startDate: string; endDate: string };
  totalFetched: number;
  sales: RealKiwifySale[];
  error?: string;
  httpStatus?: number;
}

const KIWIFY_API_BASE = 'https://public-api.kiwify.com';

export function hasServerKiwifyEnv(): boolean {
  return Boolean(
    process.env.KIWIFY_CLIENT_ID?.trim() &&
      process.env.KIWIFY_CLIENT_SECRET?.trim() &&
      process.env.KIWIFY_ACCOUNT_ID?.trim()
  );
}

function isPlaceholderSecret(value?: string): boolean {
  if (!value) return true;
  const trimmed = value.trim();
  if (!trimmed) return true;
  return /^[•*]+$/.test(trimmed);
}

export function resolveKiwifyCredentials(input?: KiwifyCredentials): {
  clientId: string;
  clientSecret: string;
  accountId: string;
} {
  const clientId =
    (input?.clientId && !isPlaceholderSecret(input.clientId) ? input.clientId.trim() : '') ||
    process.env.KIWIFY_CLIENT_ID?.trim() ||
    '';
  const clientSecret =
    (input?.clientSecret && !isPlaceholderSecret(input.clientSecret) ? input.clientSecret.trim() : '') ||
    process.env.KIWIFY_CLIENT_SECRET?.trim() ||
    '';
  const accountId =
    (input?.accountId && !isPlaceholderSecret(input.accountId) ? input.accountId.trim() : '') ||
    process.env.KIWIFY_ACCOUNT_ID?.trim() ||
    '';

  if (!clientId || !clientSecret || !accountId) {
    throw new Error(
      'Credenciais reais da API da Kiwify incompletas. Informe Client ID, Client Secret real e Account ID em Apps > Kiwify (ou configure KIWIFY_CLIENT_ID, KIWIFY_CLIENT_SECRET e KIWIFY_ACCOUNT_ID nas variáveis de ambiente da Vercel).'
    );
  }

  return { clientId, clientSecret, accountId };
}

function formatCpfCnpj(raw?: string): string {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  }
  if (digits.length === 14) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
  }
  return digits || '000.000.000-00';
}

function formatDateTime(iso?: string): string {
  if (!iso) return new Date().toISOString().replace('T', ' ').slice(0, 19);
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso).slice(0, 19);
  // Format in Brasilia timezone (UTC-3)
  const brt = new Date(d.getTime() - 3 * 60 * 60 * 1000);
  const yyyy = brt.getUTCFullYear();
  const mm = String(brt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(brt.getUTCDate()).padStart(2, '0');
  const hh = String(brt.getUTCHours()).padStart(2, '0');
  const mi = String(brt.getUTCMinutes()).padStart(2, '0');
  const ss = String(brt.getUTCSeconds()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}

function normalizePaymentMethod(raw?: string): 'PIX' | 'CARTAO_CREDITO' | 'BOLETO' {
  const val = String(raw || '').toLowerCase();
  if (val.includes('pix')) return 'PIX';
  if (val.includes('boleto')) return 'BOLETO';
  return 'CARTAO_CREDITO';
}

function normalizeStatus(raw?: string): RealKiwifySale['status'] {
  const val = String(raw || '').toLowerCase().trim();
  if (val === 'paid' || val === 'approved' || val === 'complete' || val === 'completed') return 'approved';
  if (
    val === 'refunded' ||
    val === 'refund' ||
    val === 'partially_refunded' ||
    val === 'estornado' ||
    val === 'reversed' ||
    val.includes('refund') ||
    val.includes('estorn')
  ) {
    return 'refunded';
  }
  if (
    val === 'chargedback' ||
    val === 'chargeback' ||
    val === 'charge_back' ||
    val === 'disputed' ||
    val === 'dispute' ||
    val.includes('chargeback') ||
    val.includes('disput')
  ) {
    return 'chargedback';
  }
  if (val === 'refused' || val === 'canceled' || val === 'cancelled') return 'refused';
  return 'pending';
}

function centsToBrl(val: any): number {
  const num = Number(val);
  if (!Number.isFinite(num) || num <= 0) return 0;
  // Kiwify Public API returns amounts in cents (integer)
  return Number((num / 100).toFixed(2));
}

function normalizeKiwifySale(raw: any): RealKiwifySale {
  const id = String(raw?.id || raw?.order_id || '');
  const reference = String(raw?.reference || raw?.order_ref || id);
  const rawStatus = String(raw?.status || raw?.order_status || 'unknown');
  const status = normalizeStatus(rawStatus);

  const productObj = raw?.product || raw?.Product || {};
  const productId = String(productObj?.id || productObj?.product_id || 'kiwify_prod');
  const productName = String(productObj?.name || productObj?.product_name || 'Produto Kiwify');

  const customerObj = raw?.customer || raw?.Customer || {};
  const addressObj = customerObj?.address || {};

  const chargeCents =
    raw?.payment?.charge_amount ??
    raw?.Commissions?.charge_amount ??
    raw?.charge_amount ??
    raw?.payment?.product_base_price ??
    raw?.net_amount ??
    0;

  const netCents = raw?.net_amount ?? raw?.Commissions?.my_commission ?? chargeCents;

  const amount = centsToBrl(chargeCents);
  const netAmount = centsToBrl(netCents);

  const createdAt = formatDateTime(raw?.created_at);
  const paidAt = formatDateTime(raw?.approved_date || raw?.updated_at || raw?.created_at);

  return {
    externalId: id || reference,
    reference,
    status,
    rawStatus,
    productId,
    productName,
    amount: amount > 0 ? amount : netAmount,
    netAmount,
    currency: String(raw?.payment?.charge_currency || raw?.currency || 'BRL'),
    paymentMethod: normalizePaymentMethod(raw?.payment_method),
    installments: Number(raw?.installments) || 1,
    createdAt,
    paidAt,
    customer: {
      id: String(customerObj?.id || `cust_${reference}`),
      name: String(customerObj?.name || customerObj?.full_name || customerObj?.first_name || 'Cliente Kiwify'),
      document: formatCpfCnpj(customerObj?.cpf || customerObj?.CPF || customerObj?.cnpj || customerObj?.CNPJ),
      email: String(customerObj?.email || ''),
      phone: customerObj?.mobile ? String(customerObj.mobile) : undefined,
      zipCode: String(addressObj?.zipcode || addressObj?.zip_code || addressObj?.cep || ''),
      street: String(addressObj?.street || addressObj?.address || addressObj?.logradouro || ''),
      number: String(addressObj?.number || addressObj?.numero || ''),
      complement: String(addressObj?.complement || addressObj?.complemento || ''),
      neighborhood: String(addressObj?.neighborhood || addressObj?.bairro || ''),
      city: String(addressObj?.city || addressObj?.cidade || ''),
      state: String(addressObj?.state || addressObj?.uf || ''),
    },
  };
}

/**
 * Generates an OAuth 2.0 Bearer access token from Kiwify's official public API.
 */
async function getKiwifyAccessToken(clientId: string, clientSecret: string): Promise<string> {
  const form = new URLSearchParams();
  form.set('client_id', clientId);
  form.set('client_secret', clientSecret);

  const res = await fetch(`${KIWIFY_API_BASE}/v1/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: form.toString(),
  });

  const rawText = await res.text();
  let parsed: any = null;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    // non-json
  }

  if (!res.ok || !parsed?.access_token) {
    const detail = parsed?.message || parsed?.error_description || parsed?.error || rawText.slice(0, 180);
    throw new Error(
      `Falha ao autenticar na API da Kiwify (HTTP ${res.status}): ${detail || 'Verifique se Client ID e Client Secret estão corretos.'}`
    );
  }

  return String(parsed.access_token);
}

/**
 * Splits a date window into <= 89-day chunks (Kiwify /v1/sales enforces a 90-day max window per request).
 */
function buildDateChunks(startIso: string, endIso: string): Array<{ start: string; end: string }> {
  const startDate = new Date(`${startIso.slice(0, 10)}T00:00:00Z`);
  const endDate = new Date(`${endIso.slice(0, 10)}T23:59:59Z`);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || startDate > endDate) {
    const fallbackEnd = new Date();
    const fallbackStart = new Date(fallbackEnd.getTime() - 30 * 24 * 60 * 60 * 1000);
    return [
      {
        start: fallbackStart.toISOString().slice(0, 10),
        end: fallbackEnd.toISOString().slice(0, 10),
      },
    ];
  }

  const chunks: Array<{ start: string; end: string }> = [];
  const maxDaysMs = 89 * 24 * 60 * 60 * 1000;
  let cursor = startDate.getTime();
  const limit = endDate.getTime();

  // Cap total lookback to 365 days max to avoid Vercel serverless timeout
  const minCursor = limit - 365 * 24 * 60 * 60 * 1000;
  if (cursor < minCursor) cursor = minCursor;

  while (cursor <= limit) {
    const chunkEnd = Math.min(cursor + maxDaysMs, limit);
    chunks.push({
      start: new Date(cursor).toISOString().slice(0, 10),
      end: new Date(chunkEnd).toISOString().slice(0, 10),
    });
    cursor = chunkEnd + 24 * 60 * 60 * 1000;
  }

  return chunks;
}

/**
 * Fetches 100% REAL sales directly from Kiwify's official Public API (/v1/sales).
 */
export async function fetchRealKiwifySales(params: {
  credentials?: KiwifyCredentials;
  startDate?: string;
  endDate?: string;
  includeUnpaid?: boolean;
}): Promise<KiwifySyncResult> {
  const { clientId, clientSecret, accountId } = resolveKiwifyCredentials(params.credentials);

  const todayIso = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10); // +1d buffer for UTC vs BRT
  const defaultStartIso = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const startDate = params.startDate?.trim() || defaultStartIso;
  const endDate = params.endDate?.trim() || todayIso;

  const accessToken = await getKiwifyAccessToken(clientId, clientSecret);
  const chunks = buildDateChunks(startDate, endDate);

  const byRef = new Map<string, RealKiwifySale>();

  for (const chunk of chunks) {
    let page = 1;
    const pageSize = 100;
    let hasMore = true;

    while (hasMore && page <= 15) {
      const qs = new URLSearchParams({
        start_date: chunk.start,
        end_date: chunk.end,
        page_size: String(pageSize),
        page_number: String(page),
      });

      const res = await fetch(`${KIWIFY_API_BASE}/v1/sales?${qs.toString()}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'x-kiwify-account-id': accountId,
          Accept: 'application/json',
        },
      });

      const rawText = await res.text();
      let parsed: any = null;
      try {
        parsed = JSON.parse(rawText);
      } catch {
        // non-json
      }

      if (!res.ok) {
        const detail = parsed?.message || parsed?.error || rawText.slice(0, 200);
        throw new Error(
          `A API da Kiwify retornou HTTP ${res.status} ao listar vendas (${chunk.start} a ${chunk.end}): ${detail}. Verifique se o Account ID está correto e se a API Key tem permissão de "Vendas".`
        );
      }

      const items: any[] = Array.isArray(parsed?.data)
        ? parsed.data
        : Array.isArray(parsed?.sales)
        ? parsed.sales
        : Array.isArray(parsed)
        ? parsed
        : [];

      for (const item of items) {
        const normalized = normalizeKiwifySale(item);
        const rawLower = normalized.rawStatus.toLowerCase();
        const isCanceledOrder = rawLower === 'canceled' || rawLower === 'cancelled';
        // Include paid/approved, refunded, chargedback, and canceled orders (skip declined card attempts unless requested)
        if (
          params.includeUnpaid ||
          normalized.status === 'approved' ||
          normalized.status === 'refunded' ||
          normalized.status === 'chargedback' ||
          isCanceledOrder
        ) {
          byRef.set(normalized.reference, normalized);
        }
      }

      const totalCount = Number(parsed?.pagination?.count ?? 0);
      if (items.length < pageSize || (totalCount > 0 && page * pageSize >= totalCount)) {
        hasMore = false;
      } else {
        page += 1;
      }
    }
  }

  // Sort newest first
  const sales = Array.from(byRef.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return {
    success: true,
    source: 'kiwify_public_api',
    period: { startDate: chunks[0]?.start || startDate, endDate: chunks[chunks.length - 1]?.end || endDate },
    totalFetched: sales.length,
    sales,
    httpStatus: 200,
  };
}
