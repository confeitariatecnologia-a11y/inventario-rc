import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/lib/auth';

export default function Login() {
  const navigate = useNavigate();
  const { session, signIn, resetPassword, loading, error: authError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [recoverySuccess, setRecoverySuccess] = useState(false);

  useEffect(() => {
    if (session) {
      navigate('/', { replace: true });
    }
  }, [session, navigate]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    setRecoverySuccess(false);

    if (isRecoveryMode) {
      if (!email.trim()) {
        setFormError('Preencha seu e-mail ou usuário.');
        return;
      }
      try {
        await resetPassword(email);
        setRecoverySuccess(true);
      } catch (err) {
        // auth.tsx já seta o error no context, então não precisa duplicar. Mas podemos pegar falhas aqui também.
      }
    } else {
      if (!email.trim() || !password.trim()) {
        setFormError('Preencha e-mail e senha.');
        return;
      }
      try {
        await signIn(email, password);
      } catch (err) {
        console.error('Erro no login:', err);
      }
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-slate-900">
            {isRecoveryMode ? 'Recuperar Senha' : 'Entrar no Richesse'}
          </h1>
          <p className="text-sm text-slate-500 mt-2">
            {isRecoveryMode
              ? 'Digite seu usuário ou e-mail para receber um link de redefinição.'
              : 'Digite seu nome de usuário ou e-mail cadastrado.'}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="text-xs font-semibold text-slate-600">Usuário ou E-mail</span>
            <input
              type="text"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              placeholder="Seu nome ou e-mail"
            />
          </label>
          
          {!isRecoveryMode && (
            <label className="block">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold text-slate-600">Senha</span>
                <button
                  type="button"
                  onClick={() => setIsRecoveryMode(true)}
                  className="text-xs font-semibold text-primary-600 hover:text-primary-700"
                >
                  Esqueci minha senha
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 pl-4 pr-11 py-3 text-sm text-slate-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  placeholder="•••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors"
                  title={showPassword ? 'Ocultar senha' : 'Ver senha'}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </label>
          )}

          {formError && <p className="text-sm text-red-600 bg-red-50 p-2 rounded-lg">{formError}</p>}
          {authError && <p className="text-sm text-red-600 bg-red-50 p-2 rounded-lg border border-red-200">{authError}</p>}
          {recoverySuccess && !authError && (
            <p className="text-sm text-emerald-700 bg-emerald-50 p-3 rounded-lg border border-emerald-200 text-center">
              Se este e-mail/usuário existir, enviaremos um link de recuperação para ele.
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60 transition-colors"
          >
            {loading ? 'Processando...' : isRecoveryMode ? 'Enviar Link' : 'Entrar'}
          </button>

          {isRecoveryMode && (
            <button
              type="button"
              onClick={() => {
                setIsRecoveryMode(false);
                setFormError(null);
                setRecoverySuccess(false);
              }}
              className="w-full mt-2 text-sm font-semibold text-slate-500 hover:text-slate-700 transition-colors"
            >
              Voltar para o login
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
