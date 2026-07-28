import { useEffect, useState } from 'react';
import { TrendingUp, Boxes, Wrench, DollarSign, MapPin, Tag, Download } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PageHeader, Spinner, ErrorState } from '@/components';
import { STATUS_LABELS, formatCurrency, LOCATION_TYPE_LABELS } from '@/lib/utils';
import type { Asset, Category, Location, AssetStatus } from '@/types';

interface ReportData {
  assets: Asset[];
  categories: Category[];
  locations: Location[];
}

export default function Reports() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const [assetsRes, catsRes, locsRes] = await Promise.all([
        supabase.from('assets').select('*, category:categories(*), location:locations(*)'),
        supabase.from('categories').select('*'),
        supabase.from('locations').select('*'),
      ]);
      if (assetsRes.error) {
        setError(assetsRes.error.message);
        setLoading(false);
        return;
      }
      setData({
        assets: assetsRes.data || [],
        categories: catsRes.data || [],
        locations: locsRes.data || [],
      });
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="p-6"><Spinner size="lg" className="py-20" /></div>;
  if (error) return <div className="p-6"><ErrorState message={error} /></div>;
  if (!data) return null;

  const { assets, categories, locations } = data;
  const totalValue = assets.reduce((s, a) => s + (a.acquisition_value || 0), 0);

  // By status
  const byStatus = (['operacional', 'manutencao', 'emprestado', 'baixado'] as AssetStatus[]).map((status) => ({
    status,
    count: assets.filter((a) => a.status === status).length,
    pct: assets.length ? Math.round((assets.filter((a) => a.status === status).length / assets.length) * 100) : 0,
  }));

  // By category
  const byCategory = categories.map((cat) => ({
    name: cat.name,
    color: cat.color || '#3a6bab',
    count: assets.filter((a) => a.category_id === cat.id).length,
    value: assets.filter((a) => a.category_id === cat.id).reduce((s, a) => s + (a.acquisition_value || 0), 0),
  })).sort((a, b) => b.count - a.count);

  // By location
  const byLocation = locations.map((loc) => ({
    name: loc.name,
    type: loc.type,
    count: assets.filter((a) => a.location_id === loc.id).length,
    value: assets.filter((a) => a.location_id === loc.id).reduce((s, a) => s + (a.acquisition_value || 0), 0),
  })).sort((a, b) => b.count - a.count);

  const maxCatCount = Math.max(...byCategory.map((c) => c.count), 1);
  const maxLocCount = Math.max(...byLocation.map((l) => l.count), 1);

  function exportCSV() {
    const headers = ['Código', 'Nome', 'Categoria', 'Localização', 'Status', 'Responsável', 'Valor', 'Aquisição'];
    const rows = assets.map((a) => [
      a.asset_code,
      a.name,
      a.category?.name || '',
      a.location?.name || '',
      STATUS_LABELS[a.status],
      a.responsible || '',
      a.acquisition_value || 0,
      a.acquisition_date || '',
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `inventario-richesse-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Relatórios"
        subtitle="Análise consolidada do inventário de ativos"
        actions={
          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium px-4 py-2 rounded-lg"
          >
            <Download className="w-4 h-4" />
            Exportar CSV
          </button>
        }
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
        {[
          { label: 'Total de Ativos', value: assets.length, icon: Boxes, color: 'text-primary-600', bg: 'bg-primary-50' },
          { label: 'Em Manutenção', value: assets.filter((a) => a.status === 'manutencao').length, icon: Wrench, color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'Valor Total', value: formatCurrency(totalValue), icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Unidades', value: locations.length, icon: MapPin, color: 'text-slate-600', bg: 'bg-slate-100' },
        ].map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="bg-white rounded-xl border border-slate-200 p-4 lg:p-5">
              <div className={`w-10 h-10 rounded-lg ${c.bg} flex items-center justify-center mb-3`}>
                <Icon className={`w-5 h-5 ${c.color}`} />
              </div>
              <p className="text-xl lg:text-2xl font-bold text-slate-900">{c.value}</p>
              <p className="text-xs lg:text-sm text-slate-500 mt-0.5">{c.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status distribution */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary-600" />
            Distribuição por Status
          </h3>
          <div className="space-y-3">
            {byStatus.map((s) => (
              <div key={s.status}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-slate-700">{STATUS_LABELS[s.status]}</span>
                  <span className="text-slate-500 text-xs">{s.count} ({s.pct}%)</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      s.status === 'operacional' ? 'bg-emerald-500' :
                      s.status === 'manutencao' ? 'bg-orange-500' :
                      s.status === 'emprestado' ? 'bg-blue-500' : 'bg-slate-400'
                    }`}
                    style={{ width: `${s.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* By category */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Tag className="w-4 h-4 text-primary-600" />
            Ativos por Categoria
          </h3>
          <div className="space-y-2.5">
            {byCategory.map((c) => (
              <div key={c.name}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-slate-700 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                    {c.name}
                  </span>
                  <span className="text-slate-500 text-xs">{c.count} · {formatCurrency(c.value)}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${(c.count / maxCatCount) * 100}%`, backgroundColor: c.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* By location */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 lg:col-span-2">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary-600" />
            Ativos por Localização
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
            {byLocation.map((l) => (
              <div key={l.name}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-slate-700">
                    {l.name}
                    <span className="text-xs text-slate-400 ml-1.5">({LOCATION_TYPE_LABELS[l.type]})</span>
                  </span>
                  <span className="text-slate-500 text-xs">{l.count} · {formatCurrency(l.value)}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-500 rounded-full transition-all duration-500"
                    style={{ width: `${(l.count / maxLocCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
