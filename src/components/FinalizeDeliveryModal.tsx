import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  Package,
  Plus,
  Minus,
  Trash2,
  AlertCircle,
  Clock,
  User,
  MapPin,
  Flame,
} from 'lucide-react';
import { useErp } from '../context/ErpContext';
import { Sale, PaymentMethod, PaymentSplit } from '../types';
import { formatCurrency, formatTime, getElapsedTime } from '../utils/formatters';

interface FinalizeDeliveryModalProps {
  sale: Sale | null;
  isOpen: boolean;
  onClose: () => void;
}

export const FinalizeDeliveryModal: React.FC<FinalizeDeliveryModalProps> = ({
  sale,
  isOpen,
  onClose,
}) => {
  const { finalizeDelivery, clients } = useErp();

  if (!isOpen || !sale) return null;

  // Default returned cylinders equal to cylinder quantity dispatched
  const defaultReturned = sale.dispatchedCylinders > 0 ? sale.dispatchedCylinders : 0;
  const [returnedCylinders, setReturnedCylinders] = useState<number>(defaultReturned);

  // Default payment split pre-filled with total amount or sale payments
  const initialPayments: PaymentSplit[] =
    sale.payments && sale.payments.length > 0
      ? sale.payments
      : [{ method: 'dinheiro', amount: sale.totalAmount }];

  const [payments, setPayments] = useState<PaymentSplit[]>(initialPayments);
  const [selectedClientId, setSelectedClientId] = useState<string>(sale.clientId || '');
  const [notes, setNotes] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Calculations
  const totalPaid = payments
    .filter((p) => p.method !== 'fiado')
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const fiadoPart = payments.find((p) => p.method === 'fiado')?.amount || 0;
  const totalCovered = totalPaid + fiadoPart;
  const remaining = sale.totalAmount - totalCovered;

  const handleAddPaymentRow = () => {
    setPayments((prev) => [
      ...prev,
      { method: 'pix', amount: Math.max(0, remaining) },
    ]);
  };

  const handleRemovePaymentRow = (index: number) => {
    setPayments((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePaymentChange = (index: number, field: 'method' | 'amount', val: any) => {
    setPayments((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [field]: val } : p))
    );
  };

  const handleQuickPayMethod = (method: PaymentMethod) => {
    setPayments([{ method, amount: sale.totalAmount }]);
  };

  const handleSubmit = () => {
    setErrorMessage(null);

    if (Math.abs(remaining) > 0.05) {
      setErrorMessage(
        `O total informado (R$ ${totalCovered.toFixed(2)}) não confere com o valor da venda (R$ ${sale.totalAmount.toFixed(2)}). Corrija antes de finalizar.`
      );
      return;
    }

    if (fiadoPart > 0 && !selectedClientId && !sale.clientId) {
      setErrorMessage(
        'Para pagamento em FIADO (Contas a Receber), é obrigatório selecionar um cliente cadastrado.'
      );
      return;
    }

    const res = finalizeDelivery(sale.id, {
      returnedCylinders,
      payments,
      clientId: selectedClientId || sale.clientId,
      notes: notes.trim() || undefined,
    });

    if (!res.success) {
      setErrorMessage(res.error || 'Erro ao finalizar entrega.');
      return;
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[95vh] flex flex-col animate-scaleUp">
        {/* Header */}
        <div className="px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-white" />
            <h2 className="text-base sm:text-lg font-bold">
              Finalizar Entrega #{sale.saleNumber}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-black/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1 space-y-4 text-slate-800">
          {/* Sale Summary Banner */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-amber-600" />
                {sale.clientName || 'Cliente Delivery'}
              </span>
              <span className="text-slate-500 flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" />
                {formatTime(sale.createdAt)} ({getElapsedTime(sale.createdAt)})
              </span>
            </div>

            {sale.clientAddress && (
              <div className="text-slate-600 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                <span>
                  {sale.clientAddress} - {sale.clientNeighborhood}
                </span>
              </div>
            )}

            <div className="pt-1 border-t border-slate-200/80 flex items-center justify-between">
              <div className="text-slate-700 font-medium">
                {sale.items.map((i) => `${i.quantity}x ${i.productName}`).join(', ')}
              </div>
              <div className="text-base font-black text-slate-900">
                {formatCurrency(sale.totalAmount)}
              </div>
            </div>
          </div>

          {/* STEP 1: Vasilhames Retornados (Vazios) */}
          <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                <Package className="w-4 h-4 text-amber-600" />
                <span>1. Vasilhames Retornados (Vazios)</span>
              </label>
              <span className="text-[11px] text-amber-800 bg-amber-200/60 px-2 py-0.5 rounded-full font-semibold">
                Saíram: {sale.dispatchedCylinders} cheios
              </span>
            </div>

            <p className="text-xs text-slate-600">
              Informe quantos vasilhames vazios o cliente entregou de volta ao motorista.
            </p>

            <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-amber-300">
              <span className="text-xs font-semibold text-slate-700">
                Quantidade de vazios que retornaram:
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setReturnedCylinders(Math.max(0, returnedCylinders - 1))}
                  className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 active:scale-95 font-bold"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <input
                  type="number"
                  min="0"
                  value={returnedCylinders}
                  onChange={(e) =>
                    setReturnedCylinders(Math.max(0, parseInt(e.target.value) || 0))
                  }
                  className="w-14 text-center text-lg font-black text-slate-900 border rounded-lg py-1 focus:ring-1 focus:ring-amber-500"
                />
                <button
                  type="button"
                  onClick={() => setReturnedCylinders(returnedCylinders + 1)}
                  className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 active:scale-95 font-bold"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {returnedCylinders < sale.dispatchedCylinders && (
              <div className="text-[11px] text-amber-800 bg-amber-100/70 p-2 rounded-lg flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-700" />
                <span>
                  Atenção: Cliente devolveu menos vasilhames do que os {sale.dispatchedCylinders} entregues. Isto será registrado na auditoria.
                </span>
              </div>
            )}
          </div>

          {/* STEP 2: Pagamento do Cliente */}
          <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                2. Pagamento do Cliente
              </label>
              <button
                type="button"
                onClick={handleAddPaymentRow}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-900 underline"
              >
                + Dividir Forma de Pagamento
              </button>
            </div>

            {/* Quick 1-click full payment presets */}
            <div className="grid grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => handleQuickPayMethod('pix')}
                className="py-1.5 text-xs font-bold rounded-lg border border-emerald-300 bg-white hover:bg-emerald-100 text-emerald-800 transition-colors"
              >
                100% PIX
              </button>
              <button
                type="button"
                onClick={() => handleQuickPayMethod('dinheiro')}
                className="py-1.5 text-xs font-bold rounded-lg border border-emerald-300 bg-white hover:bg-emerald-100 text-emerald-800 transition-colors"
              >
                100% Dinheiro
              </button>
              <button
                type="button"
                onClick={() => handleQuickPayMethod('debito')}
                className="py-1.5 text-xs font-bold rounded-lg border border-emerald-300 bg-white hover:bg-emerald-100 text-emerald-800 transition-colors"
              >
                100% Cartão
              </button>
              <button
                type="button"
                onClick={() => handleQuickPayMethod('fiado')}
                className="py-1.5 text-xs font-bold rounded-lg border border-orange-300 bg-orange-50 hover:bg-orange-100 text-orange-900 transition-colors"
              >
                100% FIADO
              </button>
            </div>

            {/* Payment rows */}
            <div className="space-y-2">
              {payments.map((p, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <select
                    value={p.method}
                    onChange={(e) =>
                      handlePaymentChange(idx, 'method', e.target.value as PaymentMethod)
                    }
                    className="text-xs font-medium bg-white border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="dinheiro">Dinheiro (Entra no Caixa)</option>
                    <option value="pix">PIX (Entra no Caixa)</option>
                    <option value="debito">Cartão Débito (Entra no Caixa)</option>
                    <option value="credito">Cartão Crédito (Entra no Caixa)</option>
                    <option value="fiado">FIADO (Contas a Receber)</option>
                    <option value="outro">Outro</option>
                  </select>

                  <div className="relative flex-1">
                    <span className="absolute left-2.5 top-2 text-xs text-slate-400 font-semibold">
                      R$
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      value={p.amount || ''}
                      onChange={(e) =>
                        handlePaymentChange(idx, 'amount', parseFloat(e.target.value) || 0)
                      }
                      placeholder="0,00"
                      className="w-full text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-lg py-2 pl-8 pr-2 focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  {payments.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemovePaymentRow(idx)}
                      className="p-1.5 text-slate-400 hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Split Balance Verification */}
            <div className="p-2.5 bg-white rounded-xl border border-emerald-200 text-xs space-y-1">
              <div className="flex justify-between text-slate-600">
                <span>Total da Venda:</span>
                <span className="font-bold text-slate-900">
                  {formatCurrency(sale.totalAmount)}
                </span>
              </div>
              <div className="flex justify-between text-emerald-700">
                <span>Entra no Caixa (Pago):</span>
                <span className="font-semibold">{formatCurrency(totalPaid)}</span>
              </div>
              {fiadoPart > 0 && (
                <div className="flex justify-between text-orange-600">
                  <span>Vai para Contas a Receber (Fiado):</span>
                  <span className="font-semibold">{formatCurrency(fiadoPart)}</span>
                </div>
              )}
              <div className="pt-1 border-t border-slate-100 flex justify-between font-bold">
                <span>Saldo Restante:</span>
                <span
                  className={
                    Math.abs(remaining) < 0.05 ? 'text-emerald-700' : 'text-rose-600'
                  }
                >
                  {Math.abs(remaining) < 0.05
                    ? 'Total confere R$ 0,00 (OK)'
                    : remaining > 0
                    ? `Falta ${formatCurrency(remaining)}`
                    : `Excede ${formatCurrency(Math.abs(remaining))}`}
                </span>
              </div>
            </div>

            {/* Seleção de Cliente para FIADO se necessário */}
            {fiadoPart > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl space-y-1.5">
                <label className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>Vincular Cliente para o FIADO *</span>
                </label>
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className={`w-full text-xs font-semibold bg-white border rounded-lg p-2 focus:ring-2 focus:outline-none ${
                    !selectedClientId
                      ? 'border-amber-500 ring-2 ring-amber-400 text-amber-950'
                      : 'border-amber-300 text-slate-800'
                  }`}
                >
                  <option value="">-- Selecione o cliente para debitar o FIADO --</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.phone ? `(${c.phone})` : ''} - {c.neighborhood || c.address}
                    </option>
                  ))}
                </select>
                {!selectedClientId && (
                  <p className="text-[11px] text-amber-800 font-medium">
                    A venda não possui cliente cadastrado vinculado. Para lançar o FIADO em Contas a Receber, é obrigatório selecionar o cliente acima.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Observations */}
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">
              Observações da Finalização (Opcional):
            </label>
            <input
              type="text"
              placeholder="Ex: Entregue sem problemas, cliente pediu nota na próxima, etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-amber-500"
            />
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 border border-slate-300 hover:bg-slate-100 rounded-xl font-medium text-xs text-slate-700 transition-colors"
          >
            Voltar
          </button>

          <button
            id="confirm-finalize-delivery-btn"
            type="button"
            onClick={handleSubmit}
            disabled={Math.abs(remaining) > 0.05}
            className="flex-1 py-3 px-5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>Confirmar e Finalizar Entrega</span>
          </button>
        </div>
      </div>
    </div>
  );
};
