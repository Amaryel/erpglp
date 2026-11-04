import React, { useState } from 'react';
import {
  CreditCard,
  User,
  Phone,
  Search,
  CheckCircle2,
  DollarSign,
  AlertCircle,
  Clock,
  ChevronRight,
  Plus,
  ArrowDownLeft,
} from 'lucide-react';
import { useErp } from '../context/ErpContext';
import { Receivable, PaymentMethod } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';

export const ReceivablesView: React.FC = () => {
  const { receivables, clients, receivePayment } = useErp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReceivable, setSelectedReceivable] = useState<Receivable | null>(null);

  // Payment modal state
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<PaymentMethod>('dinheiro');
  const [payNotes, setPayNotes] = useState('');
  const [paySuccessMsg, setPaySuccessMsg] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  // Group receivables by client or show individual cards
  const pendingReceivables = receivables.filter((r) => r.status !== 'pago');
  const totalReceivableAmount = pendingReceivables.reduce(
    (sum, r) => sum + r.remainingAmount,
    0
  );
  const overdueCount = pendingReceivables.filter(
    (r) => r.dueDate && r.dueDate < todayStr
  ).length;

  const filtered = pendingReceivables.filter(
    (r) =>
      r.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenPayModal = (rec: Receivable) => {
    setSelectedReceivable(rec);
    setPayAmount(rec.remainingAmount);
    setPayNotes('');
    setPaySuccessMsg(false);
  };

  const handleConfirmPay = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReceivable || payAmount <= 0) return;

    receivePayment(
      selectedReceivable.id,
      Number(payAmount),
      payMethod,
      payNotes.trim() || undefined
    );

    setPaySuccessMsg(true);
    setTimeout(() => {
      setPaySuccessMsg(false);
      setSelectedReceivable(null);
    }, 1500);
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div className="flex items-center gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Fiado
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Clientes com saldo em aberto e recebimentos.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-orange-50 border border-orange-200 px-3 py-1.5 rounded-xl text-right">
            <span className="text-[10px] font-bold text-orange-700 block uppercase">
              Total em Aberto
            </span>
            <span className="text-base font-black text-orange-950">
              {formatCurrency(totalReceivableAmount)}
            </span>
          </div>
        </div>
      </div>

      {/* Search & Overview Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2 relative">
          <Search className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nome do cliente devedor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs sm:text-sm bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between text-xs px-3">
          <span className="text-slate-500 font-semibold">Títulos Vencidos:</span>
          <span
            className={`font-black px-2 py-0.5 rounded-full ${
              overdueCount > 0
                ? 'bg-rose-100 text-rose-700'
                : 'bg-emerald-100 text-emerald-800'
            }`}
          >
            {overdueCount} devedores em atraso
          </span>
        </div>
      </div>

      {/* Receivables List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400 text-xs">
          Nenhum valor fiado em aberto encontrado.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((rec) => {
            const client = clients.find((c) => c.id === rec.clientId);
            const isOverdue = rec.dueDate && rec.dueDate < todayStr;

            return (
              <div
                key={rec.id}
                className="bg-white rounded-2xl border border-slate-200 hover:border-orange-400 p-4 shadow-xs transition-all flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                      <User className="w-4 h-4 text-orange-600" />
                      {rec.clientName}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isOverdue
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-amber-100 text-amber-900'
                      }`}
                    >
                      {isOverdue ? 'Vencido' : 'Em Aberto'}
                    </span>
                  </div>

                  {client?.phone && (
                    <div className="text-xs text-slate-500 flex items-center gap-1 mb-2">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span>{client.phone}</span>
                      {client.neighborhood && (
                        <span>• {client.neighborhood}</span>
                      )}
                    </div>
                  )}

                  {/* Amounts */}
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs space-y-1">
                    <div className="flex justify-between text-slate-600">
                      <span>Valor Original da Compra:</span>
                      <span className="font-semibold">
                        {formatCurrency(rec.originalAmount || rec.totalAmount)}
                      </span>
                    </div>
                    {rec.paidAmount > 0 && (
                      <div className="flex justify-between text-emerald-700">
                        <span>Já Pago (Amortizado):</span>
                        <span className="font-semibold">
                          -{formatCurrency(rec.paidAmount)}
                        </span>
                      </div>
                    )}
                    <div className="pt-1 border-t border-slate-200 flex justify-between font-bold text-slate-900">
                      <span>Saldo Devedor Atual:</span>
                      <span className="text-base text-orange-600 font-black">
                        {formatCurrency(rec.remainingAmount)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Venda de: {formatDate(rec.createdAt)}</span>
                    {rec.dueDate && (
                      <span className={isOverdue ? 'text-rose-600 font-bold' : ''}>
                        Vencimento: {formatDate(rec.dueDate)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Big Action Button: Receber Pagamento */}
                <button
                  type="button"
                  onClick={() => handleOpenPayModal(rec)}
                  className="w-full py-2.5 px-4 bg-orange-500 hover:bg-orange-600 active:scale-98 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <DollarSign className="w-4 h-4" />
                  <span>RECEBER PAGAMENTO (BAIXA)</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Receber Pagamento de Fiado (Requirements #21) */}
      {selectedReceivable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/80">
          <form
            onSubmit={handleConfirmPay}
            className="bg-white rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4 animate-scaleUp"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Receber Fiado: {selectedReceivable.clientName}</span>
              </h3>
              <button
                type="button"
                onClick={() => setSelectedReceivable(null)}
                className="text-slate-400 hover:text-slate-700 text-xs"
              >
                Cancelar
              </button>
            </div>

            {paySuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Pagamento registrado e creditado no caixa com sucesso!</span>
              </div>
            )}

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between text-slate-600">
                <span>Dívida Atual:</span>
                <span className="font-bold text-slate-900 text-sm">
                  {formatCurrency(selectedReceivable.remainingAmount)}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Permite pagamento total ou parcial. O valor entrará diretamente no caixa do dia.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-800 block mb-1">
                  Valor Recebido *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-bold">
                    R$
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={selectedReceivable.remainingAmount}
                    required
                    value={payAmount || ''}
                    onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)}
                    className="w-full pl-9 text-base font-black text-slate-900 border border-slate-300 rounded-xl p-2 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">
                  Forma de Pagamento *
                </label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
                  className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="dinheiro">Dinheiro (Entra no Caixa)</option>
                  <option value="pix">PIX (Entra no Caixa)</option>
                  <option value="debito">Cartão Débito</option>
                  <option value="credito">Cartão Crédito</option>
                  <option value="outro">Outro</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-600 block mb-1">
                  Observações (Opcional):
                </label>
                <input
                  type="text"
                  placeholder="Ex: Pagamento referente ao botijão da semana passada"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={payAmount <= 0}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md transition-colors disabled:opacity-50"
            >
              Confirmar Recebimento e Dar Baixa
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
