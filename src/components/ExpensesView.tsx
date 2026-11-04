import React, { useState, useMemo } from 'react';
import {
  Layers,
  Plus,
  Search,
  Calendar,
  Filter,
  DollarSign,
  Edit2,
  Trash2,
  Wallet,
  Building2,
  Tag,
  AlertTriangle,
  CheckCircle2,
  Receipt,
  FileText,
} from 'lucide-react';
import { useErp } from '../context/ErpContext';
import { Expense, PaymentMethod } from '../types';
import { formatCurrency, formatDate, formatPaymentMethod } from '../utils/formatters';

const EXPENSE_CATEGORIES = [
  'Combustível',
  'Manutenção de Veículos',
  'Aluguel',
  'Energia Elétrica',
  'Água',
  'Salários / Diárias',
  'Alimentação / Lanche',
  'Impostos / Taxas',
  'Material de Escritório / Limpeza',
  'Distribuidora / Gás',
  'Outros',
];

type DateFilter = 'hoje' | 'ontem' | '7dias' | 'mes' | 'todos';

export const ExpensesView: React.FC = () => {
  const {
    expenses,
    cashRegister,
    addExpense,
    updateExpense,
    deleteExpense,
  } = useErp();

  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('mes');
  const [categoryFilter, setCategoryFilter] = useState<string>('todos');
  const [paidFromCashFilter, setPaidFromCashFilter] = useState<'todos' | 'caixa' | 'fora'>('todos');

  // Modal create/edit
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [amount, setAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('dinheiro');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paidFromCash, setPaidFromCash] = useState(true);
  const [supplier, setSupplier] = useState('');
  const [notes, setNotes] = useState('');

  // Delete modal
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const yesterdayStr = new Date(now.getTime() - 86400000).toISOString().split('T')[0];
    const sevenDaysAgoStr = new Date(now.getTime() - 7 * 86400000).toISOString().split('T')[0];
    const firstDayMonthStr = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split('T')[0];

    return expenses
      .filter((e) => {
        const eDate = e.date.split('T')[0];
        if (dateFilter === 'hoje' && eDate !== todayStr) return false;
        if (dateFilter === 'ontem' && eDate !== yesterdayStr) return false;
        if (dateFilter === '7dias' && eDate < sevenDaysAgoStr) return false;
        if (dateFilter === 'mes' && eDate < firstDayMonthStr) return false;

        if (categoryFilter !== 'todos' && e.category !== categoryFilter) return false;

        if (paidFromCashFilter === 'caixa' && !e.paidFromCash) return false;
        if (paidFromCashFilter === 'fora' && e.paidFromCash) return false;

        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase();
          const matchDesc = e.description.toLowerCase().includes(term);
          const matchCat = e.category.toLowerCase().includes(term);
          const matchSupp = e.supplier?.toLowerCase().includes(term);
          if (!matchDesc && !matchCat && !matchSupp) return false;
        }

        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, dateFilter, categoryFilter, paidFromCashFilter, searchTerm]);

  // Aggregate Stats
  const stats = useMemo(() => {
    const totalFiltered = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

    const todayStr = new Date().toISOString().split('T')[0];
    const todayTotal = expenses
      .filter((e) => e.date.startsWith(todayStr))
      .reduce((sum, e) => sum + e.amount, 0);

    const paidFromCashTotal = filteredExpenses
      .filter((e) => e.paidFromCash)
      .reduce((sum, e) => sum + e.amount, 0);

    const outsideCashTotal = filteredExpenses
      .filter((e) => !e.paidFromCash)
      .reduce((sum, e) => sum + e.amount, 0);

    return {
      totalFiltered,
      todayTotal,
      paidFromCashTotal,
      outsideCashTotal,
      count: filteredExpenses.length,
    };
  }, [filteredExpenses, expenses]);

  const handleOpenNew = () => {
    setEditingId(null);
    setDescription('');
    setCategory(EXPENSE_CATEGORIES[0]);
    setAmount(0);
    setPaymentMethod('dinheiro');
    setDate(new Date().toISOString().split('T')[0]);
    setPaidFromCash(true);
    setSupplier('');
    setNotes('');
    setShowModal(true);
  };

  const handleOpenEdit = (exp: Expense) => {
    setEditingId(exp.id);
    setDescription(exp.description);
    setCategory(exp.category);
    setAmount(exp.amount);
    setPaymentMethod(exp.paymentMethod || exp.method || 'dinheiro');
    setDate(exp.date.split('T')[0]);
    setPaidFromCash(exp.paidFromCash);
    setSupplier(exp.supplier || '');
    setNotes(exp.notes || '');
    setShowModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || amount <= 0) return;

    if (editingId) {
      updateExpense(editingId, {
        description: description.trim(),
        category,
        amount: Number(amount),
        paymentMethod,
        date: new Date(date + 'T12:00:00').toISOString(),
        paidFromCash,
        supplier: supplier.trim() || undefined,
        notes: notes.trim() || undefined,
      });
    } else {
      addExpense({
        description: description.trim(),
        category,
        amount: Number(amount),
        paymentMethod,
        date: new Date(date + 'T12:00:00').toISOString(),
        paidFromCash,
        supplier: supplier.trim() || undefined,
        notes: notes.trim() || undefined,
      });
    }

    setShowModal(false);
  };

  const handleConfirmDelete = () => {
    if (!expenseToDelete) return;
    deleteExpense(expenseToDelete.id);
    setExpenseToDelete(null);
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div className="flex items-center gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Despesas
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Saídas do dia a dia e despesas da operação.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenNew}
            className="bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold text-xs sm:text-sm px-3.5 py-2 rounded-xl shadow-xs flex items-center gap-1.5 transition-transform"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Despesa</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-medium text-slate-500">Total Despesas no Filtro</p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-black text-rose-700">
              {formatCurrency(stats.totalFiltered)}
            </span>
            <span className="text-xs text-slate-500">({stats.count})</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-medium text-slate-500">Despesas de Hoje</p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-black text-slate-900">
              {formatCurrency(stats.todayTotal)}
            </span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-medium text-slate-500">Pagas pelo Caixa Físico</p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-black text-amber-700">
              {formatCurrency(stats.paidFromCashTotal)}
            </span>
            <span className="text-[10px] text-slate-400">saiu do caixa</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-medium text-slate-500">Pagas Fora do Caixa (PIX/Banco)</p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-black text-slate-900">
              {formatCurrency(stats.outsideCashTotal)}
            </span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por descrição, categoria, fornecedor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white"
            />
          </div>

          {/* Date Selector */}
          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
            {(['hoje', 'ontem', '7dias', 'mes', 'todos'] as DateFilter[]).map((df) => (
              <button
                key={df}
                onClick={() => setDateFilter(df)}
                className={`flex-1 py-1 text-[11px] font-bold rounded-lg transition-all capitalize ${
                  dateFilter === df
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {df === '7dias' ? '7 Dias' : df === 'mes' ? 'Mês' : df}
              </button>
            ))}
          </div>

          {/* Category Selector */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500"
            >
              <option value="todos">Todas as Categorias</option>
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Cash impact filter */}
          <div>
            <select
              value={paidFromCashFilter}
              onChange={(e) => setPaidFromCashFilter(e.target.value as any)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500"
            >
              <option value="todos">Todas as Fontes</option>
              <option value="caixa">Pagas pelo Caixa Físico</option>
              <option value="fora">Pagas por Conta Bancária/Outros</option>
            </select>
          </div>
        </div>
      </div>

      {/* Expenses List */}
      <div className="space-y-2">
        {filteredExpenses.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
            <p className="text-sm font-semibold text-slate-600">
              Nenhuma despesa encontrada com os filtros atuais.
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Clique em "Nova Despesa" para registrar uma saída financeira.
            </p>
          </div>
        ) : (
          filteredExpenses.map((exp) => (
            <div
              key={exp.id}
              className="bg-white rounded-2xl border border-slate-200 hover:border-rose-300 p-3.5 sm:p-4 shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-md">
                    {exp.category}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                      exp.paidFromCash
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : 'bg-blue-100 text-blue-800 border border-blue-200'
                    }`}
                  >
                    <Wallet className="w-3 h-3" />
                    {exp.paidFromCash ? 'Pago pelo Caixa' : 'Conta Bancária / Outro'}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {formatDate(exp.date)}
                  </span>
                </div>

                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  {exp.description}
                </h3>

                {exp.supplier && (
                  <p className="text-xs text-slate-500">
                    Favorecido / Fornecedor: <strong className="text-slate-700">{exp.supplier}</strong>
                  </p>
                )}

                {exp.notes && (
                  <p className="text-[11px] text-slate-400 italic">
                    Obs: {exp.notes}
                  </p>
                )}
              </div>

              <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 gap-2 shrink-0">
                <div className="text-right">
                  <span className="text-base sm:text-lg font-black text-rose-700">
                    - {formatCurrency(exp.amount)}
                  </span>
                  <div className="text-[11px] text-slate-500">
                    via {formatPaymentMethod(exp.paymentMethod || exp.method)}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(exp)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                    title="Editar Despesa"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setExpenseToDelete(exp)}
                    className="p-1.5 rounded-lg text-red-400 hover:text-red-700 hover:bg-red-50 transition-colors"
                    title="Excluir Despesa"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Add/Edit Expense */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-xs">
          <form
            onSubmit={handleSave}
            className="bg-white rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-3"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-base font-bold text-slate-900">
                {editingId ? 'Editar Despesa' : 'Cadastrar Nova Despesa'}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-xs font-bold text-slate-400 hover:text-slate-700"
              >
                Cancelar
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Descrição da Despesa *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Gasolina moto entrega placa XYZ / Aluguel do depósito"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2.5 font-medium focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Categoria *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl p-2.5 font-medium"
                  >
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Valor (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={amount || ''}
                    onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                    className="w-full border border-slate-300 rounded-xl p-2.5 font-black text-rose-700 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Data *</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl p-2 font-medium"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Forma de Pagamento</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full border border-slate-300 rounded-xl p-2 font-medium"
                  >
                    <option value="dinheiro">Dinheiro</option>
                    <option value="pix">PIX</option>
                    <option value="cartao_debito">Cartão de Débito</option>
                    <option value="cartao_credito">Cartão de Crédito</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Favorecido / Fornecedor (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Posto Ipiranga / Imobiliária Central"
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2"
                />
              </div>

              {/* Paid from Cash toggle */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 block">
                    Retirado do Caixa da Empresa?
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Se marcado, deduzirá o saldo do caixa atual e criará sangria/saída
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={paidFromCash}
                  onChange={(e) => setPaidFromCash(e.target.checked)}
                  className="w-4 h-4 text-rose-600 rounded focus:ring-rose-400"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Observações / Detalhes (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Nota fiscal nº 1234"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md transition-all"
              >
                Salvar Despesa
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Confirmation Delete Modal */}
      {expenseToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Excluir Despesa?
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  "{expenseToDelete.description}" no valor de{' '}
                  <strong className="text-red-700">
                    {formatCurrency(expenseToDelete.amount)}
                  </strong>
                </p>
              </div>
            </div>

            {expenseToDelete.paidFromCash && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                <p className="font-semibold">Reembolso ao Caixa:</p>
                <p className="text-[11px] mt-0.5">
                  Como esta despesa foi retirada do caixa físico, ao excluí-la o valor de{' '}
                  <strong>{formatCurrency(expenseToDelete.amount)}</strong> será estornado e
                  adicionado de volta ao saldo do caixa.
                </p>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setExpenseToDelete(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
