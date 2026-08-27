import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Spinner } from '@/components';
import type { UserAccess, AccessRole } from '@/types';
import type { Session, User } from '@supabase/supabase-js';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  access: UserAccess | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (identifier: string) => Promise<void>;
  isAdmin: boolean;
  isManager: boolean;
  isConsulta: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const ACCESS_CACHE_KEY = 'richesse_user_access';

function getCachedAccess(): UserAccess | null {
  try {
    const raw = sessionStorage.getItem(ACCESS_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setCachedAccess(access: UserAccess | null) {
  try {
    if (access) {
      sessionStorage.setItem(ACCESS_CACHE_KEY, JSON.stringify(access));
    } else {
      sessionStorage.removeItem(ACCESS_CACHE_KEY);
    }
  } catch {
    // Ignore storage errors (e.g. quota exceeded, private mode)
  }
}

async function fetchUserAccess(email: string): Promise<UserAccess | null> {
  const normalizedEmail = email.trim().toLowerCase();
  const { data, error } = await supabase
    .from('user_accesses')
    .select('*')
    .ilike('email', normalizedEmail)
    .maybeSingle();

  if (error) {
    console.error('[Auth] Erro ao consultar user_accesses:', error);
    throw error;
  }

  return data;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [access, setAccess] = useState<UserAccess | null>(getCachedAccess);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    // Timeout de segurança ultra rápido (1.2s max)
    const fallbackTimeout = setTimeout(() => {
      if (isMounted) {
        setLoading(false);
      }
    }, 1200);

    async function handleSession(sessionValue: Session | null) {
      if (!isMounted) return;
      setSession(sessionValue);
      setUser(sessionValue?.user ?? null);

      if (sessionValue?.user?.email) {
        // Se já houver permissões em cache, libera o carregamento instantaneamente (0ms)
        const cached = getCachedAccess();
        if (cached && cached.email.toLowerCase() === sessionValue.user.email.toLowerCase()) {
          setAccess(cached);
          if (isMounted) setLoading(false);
        }

        try {
          const accessValue = await fetchUserAccess(sessionValue.user.email);
          if (!isMounted) return;
          if (!accessValue) {
            setError(`O e-mail ${sessionValue.user.email} não possui acesso cadastrado no sistema (user_accesses).`);
            setCachedAccess(null);
            await supabase.auth.signOut().catch(() => {});
            setSession(null);
            setUser(null);
            setAccess(null);
          } else if (!accessValue.is_active) {
            setError('Seu acesso está inativo. Entre em contato com o administrador.');
            setCachedAccess(null);
            await supabase.auth.signOut().catch(() => {});
            setSession(null);
            setUser(null);
            setAccess(null);
          } else {
            setAccess(accessValue);
            setCachedAccess(accessValue);
          }
        } catch (fetchError) {
          if (!isMounted) return;
          console.error('[Auth] Erro ao buscar permissões:', fetchError);
        }
      } else {
        setAccess(null);
        setCachedAccess(null);
      }

      if (isMounted) {
        setLoading(false);
      }
    }

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, sessionValue) => {
      if (!isMounted) return;
      if (event === 'SIGNED_IN') {
        setError(null);
      }
      await handleSession(sessionValue);
    });

    return () => {
      isMounted = false;
      clearTimeout(fallbackTimeout);
      authListener.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (identifier: string, password: string) => {
    setLoading(true);
    setError(null);

    const cleanInput = identifier.trim();
    console.log('[Auth] signIn chamado para:', cleanInput);

    try {
      let targetEmail = cleanInput.toLowerCase();

      // Se não contiver '@', busca o e-mail correspondente pelo nome no cadastro de usuários
      if (!cleanInput.includes('@')) {
        const { data: userByExactName } = await supabase
          .from('user_accesses')
          .select('email')
          .ilike('full_name', cleanInput)
          .maybeSingle();

        if (userByExactName?.email) {
          targetEmail = userByExactName.email.toLowerCase();
        } else {
          // Busca parcial (ex: digitou "Marcos" ou "Supervisor")
          const { data: userByPartialName } = await supabase
            .from('user_accesses')
            .select('email')
            .ilike('full_name', `%${cleanInput}%`)
            .limit(1)
            .maybeSingle();

          if (userByPartialName?.email) {
            targetEmail = userByPartialName.email.toLowerCase();
          } else {
            setError('Usuário não encontrado. Verifique o nome digitado ou use seu e-mail.');
            setLoading(false);
            return;
          }
        }
      }

      console.log('[Auth] chamando supabase.auth.signInWithPassword para e-mail:', targetEmail);

      // Timeout de 10s para não travar eternamente
      const signInPromise = supabase.auth.signInWithPassword({
        email: targetEmail,
        password,
      });
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Tempo limite excedido. Verifique sua conexão com a internet.')), 10000)
      );

      const { data, error } = await Promise.race([signInPromise, timeoutPromise]) as Awaited<typeof signInPromise>;

      console.log('[Auth] signInWithPassword concluído. Error:', error?.message || 'sem erro');

      if (error) {
        setError(error.message === 'Invalid login credentials' ? 'Nome/E-mail ou senha incorretos.' : error.message);
        return;
      }

      if (!data.session?.user?.email) {
        setError('Falha ao iniciar sessão.');
        return;
      }

      console.log('[Auth] buscando permissões para:', data.session.user.email);
      const accessValue = await fetchUserAccess(data.session.user.email);
      console.log('[Auth] permissões:', accessValue?.role || 'sem permissão');

      if (!accessValue) {
        setError('Usuário não autorizado.');
        await supabase.auth.signOut();
        setSession(null);
        setUser(null);
        setAccess(null);
      } else {
        setSession(data.session);
        setUser(data.session.user);
        setAccess(accessValue);
      }
    } catch (err) {
      console.error('[Auth] signIn error:', err);
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Conexão com o servidor excedeu o tempo limite.');
      } else {
        setError(err instanceof Error ? err.message : 'Erro de conexão com o servidor.');
      }
    } finally {
      console.log('[Auth] signIn finally - setLoading(false)');
      setLoading(false);
    }
  };

  const resetPassword = async (identifier: string) => {
    setLoading(true);
    setError(null);

    const cleanInput = identifier.trim();

    try {
      let targetEmail = cleanInput.toLowerCase();

      if (!cleanInput.includes('@')) {
        const { data: userByExactName } = await supabase
          .from('user_accesses')
          .select('email')
          .ilike('full_name', cleanInput)
          .maybeSingle();

        if (userByExactName?.email) {
          targetEmail = userByExactName.email.toLowerCase();
        } else {
          const { data: userByPartialName } = await supabase
            .from('user_accesses')
            .select('email')
            .ilike('full_name', `%${cleanInput}%`)
            .limit(1)
            .maybeSingle();

          if (userByPartialName?.email) {
            targetEmail = userByPartialName.email.toLowerCase();
          } else {
            setError('Usuário não encontrado. Verifique o nome digitado ou use seu e-mail.');
            setLoading(false);
            return;
          }
        }
      }

      const { error } = await supabase.auth.resetPasswordForEmail(targetEmail, {
        redirectTo: window.location.origin, // Redirects back to app root where onAuthStateChange will handle it
      });

      if (error) throw error;
    } catch (err) {
      console.error('[Auth] resetPassword error:', err);
      setError(err instanceof Error ? err.message : 'Erro ao solicitar redefinição de senha.');
      throw err; // Re-throw for component to catch
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    setError(null);
    setCachedAccess(null);
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setAccess(null);
    setLoading(false);
  };

  const isAdmin = access?.role === 'admin';
  const isManager = access?.role === 'gestor';
  const isConsulta = access?.role === 'consulta';

  const value = useMemo(
    () => ({
      session,
      user,
      access,
      loading,
      error,
      signIn,
      signOut,
      resetPassword,
      isAdmin,
      isManager,
      isConsulta,
    }),
    [session, user, access, loading, error, isAdmin, isManager, isConsulta]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function RequireAuth({ children }: { children: JSX.Element }) {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !session) {
      navigate('/login', { replace: true });
    }
  }, [loading, session, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return children;
}

export function RequireRole({ children, roles }: { children: JSX.Element; roles: Array<AccessRole> }) {
  const { access, loading } = useAuth();
  const navigate = useNavigate();
  const rolesKey = roles.join(',');

  useEffect(() => {
    const rolesArray = rolesKey.split(',');
    if (!loading && access && !rolesArray.includes(access.role)) {
      navigate('/', { replace: true });
    }
  }, [access, loading, navigate, rolesKey]);

  if (loading) {
    return (
      <div className="p-12 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!access || !roles.includes(access.role)) {
    return null;
  }

  return children;
}
