import React, { useState } from 'react';
import { useFiscal } from '../context/FiscalContext';
import { X, Plug, Check } from 'lucide-react';

interface CompanySettingsModalProps {
  onClose: () => void;
}

export const CompanySettingsModal: React.FC<CompanySettingsModalProps> = ({ onClose }) => {
  const { company, updateCompany, setCurrentView } = useFiscal();

  const [cnpj, setCnpj] = useState(company.cnpj || '40.731.222/0001-07');
  const [tradeName, setTradeName] = useState(company.tradeName || 'CAMPEAO NEGOCIOS DIGITIAS');
  const [corporateName, setCorporateName] = useState(company.corporateName || 'CAMPEAO NEGOCIOS DIGITAIS LTDA');
  const [stateRegistration, setStateRegistration] = useState(company.stateRegistration || '264108787');
  const [municipalRegistration, setMunicipalRegistration] = useState(company.municipalRegistration || '');

  const [crt, setCrt] = useState(company.crt || 'Simples Nacional');
  const [specialRegime, setSpecialRegime] = useState(
    company.specialRegime || 'Microempresário e Empresa de Pequeno Porte (ME EPP)'
  );
  const [simplesApuracaoRegime, setSimplesApuracaoRegime] = useState(
    company.simplesApuracaoRegime || 'Regime de apuração dos tributos federais e municipal pelo SN'
  );

  const [email, setEmail] = useState(company.email || 'campeao.mkt.user@gmail.com');
  const [phone, setPhone] = useState(company.phone || '(69) 9265-3785');
  const [mobile, setMobile] = useState(company.mobile || '(69) 99265-3785');

  // Address
  const [cep, setCep] = useState(company.address?.zipCode || '88475-000');
  const [logradouro, setLogradouro] = useState(company.address?.street || 'RUA ARCELINA SOUZA BRAND');
  const [numero, setNumero] = useState(company.address?.number || '788');
  const [complemento, setComplemento] = useState(company.address?.complement || '');
  const [bairro, setBairro] = useState(company.address?.neighborhood || 'VILA ANTONIO DAVID');
  const [cidadeEstado, setCidadeEstado] = useState(
    company.address ? `${company.address.city} - ${company.address.state}` : 'Anitápolis - SC'
  );

  const [isSaved, setIsSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const [city, state] = cidadeEstado.split(' - ').map(s => s.trim());

    updateCompany({
      cnpj,
      tradeName,
      corporateName,
      stateRegistration,
      municipalRegistration,
      crt,
      specialRegime,
      simplesApuracaoRegime,
      email,
      phone,
      mobile,
      address: {
        zipCode: cep,
        street: logradouro,
        number: numero,
        complement: complemento,
        neighborhood: bairro,
        city: city || 'Anitápolis',
        state: state || 'SC',
      },
    });

    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 600);
  };

  const handleOpenApiCredentials = () => {
    onClose();
    setCurrentView('api_docs');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-8 overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Purple Accent line matching screenshot */}
        <div className="pt-3 px-6 flex items-center justify-between">
          <div className="w-10 h-1 bg-[#2c0853] rounded-full"></div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSave} className="p-6 pt-2 space-y-4 overflow-y-auto flex-1 text-xs text-slate-700">
          {/* Row 1: CNPJ & Nome Fantasia */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                <span className="text-red-500">*</span> CNPJ
              </label>
              <input
                type="text"
                value={cnpj}
                onChange={e => setCnpj(e.target.value)}
                placeholder="40.731.222/0001-07"
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#2c0853] text-slate-800"
                required
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                <span className="text-red-500">*</span> Nome fantasia
              </label>
              <input
                type="text"
                value={tradeName}
                onChange={e => setTradeName(e.target.value)}
                placeholder="CAMPEAO NEGOCIOS DIGITIAS"
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#2c0853] text-slate-800 uppercase"
                required
              />
            </div>
          </div>

          {/* Row 2: Razão Social, Insc Estadual & Insc Municipal */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <label className="block font-medium text-slate-700 mb-1">
                <span className="text-red-500">*</span> Razão Social
              </label>
              <input
                type="text"
                value={corporateName}
                onChange={e => setCorporateName(e.target.value)}
                placeholder="CAMPEAO NEGOCIOS DIGITAIS LTDA"
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#2c0853] text-slate-800 uppercase"
                required
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Insc Estadual
              </label>
              <input
                type="text"
                value={stateRegistration}
                onChange={e => setStateRegistration(e.target.value)}
                placeholder="264108787"
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#2c0853] text-slate-800"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Insc Municipal
              </label>
              <input
                type="text"
                value={municipalRegistration}
                onChange={e => setMunicipalRegistration(e.target.value)}
                placeholder=""
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#2c0853] text-slate-800"
              />
            </div>
          </div>

          {/* Row 3: CRT & Regime Especial */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                CRT
              </label>
              <select
                value={crt}
                onChange={e => setCrt(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#2c0853] text-slate-800 bg-white"
              >
                <option value="Simples Nacional">Simples Nacional</option>
                <option value="Simples Nacional – MEI">Simples Nacional – MEI</option>
                <option value="Simples Nacional – Excesso Sublimite Receita Bruta">
                  Simples Nacional – Excesso Sublimite Receita Bruta
                </option>
                <option value="Regime Normal">Regime Normal</option>
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Regime Especial
              </label>
              <select
                value={specialRegime}
                onChange={e => setSpecialRegime(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#2c0853] text-slate-800 bg-white"
              >
                <option value="Sem regime especial">Sem regime especial</option>
                <option value="Microempresa Municipal">Microempresa Municipal</option>
                <option value="Estimativa">Estimativa</option>
                <option value="Sociedade de Profissionais">Sociedade de Profissionais</option>
                <option value="Cooperativa">Cooperativa</option>
                <option value="Microempresário Individual (MEI)">Microempresário Individual (MEI)</option>
                <option value="Microempresário e Empresa de Pequeno Porte (ME EPP)">
                  Microempresário e Empresa de Pequeno Porte (ME EPP)
                </option>
                <option value="Profissional Autônomo">Profissional Autônomo</option>
              </select>
            </div>
          </div>

          {/* Row 4: Regime de Apuração dos Tributos do Simples Nacional */}
          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Regime de Apuração dos Tributos do Simples Nacional
            </label>
            <select
              value={simplesApuracaoRegime}
              onChange={e => setSimplesApuracaoRegime(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#2c0853] text-slate-800 bg-white"
            >
              <option value="Regime de apuração dos tributos federais e municipal pelo SN">
                Regime de apuração dos tributos federais e municipal pelo SN
              </option>
              <option value="Regime de apuração dos tributos federais pelo SN e o ISSQN pela NFS-e conforme respectiva legislação municipal">
                Regime de apuração dos tributos federais pelo SN e o ISSQN pela NFS-e conforme respectiva legislação municipal
              </option>
              <option value="Regime de apuração dos tributos federais e municipal pela NFS-e conforme respectivas legislações federais e municipais">
                Regime de apuração dos tributos federais e municipal pela NFS-e conforme respectivas legislações federais e municipais
              </option>
            </select>
          </div>

          {/* Row 5: E-mail, Telefone & Celular */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                E-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="campeao.mkt.user@gmail.com"
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#2c0853] text-slate-800"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Telefone
              </label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="(69) 9265-3785"
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#2c0853] text-slate-800"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Celular
              </label>
              <input
                type="text"
                value={mobile}
                onChange={e => setMobile(e.target.value)}
                placeholder="(69) 99265-3785"
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#2c0853] text-slate-800"
              />
            </div>
          </div>

          {/* Section: Endereço */}
          <div className="pt-2">
            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink mx-4 text-slate-400 font-semibold text-xs uppercase tracking-wider">
                Endereço
              </span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>
          </div>

          {/* Row 6: CEP & Logradouro */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                <span className="text-red-500">*</span> CEP
              </label>
              <input
                type="text"
                value={cep}
                onChange={e => setCep(e.target.value)}
                placeholder="88475-000"
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#2c0853] text-slate-800"
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block font-medium text-slate-700 mb-1">
                <span className="text-red-500">*</span> Logradouro
              </label>
              <input
                type="text"
                value={logradouro}
                onChange={e => setLogradouro(e.target.value)}
                placeholder="RUA ARCELINA SOUZA BRAND"
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#2c0853] text-slate-800 uppercase"
                required
              />
            </div>
          </div>

          {/* Row 7: Número & Complemento */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                <span className="text-red-500">*</span> Número
              </label>
              <input
                type="text"
                value={numero}
                onChange={e => setNumero(e.target.value)}
                placeholder="788"
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#2c0853] text-slate-800"
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block font-medium text-slate-700 mb-1">
                Complemento
              </label>
              <input
                type="text"
                value={complemento}
                onChange={e => setComplemento(e.target.value)}
                placeholder=""
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#2c0853] text-slate-800"
              />
            </div>
          </div>

          {/* Row 8: Bairro & Cidade/Estado */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                <span className="text-red-500">*</span> Bairro
              </label>
              <input
                type="text"
                value={bairro}
                onChange={e => setBairro(e.target.value)}
                placeholder="VILA ANTONIO DAVID"
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#2c0853] text-slate-800 uppercase"
                required
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                <span className="text-red-500">*</span> Cidade/Estado
              </label>
              <select
                value={cidadeEstado}
                onChange={e => setCidadeEstado(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#2c0853] text-slate-800 bg-white"
                required
              >
                <option value="Anitápolis - SC">Anitápolis - SC</option>
                <option value="Florianópolis - SC">Florianópolis - SC</option>
                <option value="São José - SC">São José - SC</option>
                <option value="Palhoça - SC">Palhoça - SC</option>
                <option value="Blumenau - SC">Blumenau - SC</option>
                <option value="Joinville - SC">Joinville - SC</option>
                <option value="São Paulo - SP">São Paulo - SP</option>
                <option value="Rio de Janeiro - RJ">Rio de Janeiro - RJ</option>
                <option value="Curitiba - PR">Curitiba - PR</option>
                <option value="Porto Velho - RO">Porto Velho - RO</option>
              </select>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={handleOpenApiCredentials}
              className="px-4 py-2 rounded-full border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium text-xs flex items-center gap-2 transition-colors"
            >
              <Plug className="w-4 h-4 text-slate-500" />
              <span>Credenciais da API</span>
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 rounded-full border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium text-xs transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-2 rounded-full bg-[#2c0853] hover:bg-[#3d0b72] text-white font-semibold text-xs shadow-sm shadow-purple-950/20 transition-all flex items-center gap-1.5"
              >
                {isSaved ? <Check className="w-4 h-4" /> : null}
                <span>{isSaved ? 'Salvo!' : 'Salvar'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
