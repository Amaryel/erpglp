import React, { useState } from 'react';
import { Flame, Lock, User, Eye, EyeOff, ArrowRight, AlertCircle, KeyRound, RefreshCw, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AppFooter } from './AppFooter';

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

  const inputClass =
    'w-full h-11 bg-white border border-slate-300 rounded-lg pl-10 text-[15px] text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-4 focus:ring-orange-600/10 focus:border-orange-600 transition-shadow';

  return (
    <div className="min-h-dvh w-full grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] bg-white font-sans">
      {/* Painel da marca (desktop) */}
      <aside className="hidden lg:flex flex-col justify-between bg-slate-950 text-white p-12 relative overflow-hidden">
        <div className="flex items-center gap-2.5">
          <img src="/icons/icon.svg" alt="" aria-hidden="true" className="w-9 h-9 rounded-lg shrink-0" />
          <span className="text-lg font-bold tracking-tight">
            Erp<span className="text-orange-500">GLP</span>
          </span>
        </div>

        <div className="max-w-md space-y-6">
          <h2 className="text-[32px] leading-tight font-bold tracking-tight">
            Vendas, entregas e vasilhames da sua revenda em um só lugar.
          </h2>
          <ul className="space-y-3 text-slate-400 text-[15px]">
            <li className="flex gap-3">
              <span className="mt-2 w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
              Estoque de cheios e vazios atualizado a cada venda.
            </li>
            <li className="flex gap-3">
              <span className="mt-2 w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
              Caixa do dia, fiado e contas a pagar sem planilha.
            </li>
            <li className="flex gap-3">
              <span className="mt-2 w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
              Funciona no balcão, no celular do entregador e no tablet.
            </li>
          </ul>
        </div>

        <p className="text-xs text-slate-600">© {new Date().getFullYear()} ErpGLP</p>
      </aside>

      {/* Formulário */}
      <main className="flex flex-col px-5 py-8 sm:px-10">
        <div className="lg:hidden flex items-center gap-2.5 mb-10">
          <img src="/icons/icon.svg" alt="" aria-hidden="true" className="w-9 h-9 rounded-lg shrink-0" />
          <span className="text-lg font-bold tracking-tight text-slate-900">
            Erp<span className="text-orange-600">GLP</span>
          </span>
        </div>

        <div className="w-full max-w-sm mx-auto my-auto space-y-7">
          <div className="space-y-1.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Entrar</h1>
            <p className="text-[15px] text-slate-500">Use o usuário e a senha fornecidos pelo administrador.</p>
          </div>

          {visibleError && (
            <div
              role="alert"
              className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-800 flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{visibleError}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <label htmlFor="login-username" className="text-sm font-medium text-slate-700 block">
                Usuário
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
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
                  className={`${inputClass} pr-4`}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="login-password" className="text-sm font-medium text-slate-700 block">
                Senha
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${inputClass} pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-orange-600 hover:bg-orange-700 text-white font-semibold text-[15px] rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Entrando…</span>
                </>
              ) : (
                <>
                  <span>Entrar</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-sm text-slate-500 flex items-start gap-2 pt-1">
            <Lock className="w-4 h-4 shrink-0 mt-0.5 text-slate-400" />
            <span>Esqueceu a senha ou é seu primeiro acesso? Peça ao administrador para definir uma senha.</span>
          </p>
        </div>

        <div className="mt-10 space-y-2">
          <p className="text-xs text-slate-400 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            Conexão protegida
          </p>
          <AppFooter />
        </div>
      </main>
    </div>
  );
};
