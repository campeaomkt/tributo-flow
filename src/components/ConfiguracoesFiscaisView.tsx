import React, { useState } from 'react';
import { useFiscal } from '../context/FiscalContext';
import { TaxRegime, MunicipalProvider, FiscalEnvironment } from '../types';
import {
  Building2,
  ShieldCheck,
  Calculator,
  Save,
  Check,
  HelpCircle,
  FileBadge,
  Sparkles,
  Info,
  Upload,
  AlertTriangle,
  Trash2,
  Eye,
  EyeOff,
  Lock,
  KeyRound,
  Zap,
  Server,
  Loader2,
  Activity,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { validatePfxCertificate, SefinConnectionTestResult } from '../services/directTransmitter';

export const ConfiguracoesFiscaisView: React.FC = () => {
  const {
    company,
    updateCompany,
    setIsCompanyModalOpen,
    hasLoadedCert,
    certSource,
    setInMemoryCertificate,
    clearInMemoryCertificate,
    testSefinMtls,
  } = useFiscal();

  const [taxRegime, setTaxRegime] = useState<TaxRegime>(company.taxRegime);
  const [simplesAnexo, setSimplesAnexo] = useState(company.simplesAnexo);
  const [fatorRActive, setFatorRActive] = useState(company.fatorRActive);
  const [rbt12, setRbt12] = useState(company.rbt12.toString());
  const [payroll12, setPayroll12] = useState(company.payroll12.toString());
  const [defaultIssRate, setDefaultIssRate] = useState(company.defaultIssRate.toString());
  const [serviceCode, setServiceCode] = useState(company.serviceCode || '010701');
  const [cnaePrincipal, setCnaePrincipal] = useState(company.cnaePrincipal);
  const [corporateName, setCorporateName] = useState(company.corporateName);
  const [cnpj, setCnpj] = useState(company.cnpj);
  const [municipalRegistration, setMunicipalRegistration] = useState(company.municipalRegistration || '1618');
  const [accountantName, setAccountantName] = useState(company.accountantName);
  const [accountantEmail, setAccountantEmail] = useState(company.accountantEmail);
  const [municipalProvider, setMunicipalProvider] = useState<MunicipalProvider>(company.municipalProvider || 'PADRAO_NACIONAL');
  const [fiscalEnvironment, setFiscalEnvironment] = useState<FiscalEnvironment>(company.fiscalEnvironment || 'HOMOLOGACAO');

  const [savedSuccess, setSavedSuccess] = useState(false);

  const [certPassword, setCertPassword] = useState('');
  const [certFileName, setCertFileName] = useState(company.certificateFileName || '');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileBase64, setSelectedFileBase64] = useState<string>('');
  const [isValidatingCert, setIsValidatingCert] = useState(false);
  const [showCertPassword, setShowCertPassword] = useState(false);
  const [certFeedback, setCertFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isTestingMtls, setIsTestingMtls] = useState(false);
  const [mtlsResult, setMtlsResult] = useState<SefinConnectionTestResult | null>(null);

  const handleTestMtlsConnection = async () => {
    setIsTestingMtls(true);
    setMtlsResult(null);
    try {
      const res = await testSefinMtls();
      setMtlsResult(res);
    } catch (err: any) {
      setMtlsResult({
        success: false,
        error: err?.message || 'Erro inesperado ao testar conexão mTLS.',
      });
    } finally {
      setIsTestingMtls(false);
    }
  };

  // Calculate live Fator R
  const numRbt12 = parseFloat(rbt12) || 0;
  const numPayroll = parseFloat(payroll12) || 0;
  const liveFatorR = numRbt12 > 0 ? ((numPayroll / numRbt12) * 100).toFixed(1) : '0';
  const isFatorRBenefited = parseFloat(liveFatorR) >= 28.0;

  const handleSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setCertFileName(file.name);
      const reader = new FileReader();
      reader.onload = () => {
        const result = typeof reader.result === 'string' ? reader.result : '';
        const b64 = result.includes(',') ? result.split(',').pop() || '' : result;
        setSelectedFileBase64(b64);
        setCertFeedback({
          type: 'success',
          message: `Arquivo "${file.name}" lido! Agora digite a senha do certificado e clique em "Instalar & Validar" para autenticar a chave privada.`,
        });
      };
      reader.onerror = () => {
        setCertFeedback({
          type: 'error',
          message: 'Não foi possível ler o arquivo selecionado. Tente selecionar o .pfx novamente.',
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleInstallCertificate = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveFileName = selectedFile ? selectedFile.name : certFileName;

    if (!selectedFileBase64) {
      setCertFeedback({
        type: 'error',
        message: 'Por favor, selecione o arquivo do certificado digital (.pfx ou .p12) do seu computador.',
      });
      return;
    }

    if (!certPassword || certPassword.trim().length === 0) {
      setCertFeedback({
        type: 'error',
        message: 'A senha do certificado é obrigatória para descriptografar a chave privada A1.',
      });
      return;
    }

    setIsValidatingCert(true);
    setCertFeedback(null);
    try {
      const validation = await validatePfxCertificate(selectedFileBase64, certPassword);
      if (!validation.success) {
        setCertFeedback({
          type: 'error',
          message: validation.error || 'Falha ao validar certificado .pfx ou senha incorreta.',
        });
        return;
      }

      if (validation.isExpired) {
        setCertFeedback({
          type: 'error',
          message: `Este certificado está EXPIRADO desde ${validation.validTo?.slice(0, 10)}. Utilize um Certificado A1 válido.`,
        });
        return;
      }

      // Store binary + password strictly in memory (never in localStorage)
      setInMemoryCertificate(selectedFileBase64, certPassword);

      updateCompany({
        certificateStatus: 'ACTIVE',
        certificateFileName: effectiveFileName,
        certificateSubject: validation.subjectCN,
        certificateIssuer: validation.issuerCN,
        certificateCnpj: validation.cnpj,
        certificateExpiryDate: validation.validTo ? validation.validTo.slice(0, 10) : '',
      });

      setCertPassword('');
      setCertFeedback({
        type: 'success',
        message: `Certificado ICP-Brasil validado com sucesso! Titular: ${validation.subjectCN} • Válido até ${validation.validTo?.slice(0, 10)}.`,
      });
    } catch (err: any) {
      setCertFeedback({
        type: 'error',
        message: err?.message || 'Erro ao comunicar com o servidor para validar o certificado.',
      });
    } finally {
      setIsValidatingCert(false);
    }
  };

  const handleRemoveCert = () => {
    setCertFileName('');
    setCertPassword('');
    setSelectedFile(null);
    setSelectedFileBase64('');
    clearInMemoryCertificate();
    updateCompany({
      certificateStatus: 'MISSING',
      certificateExpiryDate: '',
      certificateFileName: '',
      certificateSubject: '',
      certificateIssuer: '',
      certificateCnpj: '',
    });
    setCertFeedback({
      type: 'error',
      message: 'Certificado A1 removido da memória.',
    });
    setTimeout(() => setCertFeedback(null), 3500);
  };

  const handleSave = () => {
    updateCompany({
      taxRegime,
      simplesAnexo,
      fatorRActive,
      rbt12: numRbt12,
      payroll12: numPayroll,
      defaultIssRate: parseFloat(defaultIssRate) || 2.9,
      serviceCode,
      cnaePrincipal,
      corporateName,
      cnpj,
      municipalRegistration,
      accountantName,
      accountantEmail,
      municipalProvider,
      fiscalEnvironment,
    });

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Regimes Tributários & Parâmetros Fiscais</h1>
          <p className="text-xs text-slate-500">
            Configure seu enquadramento tributário (Simples Nacional, Fator R, Lucro Presumido, MEI) e regras de apuração automática
          </p>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2c0853] hover:bg-[#3d0b72] text-white font-bold text-xs shadow-md transition-all"
        >
          {savedSuccess ? <Check className="w-4 h-4 text-emerald-300" /> : <Save className="w-4 h-4" />}
          <span>{savedSuccess ? 'Salvo com sucesso!' : 'Salvar Alterações'}</span>
        </button>
      </div>

      {/* Clarification Banner: Padrão Nacional NFS-e (Sefin Nacional) */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-purple-900 text-white rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex items-center gap-2.5">
          <span className="p-2 rounded-xl bg-white/10 text-cyan-300">
            <HelpCircle className="w-5 h-5" />
          </span>
          <div>
            <h3 className="font-bold text-sm">Emissão Oficial pelo Padrão Nacional da NFS-e (Sefin Nacional)</h3>
            <p className="text-xs text-blue-200">Obrigatório para ME e EPP do Simples Nacional desde 01/11/2026 (Resolução CGSN nº 191/2026):</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 text-xs">
          <div className="p-3.5 rounded-xl bg-white/10 border border-white/10 space-y-1">
            <p className="font-bold text-cyan-300">1. Envio Direto via API REST mTLS</p>
            <p className="text-blue-100 text-[11px] leading-relaxed">
              O TributoFlow gera o XML da <strong>DPS</strong>, assina com <strong>XMLDSig RSA-SHA256</strong> usando seu Certificado A1, compacta em GZip+Base64 e envia direto à <strong>Sefin Nacional</strong>.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-white/10 border border-white/10 space-y-1">
            <p className="font-bold text-pink-300">2. Produção Restrita (Testes Reais)</p>
            <p className="text-blue-100 text-[11px] leading-relaxed">
              Teste tudo no servidor oficial de homologação (<code>sefin.producaorestrita.nfse.gov.br</code>) sem gerar imposto ou valor fiscal antes de virar para Produção.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-white/10 border border-white/10 space-y-1">
            <p className="font-bold text-emerald-300">3. Anitápolis/SC + Receita Federal</p>
            <p className="text-blue-100 text-[11px] leading-relaxed">
              Município IBGE <strong>4201109</strong> • Inscrição Municipal <strong>{company.municipalRegistration || '1618'}</strong>. As notas autorizadas aparecem automaticamente no <strong>nfse.gov.br</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* Dados da Empresa Summary Card matching user print */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center border border-purple-200">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-800 text-base">Dados da Empresa</h2>
              <p className="text-xs text-slate-500">Informações cadastrais e fiscais da pessoa jurídica emissora</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsCompanyModalOpen(true)}
            className="px-4 py-2 rounded-full bg-[#2c0853] hover:bg-[#3d0b72] text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <span>Editar Dados da Empresa</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400">Razão Social & Fantasia</span>
            <p className="font-bold text-slate-900">{company.corporateName}</p>
            <p className="text-slate-600 font-medium">{company.tradeName || 'CAMPEAO NEGOCIOS DIGITIAS'}</p>
            <p className="text-slate-500 text-[11px]">CNPJ: {company.cnpj}</p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400">Regimes e Inscrições</span>
            <p className="font-bold text-slate-900">CRT: {company.crt || 'Simples Nacional'}</p>
            <p className="text-slate-600 text-[11px] truncate" title={company.specialRegime}>
              {company.specialRegime || 'Microempresário e Empresa de Pequeno Porte (ME EPP)'}
            </p>
            <p className="text-slate-500 text-[11px]">
              IE: {company.stateRegistration || '264108787'} • IM: <strong>{company.municipalRegistration || '1618'}</strong>
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400">Endereço & Contato</span>
            <p className="font-bold text-slate-900">
              {company.address?.street}, {company.address?.number}
            </p>
            <p className="text-slate-600 text-[11px]">
              {company.address?.neighborhood} - {company.address?.city}/{company.address?.state} - CEP {company.address?.zipCode}
            </p>
            <p className="text-slate-500 text-[11px] truncate">
              {company.email || 'campeao.mkt.user@gmail.com'} • {company.mobile || '(69) 99265-3785'}
            </p>
          </div>
        </div>
      </div>

      {/* Tax Regime Selector Cards */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-slate-800 text-base">Regime Tributário Vigente</h2>
            <p className="text-xs text-slate-500">O TributoFlow calcula a retenção e alíquota de cada venda de acordo com esta escolha</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Simples Nacional */}
          <div
            onClick={() => setTaxRegime('SIMPLES_NACIONAL')}
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
              taxRegime === 'SIMPLES_NACIONAL'
                ? 'border-purple-600 bg-purple-50/50 shadow-xs'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-sm text-slate-900">Simples Nacional</span>
              <input
                type="radio"
                checked={taxRegime === 'SIMPLES_NACIONAL'}
                onChange={() => setTaxRegime('SIMPLES_NACIONAL')}
                className="text-purple-600"
              />
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Guia única DAS. Alíquotas progressivas com Fator R inteligente (Anexo III e V). Mais usado por infoprodutores.
            </p>
          </div>

          {/* Lucro Presumido */}
          <div
            onClick={() => setTaxRegime('LUCRO_PRESUMIDO')}
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
              taxRegime === 'LUCRO_PRESUMIDO'
                ? 'border-purple-600 bg-purple-50/50 shadow-xs'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-sm text-slate-900">Lucro Presumido</span>
              <input
                type="radio"
                checked={taxRegime === 'LUCRO_PRESUMIDO'}
                onChange={() => setTaxRegime('LUCRO_PRESUMIDO')}
                className="text-purple-600"
              />
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              PIS (0.65%), COFINS (3.0%), IRPJ (4.8%), CSLL (2.88%) e ISSQN (2% a 5%). Ideal para faturamento &gt; R$ 4.8M.
            </p>
          </div>

          {/* MEI */}
          <div
            onClick={() => setTaxRegime('MEI')}
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
              taxRegime === 'MEI'
                ? 'border-purple-600 bg-purple-50/50 shadow-xs'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-sm text-slate-900">MEI</span>
              <input
                type="radio"
                checked={taxRegime === 'MEI'}
                onChange={() => setTaxRegime('MEI')}
                className="text-purple-600"
              />
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Microempreendedor individual. Alíquota 0% nas notas com imposto fixo no DAS-MEI mensal.
            </p>
          </div>

          {/* Lucro Real */}
          <div
            onClick={() => setTaxRegime('LUCRO_REAL')}
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
              taxRegime === 'LUCRO_REAL'
                ? 'border-purple-600 bg-purple-50/50 shadow-xs'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-sm text-slate-900">Lucro Real</span>
              <input
                type="radio"
                checked={taxRegime === 'LUCRO_REAL'}
                onChange={() => setTaxRegime('LUCRO_REAL')}
                className="text-purple-600"
              />
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Regime não cumulativo com apuração sobre o lucro líquido contábil.
            </p>
          </div>
        </div>

        {/* Simples Nacional & Fator R Configuration */}
        {taxRegime === 'SIMPLES_NACIONAL' && (
          <div className="p-5 rounded-xl bg-purple-50/60 border border-purple-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-700" />
                <h3 className="font-bold text-purple-950 text-sm">Otimizador de Fator R (Economia de Impostos)</h3>
              </div>
              <label className="flex items-center gap-2 text-xs font-semibold text-purple-900 cursor-pointer">
                <input
                  type="checkbox"
                  checked={fatorRActive}
                  onChange={e => setFatorRActive(e.target.checked)}
                  className="rounded text-purple-600"
                />
                <span>Habilitar Fator R Automático</span>
              </label>
            </div>

            <p className="text-xs text-purple-900/80 leading-relaxed">
              Quando a folha de pagamento (pró-labore + salários + encargos) representa 28% ou mais do faturamento dos últimos 12 meses, sua empresa é tributada pelo <strong>Anexo III (iniciando em 6%)</strong> em vez do Anexo V (15,5%), reduzindo sua carga tributária em mais de 60%!
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Receita Bruta Acumulada 12 Meses (RBT12)
                </label>
                <input
                  type="number"
                  value={rbt12}
                  onChange={e => setRbt12(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Folha de Pagamento Acumulada 12 Meses
                </label>
                <input
                  type="number"
                  value={payroll12}
                  onChange={e => setPayroll12(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono text-xs"
                />
              </div>

              <div className="p-3 rounded-lg bg-white border border-purple-200 flex flex-col justify-center">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Fator R Calculado:</span>
                  <span className={`text-base font-extrabold ${isFatorRBenefited ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {liveFatorR}%
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5">
                  {isFatorRBenefited 
                    ? '✓ Enquadrado no Anexo III (Alíquota inicial 6.0%)'
                    : 'Abaixo de 28% (Enquadrado no Anexo V)'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Municipal & Fiscal Codes */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <h2 className="font-bold text-slate-800 text-base">Parâmetros Municipais & CNAE</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Código de Tributação Nacional (cTribNac - 6 dígitos)
            </label>
            <input
              type="text"
              value={serviceCode}
              onChange={e => setServiceCode(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 font-mono text-slate-800"
              placeholder="Ex: 010701"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              010701 = Item 01.07 (Suporte técnico, informática e conteúdo digital)
            </span>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              CNAE Principal
            </label>
            <input
              type="text"
              value={cnaePrincipal}
              onChange={e => setCnaePrincipal(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 font-mono text-slate-800"
              placeholder="Ex: 6202-3/00"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              Desenvolvimento e licenciamento de softwares e infoprodutos
            </span>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Alíquota de ISS de Referência (%)
            </label>
            <input
              type="text"
              value={defaultIssRate}
              onChange={e => setDefaultIssRate(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 font-mono text-slate-800"
              placeholder="Ex: 2.0"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              Anitápolis/SC (IBGE 4201109) • Simples Nacional recolhe via DAS
            </span>
          </div>
        </div>
      </div>

      {/* Motor de Transmissão Direta Sefin Nacional (Sem Intermediários) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
              <Zap className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-slate-800 text-base">API Oficial Sefin Nacional (Padrão Nacional NFS-e)</h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] border border-emerald-300">
                  Conexão Direta mTLS
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Transmissão real de DPS assinada (XMLDSig RSA-SHA256 + GZip/Base64) direto aos servidores do Emissor Nacional, sem intermediários pagos
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Padrão de Transmissão Ativo
            </label>
            <select
              value={municipalProvider}
              onChange={e => setMunicipalProvider(e.target.value as MunicipalProvider)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-600"
            >
              <option value="PADRAO_NACIONAL">API Oficial Sefin Nacional (Padrão Nacional NFS-e — Obrigatório SN)</option>
            </select>
            <span className="text-[10px] text-slate-400 mt-1 block">
              Anitápolis/SC (IBGE 4201109) • Inscrição Municipal: <strong>{municipalRegistration || '1618'}</strong>
            </span>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Ambiente Sefin Nacional
            </label>
            <select
              value={fiscalEnvironment}
              onChange={e => setFiscalEnvironment(e.target.value as FiscalEnvironment)}
              className={`w-full px-3.5 py-2.5 rounded-lg border font-semibold focus:outline-none focus:ring-2 focus:ring-purple-600 ${
                fiscalEnvironment === 'HOMOLOGACAO'
                  ? 'border-amber-400 bg-amber-50 text-amber-950'
                  : 'border-emerald-400 bg-emerald-50 text-emerald-950'
              }`}
            >
              <option value="HOMOLOGACAO">Homologação — Produção Restrita (Testes reais sem valor fiscal)</option>
              <option value="PRODUCAO">Produção Oficial (Emite NFS-e válida no nfse.gov.br)</option>
            </select>
            <span className="text-[10px] text-slate-500 mt-1 block">
              {fiscalEnvironment === 'HOMOLOGACAO'
                ? 'Modo seguro ativo: valida certificado, XML e regras na Receita sem gerar imposto.'
                : 'Atenção: em Produção, cada nota autorizada tem validade fiscal imediata.'}
            </span>
          </div>
        </div>

        {/* Technical specs of autonomous engine */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="space-y-0.5">
            <span className="text-[10px] text-slate-400 uppercase font-bold">Endpoint REST (POST /nfse)</span>
            <p className="font-mono text-[11px] font-semibold text-purple-900 truncate">
              {fiscalEnvironment === 'PRODUCAO'
                ? 'sefin.nfse.gov.br/SefinNacional/nfse'
                : 'sefin.producaorestrita.nfse.gov.br/SefinNacional/nfse'}
            </p>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] text-slate-400 uppercase font-bold">Assinatura & Transporte</span>
            <p className="font-semibold text-slate-800">
              XMLDSig RSA-SHA256 + GZip/B64 + mTLS
            </p>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10px] text-slate-400 uppercase font-bold">Custo de Transmissão</span>
            <p className="font-bold text-emerald-700">
              R$ 0,00 (Direto no Governo)
            </p>
          </div>
        </div>
      </div>

      {/* Company Registration Details */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <h2 className="font-bold text-slate-800 text-base">Identificação do Prestador de Serviços</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Razão Social</label>
            <input
              type="text"
              value={corporateName}
              onChange={e => setCorporateName(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 font-medium text-slate-800"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">CNPJ</label>
            <input
              type="text"
              value={cnpj}
              onChange={e => setCnpj(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 font-mono text-slate-800"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Inscrição Municipal (CCM)</label>
            <input
              type="text"
              value={municipalRegistration}
              onChange={e => setMunicipalRegistration(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 font-mono text-slate-800"
            />
          </div>
        </div>

        {/* Digital Certificate A1 Card */}
        {certFeedback && (
          <div
            className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
              certFeedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            {certFeedback.type === 'success' ? (
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{certFeedback.message}</span>
          </div>
        )}

        {hasLoadedCert && company.certificateStatus === 'ACTIVE' ? (
          <div className="p-5 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-4 text-xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-600 text-white shadow-sm">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-slate-900 text-sm">Certificado Digital e-CNPJ A1 Validado</p>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] border border-emerald-300">
                      {certSource === 'server_env' ? 'Configurado no Servidor (.env)' : 'Ativo na Sessão Segura (Memória)'}
                    </span>
                  </div>
                  <p className="text-slate-700 font-medium mt-0.5">
                    {company.certificateSubject || company.corporateName}
                  </p>
                  <p className="text-slate-600 mt-0.5">
                    Arquivo: <strong className="font-mono text-slate-800">{company.certificateFileName || certFileName || 'certificado.pfx'}</strong>
                    {company.certificateExpiryDate ? ` • Validade até ${company.certificateExpiryDate}` : ''}
                    {company.certificateIssuer ? ` • Emissor: ${company.certificateIssuer}` : ''}
                  </p>
                </div>
              </div>

              {certSource === 'memory' && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRemoveCert}
                    className="px-3 py-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600 font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Trocar / Remover</span>
                  </button>
                </div>
              )}
            </div>

            <div className="p-3 bg-white rounded-lg border border-emerald-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px]">
              <div className="flex items-center gap-2 text-slate-600">
                <Lock className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Chave privada e senha protegidas <strong>apenas em memória segura</strong> (nunca gravadas no navegador/localStorage).
                </span>
              </div>
              <button
                type="button"
                onClick={handleTestMtlsConnection}
                disabled={isTestingMtls}
                className="px-3.5 py-2 rounded-lg bg-[#2c0853] hover:bg-[#3d0b72] text-white font-bold text-[11px] flex items-center gap-1.5 transition-colors shrink-0 disabled:opacity-60"
              >
                {isTestingMtls ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-300" />
                ) : (
                  <Activity className="w-3.5 h-3.5 text-amber-300" />
                )}
                <span>
                  {isTestingMtls
                    ? 'Testando mTLS na Sefin...'
                    : 'Testar Conexão mTLS (Homologação + Produção)'}
                </span>
              </button>
            </div>

            {mtlsResult && (
              <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-3 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-bold text-slate-900">
                    Diagnóstico mTLS na Sefin Nacional (Somente Leitura — Sem Emitir Nota)
                  </p>
                  <span className="text-[10px] font-mono text-slate-500">
                    Sefin /nfse + ADN /parametrizacao/4201109/convenio
                  </span>
                </div>

                {mtlsResult.error && (
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 font-semibold">
                    {mtlsResult.error}
                  </div>
                )}

                {mtlsResult.homologacao && mtlsResult.producao && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      { label: 'Homologação (Produção Restrita)', data: mtlsResult.homologacao },
                      { label: 'Produção (Oficial)', data: mtlsResult.producao },
                    ].map(item => (
                      <div
                        key={item.label}
                        className={`p-3 rounded-lg border space-y-1.5 ${
                          item.data.authenticated
                            ? 'bg-emerald-50/70 border-emerald-300'
                            : 'bg-rose-50/70 border-rose-300'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-slate-900">{item.label}</span>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold text-[10px] ${
                              item.data.authenticated
                                ? 'bg-emerald-600 text-white'
                                : 'bg-rose-600 text-white'
                            }`}
                          >
                            {item.data.authenticated ? (
                              <CheckCircle2 className="w-3 h-3" />
                            ) : (
                              <XCircle className="w-3 h-3" />
                            )}
                            {item.data.authenticated
                              ? `Autenticado (HTTP ${item.data.httpStatus})`
                              : `Recusado (HTTP ${item.data.httpStatus})`}
                          </span>
                        </div>
                        <p className="font-mono text-[10px] text-slate-600 break-all">
                          {item.data.hostname} • Modo TLS: <strong>{item.data.tlsModeUsed}</strong>
                        </p>
                        {item.data.strategyLogs.length > 0 && (
                          <p className="font-mono text-[10px] text-slate-500 break-all">
                            Tentativas: {item.data.strategyLogs.join(' | ')}
                          </p>
                        )}
                        <div className="p-2 rounded bg-slate-900 text-slate-100 font-mono text-[10px] max-h-24 overflow-y-auto break-all">
                          {item.data.responsePreview}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {mtlsResult.certificate && (
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[10px] text-slate-600 space-y-1">
                    <p className="font-bold text-slate-700">
                      Cadeia extraída do .pfx (ClientAuth EKU: {mtlsResult.certificate.hasClientAuthEku ? 'Sim' : 'Não'}):
                    </p>
                    <ul className="list-disc pl-4 space-y-0.5 font-mono">
                      {mtlsResult.certificate.allCertSubjects.map((s, idx) => (
                        <li key={idx}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleInstallCertificate} className="p-5 rounded-xl border border-amber-300 bg-amber-50/50 space-y-4 text-xs">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-amber-500 text-white shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-slate-900 text-sm">Carregar Certificado Digital A1 (.pfx / .p12)</p>
                <p className="text-slate-600 leading-relaxed mt-0.5">
                  Selecione o arquivo <strong>.pfx ou .p12</strong> do seu e-CNPJ e informe a <strong>senha</strong>. O servidor valida a assinatura ICP-Brasil e a data de validade na hora. Por segurança, o arquivo e a senha ficam apenas em memória na sessão (ou configurados via variáveis <code>NFSE_PFX_BASE64</code> / <code>NFSE_CERT_PASSWORD</code> no servidor).
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              {/* Step 1: File */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  <span className="text-red-500">*</span> 1. Arquivo do Certificado (.pfx ou .p12):
                </label>
                <label className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-dashed border-purple-400 bg-white hover:bg-purple-50/50 cursor-pointer text-purple-800 font-semibold transition-colors">
                  <Upload className="w-4 h-4 text-purple-600" />
                  <span>{selectedFile ? `Trocar: ${selectedFile.name}` : 'Selecionar arquivo .pfx / .p12'}</span>
                  <input
                    type="file"
                    accept=".pfx,.p12"
                    onChange={handleSelectFile}
                    className="hidden"
                  />
                </label>
                {selectedFile && (
                  <p className="text-[11px] text-emerald-700 font-semibold mt-1.5 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Arquivo pronto: {selectedFile.name}
                  </p>
                )}
              </div>

              {/* Step 2: Password */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  <span className="text-red-500">*</span> 2. Senha do Certificado A1:
                </label>
                <div className="relative">
                  <input
                    type={showCertPassword ? 'text' : 'password'}
                    value={certPassword}
                    onChange={e => setCertPassword(e.target.value)}
                    placeholder="Digite a senha do seu certificado .pfx"
                    className="w-full px-3.5 py-2.5 pr-10 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2c0853]"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCertPassword(!showCertPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                  >
                    {showCertPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Validada criptograficamente com a chave privada do .pfx.
                </p>
              </div>
            </div>

            {/* Step 3: Install Button */}
            <div className="pt-2 flex items-center justify-end">
              <button
                type="submit"
                disabled={isValidatingCert}
                className="px-5 py-2.5 rounded-xl bg-[#2c0853] hover:bg-[#3d0b72] text-white font-bold text-xs shadow-md shadow-purple-950/20 transition-all flex items-center gap-2 disabled:opacity-60"
              >
                {isValidatingCert ? (
                  <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
                ) : (
                  <KeyRound className="w-4 h-4 text-amber-300" />
                )}
                <span>{isValidatingCert ? 'Validando Certificado A1...' : 'Validar & Ativar Certificado A1'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
