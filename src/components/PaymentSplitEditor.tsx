import React, { useEffect, useRef, useState } from 'react';
import {
  Banknote,
  QrCode,
  CreditCard,
  Wallet,
  Plus,
  Trash2,
  Split,
  CheckCircle2,
  AlertCircle,
  HandCoins,
} from 'lucide-react';
import { PaymentMethod, PaymentSplit } from '../types';
import { formatCurrency } from '../utils/formatters';
import { PAYMENT_LABELS, round2, summarizePayments } from '../lib/payments';

const METHOD_ICONS: Record<PaymentMethod, React.ElementType> = {
  dinheiro: Banknote,
  pix: QrCode,
  debito: CreditCard,
  credito: CreditCard,
  fiado: HandCoins,
  outro: Wallet,
};

/** Converte "12,50" / "12.50" / "1.234,56" em número. */
function parseMoney(text: string): number {
  const clean = text.replace(/[^\d,.-]/g, '');
  if (!clean) return 0;
  const normalized = clean.includes(',') ? clean.replace(/\./g, '').replace(',', '.') : clean;
  const n = parseFloat(normalized);
  return Number.isFinite(n) && n > 0 ? round2(n) : 0;
}

const toDraft = (value: number) => (value > 0 ? value.toFixed(2).replace('.', ',') : '');

/** Campo de valor em reais com teclado numérico no celular e vírgula decimal. */
const MoneyInput: React.FC<{
  value: number;
  onChange: (value: number) => void;
  ariaLabel: string;
  placeholder?: string;
}> = ({ value, onChange, ariaLabel, placeholder = '0,00' }) => {
  const [draft, setDraft] = useState(toDraft(value));
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setDraft(toDraft(value));
  }, [value]);

  return (
    <div className="relative flex-1 min-w-0">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-semibold pointer-events-none">
        R$
      </span>
      <input
        type="text"
        inputMode="decimal"
        aria-label={ariaLabel}
        placeholder={placeholder}
        value={draft}
        onFocus={(e) => {
          focused.current = true;
          e.target.select();
        }}
        onBlur={() => {
          focused.current = false;
          setDraft(toDraft(value));
        }}
        onChange={(e) => {
          setDraft(e.target.value);
          onChange(parseMoney(e.target.value));
        }}
        className="w-full h-11 text-sm font-bold text-slate-900 bg-white border border-slate-300 rounded-xl pl-9 pr-3 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
      />
    </div>
  );
};

interface PaymentSplitEditorProps {
  total: number;
  payments: PaymentSplit[];
  onChange: (payments: PaymentSplit[]) => void;
  allowFiado?: boolean;
  /** Exibe o aviso de cliente obrigatório quando houver fiado sem cliente. */
  missingClientForFiado?: boolean;
  /** Formas exibidas como atalho de pagamento único. */
  quickMethods?: PaymentMethod[];
}

/**
 * Editor de pagamento do dia a dia:
 * - 1 toque = valor total na forma escolhida;
 * - "Dividir" permite combinar formas (ex.: metade dinheiro, metade PIX);
 * - a última linha completa sozinha o valor que falta;
 * - calcula o troco do dinheiro.
 */
export const PaymentSplitEditor: React.FC<PaymentSplitEditorProps> = ({
  total,
  payments,
  onChange,
  allowFiado = true,
  missingClientForFiado = false,
  quickMethods = ['dinheiro', 'pix', 'debito', 'credito'],
}) => {
  const isSplit = payments.length > 1;
  const methods = (allowFiado ? [...quickMethods, 'fiado'] : quickMethods) as PaymentMethod[];
  const summary = summarizePayments(payments, total);
  const [cashReceived, setCashReceived] = useState(0);

  // Pagamento único acompanha o total do pedido (itens adicionados/removidos)
  useEffect(() => {
    if (payments.length === 1 && round2(payments[0].amount) !== round2(total)) {
      onChange([{ ...payments[0], amount: round2(total) }]);
    } else if (payments.length === 0 && total > 0) {
      onChange([{ method: 'dinheiro', amount: round2(total) }]);
    } else if (payments.length > 1) {
      // Pagamento dividido: a última forma absorve a mudança do total
      const others = payments.slice(0, -1).reduce((s, p) => s + (p.amount || 0), 0);
      const last = Math.max(0, round2(total - others));
      if (round2(payments[payments.length - 1].amount) !== last) {
        onChange([...payments.slice(0, -1), { ...payments[payments.length - 1], amount: last }]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total]);

  const selectSingle = (method: PaymentMethod) => onChange([{ method, amount: round2(total) }]);

  const startSplit = () => {
    const first = payments[0]?.method || 'dinheiro';
    const second: PaymentMethod = first === 'pix' ? 'dinheiro' : 'pix';
    const half = round2(total / 2);
    onChange([
      { method: first, amount: half },
      { method: second, amount: round2(total - half) },
    ]);
  };

  /** Atualiza uma linha; se não for a última, a última linha absorve a diferença. */
  const updateRow = (index: number, patch: Partial<PaymentSplit>) => {
    const next = payments.map((p, i) => (i === index ? { ...p, ...patch } : { ...p }));
    if (patch.amount !== undefined && index < next.length - 1) {
      const others = next.slice(0, -1).reduce((s, p) => s + (p.amount || 0), 0);
      next[next.length - 1].amount = Math.max(0, round2(total - others));
    }
    onChange(next);
  };

  const addRow = () => {
    const used = new Set(payments.map((p) => p.method));
    const method = methods.find((m) => !used.has(m)) || 'outro';
    onChange([...payments, { method, amount: Math.max(0, summary.remaining) }]);
  };

  const removeRow = (index: number) => {
    const next = payments.filter((_, i) => i !== index);
    if (next.length === 1) next[0] = { ...next[0], amount: round2(total) };
    onChange(next);
  };

  const cashAmount = summary.normalized.find((p) => p.method === 'dinheiro')?.amount || 0;
  const change = cashReceived > 0 ? round2(cashReceived - cashAmount) : 0;

  return (
    <div className="space-y-3">
      {!isSplit ? (
        <>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2" role="radiogroup" aria-label="Forma de pagamento">
            {methods.map((m) => {
              const Icon = METHOD_ICONS[m];
              const active = payments[0]?.method === m;
              const isFiado = m === 'fiado';
              return (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => selectSingle(m)}
                  className={`h-12 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-0.5 transition-colors active:scale-95 ${
                    active
                      ? isFiado
                        ? 'bg-amber-500 border-amber-500 text-white shadow-sm'
                        : 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                      : isFiado
                        ? 'bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100'
                        : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{PAYMENT_LABELS[m]}</span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={startSplit}
            disabled={total <= 0}
            className="w-full h-11 rounded-xl border border-dashed border-emerald-400 text-emerald-800 bg-emerald-50/60 hover:bg-emerald-100 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Split className="w-4 h-4" />
            <span>Dividir em mais de uma forma</span>
          </button>
        </>
      ) : (
        <div className="space-y-2">
          {payments.map((p, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <select
                aria-label={`Forma de pagamento ${idx + 1}`}
                value={p.method}
                onChange={(e) => updateRow(idx, { method: e.target.value as PaymentMethod })}
                className="h-11 w-32 shrink-0 text-sm font-semibold bg-white border border-slate-300 rounded-xl px-2 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/40"
              >
                {(Object.keys(PAYMENT_LABELS) as PaymentMethod[])
                  .filter((m) => allowFiado || m !== 'fiado')
                  .map((m) => (
                    <option key={m} value={m}>
                      {PAYMENT_LABELS[m]}
                    </option>
                  ))}
              </select>
              <MoneyInput
                value={p.amount}
                ariaLabel={`Valor em ${PAYMENT_LABELS[p.method]}`}
                onChange={(amount) => updateRow(idx, { amount })}
              />
              <button
                type="button"
                onClick={() => removeRow(idx)}
                aria-label="Remover forma de pagamento"
                className="w-11 h-11 shrink-0 flex items-center justify-center rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={addRow}
              className="h-10 px-3 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-bold flex items-center gap-1.5 hover:bg-slate-50"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Adicionar forma</span>
            </button>
            <button
              type="button"
              onClick={() => selectSingle(payments[0].method)}
              className="h-10 px-3 rounded-xl text-slate-500 text-xs font-semibold hover:text-slate-800"
            >
              Voltar para pagamento único
            </button>
          </div>
        </div>
      )}

      {/* Troco */}
      {cashAmount > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-2.5 space-y-1.5">
          <span className="text-xs font-semibold text-slate-600 block">
            Recebido em dinheiro (para calcular o troco)
          </span>
          <div className="flex items-center gap-3">
            <MoneyInput
              value={cashReceived}
              ariaLabel="Valor recebido em dinheiro"
              placeholder="0,00"
              onChange={setCashReceived}
            />
            <div className="text-right shrink-0 min-w-24">
              <div className="text-[10px] uppercase font-bold text-slate-400">Troco</div>
              <div className={`text-sm font-black ${change < 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                {cashReceived > 0 ? (change < 0 ? `Falta ${formatCurrency(-change)}` : formatCurrency(change)) : '—'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Conferência */}
      <div className="rounded-xl bg-white border border-slate-200 p-3 text-xs space-y-1">
        <div className="flex justify-between text-slate-600">
          <span>Entra no caixa</span>
          <span className="font-bold text-emerald-700">{formatCurrency(summary.paid)}</span>
        </div>
        {summary.fiado > 0 && (
          <div className="flex justify-between text-slate-600">
            <span>Fica no fiado (contas a receber)</span>
            <span className="font-bold text-amber-700">{formatCurrency(summary.fiado)}</span>
          </div>
        )}
        <div className="flex justify-between items-center pt-1.5 border-t border-slate-100 font-bold">
          <span className="text-slate-800">Total do pedido {formatCurrency(total)}</span>
          {summary.isBalanced ? (
            <span className="text-emerald-700 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Confere
            </span>
          ) : (
            <span className="text-rose-600">
              {summary.remaining > 0
                ? `Falta ${formatCurrency(summary.remaining)}`
                : `Sobra ${formatCurrency(-summary.remaining)}`}
            </span>
          )}
        </div>
      </div>

      {missingClientForFiado && summary.fiado > 0 && (
        <div className="p-2.5 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <span>
            Para lançar <strong>fiado</strong>, selecione ou cadastre o cliente.
          </span>
        </div>
      )}
    </div>
  );
};
