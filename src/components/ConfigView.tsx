import React, { useState, useRef } from 'react';
import {
  Settings,
  Save,
  Download,
  Upload,
  Trash2,
  Sparkles,
  Building2,
  Receipt,
  Phone,
  Truck,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  FileCode,
  Lock,
  Database,
  Cloud,
  Copy,
  Check,
  Zap,
  Globe,
  Key,
  ExternalLink,
  UploadCloud,
  UserCheck,
  UserX,
  Plus,
  Edit2,
  X,
  Boxes,
} from 'lucide-react';
import { useErp } from '../context/ErpContext';
import { useAuth } from '../context/AuthContext';
import {
  getStoredSupabaseConfig,
  saveStoredSupabaseConfig,
  getSupabaseKeyProblem,
  clearStoredSupabaseConfig,
  testSupabaseConnection,
  SUPABASE_SCHEMA_SQL,
} from '../lib/supabase';
import { maskPhone, formatPhone } from '../utils/formatters';
import { DeliveryPerson, Supplier } from '../types';

export const ConfigView: React.FC = () => {
  const { currentUser } = useAuth();
  const isSuperadmin = currentUser?.role === 'superadmin';
  // Dados da empresa (inclui a chave PIX do comprovante): somente administradores alteram
  const canEditSettings = isSuperadmin || currentUser?.role === 'admin';

  const {
    settings,
    updateSettings,
    deliveryPersons,
    addDeliveryPerson,
    updateDeliveryPerson,
    suppliers,
    addSupplier,
    updateSupplier,
    exportDatabaseJson,
    importDatabaseJson,
    clearOperationalData,
    generateSampleData,
    resetToSampleData,
    isOnlineDb,
    dbSyncState,
    lastSyncTime,
    dbErrorMessage,
    reloadFromOnlineDb,
    syncCurrentDataToSupabase,
  } = useErp();

  // Settings form state
  const [companyName, setCompanyName] = useState(settings?.companyName || 'ErpGLP Distribuidora de Gás');
  const [tradingName, setTradingName] = useState(settings?.tradingName || 'ErpGLP Gás & Água');
  const [cnpj, setCnpj] = useState(settings?.cnpj || '12.345.678/0001-90');
  const [phone, setPhone] = useState(settings?.phone || '(11) 98765-4321');
  const [address, setAddress] = useState(settings?.address || 'Av. Principal, 1000');
  const [neighborhood, setNeighborhood] = useState(settings?.neighborhood || 'Centro');
  const [city, setCity] = useState(settings?.city || 'São Paulo - SP');
  const [pixKey, setPixKey] = useState(settings?.pixKey || '12345678000190');
  const [receiptFooterMessage, setReceiptFooterMessage] = useState(
    settings?.receiptFooterMessage || 'Agradecemos a sua preferência! ErpGLP - Pedidos Rápidos'
  );
  const [deliveryFee, setDeliveryFee] = useState<number>(
    settings?.deliveryFee ?? 0
  );
  const [defaultMinStock, setDefaultMinStock] = useState<number>(
    settings?.defaultMinStock ?? 10
  );

  // Supabase connection state
  const storedConfig = getStoredSupabaseConfig();
  const [supabaseUrl, setSupabaseUrl] = useState(storedConfig.url);
  const [supabaseKey, setSupabaseKey] = useState(storedConfig.anonKey);
  const [copiedSql, setCopiedSql] = useState(false);
  const [testingDb, setTestingDb] = useState(false);
  const [seedingDb, setSeedingDb] = useState(false);
  const [dbTestResult, setDbTestResult] = useState<{
    success: boolean;
    message: string;
    latencyMs?: number;
  } | null>(null);

  // Status feedback
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  // Modals for test tools
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [confirmSampleOpen, setConfirmSampleOpen] = useState(false);
  const [confirmRestoreOpen, setConfirmRestoreOpen] = useState(false);
  const [restorePayload, setRestorePayload] = useState<string>('');

  // Delivery Person Modal State
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [editingDeliveryId, setEditingDeliveryId] = useState<string | null>(null);
  const [deliveryName, setDeliveryName] = useState('');
  const [deliveryPhone, setDeliveryPhone] = useState('');
  const [deliveryVehicle, setDeliveryVehicle] = useState('Moto');
  const [deliveryIsActive, setDeliveryIsActive] = useState(true);

  // Supplier Modal State
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null);
  const [supplierName, setSupplierName] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [supplierContact, setSupplierContact] = useState('');
  const [supplierProducts, setSupplierProducts] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOpenNewDelivery = () => {
    setEditingDeliveryId(null);
    setDeliveryName('');
    setDeliveryPhone('');
    setDeliveryVehicle('Moto');
    setDeliveryIsActive(true);
    setShowDeliveryModal(true);
  };

  const handleOpenEditDelivery = (dp: DeliveryPerson) => {
    setEditingDeliveryId(dp.id);
    setDeliveryName(dp.name);
    setDeliveryPhone(dp.phone ? maskPhone(dp.phone) : '');
    setDeliveryVehicle(dp.vehicle || 'Moto');
    setDeliveryIsActive(dp.isActive);
    setShowDeliveryModal(true);
  };

  const handleSaveDelivery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deliveryName.trim()) return;

    if (editingDeliveryId) {
      updateDeliveryPerson(editingDeliveryId, {
        name: deliveryName.trim(),
        phone: deliveryPhone.trim() ? maskPhone(deliveryPhone.trim()) : '',
        vehicle: deliveryVehicle.trim() || undefined,
        isActive: deliveryIsActive,
      });
      setActionMessage({ type: 'success', text: 'Entregador atualizado com sucesso!' });
    } else {
      addDeliveryPerson({
        name: deliveryName.trim(),
        phone: deliveryPhone.trim() ? maskPhone(deliveryPhone.trim()) : '',
        vehicle: deliveryVehicle.trim() || undefined,
        isActive: deliveryIsActive,
      });
      setActionMessage({ type: 'success', text: 'Entregador cadastrado com sucesso!' });
    }
    setShowDeliveryModal(false);
  };

  const handleToggleDeliveryActive = (dp: DeliveryPerson) => {
    updateDeliveryPerson(dp.id, { isActive: !dp.isActive });
    setActionMessage({
      type: 'success',
      text: `Entregador "${dp.name}" ${dp.isActive ? 'desativado' : 'ativado'} com sucesso!`,
    });
  };

  const handleOpenNewSupplier = () => {
    setEditingSupplierId(null);
    setSupplierName('');
    setSupplierPhone('');
    setSupplierContact('');
    setSupplierProducts('');
    setShowSupplierModal(true);
  };

  const handleOpenEditSupplier = (s: Supplier) => {
    setEditingSupplierId(s.id);
    setSupplierName(s.name);
    setSupplierPhone(s.phone ? maskPhone(s.phone) : '');
    setSupplierContact(s.contactPerson || '');
    setSupplierProducts(s.productsSupplied || '');
    setShowSupplierModal(true);
  };

  const handleSaveSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierName.trim()) return;

    if (editingSupplierId) {
      updateSupplier(editingSupplierId, {
        name: supplierName.trim(),
        phone: supplierPhone.trim() ? maskPhone(supplierPhone.trim()) : '',
        contactPerson: supplierContact.trim() || undefined,
        productsSupplied: supplierProducts.trim() || undefined,
      });
      setActionMessage({ type: 'success', text: 'Fornecedor atualizado com sucesso!' });
    } else {
      addSupplier({
        name: supplierName.trim(),
        phone: supplierPhone.trim() ? maskPhone(supplierPhone.trim()) : '',
        contactPerson: supplierContact.trim() || undefined,
        productsSupplied: supplierProducts.trim() || undefined,
      });
      setActionMessage({ type: 'success', text: 'Fornecedor cadastrado com sucesso!' });
    }
    setShowSupplierModal(false);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditSettings) return;
    updateSettings({
      companyName: companyName.trim(),
      tradingName: tradingName.trim(),
      cnpj: cnpj.trim(),
      phone: phone.trim(),
      address: address.trim(),
      neighborhood: neighborhood.trim(),
      city: city.trim(),
      pixKey: pixKey.trim(),
      receiptFooterMessage: receiptFooterMessage.trim(),
      deliveryFee: Number(deliveryFee) || 0,
      defaultMinStock: Number(defaultMinStock) || 0,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SCHEMA_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  const handleSaveAndConnectDb = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUrl = supabaseUrl.trim();
    const cleanKey = supabaseKey.trim();

    if (!cleanUrl || !cleanKey) {
      setDbTestResult({
        success: false,
        message: 'Informe a URL do projeto e a chave Anon do Supabase.',
      });
      return;
    }

    const keyProblem = getSupabaseKeyProblem(cleanKey);
    if (keyProblem) {
      setDbTestResult({ success: false, message: keyProblem });
      return;
    }

    setTestingDb(true);
    setDbTestResult(null);

    saveStoredSupabaseConfig(cleanUrl, cleanKey);
    const result = await testSupabaseConnection(cleanUrl, cleanKey);
    setTestingDb(false);
    setDbTestResult(result);

    if (result.success) {
      await reloadFromOnlineDb();
    }
  };

  const handleSeedDataToCloud = async () => {
    setSeedingDb(true);
    setDbTestResult(null);
    try {
      const res = await syncCurrentDataToSupabase();
      if (res.success) {
        setDbTestResult({
          success: true,
          message: 'Dados locais enviados e sincronizados com sucesso no Supabase!',
        });
      } else {
        setDbTestResult({
          success: false,
          message: `Erro ao enviar dados: ${res.error}`,
        });
      }
    } catch (e: any) {
      setDbTestResult({
        success: false,
        message: `Erro: ${e?.message || 'Falha ao sincronizar'}`,
      });
    } finally {
      setSeedingDb(false);
    }
  };

  const handleDisconnectSupabase = () => {
    if (window.confirm('Deseja desconectar o Supabase? O sistema voltará a salvar localmente.')) {
      clearStoredSupabaseConfig();
      setSupabaseUrl('');
      setSupabaseKey('');
      setDbTestResult({
        success: false,
        message: 'Banco online desconectado.',
      });
      reloadFromOnlineDb();
    }
  };

  // Real Backup Export
  const handleExportBackup = () => {
    try {
      const jsonStr = exportDatabaseJson();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const nowStr = new Date().toISOString().split('T')[0];
      link.href = url;
      link.download = `ErpGLP_Backup_${nowStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setActionMessage({
        type: 'success',
        text: 'Backup gerado e baixado com sucesso! Arquivo JSON salvo com segurança.',
      });
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: 'Erro ao gerar arquivo de backup: ' + (err?.message || 'Falha desconhecida'),
      });
    }
  };

  // Real Backup File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const content = evt.target?.result as string;
        setRestorePayload(content);
        setConfirmRestoreOpen(true);
      } catch (err) {
        setActionMessage({
          type: 'error',
          text: 'Falha ao ler o arquivo selecionado.',
        });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleConfirmRestore = () => {
    const success = importDatabaseJson(restorePayload);
    setConfirmRestoreOpen(false);
    setRestorePayload('');
    if (success) {
      setActionMessage({
        type: 'success',
        text: 'Dados restaurados com sucesso a partir do backup!',
      });
      setTimeout(() => window.location.reload(), 1000);
    } else {
      setActionMessage({
        type: 'error',
        text: 'O arquivo informado não é um backup válido do ErpGLP.',
      });
    }
  };

  // Zerar Dados
  const handleConfirmClear = () => {
    clearOperationalData();
    setConfirmClearOpen(false);
    setActionMessage({
      type: 'success',
      text: 'Dados operacionais zerados com sucesso! Vendas, caixa, contas e movimentações foram limpos para novo ciclo.',
    });
  };

  // Gerar Dados Fictícios
  const handleConfirmGenerateSample = () => {
    generateSampleData();
    setConfirmSampleOpen(false);
    setActionMessage({
      type: 'success',
      text: 'Dados fictícios de teste gerados com sucesso! Vendas balcão, entregas em rota, contas, caixa e despesas preenchidos para relatórios.',
    });
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div className="flex items-center gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Configurações
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Dados da empresa, cadastros auxiliares e backup.
            </p>
          </div>
        </div>

        {savedSuccess && (
          <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Configurações salvas!
          </span>
        )}
      </div>

      {/* Global alert feedback */}
      {actionMessage && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between gap-2 text-xs font-medium ${
            actionMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="text-xs font-bold underline"
          >
            Fechar
          </button>
        </div>
      )}

      {/* SECTION 1: SUPABASE ONLINE DATABASE INTEGRATION (PROMINENT - EXCLUSIVE TO SUPERADMIN) */}
      {isSuperadmin ? (
        <div className="bg-slate-900 rounded-3xl p-5 sm:p-6 text-white border border-slate-800 shadow-lg space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-inner shrink-0">
                <Database className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base sm:text-lg font-black text-white">
                    Banco de Dados Online (Supabase)
                  </h2>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                      isOnlineDb
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    }`}
                  >
                    {isOnlineDb ? 'Conectado & Online' : '🟡 Modo Local (Offline)'}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Exclusivo Superadmin
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Garante que qualquer celular, tablet ou computador acesse a mesma base de dados em tempo real.
                </p>
              </div>
            </div>

            {isOnlineDb && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={reloadFromOnlineDb}
                  disabled={dbSyncState === 'syncing'}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-1.5 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${dbSyncState === 'syncing' ? 'animate-spin' : ''}`} />
                  <span>Atualizar Nuvem</span>
                </button>
                <button
                  type="button"
                  onClick={handleDisconnectSupabase}
                  className="px-3 py-1.5 bg-red-950/60 hover:bg-red-900/80 text-red-300 text-xs font-bold rounded-xl border border-red-800/60 transition-colors"
                >
                  Desconectar
                </button>
              </div>
            )}
          </div>

          {/* Database feedback banner */}
          {dbTestResult && (
            <div
              className={`p-3.5 rounded-2xl border text-xs font-medium flex items-start gap-2.5 ${
                dbTestResult.success
                  ? 'bg-emerald-950/70 border-emerald-700/60 text-emerald-200'
                  : 'bg-rose-950/70 border-rose-700/60 text-rose-200'
              }`}
            >
              {dbTestResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <div>{dbTestResult.message}</div>
                {dbTestResult.latencyMs !== undefined && (
                  <div className="text-[11px] font-mono mt-1 text-slate-400">
                    Latência da Conexão: {dbTestResult.latencyMs}ms
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Step 1: SQL Schema Script */}
            <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-black flex items-center justify-center text-xs">
                      1
                    </span>
                    <h3 className="font-bold text-white text-xs sm:text-sm">
                      Copiar Script SQL do Banco
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopySql}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs ${
                      copiedSql
                        ? 'bg-emerald-600 text-white'
                        : 'bg-amber-500 hover:bg-amber-600 text-slate-950 active:scale-95'
                    }`}
                  >
                    {copiedSql ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Script Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar Script SQL</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-slate-400 text-xs leading-relaxed">
                  No painel do Supabase, acesse o menu <strong>SQL Editor</strong> &gt; <strong>New Query</strong> &gt; cole o script e clique em <strong>Run</strong>.
                </p>
              </div>

              <div className="pt-2">
                <a
                  href="https://supabase.com/dashboard"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-400 hover:text-amber-300 font-bold text-xs flex items-center gap-1.5 underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Abrir Dashboard do Supabase (SQL Editor)</span>
                </a>
              </div>
            </div>

            {/* Step 2: Supabase Connection Active Status */}
            <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-black flex items-center justify-center text-xs">
                    2
                  </span>
                  <h3 className="font-bold text-white text-xs sm:text-sm">
                    Status da Conexão Supabase
                  </h3>
                </div>

                <div className="space-y-2 bg-slate-900/90 p-3 rounded-xl border border-slate-800 text-xs">
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="font-semibold text-slate-400">Ambiente Online:</span>
                    <span className="font-bold text-emerald-400 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      Supabase Cloud
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5 text-slate-300">
                    <span className="text-[11px] text-slate-400 font-semibold">URL Conectada:</span>
                    <span className="font-mono text-[11px] text-amber-300 truncate bg-slate-950 px-2 py-1 rounded">
                      {supabaseUrl}
                    </span>
                  </div>
                  {lastSyncTime && (
                    <div className="flex items-center justify-between text-slate-400 text-[11px] pt-1 border-t border-slate-800">
                      <span>Última Sincronização:</span>
                      <span className="text-slate-200">{lastSyncTime}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleSeedDataToCloud}
                  disabled={seedingDb}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5"
                >
                  <UploadCloud className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{seedingDb ? 'Enviando...' : 'Exportar Base Atual'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveAndConnectDb({ preventDefault: () => {} } as any)}
                  disabled={testingDb}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {testingDb ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Testando...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5" />
                      <span>Testar Conexão</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900 rounded-2xl p-4 sm:p-5 text-white border border-slate-800 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm text-white flex items-center gap-2">
                <span>Banco de Dados Online Conectado (Supabase)</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Sincronização em tempo real ativa. Alterações estruturais de banco e scripts SQL são restritos ao Superadmin.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column: Company & Receipt Settings (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <form onSubmit={handleSaveSettings} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            {!canEditSettings && (
              <p className="text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">
                Somente administradores podem alterar os dados da empresa e a chave PIX.
              </p>
            )}
            <fieldset disabled={!canEditSettings} className="contents [&_:disabled]:opacity-60 [&_:disabled]:cursor-not-allowed">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-amber-500" />
                Dados da Empresa & Comprovante
              </h2>
              <button
                type="submit"
                className="bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xs flex items-center gap-1.5 transition-all"
              >
                <Save className="w-4 h-4" />
                <span>Salvar Alterações</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Nome Fantasia (Aparece no Comprovante) *
                </label>
                <input
                  type="text"
                  required
                  value={tradingName}
                  onChange={(e) => setTradingName(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2.5 font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Razão Social *
                </label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2.5 font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  CNPJ ou CPF
                </label>
                <input
                  type="text"
                  value={cnpj}
                  onChange={(e) => setCnpj(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2.5 font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Telefone / WhatsApp Comercial <span className="text-slate-400 font-normal">(Opcional)</span>
                </label>
                <input
                  type="text"
                  placeholder="(89) 9 9999 - 9999"
                  value={phone}
                  onChange={(e) => setPhone(maskPhone(e.target.value))}
                  className="w-full border border-slate-300 rounded-xl p-2.5 font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Endereço & Número
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2.5 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Bairro</label>
                  <input
                    type="text"
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl p-2.5 font-medium"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Cidade - UF</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl p-2.5 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Chave PIX (Para cobrança)
                </label>
                <input
                  type="text"
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2.5 font-mono text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Taxa Entrega Padrão (R$)
                  </label>
                  <input
                    type="number"
                    step="0.50"
                    min="0"
                    value={deliveryFee}
                    onChange={(e) => setDeliveryFee(parseFloat(e.target.value) || 0)}
                    className="w-full border border-slate-300 rounded-xl p-2.5 font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Alerta Estoque Mínimo
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={defaultMinStock}
                    onChange={(e) => setDefaultMinStock(parseInt(e.target.value) || 0)}
                    className="w-full border border-slate-300 rounded-xl p-2.5 font-bold"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="font-bold text-slate-700 block mb-1">
                  Mensagem de Rodapé no Comprovante de Venda
                </label>
                <input
                  type="text"
                  value={receiptFooterMessage}
                  onChange={(e) => setReceiptFooterMessage(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2.5 font-medium"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md transition-all flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>Salvar Configurações</span>
              </button>
            </div>
            </fieldset>
          </form>

          {/* Entregadores Management Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-600 flex items-center justify-center">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-900">
                    Entregadores Cadastrados
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Gerencie a equipe de entrega para vinculação rápida nas vendas
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleOpenNewDelivery}
                className="bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold text-xs px-3 py-1.5 rounded-xl shadow-xs flex items-center gap-1.5 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Novo Entregador</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {deliveryPersons.map((dp) => (
                <div
                  key={dp.id}
                  className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                    dp.isActive
                      ? 'bg-slate-50/80 border-slate-200 hover:border-slate-300'
                      : 'bg-slate-100/60 border-slate-200 opacity-60'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900">{dp.name}</span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase ${
                          dp.isActive
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {dp.isActive ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-2">
                      {dp.phone ? (
                        <span className="flex items-center gap-1 font-mono text-emerald-700">
                          <Phone className="w-3 h-3" />
                          {formatPhone(dp.phone)}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Sem telefone</span>
                      )}
                      {dp.vehicle && (
                        <span className="text-slate-500 font-medium">({dp.vehicle})</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleToggleDeliveryActive(dp)}
                      title={dp.isActive ? 'Desativar' : 'Ativar'}
                      className="p-1 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors"
                    >
                      {dp.isActive ? <UserX className="w-3.5 h-3.5 text-red-500" /> : <UserCheck className="w-3.5 h-3.5 text-emerald-600" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEditDelivery(dp)}
                      title="Editar Entregador"
                      className="p-1 rounded-lg hover:bg-slate-200 text-slate-700 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              {deliveryPersons.length === 0 && (
                <div className="sm:col-span-2 text-center py-4 text-xs text-slate-400 italic">
                  Nenhum entregador cadastrado. Clique em "+ Novo Entregador" para adicionar.
                </div>
              )}
            </div>
          </div>

          {/* Fornecedores Management Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500/15 text-blue-600 flex items-center justify-center">
                  <Boxes className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-900">
                    Fornecedores de Gás & Água
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Cadastre distribuidoras parceiras e contatos de reposição
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleOpenNewSupplier}
                className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs px-3 py-1.5 rounded-xl shadow-xs flex items-center gap-1.5 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Novo Fornecedor</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {suppliers.map((s) => (
                <div
                  key={s.id}
                  className="p-3 rounded-xl border border-slate-200 bg-slate-50/80 hover:border-slate-300 flex items-center justify-between transition-all"
                >
                  <div className="space-y-0.5">
                    <span className="font-bold text-xs text-slate-900 block">{s.name}</span>
                    <div className="text-[11px] text-slate-500 flex flex-col gap-0.5">
                      {s.phone ? (
                        <span className="flex items-center gap-1 font-mono text-emerald-700">
                          <Phone className="w-3 h-3" />
                          {formatPhone(s.phone)}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Sem telefone</span>
                      )}
                      {s.contactPerson && (
                        <span className="text-slate-600">Contato: {s.contactPerson}</span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenEditSupplier(s)}
                    title="Editar Fornecedor"
                    className="p-1 rounded-lg hover:bg-slate-200 text-slate-700 transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {suppliers.length === 0 && (
                <div className="sm:col-span-2 text-center py-4 text-xs text-slate-400 italic">
                  Nenhum fornecedor cadastrado. Clique em "+ Novo Fornecedor" para adicionar.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Backup & Test Utilities (1 col) */}
        <div className="space-y-4">
          {/* Backup Real Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Download className="w-4 h-4 text-blue-600" />
              Backup & Restauração dos Dados
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Exporte todos os produtos, clientes, estoque, histórico de vendas e lançamentos para um arquivo JSON seguro.
            </p>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleExportBackup}
                className="w-full py-2.5 px-3 bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold text-xs rounded-xl border border-blue-200 transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Exportar Backup Completo (.json)</span>
              </button>

              {isSuperadmin && (
                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-2.5 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-colors flex items-center justify-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Restaurar de Arquivo Backup</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Test Utilities Card (Exclusive to Superadmin) */}
          {isSuperadmin && (
            <div className="bg-white p-5 rounded-2xl border border-amber-200 shadow-xs space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h2 className="text-sm font-black text-slate-900">
                  Funções para Testes & Demonstração
                </h2>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Use estas funções para simular fluxos completos de venda, rotas de entrega e cálculo de lucros, ou limpar para começar do zero.
              </p>

              <div className="space-y-2.5 pt-1">
                {/* Gerar Dados Fictícios */}
                <button
                  type="button"
                  onClick={() => setConfirmSampleOpen(true)}
                  className="w-full py-2.5 px-3 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Gerar Dados Fictícios de Teste</span>
                </button>

                {/* Zerar Dados */}
                <button
                  type="button"
                  onClick={() => setConfirmClearOpen(true)}
                  className="w-full py-2.5 px-3 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs rounded-xl border border-red-200 transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Zerar Dados Operacionais</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Confirm Zerar Dados */}
      {confirmClearOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Zerar Todos os Dados Operacionais?
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Esta ação é indicada para testes e reinício de operações.
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 space-y-1.5 leading-relaxed">
              <p className="font-semibold text-slate-900">O que será apagado:</p>
              <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-slate-600">
                <li>Todas as vendas (balcão e delivery)</li>
                <li>Movimentações de caixa e saldos do dia</li>
                <li>Contas a receber (fiados) e contas a pagar</li>
                <li>Despesas operacionais lançadas</li>
                <li>Histórico de auditoria e divergências</li>
                <li>Quantidades de estoque zeradas (cadastros permanecem prontos)</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmClearOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmClear}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs"
              >
                Sim, Zerar Tudo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirm Gerar Dados Fictícios */}
      {confirmSampleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Gerar Dados Fictícios de Demonstração?
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Preenche o sistema com um conjunto completo de vendas, estoque e contas para testes.
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 space-y-1.5 leading-relaxed">
              <p className="font-semibold text-slate-900">O que será gerado:</p>
              <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-slate-600">
                <li>Vendas balcão e entregas em domicílio finalizadas</li>
                <li>Entregas em andamento com botijões na rota</li>
                <li>Estoque balanceado com botijões cheios e vazios</li>
                <li>Caixa do dia aberto com movimentações de entradas e saídas</li>
                <li>Contas a receber (fiados com vencimentos próximos)</li>
                <li>Despesas operacionais (combustível, salários) e contas a pagar</li>
                <li>Relatórios e cálculo de DRE/Lucro prontos para visualização</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmSampleOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmGenerateSample}
                className="px-4 py-2 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-xl shadow-xs"
              >
                Sim, Gerar Dados
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirm Restore Backup */}
      {confirmRestoreOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Confirmar Restauração do Backup?
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Os dados atuais serão substituídos pelos dados contidos no arquivo importado.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setConfirmRestoreOpen(false);
                  setRestorePayload('');
                }}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmRestore}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs"
              >
                Restaurar Backup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cadastrar/Editar Entregador */}
      {showDeliveryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Truck className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">
                  {editingDeliveryId ? 'Editar Entregador' : 'Cadastrar Novo Entregador'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDeliveryModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveDelivery} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Nome do Entregador *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: João da Moto"
                  value={deliveryName}
                  onChange={(e) => setDeliveryName(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2.5 font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Telefone / WhatsApp <span className="text-slate-400 font-normal">(Opcional)</span>
                </label>
                <input
                  type="text"
                  placeholder="(89) 9 9999 - 9999"
                  value={deliveryPhone}
                  onChange={(e) => setDeliveryPhone(maskPhone(e.target.value))}
                  className="w-full border border-slate-300 rounded-xl p-2.5 font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Veículo de Entrega (Opcional)
                </label>
                <select
                  value={deliveryVehicle}
                  onChange={(e) => setDeliveryVehicle(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2.5 font-medium bg-white"
                >
                  <option value="Moto">Moto</option>
                  <option value="Triciclo">Triciclo com Caçamba</option>
                  <option value="Carro">Carro / Fiorino</option>
                  <option value="Bicicleta">Bicicleta</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="delivery-active-check"
                  checked={deliveryIsActive}
                  onChange={(e) => setDeliveryIsActive(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 border-slate-300"
                />
                <label htmlFor="delivery-active-check" className="font-semibold text-slate-800 text-xs cursor-pointer">
                  Entregador Ativo (Disponível para rotas)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowDeliveryModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-xl shadow-xs"
                >
                  Salvar Entregador
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Cadastrar/Editar Fornecedor */}
      {showSupplierModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Boxes className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">
                  {editingSupplierId ? 'Editar Fornecedor' : 'Cadastrar Novo Fornecedor'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSupplierModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Nome do Fornecedor / Distribuidora *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Ultragaz Distribuidora Regional"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2.5 font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Telefone / WhatsApp <span className="text-slate-400 font-normal">(Opcional)</span>
                </label>
                <input
                  type="text"
                  placeholder="(89) 9 9999 - 9999"
                  value={supplierPhone}
                  onChange={(e) => setSupplierPhone(maskPhone(e.target.value))}
                  className="w-full border border-slate-300 rounded-xl p-2.5 font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Pessoa de Contato / Representante (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Marcos Vendas"
                  value={supplierContact}
                  onChange={(e) => setSupplierContact(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2.5 font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Produtos Fornecidos (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: GLP P13, P45, Vasilhames, Água 20L"
                  value={supplierProducts}
                  onChange={(e) => setSupplierProducts(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2.5 font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowSupplierModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs"
                >
                  Salvar Fornecedor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
