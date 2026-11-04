import React, { useState } from 'react';
import { Flame, Lock, User, Eye, EyeOff, ArrowRight, AlertCircle, KeyRound, RefreshCw, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginView: React.FC = () => {
  const { login, sessionMessage } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const visibleError = errorMessage || sessionMessage;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setErrorMessage(null);

    if (!username.trim()) {
      setErrorMessage('Informe seu nome de usuário.');
      return;
    }
    if (!password) {
      setErrorMessage('Digite sua senha de acesso.');
      return;
    }

    setLoading(true);
    try {
      const res = await login(username, password);
      if (!res.success) {
        setErrorMessage(res.error || 'Falha ao autenticar.');
        setPassword('');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Erro ao realizar login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh w-full bg-slate-950 flex flex-col items-center px-4 py-6 sm:p-8 font-sans relative overflow-hidden">
      {/* Fundo discreto */}
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[640px] h-[640px] bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <header className="w-full max-w-md flex items-center gap-2.5 z-10 select-none">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
          <Flame className="w-5 h-5 fill-white text-orange-500" />
        </div>
        <span className="text-xl font-black tracking-tight text-white">
          Erp<span className="text-amber-400">GLP</span>
        </span>
      </header>

      <main className="w-full max-w-md my-auto z-10 py-8">
        <div className="bg-slate-900/90 border border-slate-800 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="space-y-1.5">
            <h1 className="text-2xl font-black text-white tracking-tight">Entrar</h1>
            <p className="text-sm text-slate-400">Acesse o painel de vendas, entregas e vasilhames.</p>
          </div>

          {visibleError && (
            <div
              role="alert"
              className="p-3.5 bg-rose-950/80 border border-rose-700/60 rounded-2xl text-sm text-rose-200 flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{visibleError}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <label htmlFor="login-username" className="text-sm font-semibold text-slate-300 block">
                Usuário
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                <input
                  id="login-username"
                  type="text"
                  autoFocus
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder="seu.usuario"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full h-12 bg-slate-950/70 border border-slate-700 rounded-xl pl-10 pr-4 text-base text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="login-password" className="text-sm font-semibold text-slate-300 block">
                Senha
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-12 bg-slate-950/70 border border-slate-700 rounded-xl pl-10 pr-12 text-base text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-200"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 active:scale-[0.98] text-white font-bold text-base rounded-xl shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Entrando...</span>
                </>
              ) : (
                <>
                  <span>Entrar</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-xs text-slate-500 flex items-start gap-2 border-t border-slate-800 pt-4">
            <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>Esqueceu a senha ou é seu primeiro acesso? Peça ao administrador para definir uma senha para você.</span>
          </p>
        </div>
      </main>

      <footer className="text-xs text-slate-600 z-10 flex items-center gap-1.5">
        <ShieldCheck className="w-3.5 h-3.5" />
        <span>Conexão protegida</span>
      </footer>
    </div>
  );
};
