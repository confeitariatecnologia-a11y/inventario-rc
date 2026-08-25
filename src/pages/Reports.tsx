import { useEffect, useState, useMemo } from 'react';
import {
  TrendingUp,
  Boxes,
  MapPin,
  FileSpreadsheet,
  FileText,
  Coins,
  ShieldCheck,
  Percent,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PageHeader, ErrorState } from '@/components';
import { STATUS_LABELS, formatCurrency, LOCATION_TYPE_LABELS } from '@/lib/utils';
import type { Asset, Category, Location, AssetStatus } from '@/types';
import { calculateDepreciation, DEPRECIATION_RULES } from '@/lib/depreciation';
import { exportAssetsToExcel, exportAssetsToPDF } from '@/lib/exportUtils';
import { getCachedData, setCachedData } from '@/lib/dataCache';

interface ReportData {
  assets: Asset[];
  categories: Category[];
  locations: Location[];
}

const DEFAULT_REPORT_DATA: ReportData = {
  assets: [],
  categories: [],
  locations: [],
};

export default function Reports() {
  const [data, setData] = useState<ReportData>(() => getCachedData<ReportData>('reports_data') || DEFAULT_REPORT_DATA);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [assetsRes, catsRes, locsRes] = await Promise.all([
          supabase.from('assets').select('*, category:categories(*), location:locations(*)').range(0, 9999),
          supabase.from('categories').select('*'),
          supabase.from('locations').select('*'),
        ]);
        if (assetsRes.error) {
          if (!data.assets.length) setError(assetsRes.error.message);
          return;
        }
        const reportData = {
          assets: assetsRes.data || [],
          categories: catsRes.data || [],
          locations: locsRes.data || [],
        };
        setData(reportData);
        setCachedData('reports_data', reportData);
      } catch (err) {
        if (!data.assets.length) setError(err instanceof Error ? err.message : 'Erro ao carregar relatórios');
      }
    }
    load();
  }, []);

  const { assets, categories, locations } = data;

  const totalOriginalValue = useMemo(() => {
    return assets.reduce((s, a) => s + (Number(a.acquisition_value) || 0), 0);
  }, [assets]);

  const { totalBookValue, totalResidualValue, totalDepreciatedValue } = useMemo(() => {
    let book = 0;
    let residual = 0;
    let depreciated = 0;
    for (const a of assets) {
      const dep = calculateDepreciation(a);
      book += dep.currentBookValue;
      residual += dep.residualValue;
      depreciated += dep.accumulatedDepreciation;
    }
    return {
      totalBookValue: book,
      totalResidualValue: residual,
      totalDepreciatedValue: depreciated,
    };
  }, [assets]);

  // By status
  const byStatus = useMemo(() => {
    return (['operacional', 'manutencao', 'emprestado', 'baixado'] as AssetStatus[]).map((status) => ({
      status,
      count: assets.filter((a) => a.status === status).length,
      pct: assets.length ? Math.round((assets.filter((a) => a.status === status).length / assets.length) * 100) : 0,
    }));
  }, [assets]);

  // By category & Depreciation
  const categoryDepreciation = useMemo(() => {
    return categories.map((cat) => {
      const catAssets = assets.filter((a) => a.category_id === cat.id);
      const rule = DEPRECIATION_RULES[cat.name] || { residualRate: 0.10, usefulLifeYears: 5, annualRate: 0.20 };
      
      let sumOriginal = 0;
      let sumResidual = 0;
      let sumBook = 0;
      let sumDepreciated = 0;

      for (const a of catAssets) {
        const dep = calculateDepreciation(a);
        sumOriginal += dep.acquisitionValue;
        sumResidual += dep.residualValue;
        sumBook += dep.currentBookValue;
        sumDepreciated += dep.accumulatedDepreciation;
      }

      return {
        id: cat.id,
        name: cat.name,
        color: cat.color || '#3a6bab',
        count: catAssets.length,
        sumOriginal,
        residualRate: rule.residualRate,
        usefulLifeYears: rule.usefulLifeYears,
        sumResidual,
        sumBook,
        sumDepreciated,
      };
    }).sort((a, b) => b.count - a.count);
  }, [categories, assets]);

  // By location
  const byLocation = useMemo(() => {
    return locations.map((loc) => ({
      name: loc.name,
      type: loc.type,
      count: assets.filter((a) => a.location_id === loc.id).length,
      value: assets.filter((a) => a.location_id === loc.id).reduce((s, a) => s + (Number(a.acquisition_value) || 0), 0),
    })).sort((a, b) => b.count - a.count);
  }, [locations, assets]);

  const _maxCatCount = Math.max(...categoryDepreciation.map((c) => c.count), 1);
  const maxLocCount = Math.max(...byLocation.map((l) => l.count), 1);

  if (error && !data.assets.length) return <div className="p-6"><ErrorState message={error} /></div>;

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Relatórios e Análise Contábil"
        subtitle="Demonstrativo patrimonial, depreciação acumulada e consolidação por unidade"
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => void exportAssetsToExcel(assets, 'Relatorio_Patrimonial_Richesse')}
              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-medium px-3 py-2 rounded-lg shadow-sm transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span className="hidden sm:inline">Exportar</span> Excel (.xlsx)
            </button>
            <button
              onClick={() => exportAssetsToPDF(assets, 'Relatorio_Contabil_Patrimonio_Richesse')}
              className="inline-flex items-center gap-1.5 bg-primary-600 hover:bg-primary-700 text-white text-xs sm:text-sm font-medium px-3.5 py-2 rounded-lg shadow-sm transition-colors"
            >
              <FileText className="w-4 h-4" />
              Exportar PDF
            </button>
          </div>
        }
      />

      {/* Top summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-1">
            <Boxes className="w-4 h-4 text-primary-600" />
            Total de Itens
          </div>
          <p className="text-2xl font-bold text-slate-900">{(assets?.length ?? 0).toLocaleString('pt-BR')}</p>
          <p className="text-xs text-slate-500 mt-1">Patrimônio ativo cadastrado</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-1">
            <TrendingUp className="w-4 h-4 text-slate-700" />
            Valor Original de Aquisição
          </div>
          <p className="text-xl font-bold text-slate-900">{formatCurrency(totalOriginalValue)}</p>
          <p className="text-xs text-slate-500 mt-1">Custo histórico total</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-1">
            <Coins className="w-4 h-4 text-indigo-600" />
            Valor Contábil Líquido
          </div>
          <p className="text-xl font-bold text-indigo-700">{formatCurrency(totalBookValue)}</p>
          <p className="text-xs text-indigo-600 mt-1">Valor atual com depreciação</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-1">
            <ShieldCheck className="w-4 h-4 text-teal-600" />
            Valor Residual Estimado
          </div>
          <p className="text-xl font-bold text-teal-700">{formatCurrency(totalResidualValue)}</p>
          <p className="text-xs text-teal-600 mt-1">Garantia final de valor residual</p>
        </div>
      </div>

      {/* Demonstrativo Contábil de Depreciação por Grupo */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6 overflow-hidden">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Percent className="w-4 h-4 text-primary-600" />
              Demonstrativo de Depreciação e Vida Útil por Grupo
            </h3>
            <p className="text-xs text-slate-500">Cálculo de depreciação conforme vida útil contábil da empresa</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Grupo / Categoria</th>
                <th className="py-2.5 px-3 text-center">Itens</th>
                <th className="py-2.5 px-3 text-right">Valor Aquisição (R$)</th>
                <th className="py-2.5 px-3 text-center">Vida Útil</th>
                <th className="py-2.5 px-3 text-center">Taxa Residual</th>
                <th className="py-2.5 px-3 text-right">Valor Residual (R$)</th>
                <th className="py-2.5 px-3 text-right">Depreciação Acumulada</th>
                <th className="py-2.5 px-3 text-right">Valor Contábil Atual</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {categoryDepreciation.map((row) => (
                <tr key={row.name} className="hover:bg-slate-50/80">
                  <td className="py-3 px-3 font-semibold text-slate-900 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: row.color }} />
                    {row.name}
                  </td>
                  <td className="py-3 px-3 text-center text-slate-600">{row.count}</td>
                  <td className="py-3 px-3 text-right font-medium text-slate-800">{formatCurrency(row.sumOriginal)}</td>
                  <td className="py-3 px-3 text-center text-slate-500">{row.usefulLifeYears} anos</td>
                  <td className="py-3 px-3 text-center font-mono text-slate-600">{(row.residualRate * 100).toFixed(0)}%</td>
                  <td className="py-3 px-3 text-right text-slate-600">{formatCurrency(row.sumResidual)}</td>
                  <td className="py-3 px-3 text-right text-amber-700 font-medium">-{formatCurrency(row.sumDepreciated)}</td>
                  <td className="py-3 px-3 text-right font-bold text-indigo-700">{formatCurrency(row.sumBook)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 font-bold text-slate-900 border-t-2 border-slate-300">
              <tr>
                <td className="py-3 px-3">Total Geral</td>
                <td className="py-3 px-3 text-center">{assets.length}</td>
                <td className="py-3 px-3 text-right">{formatCurrency(totalOriginalValue)}</td>
                <td className="py-3 px-3 text-center">-</td>
                <td className="py-3 px-3 text-center">-</td>
                <td className="py-3 px-3 text-right">{formatCurrency(totalResidualValue)}</td>
                <td className="py-3 px-3 text-right text-amber-700">-{formatCurrency(totalDepreciatedValue)}</td>
                <td className="py-3 px-3 text-right text-indigo-700">{formatCurrency(totalBookValue)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By status */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Boxes className="w-4 h-4 text-primary-600" />
            Ativos por Status Operacional
          </h3>
          <div className="space-y-3">
            {byStatus.map((s) => (
              <div key={s.status}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-slate-700 font-medium">{STATUS_LABELS[s.status]}</span>
                  <span className="text-slate-500 text-xs font-semibold">{s.count} ({s.pct}%)</span>
                </div>
                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
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

        {/* By location */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary-600" />
            Distribuição por Unidade / Filial
          </h3>
          <div className="space-y-3">
            {byLocation.map((l) => (
              <div key={l.name}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-slate-700 font-medium">
                    {l.name}
                    <span className="text-xs text-slate-400 ml-1.5 font-normal">({LOCATION_TYPE_LABELS[l.type]})</span>
                  </span>
                  <span className="text-slate-500 text-xs font-semibold">{l.count} itens · {formatCurrency(l.value)}</span>
                </div>
                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
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
