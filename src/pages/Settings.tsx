import { useEffect, useMemo, useState } from 'react';
import { Building2, FileText, Plus, Save, Shield, Tags, UserCog } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { ErrorState, PageHeader, Spinner } from '@/components';
import { LOCATION_TYPE_LABELS } from '@/lib/utils';
import type { AccessRole, Category, DocumentCategory, Location, UserAccess } from '@/types';

const ROLE_LABELS: Record<AccessRole, string> = {
  admin: 'Administrador',
  gestor: 'Gestor',
  consulta: 'Consulta',
};

const EMPTY_ACCESS_FORM = {
  full_name: '',
  email: '',
  role: 'consulta' as AccessRole,
  location_id: '',
  notes: '',
};

type AccessForm = typeof EMPTY_ACCESS_FORM;

export default function Settings() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [docCategories, setDocCategories] = useState<DocumentCategory[]>([]);
  const [accesses, setAccesses] = useState<UserAccess[]>([]);
  const [accessForm, setAccessForm] = useState<AccessForm>(EMPTY_ACCESS_FORM);
  const [editingAccessId, setEditingAccessId] = useState<string | null>(null);
  const [savingAccess, setSavingAccess] = useState(false);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const editingAccess = useMemo(
    () => accesses.find((access) => access.id === editingAccessId) || null,
    [accesses, editingAccessId]
  );

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    const [locs, cats, docCats, accessRows] = await Promise.all([
      supabase.from('locations').select('*').order('name'),
      supabase.from('categories').select('*').order('name'),
      supabase.from('document_categories').select('*').order('name'),
      supabase
        .from('user_accesses')
        .select('*, location:locations(*)')
        .order('full_name'),
    ]);

    if (locs.data) setLocations(locs.data);
    if (cats.data) setCategories(cats.data);
    if (docCats.data) setDocCategories(docCats.data);
    if (accessRows.data) setAccesses(accessRows.data);

    const firstError = locs.error || cats.error || docCats.error || accessRows.error;
    setError(firstError?.message || null);
    setLoading(false);
  }

  function setAccessField(field: keyof AccessForm, value: string) {
    setAccessForm((prev) => ({ ...prev, [field]: value }));
    setAccessError(null);
  }

  function startEditAccess(access: UserAccess) {
    setEditingAccessId(access.id);
    setAccessForm({
      full_name: access.full_name,
      email: access.email,
      role: access.role,
      location_id: access.location_id || '',
      notes: access.notes || '',
    });
    setAccessError(null);
  }

  function resetAccessForm() {
    setEditingAccessId(null);
    setAccessForm(EMPTY_ACCESS_FORM);
    setAccessError(null);
  }

  async function saveAccess(event: React.FormEvent) {
    event.preventDefault();

    const fullName = accessForm.full_name.trim();
    const email = accessForm.email.trim().toLowerCase();

    if (!fullName) {
      setAccessError('Informe o nome do usuario.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setAccessError('Informe um e-mail valido.');
      return;
    }

    setSavingAccess(true);
    const payload = {
      full_name: fullName,
      email,
      role: accessForm.role,
      location_id: accessForm.location_id || null,
      notes: accessForm.notes.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const response = editingAccess
      ? await supabase.from('user_accesses').update(payload).eq('id', editingAccess.id)
      : await supabase.from('user_accesses').insert(payload);

    if (response.error) {
      setAccessError(
        response.error.message.includes('duplicate') || response.error.message.includes('unique')
          ? 'Ja existe um acesso cadastrado com esse e-mail.'
          : response.error.message
      );
      setSavingAccess(false);
      return;
    }

    resetAccessForm();
    await loadSettings();
    setSavingAccess(false);
  }

  async function toggleAccess(access: UserAccess) {
    const { error: toggleError } = await supabase
      .from('user_accesses')
      .update({ is_active: !access.is_active, updated_at: new Date().toISOString() })
      .eq('id', access.id);

    if (toggleError) {
      setAccessError(toggleError.message);
      return;
    }

    await loadSettings();
  }

  if (loading) return <div className="p-6"><Spinner size="lg" className="py-20" /></div>;
  if (error) return <div className="p-6"><ErrorState message={error} /></div>;

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto">
      <PageHeader
        title="Configuracoes"
        subtitle="Gerencie unidades, categorias e acessos"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-primary-600" />
            </div>
            <h3 className="font-semibold text-slate-900">Unidades</h3>
            <span className="text-xs text-slate-400">({locations.length})</span>
          </div>
          <div className="space-y-2">
            {locations.map((loc) => (
              <div key={loc.id} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{loc.name}</p>
                  {loc.address && <p className="text-xs text-slate-500 truncate">{loc.address}</p>}
                </div>
                <span className="text-[10px] bg-white text-slate-600 px-2 py-0.5 rounded-full border border-slate-200 flex-shrink-0">
                  {LOCATION_TYPE_LABELS[loc.type]}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
              <Tags className="w-4 h-4 text-amber-600" />
            </div>
            <h3 className="font-semibold text-slate-900">Categorias de Ativos</h3>
            <span className="text-xs text-slate-400">({categories.length})</span>
          </div>
          <div className="space-y-2">
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-slate-50">
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color || '#cbd5e1' }} />
                <p className="text-sm font-medium text-slate-900 truncate">{cat.name}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
              <FileText className="w-4 h-4 text-emerald-600" />
            </div>
            <h3 className="font-semibold text-slate-900">Categorias de Documentos</h3>
            <span className="text-xs text-slate-400">({docCategories.length})</span>
          </div>
          <div className="space-y-2">
            {docCategories.map((cat) => (
              <div key={cat.id} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50">
                <p className="text-sm font-medium text-slate-900 truncate">{cat.name}</p>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                  cat.type === 'sop' ? 'bg-primary-100 text-primary-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {cat.type === 'sop' ? 'SOP' : 'Tecnico'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <section className="bg-white rounded-xl border border-slate-200 p-5 mt-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-sky-50 flex items-center justify-center">
              <UserCog className="w-4 h-4 text-sky-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Acessos</h3>
              <p className="text-xs text-slate-500">{accesses.length} usuario(s) cadastrado(s)</p>
            </div>
          </div>
          {!editingAccessId && (
            <button
              type="button"
              onClick={resetAccessForm}
              className="inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg"
            >
              <Plus className="w-4 h-4" />
              Novo acesso
            </button>
          )}
        </div>

        <form onSubmit={saveAccess} className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-5 p-4 rounded-lg bg-slate-50 border border-slate-200">
          <div className="md:col-span-3">
            <label className="block text-xs font-medium text-slate-600 mb-1">Nome</label>
            <input
              value={accessForm.full_name}
              onChange={(event) => setAccessField('full_name', event.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400"
              placeholder="Nome do usuario"
            />
          </div>
          <div className="md:col-span-3">
            <label className="block text-xs font-medium text-slate-600 mb-1">E-mail</label>
            <input
              type="email"
              value={accessForm.email}
              onChange={(event) => setAccessField('email', event.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400"
              placeholder="usuario@empresa.com"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Perfil</label>
            <select
              value={accessForm.role}
              onChange={(event) => setAccessField('role', event.target.value as AccessRole)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400"
            >
              {(['admin', 'gestor', 'consulta'] as AccessRole[]).map((role) => (
                <option key={role} value={role}>{ROLE_LABELS[role]}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Unidade</label>
            <select
              value={accessForm.location_id}
              onChange={(event) => setAccessField('location_id', event.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400"
            >
              <option value="">Todas</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2 flex items-end gap-2">
            <button
              type="submit"
              disabled={savingAccess}
              className="inline-flex flex-1 items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              {editingAccessId ? 'Salvar' : 'Cadastrar'}
            </button>
            {editingAccessId && (
              <button
                type="button"
                onClick={resetAccessForm}
                className="px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100"
              >
                Cancelar
              </button>
            )}
          </div>
          <div className="md:col-span-12">
            <label className="block text-xs font-medium text-slate-600 mb-1">Observacoes</label>
            <input
              value={accessForm.notes}
              onChange={(event) => setAccessField('notes', event.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400"
              placeholder="Ex: acesso temporario, setor, cargo ou restricao"
            />
          </div>
          {accessError && (
            <p className="md:col-span-12 text-sm text-red-600">{accessError}</p>
          )}
        </form>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold text-slate-500 uppercase border-b border-slate-200">
                <th className="py-3 pr-4">Usuario</th>
                <th className="py-3 pr-4">Perfil</th>
                <th className="py-3 pr-4">Unidade</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 text-right">Acoes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {accesses.map((access) => (
                <tr key={access.id}>
                  <td className="py-3 pr-4">
                    <p className="font-medium text-slate-900">{access.full_name}</p>
                    <p className="text-xs text-slate-500">{access.email}</p>
                  </td>
                  <td className="py-3 pr-4">
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-slate-100 text-xs font-medium text-slate-700">
                      <Shield className="w-3 h-3" />
                      {ROLE_LABELS[access.role]}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-slate-600">{access.location?.name || 'Todas'}</td>
                  <td className="py-3 pr-4">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      access.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {access.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => startEditAccess(access)}
                        className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleAccess(access)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg border ${
                          access.is_active
                            ? 'text-red-700 bg-red-50 border-red-100 hover:bg-red-100'
                            : 'text-emerald-700 bg-emerald-50 border-emerald-100 hover:bg-emerald-100'
                        }`}
                      >
                        {access.is_active ? 'Desativar' : 'Ativar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {accesses.length === 0 && (
                <tr>
                  <td className="py-8 text-center text-slate-500" colSpan={5}>
                    Nenhum acesso cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
