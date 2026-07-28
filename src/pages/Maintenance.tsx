import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Wrench, Clock, AlertCircle, Calendar, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PageHeader, Spinner, ErrorState, EmptyState, StatusBadge } from '@/components';
import { formatDate } from '@/lib/utils';
import type { Asset } from '@/types';

export default function Maintenance() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('assets')
        .select('*, category:categories(*), location:locations(*)')
        .order('next_maintenance', { ascending: true, nullsFirst: false });
      if (error) {
        setError(error.message);
      } else {
        setAssets(data || []);
      }
      setLoading(false);
    }
    load();
  }, []);

  const inMaintenance = assets.filter((a) => a.status === 'manutencao');
  const upcoming = assets.filter(
    (a) => a.status === 'operacional' && a.next_maintenance && new Date(a.next_maintenance) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  );
  const scheduled = assets.filter(
    (a) => a.status === 'operacional' && a.next_maintenance && new Date(a.next_maintenance) > new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  );

  if (loading) return <div className="p-6"><Spinner size="lg" className="py-20" /></div>;
  if (error) return <div className="p-6"><ErrorState message={error} /></div>;

  const sections = [
    { title: 'Em Manutenção', items: inMaintenance, icon: Wrench, color: 'text-orange-600', bg: 'bg-orange-50' },
    { title: 'Manutenção Próxima (30 dias)', items: upcoming, icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50' },
    { title: 'Manutenções Programadas', items: scheduled, icon: Calendar, color: 'text-primary-600', bg: 'bg-primary-50' },
  ];

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Manutenção"
        subtitle="Acompanhe ativos em manutenção e programe intervenções preventivas"
      />

      {assets.length === 0 ? (
        <EmptyState title="Nenhum ativo cadastrado" description="Cadastre ativos para acompanhar as manutenções." />
      ) : (
        <div className="space-y-8">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <div key={section.title}>
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-8 h-8 rounded-lg ${section.bg} flex items-center justify-center`}>
                    <Icon className={`w-4 h-4 ${section.color}`} />
                  </div>
                  <h3 className="font-semibold text-slate-900">{section.title}</h3>
                  <span className="text-sm text-slate-400">({section.items.length})</span>
                </div>

                {section.items.length === 0 ? (
                  <div className="bg-white rounded-xl border border-slate-200 p-6 text-center text-sm text-slate-400">
                    Nenhum item nesta categoria
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {section.items.map((asset) => (
                      <Link
                        key={asset.id}
                        to={`/inventario/${asset.id}`}
                        className="group bg-white rounded-xl border border-slate-200 p-4 hover:shadow-cardHover hover:border-slate-300 transition-all"
                      >
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-start gap-3 min-w-0">
                            {asset.image_url ? (
                              <img src={asset.image_url} alt="" className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
                            ) : (
                              <div className="w-14 h-14 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                                <Wrench className="w-5 h-5 text-slate-400" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="font-medium text-slate-900 text-sm line-clamp-2">{asset.name}</p>
                              <p className="text-xs text-slate-500 mt-0.5 font-mono">{asset.asset_code}</p>
                            </div>
                          </div>
                          <StatusBadge status={asset.status} size="sm" />
                        </div>

                        <div className="space-y-1.5 text-xs text-slate-500">
                          {asset.location && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-slate-400">Local:</span>
                              <span className="text-slate-700 truncate">{asset.location.name}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>Última: {formatDate(asset.last_maintenance)}</span>
                          </div>
                          {asset.next_maintenance && (
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              <span>Próxima: <span className="text-slate-700 font-medium">{formatDate(asset.next_maintenance)}</span></span>
                            </div>
                          )}
                        </div>

                        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-end">
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 group-hover:gap-1.5 transition-all">
                            Ver detalhes <ArrowRight className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
