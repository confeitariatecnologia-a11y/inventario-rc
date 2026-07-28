import type { AssetStatus, LocationType, DocumentType, DocumentStatus, MovementType } from '@/types';

export const STATUS_LABELS: Record<AssetStatus, string> = {
  operacional: 'Operacional',
  manutencao: 'Em Manutenção',
  baixado: 'Baixado',
  emprestado: 'Emprestado',
};

export const STATUS_STYLES: Record<AssetStatus, { bg: string; text: string; dot: string; border: string }> = {
  operacional: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    dot: 'bg-emerald-500',
    border: 'border-emerald-200',
  },
  manutencao: {
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    dot: 'bg-orange-500',
    border: 'border-orange-200',
  },
  baixado: {
    bg: 'bg-slate-100',
    text: 'text-slate-600',
    dot: 'bg-slate-400',
    border: 'border-slate-200',
  },
  emprestado: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    dot: 'bg-blue-500',
    border: 'border-blue-200',
  },
};

export const LOCATION_TYPE_LABELS: Record<LocationType, string> = {
  loja: 'Loja',
  industria: 'Indústria',
  escritorio: 'Escritório',
};

export const LOCATION_TYPE_STYLES: Record<LocationType, string> = {
  loja: 'bg-primary-50 text-primary-700',
  industria: 'bg-amber-50 text-amber-700',
  escritorio: 'bg-slate-100 text-slate-700',
};

export const DOC_TYPE_LABELS: Record<DocumentType, string> = {
  sop: 'SOP / Processo',
  technical: 'Documentação Técnica',
};

export const DOC_STATUS_LABELS: Record<DocumentStatus, string> = {
  rascunho: 'Rascunho',
  ativo: 'Ativo',
  arquivado: 'Arquivado',
};

export const DOC_STATUS_STYLES: Record<DocumentStatus, string> = {
  rascunho: 'bg-amber-50 text-amber-700 border border-amber-200',
  ativo: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  arquivado: 'bg-slate-100 text-slate-600 border border-slate-200',
};

export const MOVEMENT_LABELS: Record<MovementType, string> = {
  status_change: 'Mudança de Status',
  location_change: 'Mudança de Local',
  maintenance: 'Manutenção',
  note: 'Anotação',
};

export const MOVEMENT_ICONS: Record<MovementType, string> = {
  status_change: 'ArrowRightLeft',
  location_change: 'MapPin',
  maintenance: 'Wrench',
  note: 'MessageSquare',
};

export function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function formatCurrency(value: number | null): string {
  if (value === null || value === undefined) return '—';
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function timeAgo(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  if (months > 0) return `${months} ${months === 1 ? 'mês' : 'meses'} atrás`;
  if (days > 0) return `${days} ${days === 1 ? 'dia' : 'dias'} atrás`;
  if (hours > 0) return `${hours}h atrás`;
  if (minutes > 0) return `${minutes}min atrás`;
  return 'agora';
}

export function getInitials(name: string | null): string {
  if (!name) return '—';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
