import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Boxes,
  CheckCircle2,
  Wrench,
  TrendingUp,
  ArrowRight,
  FileText,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PageHeader, AssetCard, Spinner, ErrorState } from '@/components';
import type { Asset, Doc } from '@/types';
import { formatDate, timeAgo } from '@/lib/utils';

interface Stats {
  total: number;
  operacional: number;
  manutencao: number;
  emprestado: number;
  baixado: number;
  totalValue: number;
  docsTotal: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentAssets, setRecentAssets] = useState<Asset[]>([]);
  const [recentDocs, setRecentDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [assetsRes, docsRes] = await Promise.all([
          supabase
            .from('assets')
            .select('*, category:categories(*), location:locations(*)')
            .order('updated_at', { ascending: false }),
          supabase
            .from('documents')
            .select('*, category:document_categories(*)')
            .order('updated_at', { ascending: false })
            .limit(5),
        ]);

        if (assetsRes.error) throw assetsRes.error;
        if (docsRes.error) throw docsRes.error;

        const assets = assetsRes.data || [];
        const docs = docsRes.data || [];

        setStats({
          total: assets.length,
          operacional: assets.filter((a) => a.status === 'operacional').length,
          manutencao: assets.filter((a) => a.status === 'manutencao').length,
          emprestado: assets.filter((a) => a.status === 'emprestado').length,
          baixado: assets.filter((a) => a.status === 'baixado').length,
          totalValue: assets.reduce((sum, a) => sum + (a.acquisition_value || 0), 0),
          docsTotal: docs.length,
        });
        setRecentAssets(assets.slice(0, 6));
        setRecentDocs(docs);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div className="p-6"><Spinner size="lg" className="py-20" /></div>;
  if (error) return <div className="p-6"><ErrorState message={error} /></div>;
  if (!stats) return null;

  const cards = [
    {
      label: 'Total de Ativos',
      value: stats.total,
      icon: Boxes,
      color: 'bg-primary-500',
      bg: 'bg-primary-50',
      text: 'text-primary-700',
    },
    {
      label: 'Operacionais',
      value: stats.operacional,
      icon: CheckCircle2,
      color: 'bg-emerald-500',
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
    },
    {
      label: 'Em Manutenção',
      value: stats.manutencao,
      icon: Wrench,
      color: 'bg-orange-500',
      bg: 'bg-orange-50',
      text: 'text-orange-700',
    },
    {
      label: 'Valor Total',
      value: stats.totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      icon: TrendingUp,
      color: 'bg-slate-700',
      bg: 'bg-slate-100',
      text: 'text-slate-700',
    },
  ];

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Painel de Controle"
        subtitle="Visão geral dos ativos e documentação do Grupo Richesse"
      />

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-8">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-white rounded-xl border border-slate-200 p-4 lg:p-5 hover:shadow-card transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg ${card.bg} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${card.text}`} />
                </div>
              </div>
              <p className="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight">
                {card.value}
              </p>
              <p className="text-xs lg:text-sm text-slate-500 mt-1">{card.label}</p>
            </div>
          );
        })}
      </div>

      {/* Status overview bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">Distribuição por Status</h3>
          <Link to="/relatorios" className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
            Relatórios <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="flex h-3 rounded-full overflow-hidden bg-slate-100">
          {stats.total > 0 && (
            <>
              <div
                className="bg-emerald-500 transition-all"
                style={{ width: `${(stats.operacional / stats.total) * 100}%` }}
                title={`Operacionais: ${stats.operacional}`}
              />
              <div
                className="bg-orange-500 transition-all"
                style={{ width: `${(stats.manutencao / stats.total) * 100}%` }}
                title={`Manutenção: ${stats.manutencao}`}
              />
              <div
                className="bg-blue-500 transition-all"
                style={{ width: `${(stats.emprestado / stats.total) * 100}%` }}
                title={`Emprestados: ${stats.emprestado}`}
              />
              <div
                className="bg-slate-400 transition-all"
                style={{ width: `${(stats.baixado / stats.total) * 100}%` }}
                title={`Baixados: ${stats.baixado}`}
              />
            </>
          )}
        </div>
        <div className="flex flex-wrap gap-4 mt-3 text-xs">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Operacional ({stats.operacional})</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-orange-500" /> Manutenção ({stats.manutencao})</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Emprestado ({stats.emprestado})</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-400" /> Baixado ({stats.baixado})</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent assets */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900">Ativos Recentes</h3>
            <Link to="/inventario" className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
              Ver tudo <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {recentAssets.map((asset) => (
              <AssetCard key={asset.id} asset={asset} />
            ))}
          </div>
        </div>

        {/* Recent docs + alerts */}
        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">Documentação Recente</h3>
              <Link to="/documentacao" className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
                Ver tudo <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
              {recentDocs.map((doc) => (
                <Link
                  key={doc.id}
                  to={`/documentacao/${doc.slug}`}
                  className="flex items-start gap-3 p-3.5 hover:bg-slate-50 transition-colors"
                >
                  <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-primary-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 line-clamp-1">{doc.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {doc.category?.name} · {timeAgo(doc.updated_at)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Maintenance alerts */}
          <div>
            <h3 className="font-semibold text-slate-900 mb-4">Alertas de Manutenção</h3>
            <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
              {recentAssets
                .filter((a) => a.status === 'manutencao' || (a.next_maintenance && new Date(a.next_maintenance) < new Date()))
                .slice(0, 4)
                .map((asset) => (
                  <Link
                    key={asset.id}
                    to={`/inventario/${asset.id}`}
                    className="flex items-center gap-3 p-3.5 hover:bg-slate-50 transition-colors"
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      asset.status === 'manutencao' ? 'bg-orange-50' : 'bg-amber-50'
                    }`}>
                      {asset.status === 'manutencao' ? (
                        <Wrench className="w-4 h-4 text-orange-600" />
                      ) : (
                        <Clock className="w-4 h-4 text-amber-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 line-clamp-1">{asset.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {asset.status === 'manutencao' ? 'Em manutenção' : `Vence: ${formatDate(asset.next_maintenance)}`}
                      </p>
                    </div>
                  </Link>
                ))}
              {recentAssets.filter((a) => a.status === 'manutencao' || (a.next_maintenance && new Date(a.next_maintenance) < new Date())).length === 0 && (
                <div className="p-6 text-center text-sm text-slate-400 flex flex-col items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-emerald-500" />
                  Nenhum alerta ativo
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
