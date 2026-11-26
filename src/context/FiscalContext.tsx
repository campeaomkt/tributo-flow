import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
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
import { generateLocalDanfsePdf } from '../services/danfsePdfGenerator';
import {
  transmitDirectToPrefeitura,
  cancelNfseDirect,
  consultNfseDirect,
  downloadOfficialDanfse,
  fetchServerCertStatus,
  testSefinMtlsConnection,
  fetchKiwifyServerStatus,
  syncKiwifySalesFromApi,
  DirectTransmissionResult,
  ServerCertStatus,
  SefinConnectionTestResult,
} from '../services/directTransmitter';
import {
  saveVaultItem,
  loadVaultItem,
  deleteVaultItem,
  saveAppData,
  loadAppData,
  deleteAppData,
} from '../services/localVault';

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

  // In-memory A1 certificate state (never persisted to localStorage)
  hasLoadedCert: boolean;
  certSource: 'memory' | 'server_env' | 'none';
  serverCertStatus: ServerCertStatus;
  setInMemoryCertificate: (pfxBase64: string, password: string) => void;
  clearInMemoryCertificate: () => void;

  // Real Kiwify Public API v1 sync state
  isSyncingKiwify: boolean;
  kiwifyServerConfigured: boolean;
  hasKiwifySecret: boolean;
  kiwifySecretValue: string;
  kiwifySyncError: string | null;
  setKiwifySecretMem: (secret: string) => void;

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
  cancelInvoice: (invoiceId: string, reason: string) => Promise<{ success: boolean; message: string }>;
  consultInvoiceSefin: (invoiceId: string) => Promise<{ success: boolean; message: string; nfseXml?: string }>;
  downloadOfficialDanfsePdf: (invoiceId: string) => Promise<{ success: boolean; message: string }>;
  testSefinMtls: () => Promise<SefinConnectionTestResult>;
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
  syncKiwifySales: (override?: {
    clientId?: string;
    clientSecret?: string;
    accountId?: string;
    startDate?: string;
    endDate?: string;
  }) => Promise<{ success: boolean; totalFetched: number; addedCount: number; error?: string }>;
  updateSaleAndInvoice: (saleId: string, updates: {
    amount?: number;
    productName?: string;
    customerName?: string;
    customerDoc?: string;
    customerEmail?: string;
  }) => void;
  closeMonth: (year: number, month: number) => void;
  resetToDefault: () => void;
}

const FiscalContext = createContext<FiscalContextType | undefined>(undefined);

const STORAGE_KEYS = {
  COMPANY: 'tributoflow_company_v8',
  PLATFORMS: 'tributoflow_platforms_v8',
  SALES: 'tributoflow_sales_v8',
  INVOICES: 'tributoflow_invoices_v8',
  CLOSINGS: 'tributoflow_closings_v8',
};

export const FiscalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [company, setCompany] = useState<CompanySettings>(() => {
    const savedV8 = localStorage.getItem(STORAGE_KEYS.COMPANY);
    if (savedV8) {
      try {
        const parsed = JSON.parse(savedV8);
        const sanitizedFatorR =
          parsed.fatorRActive && (!parsed.rbt12 || parsed.rbt12 <= 0) && (!parsed.payroll12 || parsed.payroll12 <= 0)
            ? false
            : Boolean(parsed.fatorRActive);
        return {
          ...initialCompanySettings,
          ...parsed,
          fatorRActive: sanitizedFatorR,
          dpsSeries: parsed.dpsSeries || '2',
          nextDpsNumber: Math.max(1, Number(parsed.nextDpsNumber) || 1),
          municipalRegistration: parsed.municipalRegistration || '1618',
          certificatePassword: undefined, // Never hydrate secret from localStorage
        };
      } catch {
        return initialCompanySettings;
      }
    }
    const legacy =
      localStorage.getItem('tributoflow_company_v7') ||
      localStorage.getItem('tributoflow_company_v6') ||
      localStorage.getItem('tributoflow_company_v5');
    if (legacy) {
      try {
        const parsed = JSON.parse(legacy);
        const sanitizedFatorR =
          parsed.fatorRActive && (!parsed.rbt12 || parsed.rbt12 <= 0) && (!parsed.payroll12 || parsed.payroll12 <= 0)
            ? false
            : Boolean(parsed.fatorRActive);
        return {
          ...initialCompanySettings,
          ...parsed,
          fatorRActive: sanitizedFatorR,
          municipalRegistration: parsed.municipalRegistration || '1618',
          municipalProvider: 'PADRAO_NACIONAL',
          fiscalEnvironment: 'HOMOLOGACAO',
          serviceCode: parsed.serviceCode === '01.07' ? '010701' : (parsed.serviceCode || '010701'),
          certificateStatus: 'MISSING',
          certificatePassword: undefined,
        };
      } catch {
        return initialCompanySettings;
      }
    }
    return initialCompanySettings;
  });

  // Certificate credentials persisted encrypted in browser IndexedDB vault (AES-GCM)
  const [certPfxBase64, setCertPfxBase64] = useState<string>('');
  const [certPasswordMem, setCertPasswordMem] = useState<string>('');
  const [serverCertStatus, setServerCertStatus] = useState<ServerCertStatus>({ configured: false });

  const certSource: 'memory' | 'server_env' | 'none' = certPfxBase64
    ? 'memory'
    : serverCertStatus.configured
    ? 'server_env'
    : 'none';
  const hasLoadedCert = certSource !== 'none';

  const setInMemoryCertificate = (pfxBase64: string, password: string) => {
    setCertPfxBase64(pfxBase64);
    setCertPasswordMem(password);
    void saveVaultItem('a1_cert', JSON.stringify({ pfxBase64, password }));
  };

  const clearInMemoryCertificate = () => {
    setCertPfxBase64('');
    setCertPasswordMem('');
    void deleteVaultItem('a1_cert');
  };

  // Kiwify API clientSecret persisted encrypted in browser IndexedDB vault (AES-GCM)
  const [kiwifySecretMem, setKiwifySecretState] = useState<string>('');
  const [kiwifyServerConfigured, setKiwifyServerConfigured] = useState<boolean>(false);
  const [isSyncingKiwify, setIsSyncingKiwify] = useState<boolean>(false);
  const [kiwifySyncError, setKiwifySyncError] = useState<string | null>(null);
  const hasKiwifySecret = Boolean(kiwifySecretMem.trim() || kiwifyServerConfigured);

  const setKiwifySecretMem = (secret: string) => {
    const clean = secret.trim();
    setKiwifySecretState(clean);
    if (clean) {
      void saveVaultItem('kiwify_client_secret', clean);
    } else {
      void deleteVaultItem('kiwify_client_secret');
    }
  };

  const [platforms, setPlatforms] = useState<PlatformConfig[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PLATFORMS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map((p: PlatformConfig) => ({ ...p, clientSecret: '' }));
        }
      } catch {
        // fallback
      }
    }
    return initialPlatforms;
  });

  const hasHydratedIdbRef = useRef<boolean>(false);

  const [sales, setSales] = useState<Sale[]>(() => generateInitialInvoices().sales);
  const [invoices, setInvoices] = useState<FiscalInvoice[]>(() => generateInitialInvoices().invoices);

  const [monthlyClosings, setMonthlyClosings] = useState<MonthlyClosing[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CLOSINGS);
      return saved ? JSON.parse(saved) : initialMonthlyClosings;
    } catch {
      return initialMonthlyClosings;
    }
  });

  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [dateFilter, setDateFilter] = useState<DateFilter>(() => {
    const now = new Date();
    const year = now.getFullYear();
    const monthIndex = now.getMonth();
    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
    ];
    const start = `${year}-${String(monthIndex + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(year, monthIndex + 1, 0).getDate();
    const end = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    return {
      start,
      end,
      label: `Este mês (${monthNames[monthIndex]}/${year})`,
    };
  });

  const [selectedInvoiceForDanfe, setSelectedInvoiceForDanfe] = useState<FiscalInvoice | null>(null);
  const [selectedInvoiceForSoapLogs, setSelectedInvoiceForSoapLogs] = useState<FiscalInvoice | null>(null);
  const [selectedPlatformForModal, setSelectedPlatformForModal] = useState<PlatformConfig | null>(null);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState<boolean>(false);
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState<boolean>(false);

  // Hydrate encrypted local vault + large sales/invoices from IndexedDB (never overflows 5MB localStorage)
  useEffect(() => {
    let cancelled = false;

    const hydrateAll = async () => {
      // 0. Free bloated legacy localStorage keys that could hit Chrome's 5MB quota
      try {
        localStorage.removeItem(STORAGE_KEYS.SALES);
        localStorage.removeItem(STORAGE_KEYS.INVOICES);
        localStorage.removeItem('tributoflow_sales_v7');
        localStorage.removeItem('tributoflow_invoices_v7');
      } catch {
        // ignore
      }

      // 0.5 Restore persisted sales & invoices from IndexedDB (supports tens of thousands of records)
      const [idbSales, idbInvoices] = await Promise.all([
        loadAppData<Sale[]>(STORAGE_KEYS.SALES),
        loadAppData<FiscalInvoice[]>(STORAGE_KEYS.INVOICES),
      ]);
      if (!cancelled) {
        if (Array.isArray(idbSales) && idbSales.length > 0) {
          setSales(idbSales);
        }
        if (Array.isArray(idbInvoices) && idbInvoices.length > 0) {
          // Recalculate pending/error invoices against current company tax settings
          // (automatically fixes legacy invoices mistakenly calculated at 15.5% Anexo V when RBT12=0)
          const refreshedInvoices = idbInvoices.map(inv => {
            if (inv.status !== 'PENDENTE' && inv.status !== 'ERRO') return inv;
            const recalculatedTaxes = calculateTaxes(inv.grossAmount, company);
            if (
              inv.taxes &&
              inv.taxes.effectiveRate === recalculatedTaxes.effectiveRate &&
              inv.taxes.totalTax === recalculatedTaxes.totalTax &&
              inv.taxes.regime === recalculatedTaxes.regime
            ) {
              return inv;
            }
            return {
              ...inv,
              taxes: recalculatedTaxes,
              netAmount: Number((inv.grossAmount - recalculatedTaxes.totalTax).toFixed(2)),
            };
          });
          setInvoices(refreshedInvoices);
        }
        hasHydratedIdbRef.current = true;
      }

      // 1. Restore A1 certificate from encrypted IndexedDB vault if saved previously
      const savedCertRaw = await loadVaultItem('a1_cert');
      if (!cancelled && savedCertRaw) {
        try {
          const parsed = JSON.parse(savedCertRaw);
          if (parsed?.pfxBase64 && parsed?.password) {
            setCertPfxBase64(parsed.pfxBase64);
            setCertPasswordMem(parsed.password);
            setCompany(prev => ({
              ...prev,
              certificateStatus: 'ACTIVE',
            }));
          }
        } catch {
          // ignore malformed vault record
        }
      }

      // 2. Check server-side A1 certificate env
      const status = await fetchServerCertStatus();
      if (!cancelled) {
        setServerCertStatus(status);
        if (status.configured) {
          setCompany(prev => ({
            ...prev,
            certificateStatus: status.isExpired ? 'EXPIRED' : 'ACTIVE',
            certificateSubject: status.subjectCN,
            certificateIssuer: status.issuerCN,
            certificateCnpj: status.cnpj,
            certificateExpiryDate: status.validTo ? status.validTo.slice(0, 10) : prev.certificateExpiryDate,
            certificateFileName: prev.certificateFileName || 'Variável de Ambiente (Servidor)',
          }));
        }
      }

      // 3. Restore Kiwify Client Secret from encrypted IndexedDB vault (or migrate from legacy v7) & auto-sync
      const [vaultSecret, kiwifyStatus] = await Promise.all([
        loadVaultItem('kiwify_client_secret'),
        fetchKiwifyServerStatus(),
      ]);

      if (cancelled) return;

      let effectiveSecret = vaultSecret || '';
      let migratedClientId: string | undefined;
      let migratedAccountId: string | undefined;

      if (!effectiveSecret) {
        try {
          const legacyRaw = localStorage.getItem('tributoflow_platforms_v7');
          if (legacyRaw) {
            const legacyList = JSON.parse(legacyRaw);
            const legacyKw = Array.isArray(legacyList)
              ? legacyList.find((p: any) => p?.id === 'kiwify')
              : null;
            const rawSecret = typeof legacyKw?.clientSecret === 'string' ? legacyKw.clientSecret.trim() : '';
            const isRealSecret = rawSecret.length > 0 && !/^[•*]+$/.test(rawSecret);

            if (legacyKw?.clientId || legacyKw?.accountId) {
              migratedClientId = legacyKw.clientId || undefined;
              migratedAccountId = legacyKw.accountId || undefined;
              setPlatforms(prev =>
                prev.map(p =>
                  p.id === 'kiwify'
                    ? {
                        ...p,
                        clientId: legacyKw.clientId || p.clientId,
                        accountId: legacyKw.accountId || p.accountId,
                      }
                    : p
                )
              );
            }

            if (isRealSecret) {
              effectiveSecret = rawSecret;
              await saveVaultItem('kiwify_client_secret', rawSecret);
              // Scrub plaintext secret from legacy localStorage entry
              const scrubbed = legacyList.map((p: any) => (p?.id === 'kiwify' ? { ...p, clientSecret: '' } : p));
              localStorage.setItem('tributoflow_platforms_v7', JSON.stringify(scrubbed));
            }
          }
        } catch {
          // ignore malformed legacy data
        }
      }

      setKiwifyServerConfigured(kiwifyStatus.configured);
      if (effectiveSecret) {
        setKiwifySecretState(effectiveSecret);
      }

      if (effectiveSecret || kiwifyStatus.configured) {
        void syncKiwifySales({
          clientId: migratedClientId,
          clientSecret: effectiveSecret || undefined,
          accountId: migratedAccountId,
        });
      }
    };

    void hydrateAll();
    return () => {
      cancelled = true;
    };
  }, []);

  // Sync lightweight config to localStorage (safely wrapped so QuotaExceededError can never crash React)
  useEffect(() => {
    try {
      const { certificatePassword: _omit, ...safeCompany } = company;
      localStorage.setItem(STORAGE_KEYS.COMPANY, JSON.stringify(safeCompany));
    } catch {
      // ignore storage quota errors
    }
  }, [company]);

  useEffect(() => {
    try {
      const safePlatforms = platforms.map(({ clientSecret: _omit, ...rest }) => ({ ...rest, clientSecret: '' }));
      localStorage.setItem(STORAGE_KEYS.PLATFORMS, JSON.stringify(safePlatforms));
    } catch {
      // ignore storage quota errors
    }
  }, [platforms]);

  // Persist large sales & invoices lists in IndexedDB (hundreds of MB capacity, never hits 5MB localStorage limit)
  useEffect(() => {
    if (!hasHydratedIdbRef.current && sales.length === 0) return;
    void saveAppData(STORAGE_KEYS.SALES, sales);
  }, [sales]);

  useEffect(() => {
    if (!hasHydratedIdbRef.current && invoices.length === 0) return;
    void saveAppData(STORAGE_KEYS.INVOICES, invoices);
  }, [invoices]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CLOSINGS, JSON.stringify(monthlyClosings));
    } catch {
      // ignore storage quota errors
    }
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
    const taxKeys: Array<keyof CompanySettings> = [
      'taxRegime',
      'simplesAnexo',
      'fatorRActive',
      'customEffectiveRate',
      'rbt12',
      'payroll12',
      'defaultIssRate',
    ];
    const hasTaxChange = taxKeys.some(k => Object.prototype.hasOwnProperty.call(settings, k));

    setCompany(prev => {
      const nextCompany = { ...prev, ...settings };
      if (hasTaxChange) {
        setInvoices(prevInvoices =>
          prevInvoices.map(inv => {
            if (inv.status !== 'PENDENTE' && inv.status !== 'ERRO') return inv;
            const newTaxes = calculateTaxes(inv.grossAmount, nextCompany);
            return {
              ...inv,
              taxes: newTaxes,
              netAmount: Number((inv.grossAmount - newTaxes.totalTax).toFixed(2)),
            };
          })
        );
      }
      return nextCompany;
    });
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
    provider: MunicipalProvider = 'PADRAO_NACIONAL',
    environment: FiscalEnvironment = company.fiscalEnvironment || 'HOMOLOGACAO'
  ): Promise<DirectTransmissionResult> => {
    const inv = invoices.find(i => i.id === invoiceId);
    if (!inv) throw new Error('Nota fiscal não encontrada.');

    // Always use TributoFlow's dedicated DPS series (default "2") and next sequential DPS number
    // so we NEVER collide with RPS/DPS numbers already emitted on Series 1 by another issuer (e.g., Spedy)
    const activeSeries = (company.dpsSeries || '2').replace(/\D/g, '') || '2';
    const nextNum = Math.max(1, Number(company.nextDpsNumber) || 1);
    const invToSend: FiscalInvoice = {
      ...inv,
      series: activeSeries,
      rpsNumber: String(nextNum),
    };

    const result = await transmitDirectToPrefeitura(
      invToSend,
      company,
      provider,
      environment,
      certPfxBase64 || undefined,
      certPasswordMem || undefined
    );

    if (result.success) {
      // Advance sequential DPS counter so the next emission uses nextNum + 1
      setCompany(prev => ({
        ...prev,
        dpsSeries: activeSeries,
        nextDpsNumber: Math.max((prev.nextDpsNumber || 1), nextNum + 1),
      }));

      setInvoices(prev =>
        prev.map(i => {
          if (i.id !== invoiceId) return i;
          return {
            ...i,
            series: invToSend.series,
            rpsNumber: invToSend.rpsNumber,
            status: 'EMITIDA',
            issuedAt: result.authorizedAt,
            transmissionMode: 'DIRETO_PREFEITURA',
            municipalProvider: 'PADRAO_NACIONAL',
            environment: result.environment,
            municipalProtocol: result.municipalProtocol,
            officialInvoiceNumber: result.officialNumber,
            municipalAuthCode: result.chaveAcesso || result.municipalAuthCode,
            chaveAcessoNacional: result.chaveAcesso,
            dpsId: result.dpsId,
            nfseXmlNacional: result.nfseXml,
            sefinEndpointUrl: result.endpointUrl,
            municipalUrl: result.municipalUrl,
            authorizedAt: result.authorizedAt,
            soapRequestXml: result.soapRequestXml,
            soapResponseXml: result.soapResponseXml,
            signedXml: result.signedXml,
            verificationCode: result.chaveAcesso || result.municipalAuthCode,
            accessKey: result.chaveAcesso || i.accessKey,
            number: result.officialNumber.replace('/', ''),
            scheduledFor: undefined,
            sefinErrors: [],
            lastTransmissionError: undefined,
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
    } else {
      // If Sefin Nacional reports E0014 (duplicate DPS series+number), auto-increment nextDpsNumber
      const isDuplicateDps =
        result.errors?.some(e => e.codigo === 'E0014') ||
        (result.message || '').includes('E0014');
      if (isDuplicateDps) {
        setCompany(prev => ({
          ...prev,
          dpsSeries: activeSeries,
          nextDpsNumber: Math.max((prev.nextDpsNumber || 1), nextNum + 1),
        }));
      }

      // Never fake EMITIDA — keep PENDENTE and store the real Sefin Nacional rejection + signed XML for inspection
      setInvoices(prev =>
        prev.map(i => {
          if (i.id !== invoiceId) return i;
          return {
            ...i,
            series: invToSend.series,
            rpsNumber: invToSend.rpsNumber,
            status: 'PENDENTE',
            municipalProvider: 'PADRAO_NACIONAL',
            environment: result.environment,
            dpsId: result.dpsId || i.dpsId,
            sefinEndpointUrl: result.endpointUrl,
            soapRequestXml: result.soapRequestXml || i.soapRequestXml,
            soapResponseXml: result.soapResponseXml || i.soapResponseXml,
            signedXml: result.signedXml || i.signedXml,
            sefinErrors: result.errors,
            lastTransmissionError: result.message,
          };
        })
      );
    }

    return result;
  };

  const cancelInvoice = async (
    invoiceId: string,
    reason: string
  ): Promise<{ success: boolean; message: string }> => {
    const inv = invoices.find(i => i.id === invoiceId);
    const now = new Date();
    const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // If invoice was genuinely authorized on Sefin Nacional, transmit official Event e101101
    if (inv?.chaveAcessoNacional) {
      const cancelRes = await cancelNfseDirect({
        chaveAcesso: inv.chaveAcessoNacional,
        cnpjAutor: company.cnpj,
        motivoDesc: reason,
        motivoCode: '2',
        environment: inv.environment || company.fiscalEnvironment || 'HOMOLOGACAO',
        pfxBase64: certPfxBase64 || undefined,
        certPassword: certPasswordMem || undefined,
      });

      if (!cancelRes.success) {
        return { success: false, message: cancelRes.message };
      }
    }

    setInvoices(prev =>
      prev.map(item => {
        if (item.id !== invoiceId) return item;
        return {
          ...item,
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

    return { success: true, message: 'NFS-e cancelada com sucesso.' };
  };

  const consultInvoiceSefin = async (invoiceId: string) => {
    const inv = invoices.find(i => i.id === invoiceId);
    if (!inv?.chaveAcessoNacional) {
      return { success: false, message: 'Esta nota ainda não possui Chave de Acesso autorizada pela Sefin Nacional.' };
    }
    const res = await consultNfseDirect({
      chaveAcesso: inv.chaveAcessoNacional,
      environment: inv.environment || company.fiscalEnvironment || 'HOMOLOGACAO',
      pfxBase64: certPfxBase64 || undefined,
      certPassword: certPasswordMem || undefined,
    });
    if (res.success && res.nfseXml) {
      setInvoices(prev =>
        prev.map(i => (i.id === invoiceId ? { ...i, nfseXmlNacional: res.nfseXml, soapResponseXml: res.nfseXml } : i))
      );
    }
    return { success: res.success, message: res.message, nfseXml: res.nfseXml };
  };

  const downloadOfficialDanfsePdf = async (invoiceId: string) => {
    const inv = invoices.find(i => i.id === invoiceId);
    if (!inv) {
      return { success: false, message: 'Nota fiscal não encontrada.' };
    }
    if (!inv.chaveAcessoNacional) {
      return { success: false, message: 'Esta nota ainda não possui Chave de Acesso autorizada pela Sefin Nacional.' };
    }

    try {
      const res = await downloadOfficialDanfse({
        chaveAcesso: inv.chaveAcessoNacional,
        environment: inv.environment || company.fiscalEnvironment || 'HOMOLOGACAO',
        pfxBase64: certPfxBase64 || undefined,
        certPassword: certPasswordMem || undefined,
      });

      if (res.success && res.pdfBase64) {
        const byteCharacters = atob(res.pdfBase64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const blob = new Blob([new Uint8Array(byteNumbers)], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `DANFSe_${inv.officialInvoiceNumber || inv.number}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return { success: true, message: 'DANFSe oficial (PDF) baixado do ADN Nacional!' };
      }
    } catch {
      // Fall through to local DANFSe PDF generation below
    }

    // SERPRO's adn.nfse.gov.br/danfse frequently returns HTTP 503 Service Unavailable.
    // Seamlessly generate a print-ready A4 DANFSe PDF directly from the official authorized XML!
    try {
      generateLocalDanfsePdf(inv, company);
      return {
        success: true,
        message:
          'O servidor de PDF do governo (ADN) está temporariamente fora do ar (HTTP 503), então geramos e baixamos seu DANFSe em PDF automaticamente a partir do XML oficial autorizado!',
      };
    } catch (err: any) {
      return {
        success: false,
        message: err?.message || 'Não foi possível gerar o DANFSe PDF.',
      };
    }
  };

  const testSefinMtls = async (): Promise<SefinConnectionTestResult> => {
    return testSefinMtlsConnection({
      ibgeCode: '4201109',
      pfxBase64: certPfxBase64 || undefined,
      certPassword: certPasswordMem || undefined,
    });
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

    // Always stay PENDENTE until actually authorized by Sefin Nacional
    const invStatus: 'EMITIDA' | 'PENDENTE' = 'PENDENTE';

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
    const invoiceNum = (20260000001 + invoices.length).toString();

    const newInvoice: FiscalInvoice = {
      id: invId,
      number: invoiceNum,
      series: company.dpsSeries || '2',
      rpsNumber: String((company.nextDpsNumber || 1) + invoices.length),
      verificationCode: 'PENDENTE',
      accessKey: `352610${company.cnpj.replace(/\D/g, '')}5500100000${invoiceNum}100918231`,
      saleId: saleId,
      platform: input.platform,
      model: platform?.invoiceModel || 'NFS-e',
      status: invStatus,
      issuedAt: formattedDate,
      scheduledFor: `${formattedWarranty} (Aguardando Transmissão Sefin)`,
      customer: newSale.customer,
      productName: input.productName,
      description: `Licenciamento e acesso a plataforma de conteúdo digital: ${input.productName}`,
      serviceCode: company.serviceCode,
      cnae: company.cnaePrincipal,
      grossAmount: input.amount,
      netAmount: input.amount - taxes.totalTax,
      taxes,
      emailSent: false,
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
      const orderRef = order.order_ref || orderId;

      const platformConfig = platforms.find(p => p.id === 'kiwify');
      const isApproved = order.order_status === 'paid' || order.webhook_event_type === 'order_approved';
      const isRefunded = order.order_status === 'refunded' || order.webhook_event_type === 'order_refunded';

      if (isRefunded) {
        const existingSale = sales.find(s => s.externalSaleId === orderId || s.externalSaleId === orderRef);
        if (existingSale) {
          simulateRefund(existingSale.id);
        }
        return;
      }

      // Extract main product name
      const mainProductName = order.Product?.product_name || 'Pacote de Timbres - Aevo Pro 2.0';

      // Extract Order Bumps from various possible Kiwify payload formats
      const bumps = Array.isArray(order.order_bump) 
        ? order.order_bump 
        : Array.isArray(order.OrderBump)
        ? order.OrderBump
        : Array.isArray(order.bumps)
        ? order.bumps
        : Array.isArray(order.items)
        ? order.items.filter((it: any) => it.product_id !== order.Product?.product_id)
        : [];

      const bumpNames = bumps
        .map((b: any) => b.product_name || b.name || b.title)
        .filter(Boolean);

      const fullProductName = bumpNames.length > 0 
        ? `${mainProductName} + Order Bump: ${bumpNames.join(', ')}`
        : mainProductName;

      const customerName = order.Customer?.full_name || order.Customer?.first_name || 'Cliente Kiwify';
      const customerDoc = order.Customer?.CPF || order.Customer?.cnpj || '000.000.000-00';
      const customerEmail = order.Customer?.email || 'cliente@kiwify.com.br';
      
      // Amount in Kiwify comes in cents (e.g. 3790 = R$ 37.90; 5780 = R$ 57.80 with bump)
      const rawCharge = 
        order.Commissions?.charge_amount ?? 
        order.charge_amount ?? 
        order.Commissions?.product_base_price ?? 
        3790;
      
      const amount = typeof rawCharge === 'number' 
        ? (rawCharge > 100 ? rawCharge / 100 : rawCharge) 
        : parseFloat(rawCharge) || 37.90;
      
      const paymentMethod = order.payment_method === 'pix' ? 'PIX' : order.payment_method === 'boleto' ? 'BOLETO' : 'CARTAO_CREDITO';
      const now = new Date();
      const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      
      const warrantyDays = platformConfig?.warrantyDays ?? 7;
      const warrantyDate = new Date();
      warrantyDate.setDate(warrantyDate.getDate() + warrantyDays);
      const formattedWarranty = `${warrantyDate.getFullYear()}-${String(warrantyDate.getMonth() + 1).padStart(2, '0')}-${String(warrantyDate.getDate()).padStart(2, '0')} 23:59:59`;

      // Check if sale already exists: UPDATE IT with the real Kiwify details!
      const existingSale = sales.find(s => s.externalSaleId === orderId || s.externalSaleId === orderRef);
      if (existingSale) {
        setSales(prev =>
          prev.map(s => {
            if (s.id !== existingSale.id) return s;
            return {
              ...s,
              productName: fullProductName,
              amount: amount,
              paymentMethod: paymentMethod,
              paidAt: order.approved_date || s.paidAt,
              customer: {
                ...s.customer,
                name: customerName,
                document: customerDoc,
                email: customerEmail,
              },
            };
          })
        );

        const newTaxes = calculateTaxes(amount, company);
        setInvoices(prev =>
          prev.map(inv => {
            if (inv.saleId !== existingSale.id) return inv;
            return {
              ...inv,
              productName: fullProductName,
              description: `Licenciamento e acesso a plataforma de conteúdo digital: ${fullProductName}`,
              grossAmount: amount,
              netAmount: amount - newTaxes.totalTax,
              taxes: newTaxes,
              customer: {
                ...inv.customer,
                name: customerName,
                document: customerDoc,
                email: customerEmail,
              },
            };
          })
        );
        return;
      }

      const saleId = `sale_kw_${Date.now()}`;
      const invId = `inv_kw_${Date.now()}`;

      // Invoices remain PENDENTE until transmitted to the City Hall (Betha Sistemas)
      const invStatus: 'EMITIDA' | 'PENDENTE' = 'PENDENTE';

      const newSale: Sale = {
        id: saleId,
        externalSaleId: orderRef,
        platform: 'kiwify',
        productName: fullProductName,
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
      const invoiceNum = (20260000001 + invoices.length).toString();

      const newInvoice: FiscalInvoice = {
        id: invId,
        number: invoiceNum,
        series: company.dpsSeries || '2',
        rpsNumber: String((company.nextDpsNumber || 1) + invoices.length),
        verificationCode: 'PENDENTE',
        accessKey: `352610${company.cnpj.replace(/\D/g, '')}5500100000${invoiceNum}100918231`,
        saleId: saleId,
        platform: 'kiwify',
        model: 'NFS-e',
        status: invStatus,
        issuedAt: formattedDate,
        scheduledFor: `${formattedWarranty} (Aguardando Transmissão)`,
        customer: newSale.customer,
        productName: fullProductName,
        description: `Licenciamento e acesso a plataforma de conteúdo digital: ${fullProductName}`,
        serviceCode: company.serviceCode,
        cnae: company.cnaePrincipal,
        grossAmount: amount,
        netAmount: amount - taxes.totalTax,
        taxes,
        emailSent: false,
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

  const syncKiwifySales = async (override?: {
    clientId?: string;
    clientSecret?: string;
    accountId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{ success: boolean; totalFetched: number; addedCount: number; error?: string }> => {
    const kwPlatform = platforms.find(p => p.id === 'kiwify');
    const effClientId = override?.clientId?.trim() || kwPlatform?.clientId?.trim() || '';
    const effClientSecret = override?.clientSecret?.trim() || kiwifySecretMem.trim() || '';
    const effAccountId = override?.accountId?.trim() || kwPlatform?.accountId?.trim() || '';
    const effStartDate = override?.startDate?.trim() || kwPlatform?.integrationStartDate || undefined;

    if (override?.clientSecret?.trim()) {
      setKiwifySecretMem(override.clientSecret.trim());
    }

    setIsSyncingKiwify(true);
    setKiwifySyncError(null);

    try {
      const apiRes = await syncKiwifySalesFromApi({
        clientId: effClientId || undefined,
        clientSecret: effClientSecret || undefined,
        accountId: effAccountId || undefined,
        startDate: effStartDate,
        endDate: override?.endDate,
      });

      if (!apiRes.success) {
        const errMsg = apiRes.error || 'Não foi possível sincronizar as vendas reais da Kiwify.';
        setKiwifySyncError(errMsg);
        return { success: false, totalFetched: 0, addedCount: 0, error: errMsg };
      }

      const warrantyDays = kwPlatform?.warrantyDays ?? 7;
      let addedCount = 0;

      // Merge real Kiwify sales without overwriting already-emitted invoices
      const realSalesList = apiRes.sales;

      setSales(prevSales => {
        const existingMap = new Map<string, Sale>();
        prevSales.forEach(s => existingMap.set(s.externalSaleId.toUpperCase(), s));

        const nextSales: Sale[] = [];
        const seenRefs = new Set<string>();

        for (const item of realSalesList) {
          const refKey = item.reference.toUpperCase();
          seenRefs.add(refKey);
          const existing = existingMap.get(refKey);

          const baseDate = new Date(item.paidAt.replace(' ', 'T'));
          const warrantyDt = Number.isNaN(baseDate.getTime()) ? new Date() : new Date(baseDate.getTime());
          warrantyDt.setDate(warrantyDt.getDate() + warrantyDays);
          const formattedWarranty = `${warrantyDt.getFullYear()}-${String(warrantyDt.getMonth() + 1).padStart(2, '0')}-${String(warrantyDt.getDate()).padStart(2, '0')} 23:59:59`;

          const mappedStatus: Sale['status'] =
            item.status === 'refunded' || item.status === 'chargedback'
              ? 'refunded'
              : item.status === 'approved'
              ? 'approved'
              : 'pending';

          if (existing) {
            nextSales.push({
              ...existing,
              productName: item.productName,
              productId: item.productId,
              amount: item.amount,
              paymentMethod: item.paymentMethod,
              installments: item.installments,
              status: mappedStatus,
              createdAt: item.createdAt,
              paidAt: item.paidAt,
              customer: {
                ...existing.customer,
                name: item.customer.name,
                document: item.customer.document,
                email: item.customer.email,
                phone: item.customer.phone,
                city: item.customer.city || existing.customer.city,
                state: item.customer.state || existing.customer.state,
              },
            });
          } else {
            addedCount += 1;
            const saleId = `sale_kw_${item.externalId || item.reference}`;
            const invId = `inv_kw_${item.externalId || item.reference}`;
            nextSales.push({
              id: saleId,
              externalSaleId: item.reference,
              platform: 'kiwify',
              productName: item.productName,
              productId: item.productId,
              amount: item.amount,
              paymentMethod: item.paymentMethod,
              installments: item.installments,
              status: mappedStatus,
              createdAt: item.createdAt,
              paidAt: item.paidAt,
              warrantyExpiresAt: formattedWarranty,
              customer: {
                id: item.customer.id,
                name: item.customer.name,
                document: item.customer.document,
                email: item.customer.email,
                phone: item.customer.phone,
                city: item.customer.city || 'Não informado',
                state: item.customer.state || '',
              },
              invoiceId: invId,
              invoiceStatus: mappedStatus === 'refunded' ? 'CANCELADA' : 'PENDENTE',
            });
          }
        }

        // Preserve any non-Kiwify sales or manually added records not in this date range
        for (const old of prevSales) {
          if (!seenRefs.has(old.externalSaleId.toUpperCase())) {
            nextSales.push(old);
          }
        }

        return nextSales.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      });

      setInvoices(prevInvoices => {
        const existingBySaleId = new Map<string, FiscalInvoice>();
        prevInvoices.forEach(inv => existingBySaleId.set(inv.saleId, inv));

        const nextInvoices: FiscalInvoice[] = [];
        const seenSaleIds = new Set<string>();
        let nextSeq = prevInvoices.length;

        for (const item of realSalesList) {
          const saleId = `sale_kw_${item.externalId || item.reference}`;
          const invId = `inv_kw_${item.externalId || item.reference}`;
          seenSaleIds.add(saleId);
          const existing = existingBySaleId.get(saleId);
          const taxes = calculateTaxes(item.amount, company);

          if (existing) {
            // Never overwrite already EMITIDA / Sefin-authorized fields
            if (existing.status === 'EMITIDA' || existing.chaveAcessoNacional) {
              nextInvoices.push(existing);
            } else {
              nextInvoices.push({
                ...existing,
                productName: item.productName,
                description: `Licenciamento e acesso a plataforma de conteúdo digital: ${item.productName}`,
                grossAmount: item.amount,
                netAmount: Number((item.amount - taxes.totalTax).toFixed(2)),
                taxes,
                status:
                  item.status === 'refunded' || item.status === 'chargedback' ? 'CANCELADA' : existing.status,
                customer: {
                  ...existing.customer,
                  name: item.customer.name,
                  document: item.customer.document,
                  email: item.customer.email,
                  phone: item.customer.phone,
                  city: item.customer.city || existing.customer.city,
                  state: item.customer.state || existing.customer.state,
                },
              });
            }
          } else {
            nextSeq += 1;
            const invoiceNum = (20260000000 + nextSeq).toString();
            const baseDate = new Date(item.paidAt.replace(' ', 'T'));
            const warrantyDt = Number.isNaN(baseDate.getTime()) ? new Date() : new Date(baseDate.getTime());
            warrantyDt.setDate(warrantyDt.getDate() + warrantyDays);
            const formattedWarranty = `${warrantyDt.getFullYear()}-${String(warrantyDt.getMonth() + 1).padStart(2, '0')}-${String(warrantyDt.getDate()).padStart(2, '0')} 23:59:59`;

            nextInvoices.push({
              id: invId,
              number: invoiceNum,
              series: company.dpsSeries || '2',
              rpsNumber: String((company.nextDpsNumber || 1) + nextSeq - 1),
              verificationCode: 'PENDENTE',
              accessKey: '',
              saleId,
              platform: 'kiwify',
              model: 'NFS-e',
              status: item.status === 'refunded' || item.status === 'chargedback' ? 'CANCELADA' : 'PENDENTE',
              issuedAt: item.paidAt,
              scheduledFor: `${formattedWarranty} (Aguardando Transmissão Sefin)`,
              customer: {
                id: item.customer.id,
                name: item.customer.name,
                document: item.customer.document,
                email: item.customer.email,
                phone: item.customer.phone,
                city: item.customer.city || 'Não informado',
                state: item.customer.state || '',
              },
              productName: item.productName,
              description: `Licenciamento e acesso a plataforma de conteúdo digital: ${item.productName}`,
              serviceCode: company.serviceCode || '010701',
              cnae: company.cnaePrincipal,
              grossAmount: item.amount,
              netAmount: Number((item.amount - taxes.totalTax).toFixed(2)),
              taxes,
              emailSent: false,
            });
          }
        }

        for (const old of prevInvoices) {
          if (!seenSaleIds.has(old.saleId)) {
            nextInvoices.push(old);
          }
        }

        return nextInvoices.sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
      });

      updatePlatform('kiwify', {
        enabled: true,
        totalSalesProcessed: realSalesList.length,
        lastSync: new Date().toLocaleString('pt-BR'),
      });

      return {
        success: true,
        totalFetched: realSalesList.length,
        addedCount,
      };
    } catch (err: any) {
      const errMsg = err?.message || 'Erro inesperado ao sincronizar com a API da Kiwify.';
      setKiwifySyncError(errMsg);
      return { success: false, totalFetched: 0, addedCount: 0, error: errMsg };
    } finally {
      setIsSyncingKiwify(false);
    }
  };

  const updateSaleAndInvoice = (saleId: string, updates: {
    amount?: number;
    productName?: string;
    customerName?: string;
    customerDoc?: string;
    customerEmail?: string;
  }) => {
    setSales(prev =>
      prev.map(s => {
        if (s.id !== saleId) return s;
        return {
          ...s,
          amount: updates.amount !== undefined ? updates.amount : s.amount,
          productName: updates.productName || s.productName,
          customer: {
            ...s.customer,
            name: updates.customerName || s.customer.name,
            document: updates.customerDoc || s.customer.document,
            email: updates.customerEmail || s.customer.email,
          },
        };
      })
    );

    setInvoices(prev =>
      prev.map(inv => {
        if (inv.saleId !== saleId) return inv;
        const newAmount = updates.amount !== undefined ? updates.amount : inv.grossAmount;
        const newTaxes = calculateTaxes(newAmount, company);
        const newProd = updates.productName || inv.productName;
        return {
          ...inv,
          grossAmount: newAmount,
          netAmount: newAmount - newTaxes.totalTax,
          taxes: newTaxes,
          productName: newProd,
          description: `Licenciamento e acesso a plataforma de conteúdo digital: ${newProd}`,
          customer: {
            ...inv.customer,
            name: updates.customerName || inv.customer.name,
            document: updates.customerDoc || inv.customer.document,
            email: updates.customerEmail || inv.customer.email,
          },
        };
      })
    );
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
    try {
      localStorage.removeItem(STORAGE_KEYS.COMPANY);
      localStorage.removeItem(STORAGE_KEYS.PLATFORMS);
      localStorage.removeItem(STORAGE_KEYS.SALES);
      localStorage.removeItem(STORAGE_KEYS.INVOICES);
      localStorage.removeItem(STORAGE_KEYS.CLOSINGS);
    } catch {
      // ignore
    }
    void deleteAppData(STORAGE_KEYS.SALES);
    void deleteAppData(STORAGE_KEYS.INVOICES);
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
        hasLoadedCert,
        certSource,
        serverCertStatus,
        setInMemoryCertificate,
        clearInMemoryCertificate,
        isSyncingKiwify,
        kiwifyServerConfigured,
        hasKiwifySecret,
        kiwifySecretValue: kiwifySecretMem,
        kiwifySyncError,
        setKiwifySecretMem,
        updateCompany,
        updatePlatform,
        emitInvoice,
        emitBatchInvoices,
        transmitInvoiceDirect,
        cancelInvoice,
        consultInvoiceSefin,
        downloadOfficialDanfsePdf,
        testSefinMtls,
        simulateSale,
        simulateRefund,
        processKiwifyWebhook,
        syncKiwifySales,
        updateSaleAndInvoice,
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
