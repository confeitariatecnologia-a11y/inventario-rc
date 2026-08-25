import { supabase } from '@/lib/supabase';
import type { Asset, Category, Location, Doc, DocumentCategory } from '@/types';
import { calculateDepreciation } from '@/lib/depreciation';

// In-memory + sessionStorage client cache for zero-latency UI
const memoryStore = new Map<string, unknown>();

export function getCachedData<T>(key: string): T | null {
  if (memoryStore.has(key)) {
    return memoryStore.get(key) as T;
  }
  try {
    const raw = sessionStorage.getItem(`cache_${key}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      memoryStore.set(key, parsed);
      return parsed as T;
    }
  } catch {
    // Ignore storage error
  }
  return null;
}

export function setCachedData<T>(key: string, data: T): void {
  memoryStore.set(key, data);
  try {
    sessionStorage.setItem(`cache_${key}`, JSON.stringify(data));
  } catch {
    // Ignore storage quota error
  }
}

export function invalidateCache(keyPrefix?: string): void {
  if (!keyPrefix) {
    memoryStore.clear();
    try {
      sessionStorage.clear();
    } catch {
      // Ignore
    }
    return;
  }
  for (const key of memoryStore.keys()) {
    if (key.startsWith(keyPrefix)) {
      memoryStore.delete(key);
      try {
        sessionStorage.removeItem(`cache_${key}`);
      } catch {
        // Ignore
      }
    }
  }
}

let prefetchPromise: Promise<void> | null = null;

export async function prefetchAllData(force = false): Promise<void> {
  if (prefetchPromise && !force) return prefetchPromise;

  prefetchPromise = (async () => {
    try {
      const [assetsRes, catsRes, locsRes, docsRes, docCatsRes] = await Promise.all([
        supabase
          .from('assets')
          .select('*, category:categories(*), location:locations(*)')
          .range(0, 9999)
          .order('updated_at', { ascending: false }),
        supabase.from('categories').select('*').order('name'),
        supabase.from('locations').select('*').order('name'),
        supabase
          .from('documents')
          .select('*, category:document_categories(*)')
          .order('updated_at', { ascending: false }),
        supabase.from('document_categories').select('*').order('name'),
      ]);

      const assets: Asset[] = assetsRes.data || [];
      const categories: Category[] = catsRes.data || [];
      const locations: Location[] = locsRes.data || [];
      const docs: Doc[] = docsRes.data || [];
      const docCategories: DocumentCategory[] = docCatsRes.data || [];

      let totalValue = 0;
      let totalBookValue = 0;
      let totalResidualValue = 0;

      for (const a of assets) {
        const val = Number(a.acquisition_value) || 0;
        totalValue += val;
        const dep = calculateDepreciation(a);
        totalBookValue += dep.currentBookValue;
        totalResidualValue += dep.residualValue;
      }

      const stats = {
        total: assets.length,
        operacional: assets.filter((a) => a.status === 'operacional').length,
        manutencao: assets.filter((a) => a.status === 'manutencao').length,
        emprestado: assets.filter((a) => a.status === 'emprestado').length,
        baixado: assets.filter((a) => a.status === 'baixado').length,
        totalValue,
        totalBookValue,
        totalResidualValue,
        docsTotal: docs.length,
      };

      setCachedData('all_assets', assets);
      setCachedData('all_categories', categories);
      setCachedData('all_locations', locations);
      setCachedData('all_docs', docs);
      setCachedData('all_doc_categories', docCategories);
      setCachedData('dashboard_stats', stats);
      setCachedData('dashboard_assets', assets.slice(0, 6));
      setCachedData('dashboard_docs', docs.slice(0, 5));
      setCachedData('maintenance_assets', assets);
      setCachedData('qrcode_assets', assets);
      setCachedData('reports_data', { assets, categories, locations });
    } catch (err) {
      console.warn('[dataCache] Prefetch error:', err);
    } finally {
      prefetchPromise = null;
    }
  })();

  return prefetchPromise;
}
