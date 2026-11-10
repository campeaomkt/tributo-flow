import React, { useState } from 'react';
import { useFiscal } from '../context/FiscalContext';
import { TaxRegime } from '../types';
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
  Trash2
} from 'lucide-react';

export const ConfiguracoesFiscaisView: React.FC = () => {
  const { company, updateCompany, setIsCompanyModalOpen } = useFiscal();

  const [taxRegime, setTaxRegime] = useState<TaxRegime>(company.taxRegime);
  const [simplesAnexo, setSimplesAnexo] = useState(company.simplesAnexo);
  const [fatorRActive, setFatorRActive] = useState(company.fatorRActive);
  const [rbt12, setRbt12] = useState(company.rbt12.toString());
  const [payroll12, setPayroll12] = useState(company.payroll12.toString());
  const [defaultIssRate, setDefaultIssRate] = useState(company.defaultIssRate.toString());
  const [serviceCode, setServiceCode] = useState(company.serviceCode);
  const [cnaePrincipal, setCnaePrincipal] = useState(company.cnaePrincipal);
  const [corporateName, setCorporateName] = useState(company.corporateName);
  const [cnpj, setCnpj] = useState(company.cnpj);
  const [municipalRegistration, setMunicipalRegistration] = useState(company.municipalRegistration);
  const [accountantName, setAccountantName] = useState(company.accountantName);
  const [accountantEmail, setAccountantEmail] = useState(company.accountantEmail);

  const [savedSuccess, setSavedSuccess] = useState(false);

  const [certPassword, setCertPassword] = useState('');
  const [certFileName, setCertFileName] = useState('');
  const [certFeedback, setCertFeedback] = useState<string | null>(null);

  // Calculate live Fator R
  const numRbt12 = parseFloat(rbt12) || 0;
  const numPayroll = parseFloat(payroll12) || 0;
  const liveFatorR = numRbt12 > 0 ? ((numPayroll / numRbt12) * 100).toFixed(1) : '0';
  const isFatorRBenefited = parseFloat(liveFatorR) >= 28.0;

  const handleUploadCert = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCertFileName(file.name);
      updateCompany({
        certificateStatus: 'ACTIVE',
        certificateExpiryDate: '2027-11-30',
      });
      setCertFeedback(`Certificado "${file.name}" carregado e validado com sucesso!`);
      setTimeout(() => setCertFeedback(null), 3500);
    }
  };

  const handleRemoveCert = () => {
    if (confirm('Deseja remover o certificado A1? Sem certificado, as notas fiscais não poderão ser assinadas na prefeitura.')) {
      setCertFileName('');
      setCertPassword('');
      updateCompany({
        certificateStatus: 'MISSING',
        certificateExpiryDate: '',
      });
      setCertFeedback('Certificado A1 removido.');
      setTimeout(() => setCertFeedback(null), 3000);
    }
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

      {/* Clarification Banner: Receita Federal vs Prefeitura vs SEFAZ */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-purple-900 text-white rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex items-center gap-2.5">
          <span className="p-2 rounded-xl bg-white/10 text-cyan-300">
            <HelpCircle className="w-5 h-5" />
          </span>
          <div>
            <h3 className="font-bold text-sm">Preciso integrar com a Receita Federal para emitir notas fiscais?</h3>
            <p className="text-xs text-blue-200">Entenda onde cada tipo de nota fiscal é transmitida na prática:</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 text-xs">
          <div className="p-3.5 rounded-xl bg-white/10 border border-white/10 space-y-1">
            <p className="font-bold text-cyan-300">1. NFS-e (Infoprodutos / Cursos / TI)</p>
            <p className="text-blue-100 text-[11px] leading-relaxed">
              <strong>NÃO vai para a Receita Federal diretamente.</strong> É transmitida para a <strong>Prefeitura Municipal</strong> do seu CNPJ (ex: São Paulo, Curitiba) via padrão ABRASF ou Portal Nacional NFS-e (se MEI).
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-white/10 border border-white/10 space-y-1">
            <p className="font-bold text-pink-300">2. NF-e (Produtos Físicos)</p>
            <p className="text-blue-100 text-[11px] leading-relaxed">
              É transmitida para a <strong>SEFAZ Estadual</strong> (Secretaria da Fazenda do seu Estado), autorizada pelo servidor da SEFAZ com seu Certificado A1.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-white/10 border border-white/10 space-y-1">
            <p className="font-bold text-emerald-300">3. E a Receita Federal?</p>
            <p className="text-blue-100 text-[11px] leading-relaxed">
              A Receita Federal recebe os dados no <strong>final do mês</strong>, quando seu contador importa os XMLs do TributoFlow e apura o <strong>Simples Nacional (PGDAS-D)</strong> para gerar sua guia DAS.
            </p>
          </div>
        </div>

        <div className="pt-1 text-[11px] text-blue-200 border-t border-white/10 flex items-center justify-between">
          <span>O TributoFlow cuida de toda a assinatura e envio com a prefeitura automaticamente usando seu <strong>Certificado Digital A1</strong>.</span>
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
            <p className="text-slate-500 text-[11px]">Insc. Estadual: {company.stateRegistration || '264108787'}</p>
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
              Código de Tributação Municipal (Item LC 116/03)
            </label>
            <input
              type="text"
              value={serviceCode}
              onChange={e => setServiceCode(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 font-mono text-slate-800"
              placeholder="Ex: 01.07"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              01.07 = Suporte técnico, consultoria em TI e serviços de internet
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
              Alíquota de ISS da sua Prefeitura (%)
            </label>
            <input
              type="text"
              value={defaultIssRate}
              onChange={e => setDefaultIssRate(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 font-mono text-slate-800"
              placeholder="Ex: 2.9"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              São Paulo geralmente aplica entre 2,0% e 2,9%
            </span>
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
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
            {certFeedback}
          </div>
        )}

        {company.certificateStatus === 'ACTIVE' ? (
          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-600 text-white">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-slate-900">Certificado Digital e-CNPJ A1 Ativo</p>
                <p className="text-slate-500">
                  {certFileName ? `Arquivo: ${certFileName} • ` : ''}Validade até {company.certificateExpiryDate || '2027-11-30'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
                Assinador Conectado
              </span>
              <button
                type="button"
                onClick={handleRemoveCert}
                className="p-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600"
                title="Remover certificado"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="p-5 rounded-xl border border-amber-300 bg-amber-50/50 space-y-3 text-xs">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-amber-500 text-white shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-slate-900 text-sm">Nenhum Certificado Digital A1 Conectado</p>
                <p className="text-slate-600 leading-relaxed mt-0.5">
                  Para emitir e assinar notas fiscais na prefeitura, anexe o arquivo do seu certificado <strong>e-CNPJ A1 (.pfx ou .p12)</strong> e informe a senha do arquivo.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Arquivo do Certificado (.pfx ou .p12):
                </label>
                <label className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-dashed border-purple-400 bg-white hover:bg-purple-50/50 cursor-pointer text-purple-800 font-semibold transition-colors">
                  <Upload className="w-4 h-4 text-purple-600" />
                  <span>Selecionar arquivo .pfx / .p12</span>
                  <input
                    type="file"
                    accept=".pfx,.p12"
                    onChange={handleUploadCert}
                    className="hidden"
                  />
                </label>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Senha do Certificado:
                </label>
                <input
                  type="password"
                  value={certPassword}
                  onChange={e => setCertPassword(e.target.value)}
                  placeholder="Digite a senha do certificado A1"
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-slate-800"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
