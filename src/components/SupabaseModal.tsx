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
  getSupabaseKeyProblem,
  testSupabaseConnection,
  SUPABASE_SCHEMA_SQL,
} from '../lib/supabase';
import { useErp } from '../context/ErpContext';
import { useAuth } from '../context/AuthContext';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({ isOpen, onClose }) => {
  const { currentUser } = useAuth();
  const isSuperadmin = currentUser?.role === 'superadmin';

  const { isOnlineDb, dbSyncState, lastSyncTime, reloadFromOnlineDb, syncCurrentDataToSupabase } = useErp();

  const currentConfig = getStoredSupabaseConfig();
  const [url, setUrl] = useState(currentConfig.url);
  const [anonKey, setAnonKey] = useState(currentConfig.anonKey);
  const [copiedSql, setCopiedSql] = useState(false);
  const [testing, setTesting] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [showAdvancedEdit, setShowAdvancedEdit] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    latencyMs?: number;
  } | null>(null);

  if (!isOpen || !isSuperadmin) return null;

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SCHEMA_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);

    const cleanUrl = url.trim();
    const cleanKey = anonKey.trim();

    const keyProblem = getSupabaseKeyProblem(cleanKey);
    if (keyProblem) {
      setTesting(false);
      setTestResult({ success: false, message: keyProblem });
      return;
    }

    saveStoredSupabaseConfig(cleanUrl, cleanKey);
    const result = await testSupabaseConnection(cleanUrl, cleanKey);
    setTesting(false);
    setTestResult(result);

    if (result.success) {
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
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  🟢 Conectado
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Sincronização em tempo real ativa entre qualquer celular, tablet ou computador.
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
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
          {/* Status Box */}
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <div className="font-bold text-sm text-emerald-950 flex items-center gap-2">
                  <span>Banco Online Gravado & Operacional</span>
                  {lastSyncTime && (
                    <span className="text-[11px] font-normal text-emerald-700">
                      (Último sync: {lastSyncTime})
                    </span>
                  )}
                </div>
                <p className="text-xs text-emerald-800 mt-0.5">
                  URL: <code className="bg-emerald-100/80 px-1 py-0.5 rounded font-mono text-[11px]">{url}</code>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
              >
                {testing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                <span>Testar Conexão</span>
              </button>
            </div>
          </div>

          {/* SQL Script Card */}
          <div className="p-4 rounded-2xl bg-slate-900 text-white border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Script SQL de Tabelas do Supabase
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopySql}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md ${
                  copiedSql
                    ? 'bg-emerald-500 text-white'
                    : 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 text-white'
                }`}
              >
                {copiedSql ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copiado com Sucesso!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Script SQL</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-slate-300">
              Se precisar recriar ou atualizar as tabelas, abra o <strong>SQL Editor</strong> no painel do Supabase, cole o script e clique em <strong>Run</strong>.
            </p>
          </div>

          {/* Test result message */}
          {testResult && (
            <div
              className={`p-3.5 rounded-2xl border text-xs flex items-start gap-2.5 animate-in fade-in duration-200 ${
                testResult.success
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                  : 'bg-rose-50 border-rose-300 text-rose-900'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
              )}
              <div className="flex-1">
                <div className="font-bold flex items-center gap-2">
                  <span>{testResult.success ? 'Conexão Bem-Sucedida!' : 'Aviso na Conexão'}</span>
                  {testResult.latencyMs !== undefined && (
                    <span className="font-normal text-[11px] opacity-80">
                      (Latência: {testResult.latencyMs}ms)
                    </span>
                  )}
                </div>
                <div className="mt-0.5">{testResult.message}</div>
              </div>
            </div>
          )}

          {/* Force Sync Actions */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-slate-800">
                Sincronizar Dados do Sistema
              </div>
              <div className="text-[11px] text-slate-500">
                Envie produtos, clientes e configurações locais para o banco online.
              </div>
            </div>
            <button
              type="button"
              onClick={handleSeedData}
              disabled={seeding}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 disabled:opacity-50 shrink-0"
            >
              {seeding ? (
                <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
              ) : (
                <UploadCloud className="w-4 h-4 text-amber-400" />
              )}
              <span>{seeding ? 'Enviando...' : 'Exportar Dados para Nuvem'}</span>
            </button>
          </div>

          {/* Advanced Credentials view */}
          <div>
            <button
              type="button"
              onClick={() => setShowAdvancedEdit(!showAdvancedEdit)}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 underline transition-colors"
            >
              {showAdvancedEdit ? 'Ocultar detalhes de credenciais' : 'Exibir detalhes de credenciais'}
            </button>

            {showAdvancedEdit && (
              <div className="mt-3 p-4 bg-slate-100 rounded-2xl border border-slate-200 space-y-3 animate-in fade-in duration-200">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Project URL</label>
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-800"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Anon / Publishable API Key</label>
                  <input
                    type="text"
                    value={anonKey}
                    onChange={(e) => setAnonKey(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-800"
                  />
                </div>
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    className="px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-xl"
                  >
                    Salvar e Testar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
