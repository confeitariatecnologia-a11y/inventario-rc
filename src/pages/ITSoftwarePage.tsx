import { useEffect, useState, useMemo } from 'react';
import {
  Plus,
  Search,
  Calendar,
  AlertTriangle,
  X,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { ITLicense, Asset, LicenseType } from '@/types';
import { getCachedData } from '@/lib/dataCache';

const DEFAULT_LICENSES: ITLicense[] = [
  {
    id: 'lic-1',
    software_name: 'Microsoft 365 Business Standard',
    vendor: 'Microsoft',
    license_type: 'anual',
    license_key: 'MS365-CORP-RICHESSE-2026',
    seats_total: 45,
    seats_used: 42,
    cost: 4850,
    renewal_date: '2026-11-30',
    status: 'ativo',
    notes: 'Pacote Office, Teams e Exchange para lojas e diretoria.',
    created_at: new Date().toISOString(),
  },
  {
    id: 'lic-2',
    software_name: 'Kaspersky Endpoint Security Cloud',
    vendor: 'Kaspersky',
    license_type: 'anual',
    license_key: 'KASP-SEC-9981-BR',
    seats_total: 100,
    seats_used: 94,
    cost: 3200,
    renewal_date: '2026-09-15',
    status: 'expirando',
    notes: 'Proteção antivírus de todos os terminais de caixa e escritórios.',
    created_at: new Date().toISOString(),
  },
  {
    id: 'lic-3',
    software_name: 'ERP Totvs / Linx Confeitaria',
    vendor: 'Linx',
    license_type: 'mensal',
    license_key: 'LINX-POS-RICHESSE',
    seats_total: 25,
    seats_used: 25,
    cost: 5900,
    renewal_date: '2026-12-31',
    status: 'ativo',
    notes: 'Frente de caixa (PDV) e retaguarda fiscal de todas as 7 unidades.',
    created_at: new Date().toISOString(),
  },
  {
    id: 'lic-4',
    software_name: 'AnyDesk Enterprise (Suporte Remoto)',
    vendor: 'AnyDesk',
    license_type: 'anual',
    license_key: 'ANYD-TI-REMOTE',
    seats_total: 5,
    seats_used: 4,
    cost: 1450,
    renewal_date: '2027-02-28',
    status: 'ativo',
    notes: 'Acesso remoto da equipe de TI para suporte aos caixas.',
    created_at: new Date().toISOString(),
  },
];

export default function ITSoftwarePage() {
  const [licenses, setLicenses] = useState<ITLicense[]>(DEFAULT_LICENSES);
  const [_assets, _setAssets] = useState<Asset[]>(() => getCachedData<Asset[]>('all_assets') || []);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [formName, setFormName] = useState('');
  const [formVendor, setFormVendor] = useState('');
  const [formKey, setFormKey] = useState('');
  const [formType, setFormType] = useState<LicenseType>('anual');
  const [formSeats, setFormSeats] = useState<number>(1);
  const [formCost, setFormCost] = useState<number>(0);
  const [formRenewal, setFormRenewal] = useState('');
  const [formNotes, setFormNotes] = useState('');

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('it_licenses').select('*').order('software_name');
      if (data && data.length > 0) {
        setLicenses(data);
      }
    }
    load();
  }, []);

  const metrics = useMemo(() => {
    const totalLicenses = licenses.length;
    const totalCost = licenses.reduce((s, l) => s + (Number(l.cost) || 0), 0);
    const totalSeats = licenses.reduce((s, l) => s + l.seats_total, 0);
    const usedSeats = licenses.reduce((s, l) => s + l.seats_used, 0);
    const expiring = licenses.filter((l) => l.status === 'expirando' || l.status === 'expirado').length;

    return { totalLicenses, totalCost, totalSeats, usedSeats, expiring };
  }, [licenses]);

  const filtered = useMemo(() => {
    return licenses.filter((l) => {
      if (statusFilter !== 'all' && l.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return l.software_name.toLowerCase().includes(q) || (l.vendor?.toLowerCase().includes(q) ?? false);
      }
      return true;
    });
  }, [licenses, search, statusFilter]);

  async function handleCreateLicense(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim()) return;

    const newLic: ITLicense = {
      id: `lic-${Date.now()}`,
      software_name: formName.trim(),
      vendor: formVendor.trim() || null,
      license_key: formKey.trim() || null,
      license_type: formType,
      seats_total: formSeats,
      seats_used: 0,
      cost: formCost,
      renewal_date: formRenewal || null,
      status: 'ativo',
      notes: formNotes.trim() || null,
      created_at: new Date().toISOString(),
    };

    try {
      await supabase.from('it_licenses').insert(newLic);
    } catch {
      // Fallback local
    }

    setLicenses([newLic, ...licenses]);
    setShowModal(false);
    resetForm();
  }

  function resetForm() {
    setFormName('');
    setFormVendor('');
    setFormKey('');
    setFormType('anual');
    setFormSeats(1);
    setFormCost(0);
    setFormRenewal('');
    setFormNotes('');
  }

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Gestão de TI: Licenças de Software & Sistemas"
        subtitle="Controle de assinaturas, licenças de sistemas, estações de trabalho e alertas de renovação"
        actions={
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Cadastrar Nova Licença
          </button>
        }
      />

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 font-semibold mb-1">Softwares & Sistemas</p>
          <p className="text-2xl font-bold text-slate-900">{metrics.totalLicenses}</p>
          <p className="text-xs text-slate-400 mt-0.5">Sistemas corporativos ativos</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 font-semibold mb-1">Assentos / Usuários</p>
          <p className="text-2xl font-bold text-primary-700">{metrics.usedSeats} / {metrics.totalSeats}</p>
          <p className="text-xs text-slate-400 mt-0.5">{Math.round((metrics.usedSeats / (metrics.totalSeats || 1)) * 100)}% de ocupação</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 font-semibold mb-1">Custo Total de Softwares</p>
          <p className="text-xl font-bold text-slate-900">{formatCurrency(metrics.totalCost)}</p>
          <p className="text-xs text-slate-400 mt-0.5">Investimento em TI</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-amber-600 font-semibold mb-1 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" /> Próximos de Vencer
          </p>
          <p className="text-2xl font-bold text-amber-600">{metrics.expiring}</p>
          <p className="text-xs text-amber-600 mt-0.5">Atenção para renovação</p>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 mb-5 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por software ou fornecedor..."
            className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-lg"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-lg bg-white"
        >
          <option value="all">Todos os Status</option>
          <option value="ativo">Ativo</option>
          <option value="expirando">Expirando</option>
          <option value="expirado">Expirado</option>
        </select>
      </div>

      {/* Licenses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((lic) => (
          <div key={lic.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:border-primary-300 transition-all">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <span className="text-[11px] font-bold text-primary-600 uppercase tracking-wider">{lic.vendor || 'Software'}</span>
                <h4 className="font-bold text-slate-900 text-base">{lic.software_name}</h4>
              </div>
              <span className={`px-2.5 py-0.5 text-xs font-bold rounded-md ${lic.status === 'ativo' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                {lic.status === 'ativo' ? 'Ativo' : 'Renovação Próxima'}
              </span>
            </div>

            <p className="text-xs text-slate-600 mb-3">{lic.notes || 'Sem observações adicionais.'}</p>

            <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-lg text-center mb-3">
              <div>
                <p className="text-[10px] text-slate-500">Chave / Identificador</p>
                <p className="font-mono text-xs font-bold text-slate-700 truncate">{lic.license_key || 'Conta Cloud'}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500">Assentos em Uso</p>
                <p className="text-xs font-bold text-slate-900">{lic.seats_used} de {lic.seats_total}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500">Valor / Renovação</p>
                <p className="text-xs font-bold text-indigo-700">{formatCurrency(lic.cost)}</p>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Vencimento: <strong>{lic.renewal_date ? formatDate(lic.renewal_date) : 'Vitalícia'}</strong>
              </span>
              <span className="font-medium text-slate-600 capitalize">Plano {lic.license_type}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Nova Licença */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-slide-up">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900">Cadastrar Licença de Software</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLicense} className="p-6 space-y-3 text-xs sm:text-sm">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nome do Software / Sistema *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex: Microsoft 365, Linx ERP, AnyDesk"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Fabricante / Fornecedor</label>
                  <input
                    type="text"
                    value={formVendor}
                    onChange={(e) => setFormVendor(e.target.value)}
                    placeholder="Ex: Microsoft"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tipo de Plano</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as LicenseType)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="mensal">Mensal</option>
                    <option value="anual">Anual</option>
                    <option value="vitalicia">Vitalícia</option>
                    <option value="por_usuario">Por Usuário</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Chave da Licença (Product Key)</label>
                <input
                  type="text"
                  value={formKey}
                  onChange={(e) => setFormKey(e.target.value)}
                  placeholder="XXXXX-XXXXX-XXXXX"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Total de Assentos (Usuários)</label>
                  <input
                    type="number"
                    min={1}
                    value={formSeats}
                    onChange={(e) => setFormSeats(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Custo Total (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formCost}
                    onChange={(e) => setFormCost(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Data de Renovação / Vencimento</label>
                <input
                  type="date"
                  value={formRenewal}
                  onChange={(e) => setFormRenewal(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-white bg-primary-600 hover:bg-primary-700 font-semibold rounded-lg shadow-sm"
                >
                  Salvar Licença
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
