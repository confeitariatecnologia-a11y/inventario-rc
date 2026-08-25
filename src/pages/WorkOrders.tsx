import { useEffect, useState, useMemo } from 'react';
import {
  Wrench,
  Plus,
  Search,
  CheckCircle2,
  ShieldCheck,
  X,
  Navigation,
  DollarSign,
  ChevronRight,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import type { WorkOrder, TechnicalTeam, UserAccess, Asset, Location, WorkOrderPriority, WorkOrderStatus } from '@/types';
import { useAuth } from '@/lib/auth';
import { getCachedData } from '@/lib/dataCache';

const PRIORITY_LABELS: Record<WorkOrderPriority, string> = {
  baixa: 'Baixa',
  normal: 'Normal',
  alta: 'Alta',
  critica: 'Crítica (Urgente)',
};

const PRIORITY_STYLES: Record<WorkOrderPriority, string> = {
  baixa: 'bg-slate-100 text-slate-700 border-slate-200',
  normal: 'bg-blue-50 text-blue-700 border-blue-200',
  alta: 'bg-amber-50 text-amber-700 border-amber-200',
  critica: 'bg-red-50 text-red-700 border-red-200 animate-pulse',
};

const STATUS_LABELS: Record<WorkOrderStatus, string> = {
  aberta: 'Aberta',
  em_atendimento: 'Em Atendimento',
  aguardando_peca: 'Aguardando Peça',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
};

const STATUS_STYLES: Record<WorkOrderStatus, string> = {
  aberta: 'bg-blue-50 text-blue-700',
  em_atendimento: 'bg-amber-50 text-amber-700',
  aguardando_peca: 'bg-purple-50 text-purple-700',
  concluida: 'bg-emerald-50 text-emerald-700',
  cancelada: 'bg-slate-100 text-slate-600',
};

export default function WorkOrders() {
  const { user, access } = useAuth();
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [teams, setTeams] = useState<TechnicalTeam[]>([]);
  const [technicians, setTechnicians] = useState<UserAccess[]>([]);
  const [assets, setAssets] = useState<Asset[]>(() => getCachedData<Asset[]>('all_assets') || []);
  const [locations, setLocations] = useState<Location[]>(() => getCachedData<Location[]>('all_locations') || []);
  const [_loading, setLoading] = useState(true);
  const [_error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, _setPriorityFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'all' | 'my' | 'teams_bi'>('all');

  // Modals
  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<WorkOrder | null>(null);
  const [showExecuteModal, setShowExecuteModal] = useState(false);

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formAssetId, setFormAssetId] = useState('');
  const [formLocationId, setFormLocationId] = useState('');
  const [formTeamId, setFormTeamId] = useState('');
  const [formTechId, setFormTechId] = useState('');
  const [formPriority, setFormPriority] = useState<WorkOrderPriority>('normal');
  const [formSlaHours, setFormSlaHours] = useState<number>(24);
  const [saving, setSaving] = useState(false);

  // Execution State (Field Tech)
  const [execStatus, setExecStatus] = useState<WorkOrderStatus>('em_atendimento');
  const [execParts, setExecParts] = useState('');
  const [execPartsCost, setExecPartsCost] = useState<number>(0);
  const [execNotes, setExecNotes] = useState('');
  const [execGps, setExecGps] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    try {
      setLoading(true);
      const [ordersRes, teamsRes, techRes, locsRes, assetsRes] = await Promise.all([
        supabase.from('work_orders').select('*, asset:assets(*), location:locations(*), team:technical_teams(*), technician:user_accesses(*)').order('created_at', { ascending: false }),
        supabase.from('technical_teams').select('*').order('name'),
        supabase.from('user_accesses').select('*, team:technical_teams(*)').order('full_name'),
        supabase.from('locations').select('*').order('name'),
        supabase.from('assets').select('*').order('name'),
      ]);

      if (ordersRes.data) setOrders(ordersRes.data);
      if (teamsRes.data) setTeams(teamsRes.data);
      if (techRes.data) setTechnicians(techRes.data);
      if (locsRes.data) setLocations(locsRes.data);
      if (assetsRes.data) setAssets(assetsRes.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar Ordens de Serviço');
    } finally {
      setLoading(false);
    }
  }

  // Handle GPS Checkin
  function captureGPS() {
    setGpsLoading(true);
    if (!navigator.geolocation) {
      alert('Geolocalização não suportada neste dispositivo.');
      setGpsLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setExecGps({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsLoading(false);
      },
      (err) => {
        alert(`Erro ao obter GPS: ${err.message}`);
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  // Create Order
  async function handleCreateOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!formTitle.trim()) return;

    setSaving(true);
    try {
      const code = `OS-${new Date().getFullYear()}-${String(orders.length + 1).padStart(4, '0')}`;
      const slaDeadline = new Date(Date.now() + formSlaHours * 60 * 60 * 1000).toISOString();

      const newOrder = {
        code,
        title: formTitle.trim(),
        description: formDesc.trim() || null,
        asset_id: formAssetId || null,
        location_id: formLocationId || null,
        team_id: formTeamId || null,
        technician_id: formTechId || null,
        priority: formPriority,
        status: 'aberta' as WorkOrderStatus,
        sla_deadline: slaDeadline,
        created_by: access?.full_name || user?.email || 'Administrador',
      };

      const { data: _data, error: insErr } = await supabase.from('work_orders').insert(newOrder).select().single();
      if (insErr) throw insErr;

      setShowNewModal(false);
      resetForm();
      await loadAll();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao criar Ordem de Serviço');
    } finally {
      setSaving(false);
    }
  }

  // Execute / Update Order
  async function handleSaveExecution() {
    if (!selectedOrder) return;
    setSaving(true);
    try {
      const updates: Partial<WorkOrder> = {
        status: execStatus,
        parts_replaced: execParts || null,
        parts_cost: execPartsCost || 0,
        total_cost: execPartsCost || 0,
        resolution_notes: execNotes || null,
        updated_at: new Date().toISOString(),
      };

      if (execStatus === 'em_atendimento' && !selectedOrder.started_at) {
        updates.started_at = new Date().toISOString();
        if (execGps) {
          updates.checkin_lat = execGps.lat;
          updates.checkin_lng = execGps.lng;
          updates.checkin_time = new Date().toISOString();
        }
      }

      if (execStatus === 'concluida') {
        updates.completed_at = new Date().toISOString();
        if (execGps) {
          updates.checkout_lat = execGps.lat;
          updates.checkout_lng = execGps.lng;
          updates.checkout_time = new Date().toISOString();
        }
      }

      const { error: updErr } = await supabase.from('work_orders').update(updates).eq('id', selectedOrder.id);
      if (updErr) throw updErr;

      setShowExecuteModal(false);
      setSelectedOrder(null);
      await loadAll();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao salvar atendimento');
    } finally {
      setSaving(false);
    }
  }

  function resetForm() {
    setFormTitle('');
    setFormDesc('');
    setFormAssetId('');
    setFormLocationId('');
    setFormTeamId('');
    setFormTechId('');
    setFormPriority('normal');
    setFormSlaHours(24);
  }

  // Metrics & SLA Calculations
  const metrics = useMemo(() => {
    const total = orders.length;
    const open = orders.filter((o) => o.status === 'aberta' || o.status === 'em_atendimento').length;
    const completed = orders.filter((o) => o.status === 'concluida');
    
    // SLA compliance
    const withinSla = completed.filter((o) => {
      if (!o.sla_deadline || !o.completed_at) return true;
      return new Date(o.completed_at) <= new Date(o.sla_deadline);
    }).length;

    const slaRate = completed.length ? Math.round((withinSla / completed.length) * 100) : 100;
    const totalSpent = orders.reduce((sum, o) => sum + (Number(o.total_cost) || 0), 0);

    return { total, open, completedCount: completed.length, slaRate, totalSpent };
  }, [orders]);

  // Team BI Data
  const teamStats = useMemo(() => {
    return teams.map((team) => {
      const teamOrders = orders.filter((o) => o.team_id === team.id);
      const teamCompleted = teamOrders.filter((o) => o.status === 'concluida');
      const teamWithinSla = teamCompleted.filter((o) => {
        if (!o.sla_deadline || !o.completed_at) return true;
        return new Date(o.completed_at) <= new Date(o.sla_deadline);
      }).length;

      const slaPercent = teamCompleted.length ? Math.round((teamWithinSla / teamCompleted.length) * 100) : 100;
      const teamCost = teamOrders.reduce((s, o) => s + (Number(o.total_cost) || 0), 0);

      return {
        id: team.id,
        name: team.name,
        color: team.color || '#2563eb',
        total: teamOrders.length,
        open: teamOrders.filter((o) => o.status === 'aberta' || o.status === 'em_atendimento').length,
        completed: teamCompleted.length,
        slaPercent,
        totalCost: teamCost,
      };
    });
  }, [teams, orders]);

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (activeTab === 'my' && o.technician?.email !== user?.email) return false;
      if (teamFilter !== 'all' && o.team_id !== teamFilter) return false;
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && o.priority !== priorityFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const matches =
          o.code.toLowerCase().includes(q) ||
          o.title.toLowerCase().includes(q) ||
          (o.asset?.name?.toLowerCase().includes(q) ?? false) ||
          (o.location?.name?.toLowerCase().includes(q) ?? false) ||
          (o.technician?.full_name?.toLowerCase().includes(q) ?? false);
        if (!matches) return false;
      }
      return true;
    });
  }, [orders, activeTab, teamFilter, statusFilter, priorityFilter, search, user]);

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Gestão de Ordens de Serviço & Equipes"
        subtitle="Controle de atendimentos, métricas de SLA, geolocalização e histórico de manutenção"
        actions={
          <button
            onClick={() => setShowNewModal(true)}
            className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nova Ordem de Serviço
          </button>
        }
      />

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-1">
            <Wrench className="w-4 h-4 text-primary-600" />
            Total de OS Abertas
          </div>
          <p className="text-2xl font-bold text-amber-600">{metrics.open}</p>
          <p className="text-xs text-slate-400 mt-0.5">{metrics.total} chamados registrados</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            OS Concluídas
          </div>
          <p className="text-2xl font-bold text-emerald-700">{metrics.completedCount}</p>
          <p className="text-xs text-slate-400 mt-0.5">Histórico atendido</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-1">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            Cumprimento de SLA
          </div>
          <p className="text-2xl font-bold text-indigo-700">{metrics.slaRate}%</p>
          <p className="text-xs text-slate-400 mt-0.5">Meta atingida no prazo</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-1">
            <DollarSign className="w-4 h-4 text-slate-700" />
            Custo Total de Manutenção
          </div>
          <p className="text-xl font-bold text-slate-900">{formatCurrency(metrics.totalSpent)}</p>
          <p className="text-xs text-slate-400 mt-0.5">Peças e reparos</p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 mb-5 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
            activeTab === 'all' ? 'bg-primary-50 text-primary-700' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          Todas as Ordens ({orders.length})
        </button>
        <button
          onClick={() => setActiveTab('my')}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
            activeTab === 'my' ? 'bg-primary-50 text-primary-700' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          Minhas Atribuições
        </button>
        <button
          onClick={() => setActiveTab('teams_bi')}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
            activeTab === 'teams_bi' ? 'bg-primary-50 text-primary-700' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          Comparativo de Equipes & SLA
        </button>
      </div>

      {activeTab === 'teams_bi' ? (
        /* Team BI & Comparison View */
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {teamStats.map((team) => (
              <div key={team.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: team.color }} />
                    <h4 className="font-bold text-slate-900 text-base">{team.name}</h4>
                  </div>
                  <span className={`px-2.5 py-1 text-xs font-bold rounded-lg ${team.slaPercent >= 90 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                    {team.slaPercent}% SLA
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-lg text-center mb-3">
                  <div>
                    <p className="text-[11px] text-slate-500">Total OS</p>
                    <p className="text-base font-bold text-slate-900">{team.total}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-500">Em Aberto</p>
                    <p className="text-base font-bold text-amber-600">{team.open}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-500">Custo Total</p>
                    <p className="text-xs font-bold text-slate-800 mt-1">{formatCurrency(team.totalCost)}</p>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-slate-600 mb-1 font-medium">
                    <span>Conformidade de SLA</span>
                    <span>{team.slaPercent}% no prazo</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${team.slaPercent}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Orders List & Table View */
        <>
          {/* Filters Bar */}
          <div className="bg-white rounded-xl border border-slate-200 p-3 mb-4 flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por código (OS-XXXX), bem, filial ou técnico..."
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <select
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              className="px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-lg bg-white"
            >
              <option value="all">Todas as Equipes</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-lg bg-white"
            >
              <option value="all">Todos os Status</option>
              <option value="aberta">Aberta</option>
              <option value="em_atendimento">Em Atendimento</option>
              <option value="aguardando_peca">Aguardando Peça</option>
              <option value="concluida">Concluída</option>
            </select>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Código / Título</th>
                    <th className="py-3 px-4 hidden md:table-cell">Ativo Patrimonial</th>
                    <th className="py-3 px-4">Unidade</th>
                    <th className="py-3 px-4 hidden lg:table-cell">Equipe / Técnico</th>
                    <th className="py-3 px-4">Prioridade</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        Nenhuma ordem de serviço encontrada com os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((os) => {
                      const isExpired = os.sla_deadline && new Date(os.sla_deadline) < new Date() && os.status !== 'concluida';
                      return (
                        <tr key={os.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-primary-700">{os.code}</span>
                              {isExpired && (
                                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-100 text-red-700 rounded">SLA VENCIDO</span>
                              )}
                            </div>
                            <p className="font-medium text-slate-900 truncate max-w-[200px]">{os.title}</p>
                          </td>
                          <td className="py-3 px-4 hidden md:table-cell">
                            {os.asset ? (
                              <div>
                                <p className="font-medium text-slate-900 truncate max-w-[180px]">{os.asset.name}</p>
                                <p className="font-mono text-xs text-slate-500">{os.asset.asset_code}</p>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">Geral / Sem ativo</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-700">{os.location?.name || '—'}</td>
                          <td className="py-3 px-4 hidden lg:table-cell">
                            <p className="font-semibold text-slate-800">{os.team?.name || 'Não atribuída'}</p>
                            <p className="text-xs text-slate-500">{os.technician?.full_name || 'Sem técnico'}</p>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-md border ${PRIORITY_STYLES[os.priority]}`}>
                              {PRIORITY_LABELS[os.priority]}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2.5 py-1 text-xs font-semibold rounded-lg ${STATUS_STYLES[os.status]}`}>
                              {STATUS_LABELS[os.status]}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => {
                                setSelectedOrder(os);
                                setExecStatus(os.status);
                                setExecParts(os.parts_replaced || '');
                                setExecPartsCost(os.parts_cost || 0);
                                setExecNotes(os.resolution_notes || '');
                                setShowExecuteModal(true);
                              }}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-800 bg-primary-50 px-2.5 py-1.5 rounded-lg border border-primary-200"
                            >
                              Atender / Detalhes
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Modal Nova OS */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden animate-slide-up">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-base">Abrir Nova Ordem de Serviço</h3>
              <button onClick={() => setShowNewModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="p-6 space-y-3.5 text-xs sm:text-sm">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Título do Chamado / Problema *</label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Ex: Ar condicionado da loja Oeste parou de gelar"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Filial / Unidade *</label>
                  <select
                    required
                    value={formLocationId}
                    onChange={(e) => setFormLocationId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="">Selecione a Filial...</option>
                    {locations.map((l) => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Equipe Responsável</label>
                  <select
                    value={formTeamId}
                    onChange={(e) => setFormTeamId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="">Selecione a Equipe...</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Ativo Patrimonial (Opcional)</label>
                  <select
                    value={formAssetId}
                    onChange={(e) => setFormAssetId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="">Selecione o Ativo...</option>
                    {assets.slice(0, 300).map((a) => (
                      <option key={a.id} value={a.id}>{a.asset_code} - {a.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Técnico Designado</label>
                  <select
                    value={formTechId}
                    onChange={(e) => setFormTechId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="">Selecione o Técnico...</option>
                    {technicians.map((tc) => (
                      <option key={tc.id} value={tc.id}>{tc.full_name} ({tc.role})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Prioridade</label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as WorkOrderPriority)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="baixa">Baixa</option>
                    <option value="normal">Normal</option>
                    <option value="alta">Alta</option>
                    <option value="critica">Crítica (Urgente)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Prazo SLA (Horas)</label>
                  <input
                    type="number"
                    value={formSlaHours}
                    onChange={(e) => setFormSlaHours(Number(e.target.value))}
                    min={1}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Descrição Detalhada</label>
                <textarea
                  rows={3}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Relate sintomas, mensagens de erro ou orientações para a equipe técnica..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-white bg-primary-600 hover:bg-primary-700 font-semibold rounded-lg shadow-sm disabled:opacity-50"
                >
                  {saving ? 'Criando...' : 'Abrir Ordem de Serviço'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Atendimento / Execução (Técnico e Admin) */}
      {showExecuteModal && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-slide-up">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-primary-700 text-lg">{selectedOrder.code}</span>
                <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-lg ${STATUS_STYLES[selectedOrder.status]}`}>
                  {STATUS_LABELS[selectedOrder.status]}
                </span>
              </div>
              <button onClick={() => setShowExecuteModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs sm:text-sm">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h4 className="font-bold text-slate-900 text-base">{selectedOrder.title}</h4>
                <p className="text-slate-600 mt-1">{selectedOrder.description || 'Sem descrição detalhada.'}</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3 text-xs text-slate-500 pt-2 border-t border-slate-200">
                  <div>Loja: <strong>{selectedOrder.location?.name || '-'}</strong></div>
                  <div>Equipe: <strong>{selectedOrder.team?.name || '-'}</strong></div>
                  <div>Prazo SLA: <strong>{selectedOrder.sla_deadline ? formatDateTime(selectedOrder.sla_deadline) : '-'}</strong></div>
                </div>
              </div>

              {/* GPS Check-in */}
              <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-blue-900 flex items-center gap-1.5">
                    <Navigation className="w-4 h-4 text-blue-600" />
                    Geolocalização / Check-in Automático no Local
                  </span>
                  <button
                    type="button"
                    onClick={captureGPS}
                    disabled={gpsLoading}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold"
                  >
                    {gpsLoading ? 'Obtendo GPS...' : 'Registrar GPS no Local'}
                  </button>
                </div>
                {execGps ? (
                  <p className="text-xs text-emerald-700 font-mono">
                    ✅ GPS Capturado com Sucesso: Lat {execGps.lat.toFixed(5)}, Lng {execGps.lng.toFixed(5)} às {new Date().toLocaleTimeString()}
                  </p>
                ) : (
                  <p className="text-xs text-blue-600">
                    O carimbo de GPS e data/hora valida a presença física do técnico na filial.
                  </p>
                )}
              </div>

              {/* Status Update */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Atualizar Status da OS *</label>
                <select
                  value={execStatus}
                  onChange={(e) => setExecStatus(e.target.value as WorkOrderStatus)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white font-semibold"
                >
                  <option value="aberta">Aberta</option>
                  <option value="em_atendimento">Em Atendimento (Iniciado)</option>
                  <option value="aguardando_peca">Aguardando Peça / Fornecedor</option>
                  <option value="concluida">Concluída com Sucesso</option>
                  <option value="cancelada">Cancelada</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Peças Trocadas / Utilizadas</label>
                  <input
                    type="text"
                    value={execParts}
                    onChange={(e) => setExecParts(e.target.value)}
                    placeholder="Ex: Compressor 30.000 BTUs, Termostato"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Custo Total das Peças (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={execPartsCost}
                    onChange={(e) => setExecPartsCost(Number(e.target.value))}
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Laudo Técnico / Observações da Resolução</label>
                <textarea
                  rows={3}
                  value={execNotes}
                  onChange={(e) => setExecNotes(e.target.value)}
                  placeholder="Descreva o serviço executado, testes de funcionamento realizados e recomendações preventivas..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowExecuteModal(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={handleSaveExecution}
                disabled={saving}
                className="px-5 py-2 text-white bg-primary-600 hover:bg-primary-700 font-semibold rounded-lg shadow-sm disabled:opacity-50"
              >
                {saving ? 'Gravando...' : 'Salvar Atendimento da OS'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
