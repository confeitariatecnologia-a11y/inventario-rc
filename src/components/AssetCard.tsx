import { Link } from 'react-router-dom';
import { MapPin, Calendar, ArrowRight, Tag, Check } from 'lucide-react';
import type { Asset } from '@/types';
import { StatusBadge } from '@/components';
import { formatDate } from '@/lib/utils';

interface AssetCardProps {
  asset: Asset;
  selected?: boolean;
  selectionMode?: boolean;
  onToggleSelect?: (id: string) => void;
}

export default function AssetCard({ asset, selected = false, selectionMode = false, onToggleSelect }: AssetCardProps) {
  const statusColor =
    asset.status === 'operacional'
      ? 'bg-emerald-500'
      : asset.status === 'manutencao'
      ? 'bg-orange-500'
      : asset.status === 'emprestado'
      ? 'bg-blue-500'
      : 'bg-slate-400';

  function handleClick(e: React.MouseEvent) {
    if (selectionMode && onToggleSelect) {
      e.preventDefault();
      onToggleSelect(asset.id);
    }
  }

  const inner = (
    <>
      {/* Image with status indicator */}
      <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
        {asset.image_url ? (
          <img
            src={asset.image_url}
            alt={asset.name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300">
            <Tag className="w-10 h-10" />
          </div>
        )}
        {/* Status bar at top */}
        <div className={`absolute top-0 left-0 right-0 h-1 ${statusColor}`} />
        <div className="absolute top-3 left-3">
          <StatusBadge status={asset.status} />
        </div>
        {asset.category && (
          <div className="absolute top-3 right-3">
            <span className="inline-flex items-center text-[11px] font-medium bg-white/90 backdrop-blur-sm text-slate-700 px-2 py-0.5 rounded-full border border-slate-200">
              {asset.category.name}
            </span>
          </div>
        )}
        {/* Selection checkbox overlay */}
        {selectionMode && (
          <div className={`absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all ${
            selected ? 'bg-primary-600 border-primary-600' : 'bg-white/80 border-slate-300'
          }`}>
            {selected && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-slate-900 text-sm leading-snug line-clamp-2 group-hover:text-primary-700 transition-colors">
            {asset.name}
          </h3>
        </div>

        <div className="space-y-1.5 text-xs text-slate-500 flex-1">
          <div className="flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <span className="font-mono font-medium text-slate-700">{asset.asset_code}</span>
            {asset.serial_number && (
              <span className="text-slate-400">· S/N {asset.serial_number}</span>
            )}
          </div>

          {asset.location && (
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <span className="truncate">{asset.location.name}</span>
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <span>Últ. manutenção: {formatDate(asset.last_maintenance)}</span>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
          {asset.responsible ? (
            <span className="text-xs text-slate-500 truncate">
              Resp: <span className="text-slate-700 font-medium">{asset.responsible}</span>
            </span>
          ) : (
            <span className="text-xs text-slate-400">Sem responsável</span>
          )}
          {!selectionMode && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 group-hover:gap-1.5 transition-all">
              Ver detalhes
              <ArrowRight className="w-3.5 h-3.5" />
            </span>
          )}
        </div>
      </div>
    </>
  );

  const className = `group bg-white rounded-xl border overflow-hidden transition-all duration-200 flex flex-col animate-slide-up ${
    selected ? 'border-primary-500 ring-2 ring-primary-500/30' : 'border-slate-200 hover:shadow-cardHover hover:border-slate-300'
  }`;

  if (selectionMode) {
    return (
      <div onClick={handleClick} className={className + ' cursor-pointer'}>
        {inner}
      </div>
    );
  }

  return (
    <Link to={`/inventario/${asset.id}`} className={className}>
      {inner}
    </Link>
  );
}
