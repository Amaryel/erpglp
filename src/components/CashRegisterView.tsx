import React, { useState } from 'react';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Lock,
  Unlock,
  PlusCircle,
  MinusCircle,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Clock,
  FileText,
  DollarSign,
  AlertTriangle,
} from 'lucide-react';
import { useErp } from '../context/ErpContext';
import { CashMovementType, PaymentMethod } from '../types';
import { formatCurrency, formatDateTime } from '../utils/formatters';

export const CashRegisterView: React.FC = () => {
  const {
    cashRegister,
    cashMovements,
    openCashRegister,
    closeCashRegister,
    addCashMovement,
  } = useErp();

  // Modal / Form States
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [initialBalance, setInitialBalance] = useState<number>(150);
  const [openNotes, setOpenNotes] = useState('');

  const [showCloseModal, setShowCloseModal] = useState(false);
  const [countedCash, setCountedCash] = useState<number>(0);
  const [closeNotes, setCloseNotes] = useState('');

  const [showMovementModal, setShowMovementModal] = useState(false);
  const [movType, setMovType] = useState<'suprimento' | 'sangria'>('sangria');
  const [movAmount, setMovAmount] = useState<number>(0);
  const [movDescription, setMovDescription] = useState('');

  const isOpen = cashRegister?.status === 'aberto';

  // Calculate totals by payment method for today/current register
  const paymentBreakdown = (['dinheiro', 'pix', 'debito', 'credito', 'outro'] as PaymentMethod[]).map(
    (method) => {
      const total = cashMovements
        .filter((m) => m.paymentMethod === method && (m.type === 'venda' || m.type === 'recebimento_fiado' || m.type === 'entrada'))
        .reduce((sum, m) => sum + m.amount, 0);
      return { method, total };
    }
  );

  const totalEntries = cashMovements
    .filter(
      (m) =>
        m.type === 'venda' ||
        m.type === 'recebimento_fiado' ||
        m.type === 'entrada' ||
        m.type === 'suprimento'
    )
    .reduce((sum, m) => sum + m.amount, 0);

  const totalExits = cashMovements
    .filter(
      (m) =>
        m.type === 'saida' ||
        m.type === 'sangria' ||
        m.type === 'pagamento_despesa' ||
        m.type === 'pagamento_fornecedor'
    )
    .reduce((sum, m) => sum + m.amount, 0);

  // Expected physical cash in drawer
  const expectedCashInDrawer = (cashRegister?.initialBalance || 0) + (cashRegister?.currentBalance || 0);

  const handleConfirmOpen = (e: React.FormEvent) => {
    e.preventDefault();
    openCashRegister(Number(initialBalance) || 0, openNotes.trim() || undefined);
    setShowOpenModal(false);
  };

  const handleConfirmClose = (e: React.FormEvent) => {
    e.preventDefault();
    closeCashRegister(Number(countedCash) || 0, closeNotes.trim() || undefined);
    setShowCloseModal(false);
  };

  const handleConfirmMovement = (e: React.FormEvent) => {
    e.preventDefault();
    if (movAmount <= 0 || !movDescription.trim()) return;

    addCashMovement({
      type: movType,
      amount: Number(movAmount),
      description: movDescription.trim(),
      paymentMethod: 'dinheiro',
    });

    setMovAmount(0);
    setMovDescription('');
    setShowMovementModal(false);
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Top Header */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-600">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black text-slate-900">
                Controle de Caixa
              </h1>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  isOpen
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {isOpen ? 'CAIXA ABERTO' : 'CAIXA FECHADO'}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              {isOpen && cashRegister?.openedAt
                ? `Aberto em ${formatDateTime(cashRegister.openedAt)} com saldo inicial de ${formatCurrency(
                    cashRegister.initialBalance
                  )}`
                : 'Abra o caixa para iniciar os lançamentos do dia'}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {isOpen ? (
            <>
              <button
                onClick={() => setShowMovementModal(true)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs px-3 py-2 rounded-xl border border-slate-200 flex items-center gap-1.5 transition-colors"
              >
                <ArrowDownRight className="w-4 h-4 text-slate-600" />
                <span>Sangria / Suprimento</span>
              </button>
              <button
                onClick={() => {
                  setCountedCash(cashRegister?.currentBalance || 0);
                  setShowCloseModal(true);
                }}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
              >
                <Lock className="w-4 h-4" />
                <span>Fechar Caixa</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowOpenModal(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <Unlock className="w-4 h-4" />
              <span>Abrir Caixa</span>
            </button>
          )}
        </div>
      </div>

      {/* Cash Balances Dashboard */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        {/* Saldo Inicial */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 block mb-1">
            Saldo Inicial (Fundo)
          </span>
          <div className="text-xl sm:text-2xl font-black text-slate-900">
            {formatCurrency(cashRegister?.initialBalance || 0)}
          </div>
          <span className="text-[10px] text-slate-400">Troco inicial em gaveta</span>
        </div>

        {/* Entradas */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-emerald-700 block mb-1 flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" />
            Total Entradas
          </span>
          <div className="text-xl sm:text-2xl font-black text-emerald-700">
            {formatCurrency(totalEntries)}
          </div>
          <span className="text-[10px] text-emerald-600">Vendas, recebimentos, suprimentos</span>
        </div>

        {/* Saídas */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-rose-700 block mb-1 flex items-center gap-1">
            <ArrowDownRight className="w-3.5 h-3.5" />
            Total Saídas
          </span>
          <div className="text-xl sm:text-2xl font-black text-rose-700">
            {formatCurrency(totalExits)}
          </div>
          <span className="text-[10px] text-rose-600">Sangrias e despesas pagas</span>
        </div>

        {/* Saldo Atual */}
        <div className="bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-300 shadow-xs">
          <span className="text-xs font-bold text-emerald-950 block mb-1">
            Saldo Atual em Caixa
          </span>
          <div className="text-xl sm:text-2xl font-black text-emerald-800">
            {formatCurrency(cashRegister?.currentBalance || 0)}
          </div>
          <span className="text-[10px] text-emerald-700 font-semibold">
            Disponível em caixa
          </span>
        </div>
      </div>

      {/* Breakdown by Payment Method */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-2">
        <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
          Entradas por Meio de Pagamento
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {paymentBreakdown.map((item) => (
            <div
              key={item.method}
              className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex flex-col"
            >
              <span className="text-[11px] font-semibold text-slate-500 uppercase">
                {item.method === 'debito'
                  ? 'Cartão Débito'
                  : item.method === 'credito'
                  ? 'Cartão Crédito'
                  : item.method}
              </span>
              <span className="text-sm font-black text-slate-900 mt-1">
                {formatCurrency(item.total)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Movements Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">
            Extrato de Movimentações do Caixa
          </h3>
          <span className="text-xs text-slate-500">
            {cashMovements.length} lançamentos
          </span>
        </div>

        <div className="divide-y divide-slate-100 overflow-x-auto">
          {cashMovements.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Nenhuma movimentação de caixa registrada.
            </div>
          ) : (
            cashMovements.map((mov) => {
              const isPositive =
                mov.type === 'venda' ||
                mov.type === 'recebimento_fiado' ||
                mov.type === 'entrada' ||
                mov.type === 'suprimento';

              return (
                <div
                  key={mov.id}
                  className="py-2.5 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-black ${
                        isPositive
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {isPositive ? (
                        <ArrowUpRight className="w-4 h-4" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">
                        {mov.description}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Tipo: {mov.type} {mov.paymentMethod ? `• Forma: ${mov.paymentMethod}` : ''}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div
                      className={`font-black text-sm ${
                        isPositive ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {isPositive ? `+${formatCurrency(mov.amount)}` : `-${formatCurrency(mov.amount)}`}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {formatDateTime(mov.timestamp)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal: Abertura de Caixa (Requirements #16) */}
      {showOpenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/80">
          <form
            onSubmit={handleConfirmOpen}
            className="bg-white rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Unlock className="w-5 h-5 text-emerald-600" />
                <span>Abertura de Caixa</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowOpenModal(false)}
                className="text-slate-400 hover:text-slate-700 text-xs"
              >
                Cancelar
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Saldo Inicial em Dinheiro (Fundo de Troco) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-bold">
                    R$
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={initialBalance}
                    onChange={(e) => setInitialBalance(parseFloat(e.target.value) || 0)}
                    className="w-full pl-9 text-base font-black text-slate-900 border border-slate-300 rounded-xl p-2 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-600 block mb-1">
                  Observações (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Turno da manhã, notas trocadas"
                  value={openNotes}
                  onChange={(e) => setOpenNotes(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md transition-colors"
            >
              Confirmar Abertura do Caixa
            </button>
          </form>
        </div>
      )}

      {/* Modal: Fechamento de Caixa (Requirements #18) */}
      {showCloseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/80">
          <form
            onSubmit={handleConfirmClose}
            className="bg-white rounded-2xl w-full max-w-lg p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Lock className="w-5 h-5 text-rose-600" />
                <span>Fechamento do Caixa</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowCloseModal(false)}
                className="text-slate-400 hover:text-slate-700 text-xs"
              >
                Cancelar
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between text-slate-600">
                <span>Saldo Inicial:</span>
                <span className="font-semibold">
                  {formatCurrency(cashRegister?.initialBalance || 0)}
                </span>
              </div>
              <div className="flex justify-between text-emerald-700">
                <span>Total Entradas:</span>
                <span className="font-semibold">+{formatCurrency(totalEntries)}</span>
              </div>
              <div className="flex justify-between text-rose-700">
                <span>Total Saídas:</span>
                <span className="font-semibold">-{formatCurrency(totalExits)}</span>
              </div>
              <div className="pt-1.5 border-t border-slate-200 flex justify-between font-bold text-slate-900">
                <span>Saldo Esperado em Caixa:</span>
                <span className="text-base">
                  {formatCurrency(cashRegister?.currentBalance || 0)}
                </span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-800 block mb-1">
                  Saldo Conferido Fisicamente (Contagem do Dinheiro) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-bold">
                    R$
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={countedCash}
                    onChange={(e) => setCountedCash(parseFloat(e.target.value) || 0)}
                    className="w-full pl-9 text-base font-black text-slate-900 border border-slate-300 rounded-xl p-2 focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>

              {/* Difference calculation */}
              {countedCash !== (cashRegister?.currentBalance || 0) && (
                <div
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                    countedCash > (cashRegister?.currentBalance || 0)
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                      : 'bg-rose-50 border-rose-300 text-rose-800'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>
                    Diferença de conferência:{' '}
                    {formatCurrency(
                      countedCash - (cashRegister?.currentBalance || 0)
                    )}{' '}
                    ({countedCash > (cashRegister?.currentBalance || 0) ? 'Sobra' : 'Falta de caixa'})
                  </span>
                </div>
              )}

              <div>
                <label className="font-semibold text-slate-600 block mb-1">
                  Observações do Fechamento (Opcional):
                </label>
                <input
                  type="text"
                  placeholder="Ex: Tudo conferido sem divergências"
                  value={closeNotes}
                  onChange={(e) => setCloseNotes(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm rounded-xl shadow-md transition-colors"
            >
              Confirmar e Fechar Caixa
            </button>
          </form>
        </div>
      )}

      {/* Modal: Sangria / Suprimento (Requirements #17) */}
      {showMovementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/80">
          <form
            onSubmit={handleConfirmMovement}
            className="bg-white rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                Movimentação Manual de Caixa
              </h3>
              <button
                type="button"
                onClick={() => setShowMovementModal(false)}
                className="text-slate-400 hover:text-slate-700 text-xs"
              >
                Cancelar
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMovType('sangria')}
                className={`py-2 px-3 rounded-xl font-bold text-xs border transition-all ${
                  movType === 'sangria'
                    ? 'bg-rose-50 border-rose-500 text-rose-700'
                    : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                Sangria (Retirada)
              </button>
              <button
                type="button"
                onClick={() => setMovType('suprimento')}
                className={`py-2 px-3 rounded-xl font-bold text-xs border transition-all ${
                  movType === 'suprimento'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                    : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                Suprimento (Entrada)
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Valor *</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-bold">
                    R$
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={movAmount || ''}
                    onChange={(e) => setMovAmount(parseFloat(e.target.value) || 0)}
                    placeholder="0,00"
                    className="w-full pl-9 text-base font-black text-slate-900 border border-slate-300 rounded-xl p-2"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Motivo / Descrição * (Obrigatório)
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    movType === 'sangria'
                      ? 'Ex: Retirada de segurança para cofre'
                      : 'Ex: Troco adicional para o caixa'
                  }
                  value={movDescription}
                  onChange={(e) => setMovDescription(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2 font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={movAmount <= 0 || !movDescription.trim()}
              className="w-full py-2.5 bg-slate-900 hover:bg-black text-white font-bold text-xs rounded-xl shadow-md transition-colors disabled:opacity-50"
            >
              Salvar Movimentação
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
