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
} from 'lucide-react';
import { useErp } from '../context/ErpContext';
import { AppSettings } from '../types';

export const ConfigView: React.FC = () => {
  const {
    settings,
    updateSettings,
    exportDatabaseJson,
    importDatabaseJson,
    clearOperationalData,
    generateSampleData,
    resetToSampleData,
  } = useErp();

  // Settings form state
  const [companyName, setCompanyName] = useState(settings?.companyName || 'ErpGLP Distribuidora de Gás');
  const [tradeName, setTradeName] = useState(settings?.tradeName || 'Disk Gás & Água');
  const [cnpj, setCnpj] = useState(settings?.cnpj || '12.345.678/0001-90');
  const [phone, setPhone] = useState(settings?.phone || '(11) 98765-4321');
  const [address, setAddress] = useState(settings?.address || 'Av. Principal, 1000');
  const [neighborhood, setNeighborhood] = useState(settings?.neighborhood || 'Centro');
  const [city, setCity] = useState(settings?.city || 'São Paulo - SP');
  const [pixKey, setPixKey] = useState(settings?.pixKey || '12345678000190');
  const [receiptFooter, setReceiptFooter] = useState(
    settings?.receiptFooter || 'Agradecemos a sua preferência! ErpGLP - Pedidos Rápidos'
  );
  const [defaultDeliveryFee, setDefaultDeliveryFee] = useState<number>(
    settings?.defaultDeliveryFee ?? 5
  );
  const [defaultMinStock, setDefaultMinStock] = useState<number>(
    settings?.defaultMinStock ?? 10
  );

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

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      companyName: companyName.trim(),
      tradeName: tradeName.trim(),
      cnpj: cnpj.trim(),
      phone: phone.trim(),
      address: address.trim(),
      neighborhood: neighborhood.trim(),
      city: city.trim(),
      pixKey: pixKey.trim(),
      receiptFooter: receiptFooter.trim(),
      defaultDeliveryFee: Number(defaultDeliveryFee) || 0,
      defaultMinStock: Number(defaultMinStock) || 0,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
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
    // Reset file input value
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
      // reload settings state
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
      text: 'Dados operacionais zerados com sucesso! Vendas, caixa, contas e movimentações foram limpos para novo ciclo de testes.',
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
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-slate-800 text-amber-400 flex items-center justify-center">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-black text-slate-900">
              Configurações & Backup
            </h1>
            <p className="text-xs text-slate-500">
              Gerencie dados da empresa, comprovantes, rotinas de backup e ferramentas de teste
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column: Company & Receipt Settings (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <form onSubmit={handleSaveSettings} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
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
                  value={tradeName}
                  onChange={(e) => setTradeName(e.target.value)}
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
                  Telefone / WhatsApp Comercial
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
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
                    value={defaultDeliveryFee}
                    onChange={(e) => setDefaultDeliveryFee(parseFloat(e.target.value) || 0)}
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
                  value={receiptFooter}
                  onChange={(e) => setReceiptFooter(e.target.value)}
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
          </form>
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
            </div>
          </div>

          {/* Test Utilities Card */}
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
                <Sparkles className="w-5 h-5" />
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
    </div>
  );
};
