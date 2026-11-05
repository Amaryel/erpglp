import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  Package,
  Plus,
  Minus,
  AlertCircle,
  Clock,
  User,
  MapPin,
} from 'lucide-react';
import { useErp } from '../context/ErpContext';
import { NumberField } from './NumberField';
import { Sale, PaymentSplit } from '../types';
import { formatCurrency, formatTime, getElapsedTime } from '../utils/formatters';
import { summarizePayments } from '../lib/payments';
import { PaymentSplitEditor } from './PaymentSplitEditor';

interface FinalizeDeliveryModalProps {
  sale: Sale | null;
  isOpen: boolean;
  onClose: () => void;
}

export const FinalizeDeliveryModal: React.FC<FinalizeDeliveryModalProps> = ({ sale, isOpen, onClose }) => {
  if (!isOpen || !sale) return null;
  // Conteúdo separado: os estados reiniciam a cada venda aberta (e respeitam a ordem dos hooks)
  return <FinalizeDeliveryContent key={sale.id} sale={sale} onClose={onClose} />;
};

const FinalizeDeliveryContent: React.FC<{ sale: Sale; onClose: () => void }> = ({ sale, onClose }) => {
  const { finalizeDelivery, clients } = useErp();

  const cylinderItems = sale.items.filter((i) => i.isCylinder);

  // Padrão: troca completa (cada botijão entregue volta um vazio)
  const [returnedByProduct, setReturnedByProduct] = useState<Record<string, number>>(() =>
    Object.fromEntries(cylinderItems.map((i): [string, number] => [i.productId, i.quantity]))
  );

  // Começa com a forma combinada na criação da entrega
  const [payments, setPayments] = useState<PaymentSplit[]>(() =>
    sale.payments && sale.payments.length > 0
      ? sale.payments.map((p) => ({ ...p }))
      : [{ method: 'dinheiro', amount: sale.totalAmount }]
  );
  const [selectedClientId, setSelectedClientId] = useState<string>(sale.clientId || '');
  const [notes, setNotes] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const summary = summarizePayments(payments, sale.totalAmount);
  const totalReturned = cylinderItems.reduce((sum, i) => sum + (returnedByProduct[i.productId] ?? 0), 0);
  const missingCylinders = Math.max(0, sale.dispatchedCylinders - totalReturned);
  const needsClient = summary.fiado > 0 && !selectedClientId;

  const changeReturned = (productId: string, value: number) =>
    setReturnedByProduct((prev) => ({ ...prev, [productId]: Math.max(0, value) }));

  const handleSubmit = () => {
    setErrorMessage(null);

    if (!summary.isBalanced) {
      setErrorMessage(
        summary.remaining > 0
          ? `Faltam ${formatCurrency(summary.remaining)} para fechar o pagamento.`
          : `O pagamento passa ${formatCurrency(-summary.remaining)} do valor da venda.`
      );
      return;
    }
    if (needsClient) {
      setErrorMessage('Para lançar FIADO (Contas a Receber), selecione o cliente.');
      return;
    }

    const res = finalizeDelivery(sale.id, {
      returnedCylinders: totalReturned,
      returnedByProduct,
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
        <div className="px-4 py-3 bg-orange-600 text-white flex items-center justify-between">
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

          {/* STEP 1: Vasilhames vazios devolvidos, por produto */}
          {cylinderItems.length > 0 && (
            <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-amber-600" />
                  <span>1. Vasilhames devolvidos</span>
                </label>
                <span className="text-[11px] text-amber-800 bg-amber-200/60 px-2 py-0.5 rounded-full font-semibold">
                  Saíram {sale.dispatchedCylinders} cheio(s)
                </span>
              </div>

              {cylinderItems.map((item) => {
                const value = returnedByProduct[item.productId] ?? 0;
                return (
                  <div
                    key={item.productId}
                    className="flex items-center justify-between gap-3 bg-white p-2.5 rounded-xl border border-amber-300"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-800 truncate">{item.productName}</div>
                      <div className="text-[11px] text-slate-500">Entregue: {item.quantity}</div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => changeReturned(item.productId, value - 1)}
                        aria-label={`Diminuir vazios de ${item.productName}`}
                        className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 active:scale-95"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <NumberField
                        inputMode="numeric"
                        min="0"
                        aria-label={`Vazios devolvidos de ${item.productName}`}
                        value={value}
                        onValueChange={(n) => changeReturned(item.productId, n)} decimal={false}
                        className="w-14 h-10 text-center text-lg font-black text-slate-900 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500/40"
                      />
                      <button
                        type="button"
                        onClick={() => changeReturned(item.productId, value + 1)}
                        aria-label={`Aumentar vazios de ${item.productName}`}
                        className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 active:scale-95"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {missingCylinders > 0 ? (
                <div className="text-xs text-amber-900 bg-amber-100 p-2.5 rounded-lg flex items-start gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-700 mt-0.5" />
                  <span>
                    <strong>{missingCylinders} vasilhame(s) não voltaram.</strong> O estoque de vazios só recebe o que
                    retornou, e a diferença fica registrada na auditoria.
                  </span>
                </div>
              ) : (
                <p className="text-[11px] text-slate-600">
                  Troca completa: os vazios entram no estoque assim que você confirmar.
                </p>
              )}
            </div>
          )}

          {/* STEP 2: Pagamento do cliente */}
          <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3.5 space-y-2.5">
            <label className="text-xs font-bold text-emerald-950 block">
              {cylinderItems.length > 0 ? '2. ' : ''}Pagamento recebido
            </label>

            <PaymentSplitEditor
              total={sale.totalAmount}
              payments={payments}
              onChange={setPayments}
              missingClientForFiado={needsClient}
            />

            {summary.fiado > 0 && (
              <div className="space-y-1.5">
                <label htmlFor="finalize-client" className="text-xs font-bold text-amber-900">
                  Cliente do fiado *
                </label>
                <select
                  id="finalize-client"
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className={`w-full h-11 text-sm font-semibold bg-white border rounded-xl px-2 focus:ring-2 focus:outline-none ${
                    !selectedClientId ? 'border-amber-500 ring-2 ring-amber-300' : 'border-slate-300'
                  }`}
                >
                  <option value="">Selecione o cliente</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.phone ? `(${c.phone})` : ''}
                    </option>
                  ))}
                </select>
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
            disabled={!summary.isBalanced || needsClient}
            className="flex-1 py-3 px-5 rounded-xl font-bold text-sm text-white bg-emerald-600 hover:bg-emerald-700 shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>Confirmar e Finalizar Entrega</span>
          </button>
        </div>
      </div>
    </div>
  );
};
