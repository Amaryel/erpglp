import React, { useState } from 'react';
import {
  Flame,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  KeyRound,
  CheckCircle2,
  Database,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginView: React.FC = () => {
  const { login, defineFirstAccessPassword } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // First access password setup modal/state
  const [isFirstAccessMode, setIsFirstAccessMode] = useState(false);
  const [firstAccessUsername, setFirstAccessUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [setupSuccessMessage, setSetupSuccessMessage] = useState<string | null>(null);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanUsername = username.trim();
    if (!cleanUsername) {
      setErrorMessage('Por favor, informe seu nome de usuário.');
      return;
    }

    setLoading(true);
    try {
      const res = await login(cleanUsername, password);
      if (!res.success) {
        if (res.requiresPasswordSetup) {
          // Switch to first access password definition
          setFirstAccessUsername(cleanUsername);
          setIsFirstAccessMode(true);
          setErrorMessage(null);
        } else {
          setErrorMessage(res.error || 'Falha ao autenticar.');
        }
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Erro ao realizar login.');
    } finally {
      setLoading(false);
    }
  };

  const handleDefinePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!newPassword || newPassword.length < 4) {
      setErrorMessage('A nova senha deve ter no mínimo 4 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('As senhas digitadas não coincidem. Digite novamente.');
      return;
    }

    setLoading(true);
    try {
      const res = await defineFirstAccessPassword(firstAccessUsername, newPassword);
      if (res.success) {
        setSetupSuccessMessage('Senha definida e gravada no Supabase com sucesso! Acessando...');
      } else {
        setErrorMessage(res.error || 'Erro ao salvar a senha no Supabase.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Erro ao processar nova senha.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 flex flex-col justify-between items-center p-4 sm:p-6 font-sans relative overflow-hidden">
      {/* Subtle Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header info */}
      <header className="w-full max-w-5xl flex items-center justify-between z-10 py-2">
        <div className="flex items-center gap-2.5 select-none">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
            <Flame className="w-5 h-5 fill-white text-orange-500" />
          </div>
          <div>
            <span className="text-xl font-black tracking-tight text-white flex items-center gap-1.5">
              Erp<span className="text-amber-400">GLP</span>
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Pro
              </span>
            </span>
          </div>
        </div>

        {/* Database Online Badge */}
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border bg-emerald-950/80 text-emerald-300 border-emerald-600/50">
            <Database className="w-3.5 h-3.5" />
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Banco Online Supabase Conectado</span>
          </div>
        </div>
      </header>

      {/* Main Login Card */}
      <main className="w-full max-w-md my-auto z-10">
        <div className="bg-slate-900/90 border border-slate-800 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          {!isFirstAccessMode ? (
            /* STANDARD LOGIN FORM */
            <>
              <div className="space-y-1.5 text-center">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-3 shadow-inner">
                  <Lock className="w-6 h-6" />
                </div>
                <h1 className="text-2xl font-black text-white tracking-tight">
                  Acesso ao Sistema
                </h1>
                <p className="text-xs text-slate-400">
                  Informe seu usuário e senha para acessar o painel de gestão
                </p>
              </div>

              {errorMessage && (
                <div className="p-3.5 bg-rose-950/80 border border-rose-700/60 rounded-2xl text-xs text-rose-200 flex items-start gap-2.5 animate-in fade-in duration-200">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                {/* Username Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 block">
                    Usuário
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      autoFocus
                      placeholder="Digite seu usuário"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full bg-slate-950/70 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all font-medium"
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 block">
                    Senha
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Digite sua senha"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-slate-950/70 border border-slate-700 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 active:scale-95 text-white font-bold text-sm py-3 rounded-xl shadow-lg shadow-orange-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Verificando autenticação...</span>
                    </span>
                  ) : (
                    <>
                      <span>Entrar no Sistema</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </>
          ) : (
            /* FIRST ACCESS PASSWORD DEFINITION MODE */
            <>
              <div className="space-y-1.5 text-center">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-3 shadow-inner">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h1 className="text-xl font-black text-white tracking-tight">
                  Definir Senha de Acesso
                </h1>
                <p className="text-xs text-slate-400">
                  Primeiro acesso do usuário <strong className="text-amber-400">{firstAccessUsername}</strong>. Crie sua senha de segurança.
                </p>
              </div>

              {setupSuccessMessage && (
                <div className="p-3.5 bg-emerald-950/80 border border-emerald-700/60 rounded-2xl text-xs text-emerald-200 flex items-center gap-2 animate-in fade-in duration-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{setupSuccessMessage}</span>
                </div>
              )}

              {errorMessage && (
                <div className="p-3.5 bg-rose-950/80 border border-rose-700/60 rounded-2xl text-xs text-rose-200 flex items-start gap-2.5 animate-in fade-in duration-200">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleDefinePasswordSubmit} className="space-y-4">
                {/* New Password */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 block">
                    Nova Senha
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      autoFocus
                      placeholder="Mínimo de 4 caracteres"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-slate-950/70 border border-slate-700 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200"
                      tabIndex={-1}
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 block">
                    Confirmar Nova Senha
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      placeholder="Repita a nova senha"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-slate-950/70 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all font-medium"
                    />
                  </div>
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 active:scale-95 text-white font-bold text-sm py-3 rounded-xl shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Gravando senha no Supabase...</span>
                      </span>
                    ) : (
                      <>
                        <span>Salvar Senha & Entrar</span>
                        <CheckCircle2 className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsFirstAccessMode(false);
                      setErrorMessage(null);
                    }}
                    className="text-xs font-semibold text-slate-400 hover:text-white py-1 transition-colors text-center"
                  >
                    Voltar para tela de login
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-5xl text-center text-xs text-slate-500 z-10 py-2">
        <span>ErpGLP Pro &bull; Sistema de Gestão e Entregas &bull; Banco de Dados Online Supabase</span>
      </footer>
    </div>
  );
};
