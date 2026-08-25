import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  MapPin,
  User,
  Calendar,
  DollarSign,
  Shield,
  Tag,
  Wrench,
  ArrowRightLeft,
  MessageSquare,
  QrCode as QrIcon,
  Printer,
  Pencil,
  Trash2,
  FileSignature,
  Coins,
  X,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '@/lib/supabase';
import { PageHeader, Spinner, ErrorState, StatusBadge, ConfirmDialog, AssetFormModal } from '@/components';
import type { Asset, AssetMovement, AssetStatus, MovementType } from '@/types';
import {
  formatDate,
  formatDateTime,
  formatCurrency,
  MOVEMENT_LABELS,
  STATUS_LABELS,
  STATUS_STYLES,
} from '@/lib/utils';
import { calculateDepreciation } from '@/lib/depreciation';
import { generateTermoResponsabilidadePDF } from '@/lib/exportUtils';
import { invalidateCache } from '@/lib/dataCache';

const MOVEMENT_ICON_MAP: Record<MovementType, typeof Wrench> = {
  status_change: ArrowRightLeft,
  location_change: MapPin,
  maintenance: Wrench,
  note: MessageSquare,
};

const MOVEMENT_COLOR: Record<MovementType, string> = {
  status_change: 'bg-blue-50 text-blue-600',
  location_change: 'bg-purple-50 text-purple-600',
  maintenance: 'bg-orange-50 text-orange-600',
  note: 'bg-slate-100 text-slate-600',
};

export default function AssetDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [movements, setMovements] = useState<AssetMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  // Termo de Responsabilidade Modal
  const [showTermoModal, setShowTermoModal] = useState(false);
  const [collabName, setCollabName] = useState('');
  const [collabCpf, setCollabCpf] = useState('');
  const [collabRole, setCollabRole] = useState('');
  const [collabDept, setCollabDept] = useState('');
  const [termoReason, setTermoReason] = useState('Uso profissional em atividades da empresa');

  useEffect(() => {
    if (!id) return;
    async function load() {
      try {
        setLoading(true);
        const [assetRes, moveRes] = await Promise.all([
          supabase
            .from('assets')
            .select('*, category:categories(*), location:locations(*)')
            .eq('id', id)
            .maybeSingle(),
          supabase
            .from('asset_movements')
            .select('*, from_location:locations!asset_movements_from_location_id_fkey(*), to_location:locations!asset_movements_to_location_id_fkey(*)')
            .eq('asset_id', id)
            .order('created_at', { ascending: false }),
        ]);

        if (assetRes.error) throw assetRes.error;
        if (!assetRes.data) throw new Error('Ativo não encontrado');

        setAsset(assetRes.data);
        if (assetRes.data.responsible) setCollabName(assetRes.data.responsible);
        setMovements(moveRes.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar ativo');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  async function handleStatusChange(newStatus: AssetStatus) {
    if (!asset || newStatus === asset.status) return;
    setUpdating(true);
    try {
      const { error: updError } = await supabase
        .from('assets')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', asset.id);

      if (updError) throw updError;

      await supabase.from('asset_movements').insert({
        asset_id: asset.id,
        type: 'status_change' as MovementType,
        from_status: asset.status,
        to_status: newStatus,
        description: `Status alterado de ${STATUS_LABELS[asset.status]} para ${STATUS_LABELS[newStatus]}`,
      });

      setAsset({ ...asset, status: newStatus });
      invalidateCache('all_assets');
      invalidateCache('dashboard_');
      invalidateCache('reports_');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao atualizar status');
    } finally {
      setUpdating(false);
    }
  }

  async function handleDelete() {
    if (!asset) return;
    try {
      const { error: delError } = await supabase.from('assets').delete().eq('id', asset.id);
      if (delError) throw delError;
      invalidateCache('all_assets');
      invalidateCache('dashboard_');
      invalidateCache('reports_');
      navigate('/inventario');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao excluir ativo');
    }
  }

  function handleGenerateTermo() {
    if (!asset || !collabName.trim()) return;
    generateTermoResponsabilidadePDF({
      collaboratorName: collabName.trim(),
      cpf: collabCpf.trim(),
      role: collabRole.trim(),
      department: collabDept.trim() || asset.location?.name || '',
      asset,
      reason: termoReason.trim(),
    });
    setShowTermoModal(false);
  }

  const depreciation = useMemo(() => {
    if (!asset) return null;
    return calculateDepreciation(asset);
  }, [asset]);

  if (loading) return <div className="p-6"><Spinner size="lg" className="py-20" /></div>;
  if (error || !asset) return <div className="p-6"><ErrorState message={error || 'Ativo não encontrado'} /></div>;

  const infoItems = [
    { label: 'Código do Ativo', value: asset.asset_code, icon: Tag, mono: true },
    { label: 'Plaqueta / Serial', value: asset.serial_number || 'Não informado', icon: Shield, mono: true },
    { label: 'Localização / Filial', value: asset.location?.name || 'Não atribuído', icon: MapPin },
    { label: 'Responsável Atual', value: asset.responsible || 'Sem responsável direto', icon: User },
    { label: 'Data de Aquisição', value: asset.acquisition_date ? formatDate(asset.acquisition_date) : 'Não informada', icon: Calendar },
    { label: 'Valor de Aquisição Original', value: formatCurrency(asset.acquisition_value || 0), icon: DollarSign },
    { label: 'Próxima Manutenção', value: asset.next_maintenance ? formatDate(asset.next_maintenance) : 'Não agendada', icon: Wrench },
    { label: 'Garantia até', value: asset.warranty_until ? formatDate(asset.warranty_until) : 'Não informada', icon: Shield },
  ];

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto">
      <PageHeader
        breadcrumbs={[{ label: 'Inventário', to: '/inventario' }, { label: asset.asset_code }]}
        title={asset.name}
        subtitle={asset.category?.name}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowTermoModal(true)}
              className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-medium px-3 py-2 rounded-lg shadow-sm transition-colors"
            >
              <FileSignature className="w-4 h-4" />
              <span className="hidden sm:inline">Emitir</span> Termo de Cautela
            </button>
            <button
              onClick={() => setShowEdit(true)}
              className="inline-flex items-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-medium px-3 py-2 rounded-lg"
            >
              <Pencil className="w-4 h-4" />
              <span className="hidden sm:inline">Editar</span>
            </button>
            <button
              onClick={() => setShowDelete(true)}
              className="inline-flex items-center gap-1.5 bg-white border border-slate-200 hover:bg-red-50 hover:border-red-200 hover:text-red-600 text-slate-700 text-xs sm:text-sm font-medium px-3 py-2 rounded-lg"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Excluir</span>
            </button>
            <button
              onClick={() => setShowQR(!showQR)}
              className="inline-flex items-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-medium px-3 py-2 rounded-lg"
            >
              <QrIcon className="w-4 h-4" />
              <span className="hidden sm:inline">QR Code</span>
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Image + Info + Depreciation */}
        <div className="lg:col-span-2 space-y-6">
          {/* Image card */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="relative aspect-video bg-slate-100">
              {asset.image_url ? (
                <img src={asset.image_url} alt={asset.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-300">
                  <Tag className="w-12 h-12" />
                </div>
              )}
              <div className="absolute top-3 left-3">
                <StatusBadge status={asset.status} />
              </div>
            </div>
            {asset.notes && (
              <div className="p-4 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">Notas & Plaqueta Original</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{asset.notes}</p>
              </div>
            )}
          </div>

          {/* Info grid */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-900 mb-4">Informações do Ativo</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
              {infoItems.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-slate-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-slate-500">{item.label}</p>
                      <p className={`text-sm text-slate-900 font-medium truncate ${item.mono ? 'font-mono' : ''}`}>
                        {item.value}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Depreciation Card */}
          {depreciation && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <Coins className="w-4 h-4 text-indigo-600" />
                Cálculo de Depreciação e Valor Contábil
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 mb-3">
                <div>
                  <p className="text-xs text-slate-500">Valor Original</p>
                  <p className="text-sm font-bold text-slate-900">{formatCurrency(depreciation.acquisitionValue)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Valor Contábil Atual</p>
                  <p className="text-sm font-bold text-indigo-700">{formatCurrency(depreciation.currentBookValue)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Depreciação Acumulada</p>
                  <p className="text-sm font-semibold text-amber-700">-{formatCurrency(depreciation.accumulatedDepreciation)} ({depreciation.depreciationPercent}%)</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Valor Residual</p>
                  <p className="text-sm font-bold text-teal-700">{formatCurrency(depreciation.residualValue)}</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Vida útil contábil: <strong>{depreciation.usefulLifeYears} anos</strong></span>
                <span>Status: {depreciation.isFullyDepreciated ? <strong className="text-amber-600">Totalmente Depreciado</strong> : 'Em depreciação normal'}</span>
              </div>
            </div>
          )}
        </div>

        {/* Right: Status + QR Code + History */}
        <div className="space-y-6">
          {/* Quick status change */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-900 mb-3">Alterar Status</h3>
            <div className="grid grid-cols-2 gap-2">
              {(['operacional', 'manutencao', 'emprestado', 'baixado'] as AssetStatus[]).map((st) => (
                <button
                  key={st}
                  onClick={() => handleStatusChange(st)}
                  disabled={updating || asset.status === st}
                  className={`px-3 py-2 text-xs font-semibold rounded-lg border text-center transition-all ${
                    asset.status === st
                      ? STATUS_STYLES[st] + ' ring-2 ring-primary-400'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {STATUS_LABELS[st]}
                </button>
              ))}
            </div>
          </div>

          {/* QR Code preview */}
          {showQR && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 text-center animate-slide-down">
              <h3 className="font-semibold text-slate-900 mb-3">QR Code Patrimonial</h3>
              <div className="inline-block p-3 bg-white border-2 border-slate-200 rounded-xl mb-3 shadow-sm">
                <QRCodeSVG value={`${window.location.origin}/inventario/${asset.id}`} size={160} level="M" />
              </div>
              <p className="font-mono text-xs font-bold text-slate-700">{asset.asset_code}</p>
              <button
                onClick={() => window.print()}
                className="mt-3 inline-flex items-center gap-1.5 text-xs text-primary-600 hover:text-primary-700 font-medium"
              >
                <Printer className="w-3.5 h-3.5" />
                Imprimir Etiqueta
              </button>
            </div>
          )}

          {/* Movements Timeline */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-900 mb-4">Histórico do Bem</h3>
            {movements.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">Nenhuma movimentação registrada.</p>
            ) : (
              <div className="space-y-4">
                {movements.map((move) => {
                  const Icon = MOVEMENT_ICON_MAP[move.type] || MessageSquare;
                  const colorClass = MOVEMENT_COLOR[move.type] || 'bg-slate-100 text-slate-600';
                  return (
                    <div key={move.id} className="flex gap-3 text-xs">
                      <div className={`w-7 h-7 rounded-lg ${colorClass} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900">{move.description || MOVEMENT_LABELS[move.type]}</p>
                        <p className="text-slate-400 text-[11px] mt-0.5">{formatDateTime(move.created_at)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Termo de Responsabilidade */}
      {showTermoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-slide-up">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <FileSignature className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900">Emitir Termo de Responsabilidade</h3>
              </div>
              <button onClick={() => setShowTermoModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-3.5 text-sm">
              <p className="text-xs text-slate-500">
                Gere um termo oficial em PDF para formalizar a entrega e cautela deste equipamento: <strong>{asset.name} ({asset.asset_code})</strong>.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nome Completo do Colaborador *</label>
                <input
                  type="text"
                  value={collabName}
                  onChange={(e) => setCollabName(e.target.value)}
                  placeholder="Ex: Carlos Eduardo Silva"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">CPF</label>
                  <input
                    type="text"
                    value={collabCpf}
                    onChange={(e) => setCollabCpf(e.target.value)}
                    placeholder="000.000.000-00"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Cargo / Função</label>
                  <input
                    type="text"
                    value={collabRole}
                    onChange={(e) => setCollabRole(e.target.value)}
                    placeholder="Ex: Supervisor Operacional"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Setor / Unidade</label>
                <input
                  type="text"
                  value={collabDept}
                  onChange={(e) => setCollabDept(e.target.value)}
                  placeholder={asset.location?.name || 'Ex: Filial Oeste'}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Finalidade / Motivo da Entrega</label>
                <input
                  type="text"
                  value={termoReason}
                  onChange={(e) => setTermoReason(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowTermoModal(false)}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-200 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={handleGenerateTermo}
                disabled={!collabName.trim()}
                className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm disabled:opacity-50"
              >
                Baixar Termo em PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {showEdit && (
        <AssetFormModal
          asset={asset}
          onClose={() => setShowEdit(false)}
          onSaved={async () => {
            setShowEdit(false);
            const { data } = await supabase
              .from('assets')
              .select('*, category:categories(*), location:locations(*)')
              .eq('id', asset.id)
              .single();
            if (data) setAsset(data);
          }}
        />
      )}

      {/* Delete confirmation */}
      {showDelete && (
        <ConfirmDialog
          title="Excluir ativo?"
          message="Esta ação não pode ser desfeita. Todo o histórico e movimentações deste ativo serão removidos."
          confirmLabel="Excluir"
          danger
          onConfirm={handleDelete}
          onCancel={() => setShowDelete(false)}
        />
      )}
    </div>
  );
}
