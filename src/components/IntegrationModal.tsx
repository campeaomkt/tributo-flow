import React, { useState } from 'react';
import { useFiscal } from '../context/FiscalContext';
import { PlatformConfig, InvoiceModel, InvoiceTrigger } from '../types';
import { X, Eye, EyeOff, Copy, Check, Info, ShieldCheck, Zap, RefreshCw, Loader2, AlertTriangle } from 'lucide-react';

interface IntegrationModalProps {
  platform: PlatformConfig;
  onClose: () => void;
}

export const IntegrationModal: React.FC<IntegrationModalProps> = ({ platform, onClose }) => {
  const {
    updatePlatform,
    processKiwifyWebhook,
    syncKiwifySales,
    isSyncingKiwify,
    kiwifyServerConfigured,
    kiwifySecretValue,
    setKiwifySecretMem,
  } = useFiscal();

  const [enabled, setEnabled] = useState(platform.enabled);
  const [invoiceModel, setInvoiceModel] = useState<InvoiceModel>(platform.invoiceModel);
  const [trigger, setTrigger] = useState<InvoiceTrigger>(platform.trigger);
  const [sendEmail, setSendEmail] = useState(platform.sendEmailToCustomer);
  const [cancelOnRefund, setCancelOnRefund] = useState(platform.cancelOnRefund);

  // Parameters
  const [clientId, setClientId] = useState(platform.clientId || '');
  const [clientSecret, setClientSecret] = useState(platform.id === 'kiwify' ? kiwifySecretValue : '');
  const [showSecret, setShowSecret] = useState(false);
  const [accountId, setAccountId] = useState(platform.accountId || '');
  const [includeInterest, setIncludeInterest] = useState(platform.includeInterestInValue);
  const [email, setEmail] = useState(platform.notificationEmail || 'campeao.mkt.user@gmail.com');
  const [startDate, setStartDate] = useState(platform.integrationStartDate || '2026-02-01');
  const [warrantyDays, setWarrantyDays] = useState(platform.warrantyDays || 7);

  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isTestingEndpoint, setIsTestingEndpoint] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; status: number; message: string } | null>(null);
  const [syncResult, setSyncResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [pastedJson, setPastedJson] = useState('');
  const [showPasteBox, setShowPasteBox] = useState(false);
  const [pasteFeedback, setPasteFeedback] = useState<{ ok: boolean; message: string } | null>(null);

  // Compute live absolute webhook URL so external platforms like Kiwify can reach the applet
  const liveWebhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/webhooks/${platform.id}`
    : platform.webhookUrl;

  const handleTestWebhook = async () => {
    setIsTestingEndpoint(true);
    setTestResult(null);
    try {
      const res = await fetch(liveWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          test: true,
          event: 'order_approved',
          order: { order_ref: 'PING-TEST' }
        })
      });
      if (res.ok) {
        setTestResult({
          ok: true,
          status: res.status,
          message: 'Endpoint ativo e respondendo com HTTP 200 OK! A Kiwify conseguirá entregar os webhooks sem erro.'
        });
      } else {
        setTestResult({
          ok: false,
          status: res.status,
          message: `O endpoint retornou HTTP ${res.status}. Na Vercel, certifique-se de que os novos arquivos /api/webhooks/kiwify.ts e vercel.json foram implantados.`
        });
      }
    } catch (err: any) {
      setTestResult({
        ok: false,
        status: 0,
        message: `Não foi possível alcançar ${liveWebhookUrl}: ${err.message}`
      });
    } finally {
      setIsTestingEndpoint(false);
    }
  };

  const handleRealKiwifySync = async () => {
    setSyncResult(null);
    if (clientSecret.trim()) {
      setKiwifySecretMem(clientSecret.trim());
    }
    updatePlatform(platform.id, {
      enabled: true,
      clientId,
      accountId,
      integrationStartDate: startDate,
      warrantyDays: Number(warrantyDays),
    });
    const res = await syncKiwifySales({
      clientId: clientId.trim() || undefined,
      clientSecret: clientSecret.trim() || undefined,
      accountId: accountId.trim() || undefined,
      startDate,
    });
    if (res.success) {
      setEnabled(true);
      setSyncResult({
        ok: true,
        message: `Conexão real com a API da Kiwify concluída! ${res.totalFetched} vendas reais encontradas desde ${startDate} (${res.addedCount} novas importadas).`,
      });
    } else {
      setSyncResult({
        ok: false,
        message: res.error || 'Falha ao consultar vendas reais na API da Kiwify.',
      });
    }
  };

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(liveWebhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  const handleSave = async () => {
    if (platform.id === 'kiwify' && clientSecret.trim()) {
      setKiwifySecretMem(clientSecret.trim());
    }

    updatePlatform(platform.id, {
      enabled,
      invoiceModel,
      trigger,
      sendEmailToCustomer: sendEmail,
      cancelOnRefund,
      clientId,
      clientSecret: '',
      accountId,
      includeInterestInValue: includeInterest,
      notificationEmail: email,
      integrationStartDate: startDate,
      warrantyDays: Number(warrantyDays),
    });

    if (platform.id === 'kiwify' && (clientSecret.trim() || kiwifyServerConfigured)) {
      await syncKiwifySales({
        clientId: clientId.trim() || undefined,
        clientSecret: clientSecret.trim() || undefined,
        accountId: accountId.trim() || undefined,
        startDate,
      });
    }

    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-xl my-8 overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header matching screenshot 2 */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center font-bold text-sm">
              {platform.id === 'kiwify' ? '🥝' : platform.id === 'hotmart' ? '🔥' : '⚡'}
            </div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-800">{platform.name}</h2>
              <span className="text-slate-400 text-xs">✏️</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs sm:text-sm text-slate-700">
          {/* Habilitar integração */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <span className="font-semibold text-slate-800 text-sm">Habilitar integração</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={enabled}
                onChange={e => setEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-12 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2c0853]"></div>
            </label>
          </div>

          {/* Qual modelo de nota fiscal? */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 font-semibold text-slate-800 text-sm">
              <span>Qual modelo de nota fiscal?</span>
              <Info className="w-4 h-4 text-slate-400" />
            </div>
            <div className="space-y-2 pl-1">
              {[
                { value: 'NFS-e', label: 'NFS-e (Nota de Serviços - Cursos, Infoprodutos, Assinaturas)' },
                { value: 'NF-e', label: 'NF-e (Nota de Produto Físico / E-commerce)' },
                { value: 'Split', label: 'Split (Divisão com Co-produtores / Afiliados)' },
              ].map(opt => (
                <label key={opt.value} className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="radio"
                    name="invoiceModel"
                    checked={invoiceModel === opt.value}
                    onChange={() => setInvoiceModel(opt.value as InvoiceModel)}
                    className="w-4 h-4 text-[#2c0853] focus:ring-[#2c0853]"
                  />
                  <span className="text-slate-700">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Quando emitir a nota fiscal? */}
          <div className="space-y-2 pt-2">
            <p className="font-semibold text-slate-800 text-sm">Quando emitir a nota fiscal?</p>
            <div className="space-y-2 pl-1">
              {[
                { value: 'on_created', label: 'Na geração da venda' },
                { value: 'on_warranty_expired', label: 'Após o período de garantia (Recomendado para evitar cancelamentos)' },
                { value: 'on_payment_approved', label: 'Após a aprovação do pagamento' },
                { value: 'manual', label: 'Não emitir automaticamente (Apenas sob demanda)' },
              ].map(opt => (
                <label key={opt.value} className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="radio"
                    name="trigger"
                    checked={trigger === opt.value}
                    onChange={() => setTrigger(opt.value as InvoiceTrigger)}
                    className="w-4 h-4 text-[#2c0853] focus:ring-[#2c0853]"
                  />
                  <span className="text-slate-700">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Enviar nota fiscal via email para o cliente? */}
          <div className="flex items-center justify-between pt-2">
            <span className="font-medium text-slate-700">Enviar nota fiscal via email para o cliente?</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={sendEmail}
                onChange={e => setSendEmail(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2c0853]"></div>
            </label>
          </div>

          {/* Cancelar nota fiscal quando houver um reembolso? */}
          <div className="flex items-center justify-between">
            <span className="font-medium text-slate-700">Cancelar nota fiscal quando houver um reembolso?</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={cancelOnRefund}
                onChange={e => setCancelOnRefund(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2c0853]"></div>
            </label>
          </div>

          {/* Instructions Box matching screenshot 2 */}
          <div className="p-4 rounded-xl bg-[#e6f4fe] border border-[#bae6fd] text-slate-700 space-y-2 text-xs">
            <p className="font-semibold text-sky-950">
              Para habilitar a integração com a {platform.name}, siga os passos abaixo:
            </p>
            <ol className="list-decimal list-inside space-y-1 text-sky-900 leading-relaxed">
              <li>No Dashboard da {platform.name}, acesse o menu <strong>Apps &gt; API</strong>;</li>
              <li>Clique no botão <strong>Criar API Key</strong>;</li>
              <li>No campo Nome digite <strong>TributoFlow</strong>;</li>
              <li>Na sessão <strong>Endpoints</strong> selecione apenas os endpoints <strong>Relatórios, Vendas, Reembolsar vendas e Webhooks</strong>;</li>
              <li>Cole as credenciais nos campos abaixo.</li>
            </ol>
          </div>

          {/* Parameters Section matching screenshot 3 */}
          <div className="pt-2 border-t border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm">Parâmetros</h3>
              <span className="text-[11px] text-slate-400">* Campos obrigatórios</span>
            </div>

            {/* Client ID */}
            <div>
              <label className="block text-slate-700 font-medium mb-1">
                <span className="text-red-500">*</span> Client ID
              </label>
              <input
                type="text"
                value={clientId}
                onChange={e => setClientId(e.target.value)}
                placeholder="Ex: cb4871c1-cdc7-4b85-a27c-4e89ef5557fb"
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#2c0853] text-slate-800 font-mono text-xs"
              />
            </div>

            {/* Client Secret */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-slate-700 font-medium">
                  <span className="text-red-500">*</span> Client Secret
                </label>
                {platform.id === 'kiwify' && kiwifyServerConfigured && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                    ✓ Configurado no Servidor (.env Vercel)
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type={showSecret ? 'text' : 'password'}
                  value={clientSecret}
                  onChange={e => setClientSecret(e.target.value)}
                  placeholder={
                    platform.id === 'kiwify' && kiwifyServerConfigured
                      ? 'Usando KIWIFY_CLIENT_SECRET da Vercel (deixe vazio ou cole para sobrescrever)'
                      : 'Cole o Client Secret real gerado em Apps > API na Kiwify'
                  }
                  className="w-full px-3.5 py-2 pr-10 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#2c0853] text-slate-800 font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {platform.id === 'kiwify' && (
                <p className="text-[11px] text-emerald-700 font-medium mt-1">
                  ✓ Fica salvo automaticamente no cofre criptografado deste navegador — você não precisa preencher de novo ao fechar e abrir o app.
                </p>
              )}
            </div>

            {/* Account ID */}
            <div>
              <label className="block text-slate-700 font-medium mb-1">
                <span className="text-red-500">*</span> Account ID
              </label>
              <input
                type="text"
                value={accountId}
                onChange={e => setAccountId(e.target.value)}
                placeholder="Ex: 5yDbjPlo1GqwUlO"
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#2c0853] text-slate-800 font-mono text-xs"
              />
            </div>

            {/* Incluir juros no valor da venda? */}
            <div>
              <label className="block text-slate-700 font-medium mb-1">
                <span className="text-red-500">*</span> Incluir juros no valor da venda?
              </label>
              <select
                value={includeInterest ? 'Sim' : 'Não'}
                onChange={e => setIncludeInterest(e.target.value === 'Sim')}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#2c0853] text-slate-800 bg-white"
              >
                <option value="Sim">Sim</option>
                <option value="Não">Não</option>
              </select>
            </div>

            {/* Email */}
            <div>
              <label className="block text-slate-700 font-medium mb-1">
                <span className="text-red-500">*</span> Email para notificações
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="campeao.mkt.user@gmail.com"
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#2c0853] text-slate-800"
              />
            </div>

            {/* Data de início da integração */}
            <div>
              <label className="block text-slate-700 font-medium mb-1">
                <span className="text-red-500">*</span> Data de início da integração
              </label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#2c0853] text-slate-800"
              />
            </div>

            {/* Dias de garantia (opcional) */}
            <div>
              <label className="block text-slate-700 font-medium mb-1">
                Dias de garantia (opcional)
              </label>
              <input
                type="number"
                min="0"
                max="90"
                value={warrantyDays}
                onChange={e => setWarrantyDays(Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#2c0853] text-slate-800"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Se configurado para emitir após a garantia, o sistema aguarda esses dias antes de transmitir a nota à prefeitura.
              </p>
            </div>

            {/* Webhook URL Endpoint */}
            <div className="pt-2 space-y-2">
              <label className="block text-slate-700 font-medium">
                URL de Webhook (Cole no Dashboard da {platform.name})
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={liveWebhookUrl}
                  className="w-full px-3.5 py-2 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 font-mono text-xs select-all"
                />
                <button
                  type="button"
                  onClick={handleCopyWebhook}
                  className="px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 shrink-0"
                >
                  {copiedWebhook ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedWebhook ? 'Copiado!' : 'Copiar'}</span>
                </button>
              </div>

              {/* Action Buttons: Sync Real Kiwify API & Test Webhook */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {platform.id === 'kiwify' && (
                  <>
                    <button
                      type="button"
                      onClick={handleRealKiwifySync}
                      disabled={isSyncingKiwify}
                      className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs disabled:opacity-60"
                    >
                      {isSyncingKiwify ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {isSyncingKiwify
                          ? 'Buscando vendas reais na Kiwify...'
                          : 'Sincronizar Vendas Reais da API Kiwify'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowPasteBox(!showPasteBox)}
                      className="px-3 py-2 rounded-lg border border-purple-300 bg-purple-50 hover:bg-purple-100 text-purple-900 text-xs font-semibold flex items-center gap-1.5"
                    >
                      <span>{showPasteBox ? 'Fechar Importador' : 'Colar JSON de Webhook'}</span>
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={handleTestWebhook}
                  disabled={isTestingEndpoint}
                  className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>{isTestingEndpoint ? 'Testando Endpoint...' : 'Testar Endpoint Webhook'}</span>
                </button>
              </div>

              {syncResult && (
                <div
                  className={`p-3 rounded-lg text-xs leading-relaxed border flex items-start gap-2 ${
                    syncResult.ok
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}
                >
                  {syncResult.ok ? (
                    <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <span className="font-semibold">{syncResult.message}</span>
                </div>
              )}

              {/* Manual JSON Payload Importer */}
              {showPasteBox && (
                <div className="p-3.5 rounded-xl bg-purple-50/70 border border-purple-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-purple-950 text-xs">
                      Colar JSON de qualquer webhook da Kiwify (ex: botão "Detalhes" no log):
                    </span>
                    <span className="text-[10px] text-purple-700">Formato JSON nativo</span>
                  </div>
                  <textarea
                    rows={4}
                    value={pastedJson}
                    onChange={e => setPastedJson(e.target.value)}
                    placeholder='Cole aqui o JSON da requisição da Kiwify, ex: {"order": {"order_ref": "N2RK3OI", "order_status": "paid", ...}}'
                    className="w-full p-2 rounded-lg border border-purple-200 bg-white font-mono text-[11px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-600"
                  />
                  <div className="flex items-center justify-between gap-2">
                    {pasteFeedback && (
                      <span
                        className={`text-[11px] font-semibold ${
                          pasteFeedback.ok ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {pasteFeedback.message}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        try {
                          const parsed = JSON.parse(pastedJson);
                          processKiwifyWebhook(parsed);
                          setEnabled(true);
                          setPasteFeedback({ ok: true, message: '✓ Venda real processada e adicionada na fila fiscal!' });
                          setPastedJson('');
                          setTimeout(() => setPasteFeedback(null), 4000);
                        } catch (err: any) {
                          setPasteFeedback({ ok: false, message: `JSON inválido: ${err.message}` });
                        }
                      }}
                      disabled={!pastedJson.trim()}
                      className="px-4 py-1.5 rounded-lg bg-[#2c0853] hover:bg-[#3d0b72] text-white text-xs font-bold disabled:opacity-50 ml-auto"
                    >
                      Processar Venda Real
                    </button>
                  </div>
                </div>
              )}

              {/* Test Result Feedback */}
              {testResult && (
                <div
                  className={`p-3 rounded-lg text-xs leading-relaxed border flex items-start gap-2.5 ${
                    testResult.ok
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-amber-50 border-amber-200 text-amber-900'
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {testResult.ok ? '✅' : '⚠️'}
                  </div>
                  <div>
                    <p className="font-bold">{testResult.ok ? 'Status 200 OK - Sucesso!' : `Aviso: Resposta HTTP ${testResult.status}`}</p>
                    <p className="mt-0.5">{testResult.message}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Buttons matching screenshot 2 & 3 */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-full border border-slate-300 hover:bg-white text-slate-700 font-medium text-xs transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2 rounded-full bg-[#2c0853] hover:bg-[#3d0b72] text-white font-semibold text-xs shadow-sm shadow-purple-950/20 transition-all"
          >
            {isSaved ? 'Salvo com sucesso!' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
};
