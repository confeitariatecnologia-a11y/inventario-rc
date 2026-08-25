import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  SlidersHorizontal,
  LayoutGrid,
  List,
  X,
  Plus,
  CheckSquare,
  Trash2,
  MapPin,
  Pencil,
  FileSpreadsheet,
  FileText,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  PageHeader,
  AssetCard,
  Spinner,
  ErrorState,
  EmptyState,
  StatusBadge,
  ConfirmDialog,
  AssetFormModal,
} from '@/components';
import { STATUS_LABELS } from '@/lib/utils';
import type { Asset, Category, Location, AssetStatus } from '@/types';
import { exportAssetsToExcel, exportAssetsToPDF } from '@/lib/exportUtils';
import { getCachedData, setCachedData, invalidateCache } from '@/lib/dataCache';

const STATUS_OPTIONS: AssetStatus[] = ['operacional', 'manutencao', 'emprestado', 'baixado'];

export default function Inventory() {
  const navigate = useNavigate();
  const [assets, setAssets] = useState<Asset[]>(() => getCachedData<Asset[]>('all_assets') || []);
  const [categories, setCategories] = useState<Category[]>(() => getCachedData<Category[]>('all_categories') || []);
  const [locations, setLocations] = useState<Location[]>(() => getCachedData<Location[]>('all_locations') || []);
  const [loading, setLoading] = useState(() => !getCachedData<Asset[]>('all_assets'));
  const [error, setError] = useState<string | null>(null);
  
  // Paginação
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(25);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<AssetStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);

  // Selection state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modals
  const [showForm, setShowForm] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ ids: string[] } | null>(null);
  const [relocateTarget, setRelocateTarget] = useState<string>('');
  const [showRelocate, setShowRelocate] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const loadAllData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [assetsRes, catsRes, locsRes] = await Promise.all([
        supabase
          .from('assets')
          .select('*, category:categories(*), location:locations(*)')
          .range(0, 9999)
          .order('name', { ascending: true }),
        supabase.from('categories').select('*').order('name'),
        supabase.from('locations').select('*').order('name'),
      ]);

      if (assetsRes.error) setError(assetsRes.error.message);
      else {
        setAssets(assetsRes.data || []);
        setCachedData('all_assets', assetsRes.data || []);
        setError(null);
      }

      if (catsRes.data) {
        setCategories(catsRes.data);
        setCachedData('all_categories', catsRes.data);
      }
      if (locsRes.data) {
        setLocations(locsRes.data);
        setCachedData('all_locations', locsRes.data);
      }
    } catch (err) {
      if (!assets.length) setError(err instanceof Error ? err.message : 'Erro ao carregar inventário');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [assets.length]);

  const loadAssets = useCallback(async (silent = false) => {
    return loadAllData(silent);
  }, [loadAllData]);

  useEffect(() => {
    loadAllData(Boolean(getCachedData('all_assets')));
  }, [loadAllData]);

  const filtered = useMemo(() => {
    return assets.filter((asset) => {
      if (search) {
        const q = search.toLowerCase();
        const matches =
          asset.name.toLowerCase().includes(q) ||
          asset.asset_code.toLowerCase().includes(q) ||
          (asset.serial_number?.toLowerCase().includes(q) ?? false) ||
          (asset.responsible?.toLowerCase().includes(q) ?? false);
        if (!matches) return false;
      }
      if (statusFilter !== 'all' && asset.status !== statusFilter) return false;
      if (categoryFilter !== 'all' && asset.category_id !== categoryFilter) return false;
      if (locationFilter !== 'all' && asset.location_id !== locationFilter) return false;
      return true;
    });
  }, [assets, search, statusFilter, categoryFilter, locationFilter]);

  // Reseta para a página 1 ao alterar filtros
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, categoryFilter, locationFilter, pageSize]);

  const totalPages = pageSize === -1 ? 1 : Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginatedAssets = useMemo(() => {
    if (pageSize === -1) return filtered;
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const activeFilters =
    (statusFilter !== 'all' ? 1 : 0) +
    (categoryFilter !== 'all' ? 1 : 0) +
    (locationFilter !== 'all' ? 1 : 0);

  const clearFilters = () => {
    setStatusFilter('all');
    setCategoryFilter('all');
    setLocationFilter('all');
  };

  // Selection handlers
  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelectedIds(new Set(filtered.map((a) => a.id)));
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  function enterSelectionMode() {
    setSelectionMode(true);
    setSelectedIds(new Set());
  }

  function exitSelectionMode() {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }

  // CRUD handlers
  function openNewAsset() {
    setEditingAsset(null);
    setShowForm(true);
  }

  function openEditAsset(asset: Asset) {
    setEditingAsset(asset);
    setShowForm(true);
  }

  async function deleteAssets(ids: string[]) {
    setActionLoading(true);
    const { error: delErr } = await supabase.from('assets').delete().in('id', ids);
    setActionLoading(false);
    if (delErr) {
      setError(delErr.message);
      await loadAssets(true);
      return;
    }
    invalidateCache('all_assets');
    invalidateCache('dashboard_');
    invalidateCache('maintenance_');
    invalidateCache('reports_');
    invalidateCache('qrcode_');
    setConfirmDelete(null);
    exitSelectionMode();
    await loadAssets(true);
  }

  async function relocateSelected(targetLocationId: string) {
    if (!targetLocationId) return;
    setActionLoading(true);
    const ids = Array.from(selectedIds);
    const { error: updErr } = await supabase
      .from('assets')
      .update({ location_id: targetLocationId, updated_at: new Date().toISOString() })
      .in('id', ids);
    setActionLoading(false);
    if (updErr) {
      setError(updErr.message);
      await loadAssets(true);
      return;
    }
    invalidateCache('all_assets');
    invalidateCache('dashboard_');
    invalidateCache('reports_');
    setShowRelocate(false);
    setRelocateTarget('');
    exitSelectionMode();
    await loadAssets(true);
  }

  const selectedCount = selectedIds.size;
  const allSelected = filtered.length > 0 && selectedCount === filtered.length;

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Inventário de Ativos"
        subtitle={`${assets.length} ativos cadastrados no sistema`}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => void exportAssetsToExcel(filtered)}
              title="Exportar dados filtrados para planilha Excel (.xlsx)"
              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-medium px-3 py-2 rounded-lg shadow-sm transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span className="hidden sm:inline">Exportar</span> Excel
            </button>
            <button
              onClick={() => exportAssetsToPDF(filtered)}
              title="Exportar relatório em PDF"
              className="inline-flex items-center gap-1.5 bg-slate-700 hover:bg-slate-800 text-white text-xs sm:text-sm font-medium px-3 py-2 rounded-lg shadow-sm transition-colors"
            >
              <FileText className="w-4 h-4" />
              PDF
            </button>
            <button
              onClick={openNewAsset}
              className="inline-flex items-center gap-1.5 bg-primary-600 hover:bg-primary-700 text-white text-xs sm:text-sm font-medium px-3.5 py-2 rounded-lg shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Novo Ativo
            </button>
          </div>
        }
      />

      {/* Search and filter bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 mb-5">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, código, série ou responsável..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400"
            />
          </div>

          <button
            onClick={() => (selectionMode ? exitSelectionMode() : enterSelectionMode())}
            className={`inline-flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-lg border ${
              selectionMode
                ? 'border-primary-300 bg-primary-50 text-primary-700'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            <span className="hidden sm:inline">{selectionMode ? 'Sair' : 'Selecionar'}</span>
          </button>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-lg border ${
              showFilters || activeFilters > 0
                ? 'border-primary-300 bg-primary-50 text-primary-700'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="hidden sm:inline">Filtros</span>
            {activeFilters > 0 && (
              <span className="bg-primary-600 text-white text-[10px] font-semibold rounded-full w-5 h-5 flex items-center justify-center">
                {activeFilters}
              </span>
            )}
          </button>

          <div className="flex bg-slate-100 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}
              aria-label="Visualização em grade"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}
              aria-label="Visualização em lista"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Expandable filters */}
        {showFilters && (
          <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2 animate-slide-down">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as AssetStatus | 'all')}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500/30 bg-white"
            >
              <option value="all">Todos os status</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500/30 bg-white"
            >
              <option value="all">Todas as categorias</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500/30 bg-white"
            >
              <option value="all">Todas as localizações</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>

            {activeFilters > 0 && (
              <button
                onClick={clearFilters}
                className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 ml-auto"
              >
                <X className="w-3.5 h-3.5" />
                Limpar filtros
              </button>
            )}
          </div>
        )}
      </div>

      {/* Bulk action bar */}
      {selectionMode && (
        <div className="bg-primary-600 text-white rounded-xl px-4 py-3 mb-5 flex items-center justify-between gap-3 flex-wrap animate-slide-down">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-medium">
              {selectedCount} {selectedCount === 1 ? 'ativo selecionado' : 'ativos selecionados'}
            </span>
            <button
              onClick={allSelected ? clearSelection : selectAll}
              className="text-xs bg-white/20 hover:bg-white/30 px-2.5 py-1 rounded-lg font-medium"
            >
              {allSelected ? 'Desmarcar tudo' : 'Selecionar tudo'}
            </button>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowRelocate(true)}
              disabled={selectedCount === 0}
              className="inline-flex items-center gap-1.5 text-xs bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg font-medium disabled:opacity-50"
            >
              <MapPin className="w-3.5 h-3.5" />
              Realocar
            </button>
            <button
              onClick={() => setConfirmDelete({ ids: Array.from(selectedIds) })}
              disabled={selectedCount === 0}
              className="inline-flex items-center gap-1.5 text-xs bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-lg font-medium disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Excluir
            </button>
            <button
              onClick={exitSelectionMode}
              className="inline-flex items-center gap-1.5 text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg font-medium"
            >
              <X className="w-3.5 h-3.5" />
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Results */}
      {loading ? (
        <Spinner size="lg" className="py-20" />
      ) : error ? (
        <ErrorState message={error} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Nenhum ativo encontrado"
          description={search || activeFilters > 0 ? "Tente ajustar a busca ou os filtros." : "Comece cadastrando o primeiro ativo."}
        />
      ) : viewMode === 'grid' ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {paginatedAssets.map((asset) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                selected={selectedIds.has(asset.id)}
                selectionMode={selectionMode}
                onToggleSelect={toggleSelect}
              />
            ))}
          </div>

          {/* Paginação Grid */}
          <div className="mt-5 bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between gap-4 flex-wrap text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <span>Exibindo <strong>{pageSize === -1 ? filtered.length : Math.min(filtered.length, (page - 1) * pageSize + 1)}</strong> - <strong>{pageSize === -1 ? filtered.length : Math.min(filtered.length, page * pageSize)}</strong> de <strong>{filtered.length}</strong> ativos</span>
              <span className="text-slate-300">|</span>
              <label className="flex items-center gap-1.5 text-xs text-slate-500">
                Por página:
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="px-2 py-1 border border-slate-200 rounded-md bg-white text-xs text-slate-700 font-medium focus:ring-1 focus:ring-primary-500"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={-1}>Todos</option>
                </select>
              </label>
            </div>

            {pageSize !== -1 && totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none"
                  title="Primeira página"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none"
                  title="Página anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 py-1 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none"
                  title="Próxima página"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage(totalPages)}
                  disabled={page === totalPages}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none"
                  title="Última página"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {selectionMode && (
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={() => (allSelected ? clearSelection() : selectAll())}
                      className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                    />
                  </th>
                )}
                <th className="text-left font-semibold text-slate-600 px-4 py-3">Ativo</th>
                <th className="text-left font-semibold text-slate-600 px-4 py-3 hidden md:table-cell">Código</th>
                <th className="text-left font-semibold text-slate-600 px-4 py-3 hidden lg:table-cell">Categoria</th>
                <th className="text-left font-semibold text-slate-600 px-4 py-3 hidden md:table-cell">Localização</th>
                <th className="text-left font-semibold text-slate-600 px-4 py-3">Status</th>
                {!selectionMode && <th className="w-20 px-4 py-3"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedAssets.map((asset) => (
                <tr
                  key={asset.id}
                  className={`hover:bg-slate-50 ${selectedIds.has(asset.id) ? 'bg-primary-50' : ''}`}
                >
                  {selectionMode && (
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(asset.id)}
                        onChange={() => toggleSelect(asset.id)}
                        className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                      />
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <button
                      onClick={() => navigate(`/inventario/${asset.id}`)}
                      className="font-medium text-slate-900 hover:text-primary-700 text-left"
                    >
                      {asset.name}
                    </button>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell font-mono text-xs text-slate-600">{asset.asset_code}</td>
                  <td className="px-4 py-3 hidden lg:table-cell text-slate-600">{asset.category?.name || '—'}</td>
                  <td className="px-4 py-3 hidden md:table-cell text-slate-600">{asset.location?.name || '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={asset.status} size="sm" /></td>
                  {!selectionMode && (
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => openEditAsset(asset)}
                          className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-primary-600"
                          aria-label="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setConfirmDelete({ ids: [asset.id] })}
                          className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
                          aria-label="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          {/* Paginação Tabela */}
          <div className="border-t border-slate-200 px-4 py-3 bg-slate-50 flex items-center justify-between gap-4 flex-wrap text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <span>Exibindo <strong>{pageSize === -1 ? filtered.length : Math.min(filtered.length, (page - 1) * pageSize + 1)}</strong> - <strong>{pageSize === -1 ? filtered.length : Math.min(filtered.length, page * pageSize)}</strong> de <strong>{filtered.length}</strong> ativos</span>
              <span className="text-slate-300">|</span>
              <label className="flex items-center gap-1.5 text-xs text-slate-500">
                Por página:
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="px-2 py-1 border border-slate-200 rounded-md bg-white text-xs text-slate-700 font-medium focus:ring-1 focus:ring-primary-500"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={-1}>Todos</option>
                </select>
              </label>
            </div>

            {pageSize !== -1 && totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none"
                  title="Primeira página"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none"
                  title="Página anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 py-1 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg">
                  Página {page} de {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none"
                  title="Próxima página"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage(totalPages)}
                  disabled={page === totalPages}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none"
                  title="Última página"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      {showForm && (
        <AssetFormModal
          asset={editingAsset}
          onClose={() => {
            setShowForm(false);
            setEditingAsset(null);
          }}
          onSaved={async () => {
            setShowForm(false);
            setEditingAsset(null);
            await loadAssets();
          }}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          title={confirmDelete.ids.length === 1 ? 'Excluir ativo?' : `Excluir ${confirmDelete.ids.length} ativos?`}
          message={
            confirmDelete.ids.length === 1
              ? 'Esta ação não pode ser desfeita. O ativo e todo o seu histórico serão removidos permanentemente.'
              : `Esta ação não pode ser desfeita. ${confirmDelete.ids.length} ativos e seus históricos serão removidos permanentemente.`
          }
          confirmLabel="Excluir"
          danger
          onConfirm={() => deleteAssets(confirmDelete.ids)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {showRelocate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm animate-fade-in" onClick={() => setShowRelocate(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md animate-slide-up overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-primary-600" />
                </div>
                <h3 className="font-semibold text-slate-900">Realocar Ativos</h3>
              </div>
              <p className="text-sm text-slate-500 mb-4">
                Selecione a nova localização para os {selectedCount} ativos selecionados.
              </p>
              <select
                value={relocateTarget}
                onChange={(e) => setRelocateTarget(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400"
              >
                <option value="">Selecione a localização...</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-3 bg-slate-50">
              <button
                onClick={() => setShowRelocate(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                onClick={() => relocateSelected(relocateTarget)}
                disabled={!relocateTarget || actionLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg disabled:opacity-50"
              >
                Confirmar Realocação
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
