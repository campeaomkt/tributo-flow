import React from 'react';
import { useFiscal } from '../context/FiscalContext';
import { initialProducts } from '../services/mockData';
import { Package, Tag, Layers, TrendingUp, DollarSign } from 'lucide-react';

export const ProdutosView: React.FC = () => {
  const { company, sales } = useFiscal();

  // Aggregate products dynamically from actual sales
  const productsMap = sales.reduce((map, sale) => {
    const existing = map.get(sale.productName);
    if (existing) {
      existing.salesCount += 1;
      existing.totalRevenue += sale.amount;
    } else {
      map.set(sale.productName, {
        id: sale.productId || sale.productName,
        name: sale.productName,
        platform: sale.platform,
        price: sale.amount,
        serviceCode: company.serviceCode,
        cnae: company.cnaePrincipal,
        salesCount: 1,
        totalRevenue: sale.amount,
      });
    }
    return map;
  }, new Map<string, any>());

  const dynamicProducts = Array.from(productsMap.values());

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Produtos & Catálogo Fiscal</h1>
          <p className="text-xs text-slate-500">
            Regras de tributação municipal (Item LC 116 e CNAE) mapeadas para cada infoproduto
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
            <tr>
              <th className="px-4 py-3.5">Nome do Produto</th>
              <th className="px-4 py-3.5">Plataforma</th>
              <th className="px-4 py-3.5">Preço Médio</th>
              <th className="px-4 py-3.5">Cód. Tributação (LC 116)</th>
              <th className="px-4 py-3.5">CNAE</th>
              <th className="px-4 py-3.5 text-center">Vendas Totais</th>
              <th className="px-4 py-3.5 text-right">Faturamento Acumulado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {dynamicProducts.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                  <Package className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p className="font-semibold text-slate-600">Nenhum produto cadastrado ainda</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Conecte sua plataforma de vendas (Kiwify, Hotmart) ou utilize o simulador de vendas para cadastrar produtos automaticamente.
                  </p>
                </td>
              </tr>
            ) : (
              dynamicProducts.map(prod => (
                <tr key={prod.name} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3.5 font-bold text-slate-800">
                    {prod.name}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 uppercase">
                      {prod.platform}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 font-semibold text-slate-800">
                    R$ {(prod.totalRevenue / prod.salesCount).toFixed(2)}
                  </td>
                  <td className="px-4 py-3.5 font-mono text-purple-700 font-semibold">
                    {prod.serviceCode}
                  </td>
                  <td className="px-4 py-3.5 font-mono text-slate-600">
                    {prod.cnae}
                  </td>
                  <td className="px-4 py-3.5 text-center font-medium text-slate-700">
                    {prod.salesCount}
                  </td>
                  <td className="px-4 py-3.5 text-right font-extrabold text-slate-900">
                    R$ {prod.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
