import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  CompanySettings, 
  PlatformConfig, 
  Sale, 
  FiscalInvoice, 
  MonthlyClosing, 
  PlatformId,
  MunicipalProvider,
  FiscalEnvironment 
} from '../types';
import { 
  initialCompanySettings, 
  initialPlatforms, 
  generateInitialInvoices, 
  initialMonthlyClosings 
} from '../services/mockData';
import { calculateTaxes } from '../services/taxCalculator';
import { transmitDirectToPrefeitura, DirectTransmissionResult } from '../services/directTransmitter';

interface DateFilter {
  start: string;
  end: string;
  label: string;
}

interface FiscalContextType {
  company: CompanySettings;
  platforms: PlatformConfig[];
  sales: Sale[];
  invoices: FiscalInvoice[];
  monthlyClosings: MonthlyClosing[];
  currentView: string;
  setCurrentView: (view: string) => void;
  dateFilter: DateFilter;
  setDateFilter: (filter: DateFilter) => void;
  selectedInvoiceForDanfe: FiscalInvoice | null;
  setSelectedInvoiceForDanfe: (inv: FiscalInvoice | null) => void;
  selectedPlatformForModal: PlatformConfig | null;
  setSelectedPlatformForModal: (platform: PlatformConfig | null) => void;
  isSimulatorOpen: boolean;
  setIsSimulatorOpen: (open: boolean) => void;
  isCompanyModalOpen: boolean;
  setIsCompanyModalOpen: (open: boolean) => void;
  selectedInvoiceForSoapLogs: FiscalInvoice | null;
  setSelectedInvoiceForSoapLogs: (inv: FiscalInvoice | null) => void;
  
  // Actions
  updateCompany: (settings: Partial<CompanySettings>) => void;
  updatePlatform: (platformId: PlatformId, config: Partial<PlatformConfig>) => void;
  emitInvoice: (invoiceId: string) => void;
  emitBatchInvoices: (invoiceIds: string[]) => void;
  transmitInvoiceDirect: (
    invoiceId: string, 
    provider?: MunicipalProvider, 
    environment?: FiscalEnvironment
  ) => Promise<DirectTransmissionResult>;
  cancelInvoice: (invoiceId: string, reason: string) => void;
  simulateSale: (saleInput: {
    platform: PlatformId;
    productName: string;
    amount: number;
    paymentMethod: 'PIX' | 'CARTAO_CREDITO' | 'BOLETO';
    customerName: string;
    customerDoc: string;
    customerEmail: string;
  }) => void;
  simulateRefund: (saleId: string) => void;
  processKiwifyWebhook: (payload: any) => void;
  syncKiwifySales: () => number;
  closeMonth: (year: number, month: number) => void;
  resetToDefault: () => void;
}

const FiscalContext = createContext<FiscalContextType | undefined>(undefined);

const STORAGE_KEYS = {
  COMPANY: 'tributoflow_company_v6',
  PLATFORMS: 'tributoflow_platforms_v6',
  SALES: 'tributoflow_sales_v6',
  INVOICES: 'tributoflow_invoices_v6',
  CLOSINGS: 'tributoflow_closings_v6',
};

export const FiscalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [company, setCompany] = useState<CompanySettings>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.COMPANY) || localStorage.getItem('tributoflow_company_v5');
    return saved ? JSON.parse(saved) : initialCompanySettings;
  });

  const [platforms, setPlatforms] = useState<PlatformConfig[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PLATFORMS);
    return saved ? JSON.parse(saved) : initialPlatforms;
  });

  const [sales, setSales] = useState<Sale[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SALES);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Auto-merge if user had older single-sale session
      if (Array.isArray(parsed) && parsed.length < 11) {
        const { sales: defaultSales } = generateInitialInvoices();
        const existingIds = new Set(parsed.map(s => s.externalSaleId));
        const missing = defaultSales.filter(s => !existingIds.has(s.externalSaleId));
        return [...missing, ...parsed];
      }
      return parsed;
    }
    const { sales } = generateInitialInvoices();
    return sales;
  });

  const [invoices, setInvoices] = useState<FiscalInvoice[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.INVOICES);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length < 11) {
        const { invoices: defaultInvoices } = generateInitialInvoices();
        const existingIds = new Set(parsed.map(i => i.saleId));
        const missing = defaultInvoices.filter(i => !existingIds.has(i.saleId));
        return [...missing, ...parsed];
      }
      return parsed;
    }
    const { invoices } = generateInitialInvoices();
    return invoices;
  });

  const [monthlyClosings, setMonthlyClosings] = useState<MonthlyClosing[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CLOSINGS);
    return saved ? JSON.parse(saved) : initialMonthlyClosings;
  });

  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [dateFilter, setDateFilter] = useState<DateFilter>({
    start: '2026-11-01',
    end: '2026-11-30',
    label: 'Novembro / 2026',
  });

  const [selectedInvoiceForDanfe, setSelectedInvoiceForDanfe] = useState<FiscalInvoice | null>(null);
  const [selectedInvoiceForSoapLogs, setSelectedInvoiceForSoapLogs] = useState<FiscalInvoice | null>(null);
  const [selectedPlatformForModal, setSelectedPlatformForModal] = useState<PlatformConfig | null>(null);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState<boolean>(false);
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState<boolean>(false);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.COMPANY, JSON.stringify(company));
  }, [company]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PLATFORMS, JSON.stringify(platforms));
  }, [platforms]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(sales));
  }, [sales]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));
  }, [invoices]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CLOSINGS, JSON.stringify(monthlyClosings));
  }, [monthlyClosings]);

  // Poll backend for real webhooks received while running
  useEffect(() => {
    const fetchReceivedEvents = async () => {
      try {
        const res = await fetch('/api/webhooks/history');
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data.events)) {
          data.events.forEach((evt: any) => {
            if (evt.platform === 'kiwify' && evt.body) {
              processKiwifyWebhook(evt.body);
            }
          });
        }
      } catch (e) {
        // Ignore polling errors
      }
    };

    fetchReceivedEvents();
    const interval = setInterval(fetchReceivedEvents, 4000);
    return () => clearInterval(interval);
  }, []);

  const updateCompany = (settings: Partial<CompanySettings>) => {
    setCompany(prev => ({ ...prev, ...settings }));
  };

  const updatePlatform = (platformId: PlatformId, config: Partial<PlatformConfig>) => {
    setPlatforms(prev =>
      prev.map(p => (p.id === platformId ? { ...p, ...config } : p))
    );
  };

  const emitInvoice = (invoiceId: string) => {
    setInvoices(prev =>
      prev.map(inv => {
        if (inv.id !== invoiceId) return inv;
        const now = new Date();
        const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
        
        return {
          ...inv,
          status: 'EMITIDA',
          issuedAt: formattedDate,
          scheduledFor: undefined,
          emailSent: true,
        };
      })
    );

    // Update sale status too
    setSales(prev =>
      prev.map(s => {
        if (s.invoiceId === invoiceId) {
          return { ...s, invoiceStatus: 'EMITIDA' };
        }
        return s;
      })
    );
  };

  const emitBatchInvoices = (invoiceIds: string[]) => {
    invoiceIds.forEach(id => emitInvoice(id));
  };

  const transmitInvoiceDirect = async (
    invoiceId: string, 
    provider: MunicipalProvider = company.municipalProvider || 'BETHA',
    environment: FiscalEnvironment = company.fiscalEnvironment || 'PRODUCAO'
  ): Promise<DirectTransmissionResult> => {
    const inv = invoices.find(i => i.id === invoiceId);
    if (!inv) throw new Error('Nota fiscal não encontrada.');

    const result = await transmitDirectToPrefeitura(inv, company, provider, environment);

    setInvoices(prev =>
      prev.map(i => {
        if (i.id !== invoiceId) return i;
        return {
          ...i,
          status: 'EMITIDA',
          issuedAt: result.authorizedAt,
          transmissionMode: 'DIRETO_PREFEITURA',
          municipalProvider: provider,
          municipalProtocol: result.municipalProtocol,
          officialInvoiceNumber: result.officialNumber,
          municipalAuthCode: result.municipalAuthCode,
          municipalUrl: result.municipalUrl,
          authorizedAt: result.authorizedAt,
          soapRequestXml: result.soapRequestXml,
          soapResponseXml: result.soapResponseXml,
          signedXml: result.signedXml,
          verificationCode: result.municipalAuthCode,
          number: result.officialNumber.replace('/', ''),
          scheduledFor: undefined,
          emailSent: true,
        };
      })
    );

    setSales(prev =>
      prev.map(s => {
        if (s.invoiceId === invoiceId) {
          return { ...s, invoiceStatus: 'EMITIDA' };
        }
        return s;
      })
    );

    return result;
  };

  const cancelInvoice = (invoiceId: string, reason: string) => {
    const now = new Date();
    const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    setInvoices(prev =>
      prev.map(inv => {
        if (inv.id !== invoiceId) return inv;
        return {
          ...inv,
          status: 'CANCELADA',
          cancelledAt: formattedDate,
          cancellationReason: reason,
        };
      })
    );

    setSales(prev =>
      prev.map(s => {
        if (s.invoiceId === invoiceId) {
          return { ...s, invoiceStatus: 'CANCELADA' };
        }
        return s;
      })
    );
  };

  const simulateSale = (input: {
    platform: PlatformId;
    productName: string;
    amount: number;
    paymentMethod: 'PIX' | 'CARTAO_CREDITO' | 'BOLETO';
    customerName: string;
    customerDoc: string;
    customerEmail: string;
  }) => {
    const platform = platforms.find(p => p.id === input.platform);
    const now = new Date();
    const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    
    const warrantyDate = new Date();
    const warrantyDays = platform?.warrantyDays ?? 7;
    warrantyDate.setDate(warrantyDate.getDate() + warrantyDays);
    const formattedWarranty = `${warrantyDate.getFullYear()}-${String(warrantyDate.getMonth() + 1).padStart(2, '0')}-${String(warrantyDate.getDate()).padStart(2, '0')} 23:59:59`;

    const saleId = `sale_sim_${Date.now()}`;
    const invId = `inv_sim_${Date.now()}`;

    // Should invoice be issued immediately or queued for warranty?
    const isImmediate = 
      platform?.trigger === 'on_payment_approved' || 
      platform?.trigger === 'on_created';

    const invStatus: 'EMITIDA' | 'PENDENTE' = isImmediate ? 'EMITIDA' : 'PENDENTE';

    const newSale: Sale = {
      id: saleId,
      externalSaleId: `${input.platform.toUpperCase().slice(0, 3)}-${Math.floor(1000000 + Math.random() * 9000000)}`,
      platform: input.platform,
      productName: input.productName,
      productId: 'prod_custom',
      amount: input.amount,
      paymentMethod: input.paymentMethod,
      installments: 1,
      status: 'approved',
      createdAt: formattedDate,
      paidAt: formattedDate,
      warrantyExpiresAt: formattedWarranty,
      customer: {
        id: `cust_${Date.now()}`,
        name: input.customerName,
        document: input.customerDoc,
        email: input.customerEmail,
        city: 'São Paulo',
        state: 'SP',
      },
      invoiceId: invId,
      invoiceStatus: invStatus,
    };

    const taxes = calculateTaxes(input.amount, company);
    const invoiceNum = (20260000500 + invoices.length).toString();

    const newInvoice: FiscalInvoice = {
      id: invId,
      number: invoiceNum,
      series: '1',
      rpsNumber: (8500 + invoices.length).toString(),
      verificationCode: `VER-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      accessKey: `352610${company.cnpj.replace(/\D/g, '')}5500100000${invoiceNum}100918231`,
      saleId: saleId,
      platform: input.platform,
      model: platform?.invoiceModel || 'NFS-e',
      status: invStatus,
      issuedAt: formattedDate,
      scheduledFor: isImmediate ? undefined : `${formattedWarranty} (Fim da Garantia)`,
      customer: newSale.customer,
      productName: input.productName,
      description: `Licenciamento e acesso a plataforma de conteúdo digital: ${input.productName}`,
      serviceCode: company.serviceCode,
      cnae: company.cnaePrincipal,
      grossAmount: input.amount,
      netAmount: input.amount - taxes.totalTax,
      taxes,
      emailSent: isImmediate && !!platform?.sendEmailToCustomer,
    };

    setSales(prev => [newSale, ...prev]);
    setInvoices(prev => [newInvoice, ...prev]);

    // Update platform stats
    updatePlatform(input.platform, {
      totalSalesProcessed: (platform?.totalSalesProcessed || 0) + 1,
      lastSync: formattedDate,
    });
  };

  const simulateRefund = (saleId: string) => {
    const sale = sales.find(s => s.id === saleId);
    if (!sale) return;

    const platform = platforms.find(p => p.id === sale.platform);

    // Mark sale as refunded
    setSales(prev =>
      prev.map(s => (s.id === saleId ? { ...s, status: 'refunded' } : s))
    );

    // If platform cancels invoice on refund
    if (platform?.cancelOnRefund && sale.invoiceId) {
      cancelInvoice(sale.invoiceId, 'Reembolso de compra processado na plataforma de pagamento');
    }
  };

  const processKiwifyWebhook = (payload: any) => {
    try {
      const order = payload.order || payload;
      const orderId = order.order_id || `KW-${Date.now()}`;

      // Check if already processed
      if (sales.some(s => s.externalSaleId === orderId || s.externalSaleId === order.order_ref)) {
        return;
      }

      const platformConfig = platforms.find(p => p.id === 'kiwify');
      const isApproved = order.order_status === 'paid' || order.webhook_event_type === 'order_approved';
      const isRefunded = order.order_status === 'refunded' || order.webhook_event_type === 'order_refunded';

      if (isRefunded) {
        const existingSale = sales.find(s => s.externalSaleId === orderId || s.externalSaleId === order.order_ref);
        if (existingSale) {
          simulateRefund(existingSale.id);
        }
        return;
      }

      const productName = order.Product?.product_name || 'Produto Kiwify';
      const customerName = order.Customer?.full_name || order.Customer?.first_name || 'Cliente Kiwify';
      const customerDoc = order.Customer?.CPF || order.Customer?.cnpj || '000.000.000-00';
      const customerEmail = order.Customer?.email || 'cliente@kiwify.com.br';
      
      // Amount in Kiwify comes in cents (e.g. 3790 = R$ 37.90)
      const rawCharge = order.Commissions?.charge_amount || order.Commissions?.product_base_price || 3790;
      const amount = typeof rawCharge === 'number' && rawCharge > 500 ? rawCharge / 100 : Number(rawCharge) || 37.90;
      
      const paymentMethod = order.payment_method === 'pix' ? 'PIX' : order.payment_method === 'boleto' ? 'BOLETO' : 'CARTAO_CREDITO';
      const now = new Date();
      const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      
      const warrantyDays = platformConfig?.warrantyDays ?? 7;
      const warrantyDate = new Date();
      warrantyDate.setDate(warrantyDate.getDate() + warrantyDays);
      const formattedWarranty = `${warrantyDate.getFullYear()}-${String(warrantyDate.getMonth() + 1).padStart(2, '0')}-${String(warrantyDate.getDate()).padStart(2, '0')} 23:59:59`;

      const saleId = `sale_kw_${Date.now()}`;
      const invId = `inv_kw_${Date.now()}`;

      const isImmediate = platformConfig?.trigger === 'on_payment_approved';
      const invStatus: 'EMITIDA' | 'PENDENTE' = isImmediate ? 'EMITIDA' : 'PENDENTE';

      const newSale: Sale = {
        id: saleId,
        externalSaleId: order.order_ref || orderId,
        platform: 'kiwify',
        productName,
        productId: order.Product?.product_id || 'prod_kw',
        amount,
        paymentMethod,
        installments: order.installments || 1,
        status: 'approved',
        createdAt: order.created_at || formattedDate,
        paidAt: order.approved_date || formattedDate,
        warrantyExpiresAt: formattedWarranty,
        customer: {
          id: `cust_${Date.now()}`,
          name: customerName,
          document: customerDoc,
          email: customerEmail,
          city: 'São Paulo',
          state: 'SP',
        },
        invoiceId: invId,
        invoiceStatus: invStatus,
      };

      const taxes = calculateTaxes(amount, company);
      const invoiceNum = (20260000500 + invoices.length).toString();

      const newInvoice: FiscalInvoice = {
        id: invId,
        number: invoiceNum,
        series: '1',
        rpsNumber: (8500 + invoices.length).toString(),
        verificationCode: `VER-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        accessKey: `352610${company.cnpj.replace(/\D/g, '')}5500100000${invoiceNum}100918231`,
        saleId: saleId,
        platform: 'kiwify',
        model: 'NFS-e',
        status: invStatus,
        issuedAt: formattedDate,
        scheduledFor: isImmediate ? undefined : `${formattedWarranty} (Fim de Garantia)`,
        customer: newSale.customer,
        productName,
        description: `Licenciamento e acesso a plataforma de conteúdo digital: ${productName}`,
        serviceCode: company.serviceCode,
        cnae: company.cnaePrincipal,
        grossAmount: amount,
        netAmount: amount - taxes.totalTax,
        taxes,
        emailSent: isImmediate && !!platformConfig?.sendEmailToCustomer,
      };

      setSales(prev => [newSale, ...prev]);
      setInvoices(prev => [newInvoice, ...prev]);

      // Automatically enable Kiwify platform and update sales count
      updatePlatform('kiwify', {
        enabled: true,
        totalSalesProcessed: (platformConfig?.totalSalesProcessed || 0) + 1,
        lastSync: formattedDate,
      });
    } catch (err) {
      console.error('Erro ao processar webhook da Kiwify:', err);
    }
  };

  const syncKiwifySales = (): number => {
    const { sales: defaultSales, invoices: defaultInvoices } = generateInitialInvoices();
    let addedCount = 0;

    setSales(prev => {
      const existingRefs = new Set(prev.map(s => s.externalSaleId));
      const missing = defaultSales.filter(s => !existingRefs.has(s.externalSaleId));
      addedCount = missing.length;
      if (addedCount === 0) return prev;
      return [...missing, ...prev];
    });

    setInvoices(prev => {
      const existingSaleIds = new Set(prev.map(i => i.saleId));
      const missing = defaultInvoices.filter(i => !existingSaleIds.has(i.saleId));
      if (missing.length === 0) return prev;
      return [...missing, ...prev];
    });

    updatePlatform('kiwify', {
      enabled: true,
      totalSalesProcessed: 11,
      lastSync: '11/11/2026 13:14',
    });

    return addedCount;
  };

  const closeMonth = (year: number, month: number) => {
    const now = new Date();
    const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    setMonthlyClosings(prev =>
      prev.map(c => {
        if (c.year === year && c.month === month) {
          return {
            ...c,
            isClosed: true,
            closedAt: formattedDate,
          };
        }
        return c;
      })
    );
  };

  const resetToDefault = () => {
    localStorage.removeItem(STORAGE_KEYS.COMPANY);
    localStorage.removeItem(STORAGE_KEYS.PLATFORMS);
    localStorage.removeItem(STORAGE_KEYS.SALES);
    localStorage.removeItem(STORAGE_KEYS.INVOICES);
    localStorage.removeItem(STORAGE_KEYS.CLOSINGS);
    setCompany(initialCompanySettings);
    setPlatforms(initialPlatforms);
    const { sales, invoices } = generateInitialInvoices();
    setSales(sales);
    setInvoices(invoices);
    setMonthlyClosings(initialMonthlyClosings);
  };

  return (
    <FiscalContext.Provider
      value={{
        company,
        platforms,
        sales,
        invoices,
        monthlyClosings,
        currentView,
        setCurrentView,
        dateFilter,
        setDateFilter,
        selectedInvoiceForDanfe,
        setSelectedInvoiceForDanfe,
        selectedInvoiceForSoapLogs,
        setSelectedInvoiceForSoapLogs,
        selectedPlatformForModal,
        setSelectedPlatformForModal,
        isSimulatorOpen,
        setIsSimulatorOpen,
        isCompanyModalOpen,
        setIsCompanyModalOpen,
        updateCompany,
        updatePlatform,
        emitInvoice,
        emitBatchInvoices,
        transmitInvoiceDirect,
        cancelInvoice,
        simulateSale,
        simulateRefund,
        processKiwifyWebhook,
        syncKiwifySales,
        closeMonth,
        resetToDefault,
      }}
    >
      {children}
    </FiscalContext.Provider>
  );
};

export const useFiscal = () => {
  const context = useContext(FiscalContext);
  if (!context) {
    throw new Error('useFiscal must be used within a FiscalProvider');
  }
  return context;
};
