export type TaxRegime = 'MEI' | 'SIMPLES_NACIONAL' | 'LUCRO_PRESUMIDO' | 'LUCRO_REAL';

export type InvoiceModel = 'NFS-e' | 'NF-e' | 'Split';

export type InvoiceTrigger = 
  | 'on_created' 
  | 'on_warranty_expired' 
  | 'on_payment_approved' 
  | 'manual';

export type InvoiceStatus = 'EMITIDA' | 'PENDENTE' | 'CANCELADA' | 'PROCESSANDO' | 'ERRO';

export type PlatformId = 
  | 'kiwify' 
  | 'hotmart' 
  | 'eduzz' 
  | 'monetizze' 
  | 'braip' 
  | 'stripe' 
  | 'shopify' 
  | 'custom_api';

export interface PlatformConfig {
  id: PlatformId;
  name: string;
  logo: string;
  tagline: string;
  enabled: boolean;
  invoiceModel: InvoiceModel;
  trigger: InvoiceTrigger;
  sendEmailToCustomer: boolean;
  cancelOnRefund: boolean;
  clientId: string;
  clientSecret: string;
  accountId: string;
  includeInterestInValue: boolean;
  notificationEmail: string;
  integrationStartDate: string;
  warrantyDays: number;
  webhookUrl: string;
  webhookSecret: string;
  lastSync?: string;
  totalSalesProcessed?: number;
}

export interface Customer {
  id: string;
  name: string;
  document: string; // CPF or CNPJ
  email: string;
  phone?: string;
  city?: string;
  state?: string;
  isCompany?: boolean;
}

export interface Product {
  id: string;
  name: string;
  platform: PlatformId;
  externalId: string;
  price: number;
  serviceCode: string; // e.g. 01.07 ou 08.02
  cnae: string;
  salesCount: number;
  totalRevenue: number;
}

export interface Sale {
  id: string;
  externalSaleId: string;
  platform: PlatformId;
  productName: string;
  productId: string;
  amount: number;
  paymentMethod: 'PIX' | 'CARTAO_CREDITO' | 'BOLETO';
  installments?: number;
  status: 'approved' | 'pending' | 'refunded' | 'cancelled';
  createdAt: string;
  paidAt?: string;
  warrantyExpiresAt: string;
  customer: Customer;
  invoiceId?: string;
  invoiceStatus?: InvoiceStatus;
}

export interface TaxBreakdown {
  regime: TaxRegime;
  effectiveRate: number; // in %
  totalTax: number;
  issRate: number;
  issAmount: number;
  pisRate: number;
  pisAmount: number;
  cofinsRate: number;
  cofinsAmount: number;
  irpjRate: number;
  irpjAmount: number;
  csllRate: number;
  csllAmount: number;
  inssRetained?: number;
}

export interface FiscalInvoice {
  id: string;
  number: string; // e.g. "20260000412"
  series: string; // e.g. "1"
  rpsNumber: string; // e.g. "8492"
  verificationCode: string; // e.g. "4A8F-9C12-E7B0"
  accessKey: string;
  saleId: string;
  platform: PlatformId;
  model: InvoiceModel;
  status: InvoiceStatus;
  issuedAt: string;
  cancelledAt?: string;
  cancellationReason?: string;
  scheduledFor?: string;
  customer: Customer;
  productName: string;
  description: string;
  serviceCode: string; // Código de tributação municipal
  cnae: string;
  grossAmount: number;
  netAmount: number;
  taxes: TaxBreakdown;
  xmlUrl?: string;
  pdfUrl?: string;
  municipalAuthUrl?: string;
  emailSent: boolean;
}

export interface CompanySettings {
  corporateName: string; // "CAMPEAO NEGOCIOS DIGITAIS LTDA"
  tradeName: string; // "CAMPEAO NEGOCIOS DIGITIAS"
  cnpj: string; // "40.731.222/0001-07"
  municipalRegistration: string;
  stateRegistration?: string; // "264108787"
  crt: string; // "Simples Nacional"
  specialRegime: string; // "Microempresário e Empresa de Pequeno Porte (ME EPP)"
  simplesApuracaoRegime: string; // "Regime de apuração dos tributos federais e municipal pelo SN"
  email: string; // "campeao.mkt.user@gmail.com"
  phone: string; // "(69) 9265-3785"
  mobile: string; // "(69) 99265-3785"
  taxRegime: TaxRegime;
  simplesAnexo: 'ANEXO_I' | 'ANEXO_III' | 'ANEXO_V';
  fatorRActive: boolean;
  rbt12: number; // Receita Bruta Total 12 meses
  payroll12: number; // Folha de pagamento 12 meses
  defaultIssRate: number; // e.g. 2.9%
  serviceCode: string; // "01.07"
  cnaePrincipal: string; // "6202-3/00"
  address: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
  };
  accountantEmail: string;
  accountantName: string;
  accountantToken: string;
  certificateStatus: 'ACTIVE' | 'EXPIRED' | 'MISSING';
  certificateExpiryDate: string;
  certificateFileName?: string;
  certificatePassword?: string;
}

export interface MonthlyClosing {
  year: number;
  month: number; // 1-12
  monthName: string;
  grossRevenue: number;
  netRevenue: number;
  invoicesCount: number;
  cancelledCount: number;
  estimatedTaxes: number;
  simplesDasEstimate: number;
  issDue: number;
  isClosed: boolean;
  closedAt?: string;
}
