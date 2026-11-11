import React, { useState } from 'react';
import { Sale } from '../types';
import { useFiscal } from '../context/FiscalContext';
import { X, Check, FileText, Sparkles, RefreshCw, AlertCircle } from 'lucide-react';

interface EditSaleModalProps {
  sale: Sale;
  onClose: () => void;
}

export const EditSaleModal: React.FC<EditSaleModalProps> = ({ sale, onClose }) => {
  const { updateSaleAndInvoice, processKiwifyWebhook } = useFiscal();

  const [activeTab, setActiveTab] = useState<'manual' | 'json'>('manual');
  const [amount, setAmount] = useState(sale.amount.toString());
  const [productName, setProductName] = useState(sale.productName);
  const [hasOrderBump, setHasOrderBump] = useState(sale.productName.includes('+') || false);
  const [orderBumpName, setOrderBumpName] = useState('');
  const [customerName, setCustomerName] = useState(sale.customer.name);
  const [customerDoc, setCustomerDoc] = useState(sale.customer.document);
  const [customerEmail, setCustomerEmail] = useState(sale.customer.email);

  const [jsonInput, setJsonInput] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSaveManual = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount.replace(',', '.')) || 37.90;
    
    let finalProductName = productName;
    if (hasOrderBump && orderBumpName.trim() && !finalProductName.includes(orderBumpName.trim())) {
      finalProductName = `${productName.split(' +')[0]} + Order Bump: ${orderBumpName.trim()}`;
    }

    updateSaleAndInvoice(sale.id, {
      amount: parsedAmount,
      productName: finalProductName,
      customerName: customerName.trim(),
      customerDoc: customerDoc.trim(),
      customerEmail: customerEmail.trim(),
    });

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1000);
  };

  const handleParseAndApplyJson = () => {
    setJsonError(null);
    try {
      const parsed = JSON.parse(jsonInput);
      processKiwifyWebhook(parsed);
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 1000);
    } catch (err: any) {
      setJsonError(`JSON inválido: ${err.message}. Certifique-se de copiar o conteúdo inteiro da caixa de Detalhes na Kiwify.`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-6 overflow-hidden border border-slate-200 flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-purple-950 to-indigo-950 text-white flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-base">Atualizar Venda & NFS-e</h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold border border-emerald-500/30">
                {sale.externalSaleId}
              </span>
            </div>
            <p className="text-xs text-purple-200 mt-0.5">
              Ajuste o valor com Order Bump ou cole o JSON copiado da Kiwify
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-semibold px-6 pt-3">
          <button
            onClick={() => setActiveTab('manual')}
            className={`pb-2.5 px-3 border-b-2 transition-colors ${
              activeTab === 'manual'
                ? 'border-[#2c0853] text-[#2c0853]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Editar Valor & Tomador
          </button>
          <button
            onClick={() => setActiveTab('json')}
            className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'json'
                ? 'border-[#2c0853] text-[#2c0853]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            <span>Colar JSON da Kiwify (Automático)</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs">
          {savedSuccess && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 font-semibold flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>Venda e Nota Fiscal recalculadas e atualizadas com sucesso!</span>
            </div>
          )}

          {activeTab === 'manual' ? (
            <form onSubmit={handleSaveManual} className="space-y-4">
              <div className="p-3.5 rounded-xl bg-purple-50/70 border border-purple-200/80 space-y-2">
                <span className="text-[10px] uppercase font-bold text-purple-900 block">
                  Valor & Order Bump
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      Valor Total da Venda (R$):
                    </label>
                    <input
                      type="text"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      placeholder="Ex: 57.80"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-purple-600"
                      required
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Inclua o valor total cobrado do cliente
                    </span>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      Produto Principal:
                    </label>
                    <input
                      type="text"
                      value={productName.split(' +')[0]}
                      onChange={e => setProductName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-purple-600"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-purple-200/60">
                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-purple-950">
                    <input
                      type="checkbox"
                      checked={hasOrderBump}
                      onChange={e => setHasOrderBump(e.target.checked)}
                      className="rounded text-purple-600"
                    />
                    <span>Esta venda teve Order Bump / Produto Adicional</span>
                  </label>

                  {hasOrderBump && (
                    <div className="mt-2 space-y-1">
                      <input
                        type="text"
                        value={orderBumpName}
                        onChange={e => setOrderBumpName(e.target.value)}
                        placeholder="Nome do produto do Order Bump (ex: Pack de Samples, Masterclass...)"
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-purple-600 bg-white"
                      />
                      <span className="text-[10px] text-slate-500">
                        O nome do Order Bump aparecerá na discriminação da nota fiscal
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Customer details */}
              <div className="space-y-3">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Dados Reais do Tomador / Cliente
                </span>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Nome Completo:</label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={e => setCustomerName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-purple-600"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">CPF do Cliente:</label>
                    <input
                      type="text"
                      value={customerDoc}
                      onChange={e => setCustomerDoc(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-purple-600"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Email do Cliente:</label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={e => setCustomerEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-purple-600"
                    required
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#2c0853] hover:bg-[#3d0b72] text-white text-xs font-bold shadow-xs"
                >
                  Salvar & Recalcular Nota Fiscal
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 text-xs leading-relaxed">
                💡 <strong>Como copiar da Kiwify:</strong>
                <ol className="list-decimal pl-4 mt-1 space-y-0.5">
                  <li>No painel da Kiwify, vá em <strong>Apps → Webhooks → Logs</strong>.</li>
                  <li>Clique nos três pontinhos <strong>`⋮`</strong> ao lado da venda <strong>{sale.externalSaleId}</strong> e selecione <strong>Detalhes</strong>.</li>
                  <li>Copie todo o texto da caixa <strong>Requisição</strong> e cole aqui abaixo:</li>
                </ol>
              </div>

              <textarea
                rows={7}
                value={jsonInput}
                onChange={e => setJsonInput(e.target.value)}
                placeholder={`Cole aqui o JSON da Kiwify (ex: {"order": { "order_ref": "${sale.externalSaleId}", ...}})`}
                className="w-full p-3 rounded-xl border border-slate-300 font-mono text-[11px] text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-600"
              />

              {jsonError && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{jsonError}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold"
                >
                  Fechar
                </button>
                <button
                  type="button"
                  onClick={handleParseAndApplyJson}
                  disabled={!jsonInput.trim()}
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs disabled:opacity-50"
                >
                  Importar Dados Reais & Atualizar NFS-e
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
