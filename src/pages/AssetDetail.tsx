import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
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
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    async function load() {
      setLoading(true);
      const [assetRes, moveRes] = await Promise.all([
        supabase
          .from('assets')
          .select('*, category:categories(*), location:locations(*)')
          .eq('id', id)
          .maybeSingle(),
        supabase
          .from('asset_movements')
          .select('*')
          .eq('asset_id', id)
          .order('created_at', { ascending: false }),
      ]);
      if (assetRes.error) {
        setError(assetRes.error.message);
      } else if (!assetRes.data) {
        setError('Ativo não encontrado');
      } else {
        setAsset(assetRes.data);
      }
      if (moveRes.data) setMovements(moveRes.data);
      setLoading(false);
    }
    load();
  }, [id]);

  async function changeStatus(newStatus: AssetStatus) {
    if (!asset || newStatus === asset.status) return;
    setUpdating(true);
    const prevStatus = asset.status;
    const { error: updErr } = await supabase
      .from('assets')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', asset.id);
    if (updErr) {
      setError(updErr.message);
      setUpdating(false);
      return;
    }
    await supabase.from('asset_movements').insert({
      asset_id: asset.id,
      type: 'status_change',
      previous_value: prevStatus,
      new_value: newStatus,
      description: `Status alterado de "${STATUS_LABELS[prevStatus]}" para "${STATUS_LABELS[newStatus]}"`,
      performed_by: 'Sistema',
    });
    setAsset({ ...asset, status: newStatus });
    const { data: newMoves } = await supabase
      .from('asset_movements')
      .select('*')
      .eq('asset_id', asset.id)
      .order('created_at', { ascending: false });
    if (newMoves) setMovements(newMoves);
    setUpdating(false);
  }

  async function handleDelete() {
    if (!asset) return;
    setDeleting(true);
    const { error: delErr } = await supabase.from('assets').delete().eq('id', asset.id);
    setDeleting(false);
    if (delErr) {
      setError(delErr.message);
      setShowDelete(false);
      return;
    }
    navigate('/inventario');
  }

  if (loading) return <div className="p-6"><Spinner size="lg" className="py-20" /></div>;
  if (error) return (
    <div className="p-6">
      <Link to="/inventario" className="inline-flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Voltar ao inventário
      </Link>
      <ErrorState message={error} />
    </div>
  );
  if (!asset) return null;

  const infoItems = [
    { icon: Tag, label: 'Código do Ativo', value: asset.asset_code, mono: true },
    { icon: Tag, label: 'Número de Série', value: asset.serial_number || '—', mono: true },
    { icon: MapPin, label: 'Localização', value: asset.location?.name || '—' },
    { icon: User, label: 'Responsável', value: asset.responsible || '—' },
    { icon: Calendar, label: 'Data de Aquisição', value: formatDate(asset.acquisition_date) },
    { icon: DollarSign, label: 'Valor de Aquisição', value: formatCurrency(asset.acquisition_value) },
    { icon: Shield, label: 'Garantia até', value: formatDate(asset.warranty_until) },
    { icon: Wrench, label: 'Última Manutenção', value: formatDate(asset.last_maintenance) },
    { icon: Calendar, label: 'Próx. Manutenção', value: formatDate(asset.next_maintenance) },
  ];

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto">
      <PageHeader
        breadcrumbs={[{ label: 'Inventário', to: '/inventario' }, { label: asset.asset_code }]}
        title={asset.name}
        subtitle={asset.category?.name}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowEdit(true)}
              className="inline-flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium px-3 py-2 rounded-lg"
            >
              <Pencil className="w-4 h-4" />
              <span className="hidden sm:inline">Editar</span>
            </button>
            <button
              onClick={() => setShowDelete(true)}
              className="inline-flex items-center gap-2 bg-white border border-slate-200 hover:bg-red-50 hover:border-red-200 hover:text-red-600 text-slate-700 text-sm font-medium px-3 py-2 rounded-lg"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Excluir</span>
            </button>
            <button
              onClick={() => setShowQR(!showQR)}
              className="inline-flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium px-3 py-2 rounded-lg"
            >
              <QrIcon className="w-4 h-4" />
              <span className="hidden sm:inline">QR Code</span>
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Image + Info */}
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
                <p className="text-xs font-medium text-slate-500 mb-1">Observações</p>
                <p className="text-sm text-slate-700">{asset.notes}</p>
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

          {/* History timeline */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-900 mb-4">Histórico de Movimentações</h3>
            {movements.length === 0 ? (
              <p className="text-sm text-slate-400 py-6 text-center">Nenhuma movimentação registrada.</p>
            ) : (
              <div className="space-y-0">
                {movements.map((move, idx) => {
                  const Icon = MOVEMENT_ICON_MAP[move.type];
                  return (
                    <div key={move.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${MOVEMENT_COLOR[move.type]}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        {idx < movements.length - 1 && <div className="w-0.5 flex-1 bg-slate-200 my-1" />}
                      </div>
                      <div className="pb-5 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-slate-900">{MOVEMENT_LABELS[move.type]}</p>
                          <p className="text-xs text-slate-400">{formatDateTime(move.created_at)}</p>
                        </div>
                        {move.description && <p className="text-sm text-slate-600 mt-0.5">{move.description}</p>}
                        {(move.previous_value || move.new_value) && (
                          <p className="text-xs text-slate-500 mt-1">
                            {move.previous_value && <span className="line-through">{move.previous_value}</span>}
                            {move.previous_value && move.new_value && ' → '}
                            {move.new_value && <span className="font-medium">{move.new_value}</span>}
                          </p>
                        )}
                        {move.performed_by && (
                          <p className="text-xs text-slate-400 mt-1">por {move.performed_by}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Status control + QR */}
        <div className="space-y-6">
          {/* Status control */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-900 mb-1">Status do Ativo</h3>
            <p className="text-xs text-slate-500 mb-4">Altere o status para refletir a situação atual</p>
            <div className={`rounded-lg p-4 mb-4 ${STATUS_STYLES[asset.status].bg} ${STATUS_STYLES[asset.status].border} border`}>
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${STATUS_STYLES[asset.status].dot}`} />
                <span className={`font-semibold ${STATUS_STYLES[asset.status].text}`}>{STATUS_LABELS[asset.status]}</span>
              </div>
            </div>
            <div className="space-y-2">
              {(['operacional', 'manutencao', 'emprestado', 'baixado'] as AssetStatus[]).map((s) => (
                <button
                  key={s}
                  onClick={() => changeStatus(s)}
                  disabled={updating || s === asset.status}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                    s === asset.status
                      ? `${STATUS_STYLES[s].bg} ${STATUS_STYLES[s].border} ${STATUS_STYLES[s].text} cursor-default`
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  } ${updating ? 'opacity-50' : ''}`}
                >
                  <span className={`w-2 h-2 rounded-full ${STATUS_STYLES[s].dot}`} />
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          {/* QR Code */}
          {showQR && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 text-center animate-slide-up">
              <h3 className="font-semibold text-slate-900 mb-1">QR Code do Ativo</h3>
              <p className="text-xs text-slate-500 mb-4">Escaneie para acessar rapidamente este ativo</p>
              <div className="inline-block p-4 bg-white border-2 border-slate-200 rounded-xl">
                <QRCodeSVG
                  value={`${window.location.origin}/#/inventario/${asset.id}`}
                  size={180}
                  level="M"
                  includeMargin={false}
                />
              </div>
              <p className="text-xs font-mono text-slate-500 mt-3">{asset.asset_code}</p>
              <button
                onClick={() => window.print()}
                className="mt-4 inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                <Printer className="w-4 h-4" />
                Imprimir
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showEdit && (
        <AssetFormModal
          asset={asset}
          onClose={() => setShowEdit(false)}
          onSaved={async () => {
            setShowEdit(false);
            setLoading(true);
            const { data } = await supabase
              .from('assets')
              .select('*, category:categories(*), location:locations(*)')
              .eq('id', asset.id)
              .maybeSingle();
            if (data) setAsset(data);
            setLoading(false);
          }}
        />
      )}

      {showDelete && (
        <ConfirmDialog
          title="Excluir este ativo?"
          message="Esta ação não pode ser desfeita. O ativo e todo o seu histórico de movimentações serão removidos permanentemente."
          confirmLabel="Excluir"
          danger
          onConfirm={handleDelete}
          onCancel={() => setShowDelete(false)}
        />
      )}
    </div>
  );
}
