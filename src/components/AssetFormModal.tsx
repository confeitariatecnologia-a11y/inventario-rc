import { useEffect, useState } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { STATUS_LABELS } from '@/lib/utils';
import type { Asset, Category, Location, AssetStatus } from '@/types';

interface AssetFormModalProps {
  asset?: Asset | null;
  onClose: () => void;
  onSaved: () => void;
}

const EMPTY_FORM = {
  name: '',
  asset_code: '',
  serial_number: '',
  category_id: '',
  location_id: '',
  status: 'operacional' as AssetStatus,
  responsible: '',
  acquisition_date: '',
  acquisition_value: '',
  warranty_until: '',
  last_maintenance: '',
  next_maintenance: '',
  image_url: '',
  notes: '',
};

type FormData = typeof EMPTY_FORM;

export default function AssetFormModal({ asset, onClose, onSaved }: AssetFormModalProps) {
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [categories, setCategories] = useState<Category[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  const isEdit = Boolean(asset);

  useEffect(() => {
    async function loadOptions() {
      const [cats, locs] = await Promise.all([
        supabase.from('categories').select('*').order('name'),
        supabase.from('locations').select('*').order('name'),
      ]);
      if (cats.data) setCategories(cats.data);
      if (locs.data) setLocations(locs.data);
    }
    loadOptions();
  }, []);

  useEffect(() => {
    if (asset) {
      setForm({
        name: asset.name,
        asset_code: asset.asset_code,
        serial_number: asset.serial_number || '',
        category_id: asset.category_id || '',
        location_id: asset.location_id || '',
        status: asset.status,
        responsible: asset.responsible || '',
        acquisition_date: asset.acquisition_date || '',
        acquisition_value: asset.acquisition_value?.toString() || '',
        warranty_until: asset.warranty_until || '',
        last_maintenance: asset.last_maintenance || '',
        next_maintenance: asset.next_maintenance || '',
        image_url: asset.image_url || '',
        notes: asset.notes || '',
      });
    }
  }, [asset]);

  function set(field: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function validate(): boolean {
    const newErrors: Partial<Record<keyof FormData, string>> = {};
    if (!form.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    } else if (form.name.trim().length > 200) {
      newErrors.name = 'Nome deve ter no máximo 200 caracteres';
    }
    if (!form.asset_code.trim()) {
      newErrors.asset_code = 'Código é obrigatório';
    } else if (!/^[A-Za-z0-9_-]+$/.test(form.asset_code.trim())) {
      newErrors.asset_code = 'Código deve conter apenas letras, números, hífen ou underline';
    } else if (form.asset_code.trim().length > 50) {
      newErrors.asset_code = 'Código deve ter no máximo 50 caracteres';
    }
    if (form.serial_number && form.serial_number.length > 100) {
      newErrors.serial_number = 'Número de série deve ter no máximo 100 caracteres';
    }
    if (form.responsible && form.responsible.length > 100) {
      newErrors.responsible = 'Responsável deve ter no máximo 100 caracteres';
    }
    if (form.acquisition_value) {
      const num = parseFloat(form.acquisition_value);
      if (isNaN(num) || num < 0 || num > 999999999.99) {
        newErrors.acquisition_value = 'Valor inválido';
      }
    }
    if (form.image_url && !/^https?:\/\/.+/i.test(form.image_url.trim())) {
      newErrors.image_url = 'URL deve começar com http:// ou https://';
    }
    if (form.notes && form.notes.length > 2000) {
      newErrors.notes = 'Observações devem ter no máximo 2000 caracteres';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);

    const payload = {
      name: form.name.trim().slice(0, 200),
      asset_code: form.asset_code.trim().toUpperCase().slice(0, 50),
      serial_number: form.serial_number.trim().slice(0, 100) || null,
      category_id: form.category_id || null,
      location_id: form.location_id || null,
      status: form.status,
      responsible: form.responsible.trim().slice(0, 100) || null,
      acquisition_date: form.acquisition_date || null,
      acquisition_value: form.acquisition_value ? Math.max(0, parseFloat(form.acquisition_value)) : null,
      warranty_until: form.warranty_until || null,
      last_maintenance: form.last_maintenance || null,
      next_maintenance: form.next_maintenance || null,
      image_url: form.image_url.trim().slice(0, 2000) || null,
      notes: form.notes.trim().slice(0, 2000) || null,
      updated_at: new Date().toISOString(),
    };

    if (isEdit && asset) {
      const { error } = await supabase.from('assets').update(payload).eq('id', asset.id);
      if (error) {
        setErrors({ name: error.message });
        setSaving(false);
        return;
      }
    } else {
      const { error } = await supabase.from('assets').insert(payload);
      if (error) {
        if (error.message.includes('asset_code')) {
          setErrors({ asset_code: 'Este código já está em uso' });
        } else {
          setErrors({ name: error.message });
        }
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm animate-fade-in" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 flex-shrink-0">
          <h2 className="text-lg font-semibold text-slate-900">
            {isEdit ? 'Editar Ativo' : 'Novo Ativo'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-5">
            {/* Section: Identificação */}
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Identificação</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Nome do Ativo <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => set('name', e.target.value)}
                    placeholder="Ex: Impressora Zebra ZT410"
                    className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 ${
                      errors.name ? 'border-red-400 bg-red-50' : 'border-slate-200'
                    }`}
                  />
                  {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Código <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.asset_code}
                    onChange={(e) => set('asset_code', e.target.value)}
                    placeholder="Ex: PRT003"
                    className={`w-full px-3 py-2 text-sm border rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 ${
                      errors.asset_code ? 'border-red-400 bg-red-50' : 'border-slate-200'
                    }`}
                  />
                  {errors.asset_code && <p className="text-xs text-red-500 mt-1">{errors.asset_code}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Número de Série</label>
                  <input
                    type="text"
                    value={form.serial_number}
                    onChange={(e) => set('serial_number', e.target.value)}
                    placeholder="Ex: SN-ABC-001"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Categoria</label>
                  <select
                    value={form.category_id}
                    onChange={(e) => set('category_id', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400"
                  >
                    <option value="">Selecione...</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => set('status', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400"
                  >
                    {(['operacional', 'manutencao', 'emprestado', 'baixado'] as AssetStatus[]).map((s) => (
                      <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Section: Localização */}
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Localização & Responsável</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Localização</label>
                  <select
                    value={form.location_id}
                    onChange={(e) => set('location_id', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400"
                  >
                    <option value="">Selecione...</option>
                    {locations.map((l) => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Responsável</label>
                  <input
                    type="text"
                    value={form.responsible}
                    onChange={(e) => set('responsible', e.target.value)}
                    placeholder="Nome do responsável"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400"
                  />
                </div>
              </div>
            </div>

            {/* Section: Financeiro */}
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Informações Financeiras</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Data de Aquisição</label>
                  <input
                    type="date"
                    value={form.acquisition_date}
                    onChange={(e) => set('acquisition_date', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Valor (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.acquisition_value}
                    onChange={(e) => set('acquisition_value', e.target.value)}
                    placeholder="0,00"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Garantia até</label>
                  <input
                    type="date"
                    value={form.warranty_until}
                    onChange={(e) => set('warranty_until', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400"
                  />
                </div>
              </div>
            </div>

            {/* Section: Manutenção */}
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Manutenção</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Última Manutenção</label>
                  <input
                    type="date"
                    value={form.last_maintenance}
                    onChange={(e) => set('last_maintenance', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Próxima Manutenção</label>
                  <input
                    type="date"
                    value={form.next_maintenance}
                    onChange={(e) => set('next_maintenance', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400"
                  />
                </div>
              </div>
            </div>

            {/* Section: Imagem e notas */}
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Imagem & Observações</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">URL da Imagem</label>
                  <input
                    type="url"
                    value={form.image_url}
                    onChange={(e) => set('image_url', e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400"
                  />
                  {form.image_url && (
                    <img src={form.image_url} alt="preview" className="mt-2 h-20 rounded-lg object-cover border border-slate-200" onError={(e) => (e.currentTarget.style.display = 'none')} />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Observações</label>
                  <textarea
                    rows={3}
                    value={form.notes}
                    onChange={(e) => set('notes', e.target.value)}
                    placeholder="Informações adicionais sobre o ativo..."
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-3 flex-shrink-0 bg-slate-50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg disabled:opacity-60"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {isEdit ? 'Salvar Alterações' : 'Cadastrar Ativo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
