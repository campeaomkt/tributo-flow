import React, { useState } from 'react';
import { useFiscal } from '../context/FiscalContext';
import { PlatformId } from '../types';
import { 
  X, 
  Zap, 
  Sparkles, 
  CheckCircle, 
  Clock, 
  RotateCcw, 
  CreditCard,
  Building2,
  DollarSign
} from 'lucide-react';

interface SimulatorModalProps {
  onClose: () => void;
}

export const SimulatorModal: React.FC<SimulatorModalProps> = ({ onClose }) => {
  const { platforms, simulateSale, simulateRefund, sales, company } = useFiscal();

  const [mode, setMode] = useState<'sale' | 'refund'>('sale');
  const [platform, setPlatform] = useState<PlatformId>('kiwify');
  const [productName, setProductName] = useState('PADS CONTINUOS EM TODOS OS TONS');
  const [amount, setAmount] = useState('19.90');
  const [paymentMethod, setPaymentMethod] = useState<'PIX' | 'CARTAO_CREDITO' | 'BOLETO'>('PIX');
  const [customerName, setCustomerName] = useState('Marina Rocha Azevedo');
  const [customerDoc, setCustomerDoc] = useState('388.910.420-19');
  const [customerEmail, setCustomerEmail] = useState('marina.azevedo@gmail.com');

  const [selectedSaleToRefund, setSelectedSaleToRefund] = useState(sales[0]?.id || '');
  const [simulatedSuccess, setSimulatedSuccess] = useState<string | null>(null);

  const selectedPlatformConfig = platforms.find(p => p.id === platform);

  const handleRunSaleSimulation = () => {
    const val = parseFloat(amount.replace(',', '.')) || 19.90;
    
    simulateSale({
      platform,
      productName,
      amount: val,
      paymentMethod,
      customerName,
      customerDoc,
      customerEmail,
    });

    const isImmediate = selectedPlatformConfig?.trigger === 'on_payment_approved';
    const message = isImmediate
      ? `Venda aprovada! A nota fiscal foi EMITIDA e transmitida imediatamente com sucesso conforme a regra de ${selectedPlatformConfig?.name}.`
      : `Venda recebida! A nota fiscal foi adicionada à fila de PENDENTES com garantia de ${selectedPlatformConfig?.warrantyDays || 7} dias.`;

    setSimulatedSuccess(message);
    setTimeout(() => {
      setSimulatedSuccess(null);
      onClose();
    }, 1800);
  };

  const handleRunRefundSimulation = () => {
    if (!selectedSaleToRefund) return;
    simulateRefund(selectedSaleToRefund);
    setSimulatedSuccess('Reembolso processado na plataforma! A nota fiscal foi cancelada automaticamente.');
    setTimeout(() => {
      setSimulatedSuccess(null);
      onClose();
    }, 1800);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-6 overflow-hidden border border-slate-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-purple-900 to-indigo-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-white/10 text-amber-300">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base">Simulador de Webhook de Vendas</h2>
              <p className="text-xs text-purple-200">
                Dispare eventos da Kiwify ou Hotmart em tempo real
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-purple-300 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-semibold">
          <button
            onClick={() => setMode('sale')}
            className={`flex-1 py-3 text-center border-b-2 transition-colors ${
              mode === 'sale'
                ? 'border-[#2c0853] text-[#2c0853] bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            1. Simular Nova Venda (Aprovada)
          </button>
          <button
            onClick={() => setMode('refund')}
            className={`flex-1 py-3 text-center border-b-2 transition-colors ${
              mode === 'refund'
                ? 'border-rose-600 text-rose-600 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            2. Simular Reembolso (Cancelamento)
          </button>
        </div>

        {/* Feedback Alert */}
        {simulatedSuccess && (
          <div className="m-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-2 animate-bounce">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{simulatedSuccess}</span>
          </div>
        )}

        {/* Form Body */}
        <div className="p-6 space-y-4 text-xs text-slate-700">
          {mode === 'sale' ? (
            <>
              {/* Presets */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Testes Rápidos:
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      setPlatform('kiwify');
                      setProductName('PADS CONTINUOS EM TODOS OS TONS');
                      setAmount('19.90');
                      setPaymentMethod('PIX');
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 font-semibold border border-purple-200 text-[11px]"
                  >
                    🥝 Kiwify (R$ 19,90)
                  </button>
                  <button
                    onClick={() => {
                      setPlatform('hotmart');
                      setProductName('MASTERCLASS TRÁFEGO PAGO DE ALTA CONVERSÃO');
                      setAmount('197.00');
                      setPaymentMethod('CARTAO_CREDITO');
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-700 font-semibold border border-orange-200 text-[11px]"
                  >
                    🔥 Hotmart (R$ 197,00)
                  </button>
                  <button
                    onClick={() => {
                      setPlatform('kiwify');
                      setProductName('MENTORIA VIP INDIVIDUAL');
                      setAmount('1997.00');
                      setPaymentMethod('PIX');
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold border border-emerald-200 text-[11px]"
                  >
                    💎 High Ticket (R$ 1.997,00)
                  </button>
                </div>
              </div>

              {/* Platform Selector */}
              <div>
                <label className="block font-semibold text-slate-800 mb-1">Plataforma de Vendas</label>
                <select
                  value={platform}
                  onChange={e => setPlatform(e.target.value as PlatformId)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-medium text-slate-800 bg-white"
                >
                  <option value="kiwify">Kiwify (Webhook Ativo)</option>
                  <option value="hotmart">Hotmart (Webhook Ativo)</option>
                  <option value="eduzz">Eduzz</option>
                  <option value="monetizze">Monetizze</option>
                  <option value="braip">Braip</option>
                  <option value="stripe">Stripe</option>
                  <option value="custom_api">API RESTful Direta</option>
                </select>
                <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Regra configurada:</span>
                  <span className="font-semibold text-purple-700">
                    {selectedPlatformConfig?.trigger === 'on_payment_approved'
                      ? '⚡ Emissão Imediata na Aprovação'
                      : `⏳ Enfileirar para Garantia (${selectedPlatformConfig?.warrantyDays} dias)`}
                  </span>
                </div>
              </div>

              {/* Product and Value */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block font-semibold text-slate-800 mb-1">Nome do Produto</label>
                  <input
                    type="text"
                    value={productName}
                    onChange={e => setProductName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">Valor (R$)</label>
                  <input
                    type="text"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-slate-900 text-right"
                  />
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block font-semibold text-slate-800 mb-1">Forma de Pagamento</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['PIX', 'CARTAO_CREDITO', 'BOLETO'] as const).map(pm => (
                    <button
                      key={pm}
                      type="button"
                      onClick={() => setPaymentMethod(pm)}
                      className={`py-2 rounded-lg border text-center font-semibold transition-all ${
                        paymentMethod === pm
                          ? 'border-purple-600 bg-purple-50 text-purple-900'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {pm === 'CARTAO_CREDITO' ? 'Cartão' : pm}
                    </button>
                  ))}
                </div>
              </div>

              {/* Customer Details */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="font-semibold text-slate-800 block">Dados do Tomador (Cliente):</span>
                <input
                  type="text"
                  placeholder="Nome do Cliente"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-md border border-slate-300 bg-white"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="CPF/CNPJ"
                    value={customerDoc}
                    onChange={e => setCustomerDoc(e.target.value)}
                    className="px-3 py-1.5 rounded-md border border-slate-300 bg-white"
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={customerEmail}
                    onChange={e => setCustomerEmail(e.target.value)}
                    className="px-3 py-1.5 rounded-md border border-slate-300 bg-white"
                  />
                </div>
              </div>
            </>
          ) : (
            /* Refund Mode */
            <div className="space-y-4">
              <p className="text-slate-600 leading-relaxed">
                Quando um cliente pede reembolso na Kiwify ou Hotmart dentro do prazo legal de 7 dias, a plataforma envia um webhook de estorno. O Spedy detecta e cancela a nota fiscal automaticamente, protegendo seu faturamento contábil de impostos indevidos.
              </p>

              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Selecione a venda para estornar:
                </label>
                <select
                  value={selectedSaleToRefund}
                  onChange={e => setSelectedSaleToRefund(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-medium text-slate-800"
                >
                  {sales.filter(s => s.status === 'approved').slice(0, 10).map(s => (
                    <option key={s.id} value={s.id}>
                      {s.productName} - R$ {s.amount.toFixed(2)} ({s.customer.name})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-white font-medium text-xs"
          >
            Cancelar
          </button>

          {mode === 'sale' ? (
            <button
              onClick={handleRunSaleSimulation}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-[#2c0853] hover:bg-[#3d0b72] text-white font-bold text-xs shadow-md shadow-purple-950/20"
            >
              <Zap className="w-4 h-4 text-amber-300" />
              <span>Disparar Webhook de Venda</span>
            </button>
          ) : (
            <button
              onClick={handleRunRefundSimulation}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-950/20"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Simular Estorno / Cancelamento</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
