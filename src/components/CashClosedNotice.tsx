import React, { useState } from 'react';
import { Lock, Unlock } from 'lucide-react';
import { useErp } from '../context/ErpContext';
import { NumberField } from './NumberField';

/**
 * Aviso exibido quando há valor a receber e o caixa está fechado.
 * Sem caixa aberto o dinheiro não tem onde entrar, então oferece abrir ali mesmo.
 */
export const CashClosedNotice: React.FC = () => {
  const { cashRegister, openCashRegister } = useErp();
  const [initialBalance, setInitialBalance] = useState(0);
  if (cashRegister?.status === 'aberto') return null;

  return (
    <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-3 space-y-2.5">
      <div className="flex items-start gap-2 text-sm text-amber-950">
        <Lock className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
        <p>
          <strong className="font-semibold">O caixa está fechado.</strong> Abra o caixa para o valor recebido entrar
          no financeiro. Fiado não precisa de caixa aberto.
        </p>
      </div>
      <div className="flex items-end gap-2">
        <div className="flex-1 min-w-0">
          <label htmlFor="quick-open-cash" className="text-xs text-amber-900 block mb-1">
            Troco inicial (R$)
          </label>
          <NumberField
            id="quick-open-cash"
            min="0"
            value={initialBalance}
            onValueChange={setInitialBalance}
            emptyWhenZero
            placeholder="0,00"
            className="w-full h-10 border border-amber-300 bg-white rounded-lg px-2.5 text-sm font-semibold"
          />
        </div>
        <button
          type="button"
          onClick={() => openCashRegister(initialBalance)}
          className="h-10 px-3.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold flex items-center gap-1.5 shrink-0"
        >
          <Unlock className="w-4 h-4" />
          Abrir caixa
        </button>
      </div>
    </div>
  );
};
