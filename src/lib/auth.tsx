import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import type { UserAccess } from '@/types';
import type { Session, User } from '@supabase/supabase-js';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  access: UserAccess | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isManager: boolean;
  isConsulta: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function fetchUserAccess(email: string): Promise<UserAccess | null> {
  const { data, error } = await supabase
    .from('user_accesses')
    .select('*')
    .eq('email', email)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

/** Remove dados de sessão corrompidos do localStorage */
function clearSupabaseSession() {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('sb-')) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((key) => localStorage.removeItem(key));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [access, setAccess] = useState<UserAccess | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function initialize() {
      try {
        setLoading(true);
        const { data } = await supabase.auth.getSession();
        if (!isMounted) return;

        const sessionValue = data.session;
        setSession(sessionValue);
        setUser(sessionValue?.user ?? null);

        if (sessionValue?.user?.email) {
          try {
            const accessValue = await fetchUserAccess(sessionValue.user.email);
            if (!isMounted) return;
            if (!accessValue) {
              setError('Usuário não autorizado.');
              await supabase.auth.signOut();
              setSession(null);
              setUser(null);
              setAccess(null);
            } else {
              setAccess(accessValue);
            }
          } catch (fetchError) {
            if (!isMounted) return;
            console.error('Erro ao buscar permissões:', fetchError);
            // Se falhou ao carregar permissões, faz logout para limpar sessão inválida
            await supabase.auth.signOut().catch(() => { });
            setSession(null);
            setUser(null);
            setAccess(null);
            setError('Sessão inválida. Faça login novamente.');
          }
        }
      } catch (err) {
        console.error('Erro ao inicializar autenticação:', err);
        // Limpa dados corrompidos do localStorage
        clearSupabaseSession();
        setError('Sessão corrompida. Faça login novamente.');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    initialize();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_, sessionValue) => {
      if (!isMounted) return;
      setSession(sessionValue ?? null);
      setUser(sessionValue?.user ?? null);
      setError(null);
      if (sessionValue?.user?.email) {
        try {
          const accessValue = await fetchUserAccess(sessionValue.user.email);
          if (!isMounted) return;
          if (!accessValue) {
            setError('Usuário não autorizado.');
            await supabase.auth.signOut();
            setSession(null);
            setUser(null);
            setAccess(null);
          } else {
            setAccess(accessValue);
          }
        } catch (fetchError) {
          if (!isMounted) return;
          setError(fetchError instanceof Error ? fetchError.message : 'Falha ao carregar permissões.');
          setAccess(null);
        }
      } else {
        setAccess(null);
      }
      setLoading(false);
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    setError(null);

    console.log('[Auth] signIn chamado para:', email);

    try {
      const normalizedEmail = email.trim().toLowerCase();

      console.log('[Auth] chamando supabase.auth.signInWithPassword...');

      // Timeout de 10s para não travar eternamente
      const signInPromise = supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Tempo limite excedido. Verifique sua conexão com a internet.')), 10000)
      );

      const { data, error } = await Promise.race([signInPromise, timeoutPromise]) as Awaited<typeof signInPromise>;

      console.log('[Auth] signInWithPassword concluído. Error:', error?.message || 'sem erro');

      if (error) {
        setError(error.message);
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

  const signOut = async () => {
    setLoading(true);
    setError(null);
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
      isAdmin,
      isManager,
      isConsulta,
    }),
    [session, user, access, loading, error, isAdmin, isManager, isConsulta]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

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

  if (loading || !session) {
    return null;
  }

  return children;
}

export function RequireRole({ children, roles }: { children: JSX.Element; roles: Array<'admin' | 'gestor' | 'consulta'> }) {
  const { access, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && access && !roles.includes(access.role)) {
      navigate('/', { replace: true });
    }
  }, [access, loading, navigate, roles]);

  if (loading || !access) {
    return null;
  }

  if (!roles.includes(access.role)) {
    return null;
  }

  return children;
}
