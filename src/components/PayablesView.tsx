import React, { useState } from 'react';
import {
  Layers,
  Plus,
  Search,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  Clock,
  Trash2,
  DollarSign,
  Tag,
} from 'lucide-react';
import { useErp } from '../context/ErpContext';
import { Payable, PaymentMethod } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';

const CATEGORIES = [
  'Gás / Distribuidora',
  'Combustível',
  'Manutenção de Veículos',
  'Aluguel',
  'Energia Elétrica',
  'Água',
  'Funcionários / Diárias',
  'Internet / Telefonia',
  'Impostos / Taxas',
  'Outros',
];

export const PayablesView: React.FC = () => {
  const { payables, addPayable, payBill } = useErp();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'todos' | 'pendente' | 'pago'>('todos');

  // Modal new payable
  const [showAddModal, setShowAddModal] = useState(false);
  const [desc, setDesc] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [supplier, setSupplier] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');

  // Modal pay bill
  const [selectedToPay, setSelectedToPay] = useState<Payable | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<PaymentMethod>('dinheiro');

  const todayStr = new Date().toISOString().split('T')[0];

  const filtered = payables.filter((p) => {
    if (filterStatus !== 'todos' && p.status !== filterStatus) return false;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchDesc = p.description.toLowerCase().includes(term);
      const matchCat = p.category.toLowerCase().includes(term);
      const matchSupp = p.supplier?.toLowerCase().includes(term);
      return matchDesc || matchCat || matchSupp;
    }
    return true;
  });

  const pendingTotal = payables
    .filter((p) => p.status === 'pendente')
    .reduce((sum, p) => sum + p.amount, 0);

  const overdueTotal = payables
    .filter((p) => p.status === 'pendente' && p.dueDate < todayStr)
    .reduce((sum, p) => sum + p.amount, 0);

  const handleCreatePayable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!desc.trim() || amount <= 0 || !dueDate) return;

    addPayable({
      description: desc.trim(),
      category,
      supplier: supplier.trim() || undefined,
      amount: Number(amount),
      dueDate,
      notes: notes.trim() || undefined,
    });

    setDesc('');
    setSupplier('');
    setAmount(0);
    setDueDate('');
    setNotes('');
    setShowAddModal(false);
  };

  const handleConfirmPayBill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedToPay || payAmount <= 0) return;

    payBill(selectedToPay.id, payMethod, Number(payAmount));
    setSelectedToPay(null);
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Top Header */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-slate-900/10 flex items-center justify-center text-slate-800">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-black text-slate-900">
              Contas a Pagar & Despesas
            </h1>
            <p className="text-xs text-slate-500">
              Controle de fornecedores, combustível, manutenção, energia e baixa automática no caixa
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="bg-slate-900 hover:bg-black active:scale-95 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-xs flex items-center justify-center gap-2 transition-transform"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Conta a Pagar</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 block mb-1">
            Total a Pagar Pendente
          </span>
          <div className="text-xl sm:text-2xl font-black text-slate-900">
            {formatCurrency(pendingTotal)}
          </div>
          <span className="text-[10px] text-slate-400">Em aberto no sistema</span>
        </div>

        <div className="bg-rose-50/70 p-3.5 rounded-2xl border border-rose-300 shadow-xs">
          <span className="text-xs font-bold text-rose-900 block mb-1">
            Contas Vencidas
          </span>
          <div className="text-xl sm:text-2xl font-black text-rose-700">
            {formatCurrency(overdueTotal)}
          </div>
          <span className="text-[10px] text-rose-700 font-semibold">
            {overdueTotal > 0 ? 'Requer atenção imediata' : 'Nenhuma conta em atraso'}
          </span>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por descrição, categoria ou fornecedor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs sm:text-sm bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setFilterStatus('todos')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
              filterStatus === 'todos'
                ? 'bg-slate-900 text-white'
                : 'bg-white border border-slate-200 text-slate-600'
            }`}
          >
            Todas
          </button>
          <button
            onClick={() => setFilterStatus('pendente')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
              filterStatus === 'pendente'
                ? 'bg-amber-500 text-white'
                : 'bg-white border border-slate-200 text-slate-600'
            }`}
          >
            Pendentes
          </button>
          <button
            onClick={() => setFilterStatus('pago')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
              filterStatus === 'pago'
                ? 'bg-emerald-600 text-white'
                : 'bg-white border border-slate-200 text-slate-600'
            }`}
          >
            Pagas
          </button>
        </div>
      </div>

      {/* Payables Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filtered.map((item) => {
          const isOverdue = item.status === 'pendente' && item.dueDate < todayStr;

          return (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-slate-200 hover:border-slate-400 p-4 shadow-xs transition-all flex flex-col justify-between gap-3"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-lg">
                    {item.category}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                      item.status === 'pago'
                        ? 'bg-emerald-100 text-emerald-800'
                        : isOverdue
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-amber-100 text-amber-900'
                    }`}
                  >
                    {item.status === 'pago'
                      ? 'Pago'
                      : isOverdue
                      ? 'Vencida'
                      : 'Pendente'}
                  </span>
                </div>

                <h3 className="font-bold text-slate-900 text-sm">{item.description}</h3>
                {item.supplier && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    Fornecedor: <strong>{item.supplier}</strong>
                  </p>
                )}

                <div className="mt-3 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Vencimento:</span>
                    <span
                      className={`text-xs font-bold ${
                        isOverdue ? 'text-rose-600' : 'text-slate-700'
                      }`}
                    >
                      {formatDate(item.dueDate)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">Valor da Conta:</span>
                    <span className="text-base font-black text-slate-900">
                      {formatCurrency(item.amount)}
                    </span>
                  </div>
                </div>

                {item.notes && (
                  <div className="text-[11px] text-slate-500 italic mt-2">
                    Obs: {item.notes}
                  </div>
                )}
              </div>

              {item.status === 'pendente' ? (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedToPay(item);
                    setPayAmount(item.amount);
                  }}
                  className="w-full py-2.5 bg-slate-900 hover:bg-black text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>DAR BAIXA (PAGAR)</span>
                </button>
              ) : (
                <div className="py-2 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-semibold text-center border border-emerald-200">
                  Conta paga em {item.paidAt ? formatDate(item.paidAt) : ''} via {item.paymentMethod}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal: Cadastrar Conta a Pagar (Requirements #23) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/80">
          <form
            onSubmit={handleCreatePayable}
            className="bg-white rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-3 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                Cadastrar Conta a Pagar
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-700 text-xs"
              >
                Cancelar
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Descrição da Conta *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Combustível Fiorino ou Carga Distribuidora"
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Categoria *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl p-2"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Fornecedor
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Posto Central"
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl p-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Valor *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={amount || ''}
                    onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                    placeholder="0,00"
                    className="w-full border border-slate-300 rounded-xl p-2 font-black"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Data de Vencimento *
                  </label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl p-2"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-600 block mb-1">
                  Observações
                </label>
                <input
                  type="text"
                  placeholder="Ex: Boleto com código de barras"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-slate-900 hover:bg-black text-white font-bold text-xs rounded-xl shadow-md transition-colors"
            >
              Salvar Conta a Pagar
            </button>
          </form>
        </div>
      )}

      {/* Modal: Baixa de Conta (Requirements #24) */}
      {selectedToPay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/80">
          <form
            onSubmit={handleConfirmPayBill}
            className="bg-white rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Dar Baixa: {selectedToPay.description}</span>
              </h3>
              <button
                type="button"
                onClick={() => setSelectedToPay(null)}
                className="text-slate-400 hover:text-slate-700 text-xs"
              >
                Cancelar
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Valor da Conta:</span>
                <span className="font-bold text-slate-900">
                  {formatCurrency(selectedToPay.amount)}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Se pago em dinheiro, sairá automaticamente do saldo do caixa atual.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-800 block mb-1">
                  Valor Pago *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)}
                  className="w-full border border-slate-300 rounded-xl p-2 font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">
                  Forma de Pagamento Utilizada *
                </label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
                  className="w-full border border-slate-300 rounded-xl p-2.5 font-semibold"
                >
                  <option value="dinheiro">Dinheiro (Sai do Caixa do Dia)</option>
                  <option value="pix">PIX / Transferência Bancária</option>
                  <option value="debito">Cartão de Débito</option>
                  <option value="credito">Cartão de Crédito</option>
                  <option value="outro">Boleto / Outro</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors"
            >
              Confirmar Pagamento e Baixar Conta
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
