import { useEffect, useMemo, useState, useCallback } from 'react';
import { Building2, FileText, Plus, Save, Shield, Tags, Trash2, UserCog, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase, supabaseAdminAuth } from '@/lib/supabase';
import { ConfirmDialog, ErrorState, PageHeader } from '@/components';
import { LOCATION_TYPE_LABELS } from '@/lib/utils';
import type { AccessRole, Category, DocumentCategory, Location, UserAccess } from '@/types';

const ROLE_LABELS: Record<AccessRole, string> = {
  admin: 'Administrador Master',
  gestor: 'Gestor de Loja',
  tecnico: 'Técnico de Campo',
  auditor: 'Auditor de Estoque',
  consulta: 'Consulta Geral',
};

const EMPTY_ACCESS_FORM = {
  full_name: '',
  email: '',
  password: '',
  role: 'consulta' as AccessRole,
  location_id: '',
  notes: '',
};

type AccessForm = typeof EMPTY_ACCESS_FORM;

import { getCachedData, setCachedData, invalidateCache } from '@/lib/dataCache';

export default function Settings() {
  const [locations, setLocations] = useState<Location[]>(() => getCachedData<Location[]>('all_locations') || []);
  const [categories, setCategories] = useState<Category[]>(() => getCachedData<Category[]>('all_categories') || []);
  const [docCategories, setDocCategories] = useState<DocumentCategory[]>(() => getCachedData<DocumentCategory[]>('all_doc_categories') || []);
  const [accesses, setAccesses] = useState<UserAccess[]>(() => getCachedData<UserAccess[]>('all_user_accesses') || []);
  const [accessForm, setAccessForm] = useState<AccessForm>(EMPTY_ACCESS_FORM);
  const [showAccessForm, setShowAccessForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [editingAccessId, setEditingAccessId] = useState<string | null>(null);
  const [confirmDeleteAccess, setConfirmDeleteAccess] = useState<UserAccess | null>(null);
  const [savingAccess, setSavingAccess] = useState(false);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [accessSuccess, setAccessSuccess] = useState<string | null>(null);
  const [_loading, setLoading] = useState(() => !(getCachedData('all_locations') || getCachedData('all_categories')));
  const [error, setError] = useState<string | null>(null);

  const editingAccess = useMemo(
    () => accesses.find((access) => access.id === editingAccessId) || null,
    [accesses, editingAccessId]
  );

  const loadSettings = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [locs, cats, docCats, accessRows] = await Promise.all([
        supabase.from('locations').select('*').order('name'),
        supabase.from('categories').select('*').order('name'),
        supabase.from('document_categories').select('*').order('name'),
        supabase
          .from('user_accesses')
          .select('*, location:locations(*)')
          .order('full_name'),
      ]);

      if (locs.data) {
        setLocations(locs.data);
        setCachedData('all_locations', locs.data);
      }
      if (cats.data) {
        setCategories(cats.data);
        setCachedData('all_categories', cats.data);
      }
      if (docCats.data) {
        setDocCategories(docCats.data);
        setCachedData('all_doc_categories', docCats.data);
      }
      if (accessRows.data) {
        setAccesses(accessRows.data);
        setCachedData('all_user_accesses', accessRows.data);
      }

      const firstError = locs.error || cats.error || docCats.error || accessRows.error;
      if (!locations.length) setError(firstError?.message || null);
    } catch (err) {
      if (!locations.length) setError(err instanceof Error ? err.message : 'Erro ao carregar configurações');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [locations.length]);

  useEffect(() => {
    loadSettings(Boolean(getCachedData('all_locations')));
  }, [loadSettings]);

  function setAccessField(field: keyof AccessForm, value: string) {
    setAccessForm((prev) => ({ ...prev, [field]: value }));
    setAccessError(null);
  }

  function startEditAccess(access: UserAccess) {
    setEditingAccessId(access.id);
    setAccessForm({
      full_name: access.full_name,
      email: access.email,
      password: '',
      role: access.role,
      location_id: access.location_id || '',
      notes: access.notes || '',
    });
    setShowAccessForm(true);
    setAccessError(null);
  }

  function resetAccessForm() {
    setEditingAccessId(null);
    setAccessForm(EMPTY_ACCESS_FORM);
    setShowAccessForm(false);
    setAccessError(null);
  }

  function toggleNewAccessForm() {
    if (showAccessForm && !editingAccessId) {
      setShowAccessForm(false);
    } else {
      setEditingAccessId(null);
      setAccessForm(EMPTY_ACCESS_FORM);
      setShowAccessForm(true);
    }
    setAccessError(null);
  }

  async function saveAccess(event: React.FormEvent) {
    event.preventDefault();

    const email = accessForm.email.trim().toLowerCase();
    const fullName = accessForm.full_name.trim() || email.split('@')[0];
    const password = accessForm.password.trim();

    if (!email) {
      setAccessError('Informe o e-mail do usuário.');
      return;
    }

    if (!editingAccess && (!password || password.length < 6)) {
      setAccessError('A senha inicial deve ter pelo menos 6 caracteres.');
      return;
    }

    setSavingAccess(true);
    setAccessError(null);
    setAccessSuccess(null);

    let _authNotice = '';

    try {
      // Se for criação de novo usuário, tenta criar no Supabase Auth
      if (!editingAccess) {
        try {
          const { error: authError } = await supabaseAdminAuth.auth.signUp({
            email,
            password,
            options: {
              data: {
                full_name: fullName,
              },
            },
          });

          if (authError) {
            console.warn('[Settings] Aviso Supabase Auth:', authError.message);
            if (authError.message.includes('already registered')) {
              _authNotice = 'Usuário já registrado no Auth';
            } else {
              let errorMsg = authError.message;
              if (authError.status === 429 || authError.message.includes('rate_limit')) {
                errorMsg = 'Limite de criação de logins atingido (proteção anti-spam). Tente novamente mais tarde ou configure um provedor de e-mail.';
              }
              setAccessError(`Erro ao criar login: ${errorMsg}`);
              setSavingAccess(false);
              return;
            }
          }
        } catch (err) {
          setAccessError('Falha na comunicação com o serviço de autenticação.');
          setSavingAccess(false);
          return;
        }
      }

      const payload = {
        full_name: fullName,
        email,
        role: accessForm.role,
        location_id: accessForm.location_id || null,
        notes: accessForm.notes.trim() || null,
        updated_at: new Date().toISOString(),
      };

      const response = editingAccess
        ? await supabase.from('user_accesses').update(payload).eq('id', editingAccess.id).select('*, location:locations(*)').single()
        : await supabase.from('user_accesses').insert(payload).select('*, location:locations(*)').single();

      if (response.error) {
        setAccessError(
          response.error.message.includes('duplicate') || response.error.message.includes('unique')
            ? 'Já existe um acesso cadastrado com esse e-mail nas configurações.'
            : response.error.message
        );
        return;
      }

      if (response.data) {
        const saved = response.data as UserAccess;
        setAccesses((prev) => [saved, ...prev.filter((a) => a.id !== saved.id)]);
      }

      invalidateCache('all_user_accesses');
      resetAccessForm();
      setAccessSuccess(`Usuário "${fullName}" cadastrado com sucesso!`);
      setTimeout(() => setAccessSuccess(null), 5000);
      await loadSettings(true);
    } catch (err) {
      setAccessError(err instanceof Error ? err.message : 'Erro ao salvar acesso.');
    } finally {
      setSavingAccess(false);
    }
  }

  async function toggleAccess(access: UserAccess) {
    const nextStatus = !access.is_active;
    // Otimista: altera o estado local na hora
    setAccesses((prev) =>
      prev.map((a) => (a.id === access.id ? { ...a, is_active: nextStatus } : a))
    );

    const { error: toggleError } = await supabase
      .from('user_accesses')
      .update({ is_active: nextStatus, updated_at: new Date().toISOString() })
      .eq('id', access.id);

    if (toggleError) {
      setAccessError(toggleError.message);
      await loadSettings(true);
      return;
    }

    invalidateCache('all_user_accesses');
    await loadSettings(true);
  }

  async function deleteAccess(access: UserAccess) {
    setConfirmDeleteAccess(null);

    // 1. Remove otimisticamente do estado local
    setAccesses((prev) => prev.filter((a) => a.id !== access.id));

    try {
      // 2. Executa o DELETE retornando as linhas afetadas
      const { data: deleted, error: delError } = await supabase
        .from('user_accesses')
        .delete()
        .eq('id', access.id)
        .select('id');

      // 3. Verifica se houve erro de banco
      if (delError) {
        console.error('[Settings] Erro ao excluir acesso:', delError);
        setAccessError(`Erro ao excluir: ${delError.message}`);
        // Reverte o estado local
        setAccesses((prev) => [access, ...prev]);
        return;
      }

      // 4. Verifica se realmente foi deletado (0 rows = RLS bloqueou ou ID não existe)
      if (!deleted || deleted.length === 0) {
        console.warn('[Settings] DELETE não afetou nenhuma linha. Possível bloqueio de RLS ou registro inexistente.', access.id);
        setAccessError(
          'Não foi possível excluir este registro. Verifique as permissões de exclusão no banco de dados (RLS).'
        );
        // Reverte o estado local
        setAccesses((prev) => [access, ...prev]);
        return;
      }

      // 5. Sucesso — invalida cache e recarrega
      invalidateCache('all_user_accesses');
      await loadSettings(true);
    } catch (err) {
      console.error('[Settings] Exceção ao excluir acesso:', err);
      setAccessError(err instanceof Error ? err.message : 'Erro inesperado ao excluir acesso.');
      setAccesses((prev) => [access, ...prev]);
    }
  }

  if (error && !locations.length && !accesses.length) return <div className="p-6"><ErrorState message={error} /></div>;

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
          <button
            type="button"
            onClick={toggleNewAccessForm}
            className={`inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              showAccessForm && !editingAccessId
                ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                : 'text-white bg-primary-600 hover:bg-primary-700'
            }`}
          >
            <Plus className={`w-4 h-4 transition-transform ${showAccessForm && !editingAccessId ? 'rotate-45' : ''}`} />
            {showAccessForm && !editingAccessId ? 'Cancelar' : 'Novo acesso'}
          </button>
        </div>

        {accessSuccess && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm flex items-center gap-2 animate-slide-down">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span className="font-medium">{accessSuccess}</span>
          </div>
        )}

        {accessError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-sm flex items-center gap-2 animate-slide-down">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <span className="font-medium">{accessError}</span>
          </div>
        )}

        {showAccessForm && (
          <form onSubmit={saveAccess} className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-5 p-4 rounded-lg bg-slate-50 border border-slate-200 animate-slide-down">
            <div className="md:col-span-3">
              <label className="block text-xs font-medium text-slate-600 mb-1">Nome</label>
              <input
                value={accessForm.full_name}
                onChange={(event) => setAccessField('full_name', event.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400"
                placeholder="Nome do usuário"
              />
            </div>
            <div className="md:col-span-3">
              <label className="block text-xs font-medium text-slate-600 mb-1">E-mail (Login)</label>
              <input
                type="email"
                value={accessForm.email}
                onChange={(event) => setAccessField('email', event.target.value)}
                disabled={!!editingAccessId}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400 disabled:bg-slate-100 disabled:text-slate-500"
                placeholder="usuario@empresa.com"
              />
            </div>
            {!editingAccessId && (
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">Senha Inicial</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={accessForm.password}
                    onChange={(event) => setAccessField('password', event.target.value)}
                    className="w-full pl-3 pr-9 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded transition-colors"
                    title={showPassword ? 'Ocultar senha' : 'Ver senha'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  O usuário usará esta senha para o primeiro login.
                </p>
              </div>
            )}
            <div className={editingAccessId ? "md:col-span-2" : "md:col-span-2"}>
              <label className="block text-xs font-medium text-slate-600 mb-1">Perfil</label>
              <select
                value={accessForm.role}
                onChange={(event) => setAccessField('role', event.target.value as AccessRole)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400"
              >
                {(['admin', 'gestor', 'tecnico', 'auditor', 'consulta'] as AccessRole[]).map((role) => (
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
            <div className="md:col-span-12 flex items-center justify-between gap-3 pt-2">
              <div className="flex-1 min-w-0">
                <input
                  value={accessForm.notes}
                  onChange={(event) => setAccessField('notes', event.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400"
                  placeholder="Observações (ex: setor, cargo ou restrição)"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={savingAccess}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg disabled:opacity-60"
                >
                  <Save className="w-4 h-4" />
                  {editingAccessId ? 'Salvar Alterações' : 'Cadastrar e Criar Login'}
                </button>
                <button
                  type="button"
                  onClick={resetAccessForm}
                  className="px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100"
                >
                  Cancelar
                </button>
              </div>
            </div>
            {accessError && (
              <p className="md:col-span-12 text-sm text-red-600 bg-red-50 p-2 rounded-lg border border-red-100">{accessError}</p>
            )}
          </form>
        )}

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
                            ? 'text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100'
                            : 'text-emerald-700 bg-emerald-50 border-emerald-100 hover:bg-emerald-100'
                        }`}
                      >
                        {access.is_active ? 'Desativar' : 'Ativar'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteAccess(access)}
                        className="p-1.5 text-xs font-medium text-red-600 hover:bg-red-50 border border-slate-200 hover:border-red-200 rounded-lg"
                        title="Excluir acesso"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
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

      {confirmDeleteAccess && (
        <ConfirmDialog
          title="Excluir Acesso"
          message={`Tem certeza que deseja remover permanentemente o acesso de ${confirmDeleteAccess.full_name} (${confirmDeleteAccess.email})?`}
          confirmLabel="Excluir Permanecendo"
          danger
          onConfirm={() => deleteAccess(confirmDeleteAccess)}
          onCancel={() => setConfirmDeleteAccess(null)}
        />
      )}
    </div>
  );
}
