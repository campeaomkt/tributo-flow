import React, { useState } from 'react';
import { useFiscal } from '../context/FiscalContext';
import { Users, Search, Mail, MapPin } from 'lucide-react';

export const ClientesView: React.FC = () => {
  const { sales } = useFiscal();
  const [searchTerm, setSearchTerm] = useState('');

  // Extract unique customers from sales
  const customers = Array.from(
    new Map(sales.map(s => [s.customer.document, s.customer])).values()
  );

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.document.includes(searchTerm) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Tomadores de Serviços (Clientes)</h1>
          <p className="text-xs text-slate-500">
            Base de dados de clientes cadastrados automaticamente através das compras na Kiwify e Hotmart
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por nome, CPF/CNPJ ou email..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-600"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
            <tr>
              <th className="px-4 py-3.5">Nome do Tomador</th>
              <th className="px-4 py-3.5">CPF / CNPJ</th>
              <th className="px-4 py-3.5">Email</th>
              <th className="px-4 py-3.5">Localidade</th>
              <th className="px-4 py-3.5 text-center">Tipo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(c => {
              const isCnpj = c.document.replace(/\D/g, '').length > 11;

              return (
                <tr key={c.document} className="hover:bg-slate-50/70">
                  <td className="px-4 py-3.5 font-bold text-slate-800">
                    {c.name}
                  </td>
                  <td className="px-4 py-3.5 font-mono text-slate-600 font-medium">
                    {c.document}
                  </td>
                  <td className="px-4 py-3.5 text-slate-600">
                    {c.email}
                  </td>
                  <td className="px-4 py-3.5 text-slate-500">
                    {c.city ? `${c.city} - ${c.state}` : 'São Paulo - SP'}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        isCnpj ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {isCnpj ? 'Pessoa Jurídica' : 'Pessoa Física'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
