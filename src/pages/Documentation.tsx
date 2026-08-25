import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, FileText, Wrench, BookOpen, ArrowRight, Plus, Tag } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PageHeader, ErrorState, EmptyState } from '@/components';
import {
  DOC_TYPE_LABELS,
  DOC_STATUS_LABELS,
  DOC_STATUS_STYLES,
  timeAgo,
} from '@/lib/utils';
import type { Doc, DocumentCategory, DocumentType } from '@/types';

import { getCachedData, setCachedData } from '@/lib/dataCache';

export default function Documentation() {
  const [docs, setDocs] = useState<Doc[]>(() => getCachedData<Doc[]>('all_docs') || []);
  const [categories, setCategories] = useState<DocumentCategory[]>(() => getCachedData<DocumentCategory[]>('all_doc_categories') || []);
  const [_loading, setLoading] = useState(() => !(getCachedData('all_docs') && getCachedData('all_doc_categories')));
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<DocumentType | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  useEffect(() => {
    async function load() {
      try {
        const [docsRes, catsRes] = await Promise.all([
          supabase
            .from('documents')
            .select('*, category:document_categories(*)')
            .order('updated_at', { ascending: false }),
          supabase.from('document_categories').select('*').order('name'),
        ]);
        if (docsRes.error) {
          if (!docs.length) setError(docsRes.error.message);
        } else {
          setDocs(docsRes.data || []);
          setCachedData('all_docs', docsRes.data || []);
        }
        if (catsRes.data) {
          setCategories(catsRes.data);
          setCachedData('all_doc_categories', catsRes.data);
        }
      } catch (err) {
        if (!docs.length) setError(err instanceof Error ? err.message : 'Erro ao carregar documentação');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    return docs.filter((doc) => {
      if (search) {
        const q = search.toLowerCase();
        const matches =
          doc.title.toLowerCase().includes(q) ||
          doc.content.toLowerCase().includes(q) ||
          (doc.tags?.some((t) => t.toLowerCase().includes(q)) ?? false);
        if (!matches) return false;
      }
      if (typeFilter !== 'all' && doc.category?.type !== typeFilter) return false;
      if (categoryFilter !== 'all' && doc.category_id !== categoryFilter) return false;
      return true;
    });
  }, [docs, search, typeFilter, categoryFilter]);

  const sopCount = docs.filter((d) => d.category?.type === 'sop').length;
  const techCount = docs.filter((d) => d.category?.type === 'technical').length;

  if (error && !docs.length) return <div className="p-6"><ErrorState message={error} /></div>;

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Documentação"
        subtitle="SOPs, processos operacionais e documentação técnica"
        actions={
          <button className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-4 py-2 rounded-lg shadow-sm">
            <Plus className="w-4 h-4" />
            Novo Documento
          </button>
        }
      />

      {/* Type cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
        <button
          onClick={() => setTypeFilter('all')}
          className={`text-left bg-white rounded-xl border p-4 transition-all ${
            typeFilter === 'all' ? 'border-primary-400 ring-2 ring-primary-500/20' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <BookOpen className="w-5 h-5 text-slate-600 mb-2" />
          <p className="text-2xl font-bold text-slate-900">{docs.length}</p>
          <p className="text-xs text-slate-500">Total</p>
        </button>
        <button
          onClick={() => setTypeFilter('sop')}
          className={`text-left bg-white rounded-xl border p-4 transition-all ${
            typeFilter === 'sop' ? 'border-primary-400 ring-2 ring-primary-500/20' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <FileText className="w-5 h-5 text-primary-600 mb-2" />
          <p className="text-2xl font-bold text-slate-900">{sopCount}</p>
          <p className="text-xs text-slate-500">SOPs / Processos</p>
        </button>
        <button
          onClick={() => setTypeFilter('technical')}
          className={`text-left bg-white rounded-xl border p-4 transition-all ${
            typeFilter === 'technical' ? 'border-primary-400 ring-2 ring-primary-500/20' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <Wrench className="w-5 h-5 text-amber-600 mb-2" />
          <p className="text-2xl font-bold text-slate-900">{techCount}</p>
          <p className="text-xs text-slate-500">Documentação Técnica</p>
        </button>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <Tag className="w-5 h-5 text-emerald-600 mb-2" />
          <p className="text-2xl font-bold text-slate-900">{docs.filter((d) => d.status === 'ativo').length}</p>
          <p className="text-xs text-slate-500">Documentos Ativos</p>
        </div>
      </div>

      {/* Search + filter */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 mb-5 flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar documentos por título, conteúdo ou tags..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500/30 bg-white"
        >
          <option value="all">Todas as categorias</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Document list */}
      {filtered.length === 0 ? (
        <EmptyState
          title="Nenhum documento encontrado"
          description={search || typeFilter !== 'all' || categoryFilter !== 'all' ? "Tente ajustar a busca ou os filtros." : "Comece criando o primeiro documento."}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((doc) => {
            const isSop = doc.category?.type === 'sop';
            return (
              <Link
                key={doc.id}
                to={`/documentacao/${doc.slug}`}
                className="group bg-white rounded-xl border border-slate-200 p-5 hover:shadow-cardHover hover:border-slate-300 transition-all flex flex-col animate-slide-up"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    isSop ? 'bg-primary-50' : 'bg-amber-50'
                  }`}>
                    {isSop ? <FileText className="w-5 h-5 text-primary-600" /> : <Wrench className="w-5 h-5 text-amber-600" />}
                  </div>
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${DOC_STATUS_STYLES[doc.status]}`}>
                    {DOC_STATUS_LABELS[doc.status]}
                  </span>
                </div>

                <h3 className="font-semibold text-slate-900 text-sm leading-snug mb-1 group-hover:text-primary-700 transition-colors line-clamp-2">
                  {doc.title}
                </h3>
                <p className="text-xs text-slate-500 mb-3">
                  {doc.category?.name || DOC_TYPE_LABELS[doc.category?.type || 'sop']} · v{doc.version}
                </p>

                <p className="text-xs text-slate-600 line-clamp-3 flex-1">
                  {doc.content.replace(/[#*\-`>]/g, '').replace(/\n+/g, ' ').trim().slice(0, 150)}
                </p>

                {doc.tags && doc.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {doc.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>{timeAgo(doc.updated_at)}</span>
                  <span className="inline-flex items-center gap-1 font-medium text-primary-600 group-hover:gap-1.5 transition-all">
                    Ler <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
