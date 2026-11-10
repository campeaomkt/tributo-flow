import React, { useState } from 'react';
import { useFiscal } from '../context/FiscalContext';
import { 
  Code2, 
  Terminal, 
  Copy, 
  Check, 
  Key, 
  Send, 
  ShieldCheck, 
  ExternalLink,
  BookOpen
} from 'lucide-react';

export const ApiDocsView: React.FC = () => {
  const { company } = useFiscal();
  const [apiKey, setApiKey] = useState('spd_live_8f9021da7c0942e19ba48c');
  const [copiedKey, setCopiedKey] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<'curl' | 'javascript' | 'python'>('curl');

  const copyApiKey = () => {
    navigator.clipboard.writeText(apiKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const curlExample = `curl -X POST https://api.tributoflow.com.br/v1/invoices \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "external_id": "SALE-98129",
    "customer": {
      "name": "Maria Clara Oliveira",
      "document": "394.819.201-92",
      "email": "maria.clara@gmail.com"
    },
    "service": {
      "product_name": "MEU CURSO ONLINE",
      "amount": 97.00,
      "code": "${company.serviceCode}",
      "cnae": "${company.cnaePrincipal}"
    },
    "options": {
      "send_email": true,
      "warranty_days": 7
    }
  }'`;

  const jsExample = `import axios from 'axios';

const response = await axios.post('https://api.tributoflow.com.br/v1/invoices', {
  external_id: 'SALE-98129',
  customer: {
    name: 'Maria Clara Oliveira',
    document: '394.819.201-92',
    email: 'maria.clara@gmail.com'
  },
  service: {
    product_name: 'MEU CURSO ONLINE',
    amount: 97.00,
    code: '${company.serviceCode}',
    cnae: '${company.cnaePrincipal}'
  },
  options: {
    send_email: true,
    warranty_days: 7
  }
}, {
  headers: {
    Authorization: 'Bearer ${apiKey}',
    'Content-Type': 'application/json'
  }
});

console.log('Nota emitida:', response.data.number, response.data.verification_code);`;

  const pythonExample = `import requests

url = "https://api.tributoflow.com.br/v1/invoices"
headers = {
    "Authorization": "Bearer ${apiKey}",
    "Content-Type": "application/json"
}
payload = {
    "external_id": "SALE-98129",
    "customer": {
        "name": "Maria Clara Oliveira",
        "document": "394.819.201-92",
        "email": "maria.clara@gmail.com"
    },
    "service": {
        "product_name": "MEU CURSO ONLINE",
        "amount": 97.00,
        "code": "${company.serviceCode}",
        "cnae": "${company.cnaePrincipal}"
    },
    "options": {
        "send_email": True,
        "warranty_days": 7
    }
}

response = requests.post(url, json=payload, headers=headers)
print(response.json())`;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">API RESTful & Emissão Programática</h1>
          <p className="text-xs text-slate-500">
            Emita notas fiscais eletrônicas diretamente do seu backend, checkout próprio, aplicativo ou ERP
          </p>
        </div>
      </div>

      {/* API Key Box */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-purple-600" />
            <h2 className="font-bold text-slate-800 text-sm">Chave de API (Secret Key)</h2>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
            Ambiente de Produção
          </span>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="password"
            readOnly
            value={apiKey}
            className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 border border-slate-200 font-mono text-xs text-slate-800 select-all"
          />
          <button
            onClick={copyApiKey}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#2c0853] hover:bg-[#3d0b72] text-white font-semibold text-xs transition-colors"
          >
            {copiedKey ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
            <span>{copiedKey ? 'Copiado!' : 'Copiar Chave'}</span>
          </button>
        </div>
        <p className="text-[11px] text-slate-400">
          Nunca exponha sua chave no frontend público. Envie sempre no cabeçalho <code className="text-purple-700 bg-purple-50 px-1 py-0.5 rounded">Authorization: Bearer YOUR_KEY</code> a partir do seu servidor.
        </p>
      </div>

      {/* Endpoint documentation */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded-md bg-emerald-600 text-white font-mono font-bold text-xs">
              POST
            </span>
            <span className="font-mono text-xs font-bold text-slate-800">
              https://api.tributoflow.com.br/v1/invoices
            </span>
          </div>
          <div className="flex items-center gap-1">
            {(['curl', 'javascript', 'python'] as const).map(lang => (
              <button
                key={lang}
                onClick={() => setSelectedLanguage(lang)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold uppercase transition-all ${
                  selectedLanguage === lang
                    ? 'bg-purple-900 text-white'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {lang}
              </button>
            ))}
          </div>
        </div>

        <div className="p-5 bg-slate-950 text-slate-200 font-mono text-xs overflow-x-auto leading-relaxed">
          <pre>
            {selectedLanguage === 'curl' && curlExample}
            {selectedLanguage === 'javascript' && jsExample}
            {selectedLanguage === 'python' && pythonExample}
          </pre>
        </div>

        <div className="p-5 border-t border-slate-200 space-y-3 bg-white text-xs">
          <h3 className="font-bold text-slate-800">Resposta da Emissão (HTTP 201 Created):</h3>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 font-mono text-[11px] text-slate-700 leading-relaxed overflow-x-auto">
{`{
  "status": "success",
  "invoice": {
    "number": "20260000451",
    "series": "1",
    "verification_code": "VER-98FA-11C2",
    "access_key": "35261040731222000107550010000020260000451100918231",
    "status": "EMITIDA",
    "issued_at": "2026-10-29T12:45:00Z",
    "gross_amount": 19.90,
    "net_amount": 18.70,
    "taxes": {
      "effective_rate": 6.0,
      "total_tax": 1.20,
      "iss": 0.40
    },
    "xml_url": "https://api.tributoflow.com.br/v1/invoices/20260000451/xml",
    "danfse_url": "https://api.tributoflow.com.br/v1/invoices/20260000451/danfe.pdf"
  }
}`}
          </div>
        </div>
      </div>
    </div>
  );
};
