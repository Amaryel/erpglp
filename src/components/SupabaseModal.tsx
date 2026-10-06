import React, { useState } from 'react';
import {
  Database,
  Cloud,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Zap,
  Server,
  Key,
  Globe,
  UploadCloud,
  X,
} from 'lucide-react';
import {
  getStoredSupabaseConfig,
  saveStoredSupabaseConfig,
  clearStoredSupabaseConfig,
  testSupabaseConnection,
  SUPABASE_SCHEMA_SQL,
} from '../lib/supabase';
import { useErp } from '../context/ErpContext';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({ isOpen, onClose }) => {
  const { isOnlineDb, dbSyncState, reloadFromOnlineDb, syncCurrentDataToSupabase } = useErp();

  const currentConfig = getStoredSupabaseConfig();
  const [url, setUrl] = useState(currentConfig.url);
  const [anonKey, setAnonKey] = useState(currentConfig.anonKey);
  const [copiedSql, setCopiedSql] = useState(false);
  const [testing, setTesting] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    latencyMs?: number;
  } | null>(null);

  if (!isOpen) return null;

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SCHEMA_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  const handleSaveAndTest = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUrl = url.trim();
    const cleanKey = anonKey.trim();

    if (!cleanUrl || !cleanKey) {
      setTestResult({
        success: false,
        message: 'Por favor, informe a URL do projeto e a chave Anon (chave pública) do Supabase.',
      });
      return;
    }

    setTesting(true);
    setTestResult(null);

    // Save config first
    saveStoredSupabaseConfig(cleanUrl, cleanKey);

    // Test connection
    const result = await testSupabaseConnection(cleanUrl, cleanKey);
    setTesting(false);
    setTestResult(result);

    if (result.success) {
      // Trigger full database sync
      await reloadFromOnlineDb();
    }
  };

  const handleSeedData = async () => {
    setSeeding(true);
    setTestResult(null);
    try {
      const res = await syncCurrentDataToSupabase();
      if (res.success) {
        setTestResult({
          success: true,
          message: 'Dados locais exportados com sucesso para o banco de dados online Supabase!',
        });
      } else {
        setTestResult({
          success: false,
          message: `Erro ao exportar dados: ${res.error || 'Falha ao sincronizar'}`,
        });
      }
    } catch (e: any) {
      setTestResult({
        success: false,
        message: `Erro: ${e?.message || 'Falha desconhecida'}`,
      });
    } finally {
      setSeeding(false);
    }
  };

  const handleDisconnect = () => {
    if (window.confirm('Deseja realmente desconectar o banco de dados online e voltar para o modo local temporário?')) {
      clearStoredSupabaseConfig();
      setUrl('');
      setAnonKey('');
      setTestResult({
        success: false,
        message: 'Banco de dados online desconectado. O sistema está usando armazenamento local.',
      });
      reloadFromOnlineDb();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shadow-inner">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white">
                  Banco de Dados Online (Supabase)
                </h2>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    isOnlineDb
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  }`}
                >
                  {isOnlineDb ? '🟢 Online Ativo' : '🟡 Modo Local'}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Acesse o sistema de qualquer celular ou PC com sincronização em tempo real.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs text-slate-700">
          {/* Status Banner */}
          <div
            className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              isOnlineDb
                ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                : 'bg-amber-50 border-amber-200 text-amber-950'
            }`}
          >
            <div className="flex items-start gap-3">
              {isOnlineDb ? (
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <Cloud className="w-4 h-4" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              )}
              <div>
                <div className="font-bold text-sm">
                  {isOnlineDb
                    ? 'Conectado ao Banco de Dados Online!'
                    : 'Configure o Banco de Dados Online'}
                </div>
                <div className="text-xs text-slate-600 mt-0.5">
                  {isOnlineDb
                    ? 'Todas as vendas, estoque, caixa e cadastros estão sendo salvos diretamente no Supabase em tempo real.'
                    : 'Cole as chaves do seu Supabase abaixo para que todos os celulares e computadores usem o mesmo banco.'}
                </div>
              </div>
            </div>

            {isOnlineDb && (
              <button
                type="button"
                onClick={handleDisconnect}
                className="px-3 py-1.5 bg-white hover:bg-red-50 text-red-600 font-bold text-xs rounded-xl border border-red-200 transition-colors shrink-0"
              >
                Desconectar
              </button>
            )}
          </div>

          {/* Test/Sync Feedback message */}
          {testResult && (
            <div
              className={`p-3.5 rounded-xl border text-xs font-medium flex items-start gap-2.5 ${
                testResult.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <div>{testResult.message}</div>
                {testResult.latencyMs !== undefined && (
                  <div className="text-[11px] font-mono mt-1 text-slate-500">
                    Tempo de resposta: {testResult.latencyMs}ms
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 1: SQL Schema Script */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-slate-900 text-amber-400 font-bold flex items-center justify-center text-xs">
                  1
                </span>
                <h3 className="font-black text-slate-900 text-sm">
                  Copiar Script SQL para o Supabase
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCopySql}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs ${
                  copiedSql
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-900 hover:bg-slate-800 text-white active:scale-95'
                }`}
              >
                {copiedSql ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>SQL Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Script SQL Completo</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              No painel do Supabase, acesse o menu <strong>SQL Editor</strong> &gt; clique em <strong>New Query</strong> &gt; cole o código copiado e clique no botão verde <strong>Run</strong>. Isso cria todas as tabelas e permissões automaticamente.
            </p>
          </div>

          {/* Step 2: Supabase Credentials Form */}
          <form onSubmit={handleSaveAndTest} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-slate-900 text-amber-400 font-bold flex items-center justify-center text-xs">
                2
              </span>
              <h3 className="font-black text-slate-900 text-sm">
                Colar Credenciais do Supabase
              </h3>
            </div>
            <p className="text-xs text-slate-600">
              No Supabase, acesse <strong>Project Settings</strong> (ícone de engrenagem) &gt; <strong>API</strong> e copie os valores:
            </p>

            <div className="space-y-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-blue-600" />
                  <span>Project URL (URL do Projeto) *</span>
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://exemplo.supabase.co"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 font-mono text-xs text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-hidden"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-amber-600" />
                  <span>Project API Key (anon / public) *</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={anonKey}
                  onChange={(e) => setAnonKey(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 font-mono text-xs text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-hidden"
                />
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 font-bold text-xs flex items-center gap-1.5 underline"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Abrir Painel do Supabase</span>
              </a>

              <button
                type="submit"
                disabled={testing}
                className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 active:scale-95 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {testing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Testando Conexão...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    <span>Conectar & Testar Banco Online</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Optional: Seed Initial Data */}
          {isOnlineDb && (
            <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-200/80 space-y-3">
              <div className="flex items-center gap-2">
                <UploadCloud className="w-4 h-4 text-emerald-700" />
                <h4 className="font-bold text-slate-900 text-xs">
                  Sincronização Inicial de Dados (Opcional)
                </h4>
              </div>
              <p className="text-slate-600 text-xs leading-relaxed">
                Se acabou de criar o banco no Supabase e deseja enviar o cadastro de produtos, clientes e configurações padrão para a nuvem:
              </p>
              <button
                type="button"
                onClick={handleSeedData}
                disabled={seeding}
                className="px-4 py-2 bg-white hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl border border-emerald-300 shadow-xs flex items-center gap-2 transition-all disabled:opacity-50"
              >
                {seeding ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Enviando dados para o Supabase...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>Enviar Dados Padrão para o Supabase</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 rounded-xl transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
