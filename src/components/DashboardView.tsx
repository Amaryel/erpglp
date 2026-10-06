import React, { useState, useMemo } from 'react';
import {
  Package,
  TrendingUp,
  Truck,
  Wallet,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Clock,
  CreditCard,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  PlusCircle,
  ChevronRight,
  Users,
  ShieldAlert,
  Database,
  Cloud,
} from 'lucide-react';
import { useErp } from '../context/ErpContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import { ActiveTab } from './Navbar';

interface DashboardViewProps {
  setActiveTab: (tab: ActiveTab) => void;
  onOpenNewSale: () => void;
}

type DatePeriod = 'hoje' | 'ontem' | '7dias' | 'este_mes' | 'mes_anterior' | 'custom';

export const DashboardView: React.FC<DashboardViewProps> = ({
  setActiveTab,
  onOpenNewSale,
}) => {
  const {
    products,
    stock,
    sales,
    receivables,
    payables,
    cashRegister,
    cashMovements,
    expenses,
    totalFullCylinders,
    totalEmptyCylinders,
    criticalStockCount,
    inProgressDeliveriesCount,
    isOnlineDb,
    dbSyncState,
    lastSyncTime,
  } = useErp();

  const [period, setPeriod] = useState<DatePeriod>('hoje');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');

  // Date range filter calculations
  const filteredSales = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const yesterday = new Date(now.getTime() - 86400000);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
    const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split('T')[0];

    const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      .toISOString()
      .split('T')[0];
    const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
      .toISOString()
      .split('T')[0];

    return sales.filter((s) => {
      const sDate = s.createdAt.split('T')[0];

      if (period === 'hoje') return sDate === todayStr;
      if (period === 'ontem') return sDate === yesterdayStr;
      if (period === '7dias') return s.createdAt >= sevenDaysAgo.toISOString();
      if (period === 'este_mes') return sDate >= firstDayThisMonth;
      if (period === 'mes_anterior')
        return sDate >= firstDayLastMonth && sDate <= lastDayLastMonth;
      if (period === 'custom') {
        if (customStart && sDate < customStart) return false;
        if (customEnd && sDate > customEnd) return false;
        return true;
      }
      return true;
    });
  }, [sales, period, customStart, customEnd]);

  // Sales metrics in filtered period
  const finalizedSales = filteredSales.filter((s) => s.status === 'finalizada');
  const salesCount = finalizedSales.length;
  const totalRevenue = finalizedSales.reduce((sum, s) => sum + s.totalAmount, 0);
  const totalCost = finalizedSales.reduce((sum, s) => sum + s.totalCost, 0);
  const grossProfit = totalRevenue - totalCost;
  const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
  const fiadoSalesCount = finalizedSales.filter((s) => s.fiadoAmount > 0).length;

  // Deliveries in status breakdown
  const pendingDeliveries = sales.filter(
    (s) => s.type === 'delivery' && s.status === 'pendente'
  ).length;
  const onTheWayDeliveries = sales.filter(
    (s) => s.type === 'delivery' && s.status === 'em_entrega'
  ).length;
  const waitingFinalizeDeliveries = sales.filter(
    (s) => s.type === 'delivery' && s.status === 'aguardando_finalizacao'
  ).length;

  // Cash calculations today
  const todayStr = new Date().toISOString().split('T')[0];
  const todayCashEntries = cashMovements
    .filter(
      (m) =>
        m.timestamp.startsWith(todayStr) &&
        (m.type === 'venda' || m.type === 'recebimento_fiado' || m.type === 'entrada' || m.type === 'suprimento')
    )
    .reduce((sum, m) => sum + m.amount, 0);

  const todayCashExits = cashMovements
    .filter(
      (m) =>
        m.timestamp.startsWith(todayStr) &&
        (m.type === 'saida' || m.type === 'sangria')
    )
    .reduce((sum, m) => sum + m.amount, 0);

  // Financial obligations
  const totalReceivables = receivables
    .filter((r) => r.status !== 'pago')
    .reduce((sum, r) => sum + r.remainingAmount, 0);

  const overdueReceivables = receivables
    .filter((r) => r.status !== 'pago' && r.dueDate && r.dueDate < todayStr)
    .reduce((sum, r) => sum + r.remainingAmount, 0);

  const overduePayables = payables
    .filter((p) => p.status === 'pendente' && p.dueDate < todayStr)
    .reduce((sum, p) => sum + p.amount, 0);

  const upcomingPayables = payables
    .filter((p) => {
      if (p.status !== 'pendente') return false;
      const in7Days = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
      return p.dueDate >= todayStr && p.dueDate <= in7Days;
    })
    .reduce((sum, p) => sum + p.amount, 0);

  // Non-cylinder products count
  const otherProductsCount = products.filter((p) => !p.isCylinder).length;

  return (
    <div className="space-y-4 sm:space-y-6 pb-12">
      {/* Top Banner with Quick Actions & Online Status */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-4 sm:p-6 shadow-md relative overflow-hidden space-y-4">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold border border-amber-500/30">
                <Flame className="w-3.5 h-3.5" />
                <span>Painel Operacional ErpGLP</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold">
                <Database className="w-3 h-3" />
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Banco de Dados Online Conectado (Supabase)</span>
                {lastSyncTime && (
                  <span className="text-[10px] text-slate-300 font-normal">({lastSyncTime})</span>
                )}
              </div>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">
              Visão Geral da Revenda
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
              Controle imediato de botijões, entregas em rota, fluxo de caixa e lucro.
            </p>
          </div>

          {/* Quick Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onOpenNewSale}
              className="bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-md shadow-orange-500/20 flex items-center gap-2 transition-transform"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Lançar Venda</span>
            </button>

            <button
              onClick={() => setActiveTab('em_andamento')}
              className="bg-slate-700/80 hover:bg-slate-700 text-white font-bold text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-600 flex items-center gap-2 transition-colors relative"
            >
              <Truck className="w-4 h-4 text-amber-400" />
              <span>Entregas</span>
              {inProgressDeliveriesCount > 0 && (
                <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-1.5 py-0.2 rounded-full">
                  {inProgressDeliveriesCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('caixa')}
              className="bg-slate-700/80 hover:bg-slate-700 text-white font-bold text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-600 flex items-center gap-2 transition-colors"
            >
              <Wallet className="w-4 h-4 text-emerald-400" />
              <span>Caixa</span>
            </button>
          </div>
        </div>
      </div>

      {/* Date Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-white p-2.5 rounded-xl border border-slate-200">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">
          Período de Análise:
        </span>

        <div className="flex flex-wrap items-center gap-1">
          {(
            [
              { id: 'hoje', label: 'Hoje' },
              { id: 'ontem', label: 'Ontem' },
              { id: '7dias', label: '7 Dias' },
              { id: 'este_mes', label: 'Este Mês' },
              { id: 'mes_anterior', label: 'Mês Anterior' },
              { id: 'custom', label: 'Personalizado' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              onClick={() => setPeriod(item.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                period === item.id
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {period === 'custom' && (
          <div className="flex items-center gap-2 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg p-1.5"
            />
            <span className="text-xs text-slate-400">até</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg p-1.5"
            />
          </div>
        )}
      </div>

      {/* Urgent Alerts Banner (if any) */}
      {(inProgressDeliveriesCount > 0 || criticalStockCount > 0 || overdueReceivables > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {inProgressDeliveriesCount > 0 && (
            <div
              onClick={() => setActiveTab('em_andamento')}
              className="bg-amber-50 border border-amber-300/80 rounded-xl p-2.5 flex items-center justify-between cursor-pointer hover:bg-amber-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="text-xs font-bold text-amber-900">
                  {inProgressDeliveriesCount} entregas em andamento
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-amber-600" />
            </div>
          )}

          {criticalStockCount > 0 && (
            <div
              onClick={() => setActiveTab('estoque')}
              className="bg-rose-50 border border-rose-300/80 rounded-xl p-2.5 flex items-center justify-between cursor-pointer hover:bg-rose-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="text-xs font-bold text-rose-900">
                  {criticalStockCount} produtos com estoque baixo
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-rose-600" />
            </div>
          )}

          {overdueReceivables > 0 && (
            <div
              onClick={() => setActiveTab('receber')}
              className="bg-orange-50 border border-orange-300/80 rounded-xl p-2.5 flex items-center justify-between cursor-pointer hover:bg-orange-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-orange-600 shrink-0" />
                <span className="text-xs font-bold text-orange-900">
                  {formatCurrency(overdueReceivables)} fiados vencidos
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-orange-600" />
            </div>
          )}
        </div>
      )}

      {/* SECTION 1: ESTOQUE CARDS */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Package className="w-4 h-4 text-amber-500" />
            <span>Estoque & Vasilhames em Tempo Real</span>
          </h2>
          <button
            onClick={() => setActiveTab('estoque')}
            className="text-xs text-amber-600 hover:text-amber-700 font-semibold"
          >
            Ver Detalhes →
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          {/* Card Cheios */}
          <div
            onClick={() => setActiveTab('estoque')}
            className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs cursor-pointer hover:border-amber-400 transition-all"
          >
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-semibold">Botijões Cheios</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Flame className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900">
              {totalFullCylinders}
            </div>
            <p className="text-[11px] text-emerald-700 font-medium mt-0.5">
              Prontos para venda/entrega
            </p>
          </div>

          {/* Card Vazios */}
          <div
            onClick={() => setActiveTab('estoque')}
            className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs cursor-pointer hover:border-amber-400 transition-all"
          >
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-semibold">Vasilhames Vazios</span>
              <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                <Package className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900">
              {totalEmptyCylinders}
            </div>
            <p className="text-[11px] text-blue-700 font-medium mt-0.5">
              No pátio aguardando recarga
            </p>
          </div>

          {/* Card Outros Produtos */}
          <div
            onClick={() => setActiveTab('produtos')}
            className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs cursor-pointer hover:border-amber-400 transition-all"
          >
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-semibold">Outros Produtos</span>
              <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900">
              {otherProductsCount}
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              Água, reguladores, mangueiras
            </p>
          </div>

          {/* Card Estoque Mínimo */}
          <div
            onClick={() => setActiveTab('estoque')}
            className={`p-3.5 rounded-2xl border shadow-xs cursor-pointer transition-all ${
              criticalStockCount > 0
                ? 'bg-rose-50/50 border-rose-300 hover:border-rose-500'
                : 'bg-white border-slate-200 hover:border-amber-400'
            }`}
          >
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-semibold">Estoque Crítico</span>
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                  criticalStockCount > 0
                    ? 'bg-rose-100 text-rose-700'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div
              className={`text-2xl sm:text-3xl font-black ${
                criticalStockCount > 0 ? 'text-rose-600' : 'text-slate-900'
              }`}
            >
              {criticalStockCount}
            </div>
            <p
              className={`text-[11px] font-medium mt-0.5 ${
                criticalStockCount > 0 ? 'text-rose-700' : 'text-slate-500'
              }`}
            >
              {criticalStockCount > 0 ? 'Itens abaixo do mínimo' : 'Tudo regular'}
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 2: VENDAS & LUCRO CARDS */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <span>Vendas & Lucro Bruto ({period})</span>
          </h2>
          <button
            onClick={() => setActiveTab('lucro')}
            className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold"
          >
            Demonstrativo de Lucro →
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          {/* Card Faturamento */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 block mb-1">
              Faturamento no Período
            </span>
            <div className="text-xl sm:text-2xl font-black text-slate-900">
              {formatCurrency(totalRevenue)}
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              {salesCount} vendas finalizadas
            </p>
          </div>

          {/* Card Custo das Mercadorias */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 block mb-1">
              Custo dos Produtos Vendidos
            </span>
            <div className="text-xl sm:text-2xl font-black text-slate-700">
              {formatCurrency(totalCost)}
            </div>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
              Congelado no ato da venda
            </p>
          </div>

          {/* Card Lucro Bruto */}
          <div className="bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-300 shadow-xs">
            <span className="text-xs font-bold text-emerald-900 block mb-1">
              Lucro Bruto do Período
            </span>
            <div className="text-xl sm:text-2xl font-black text-emerald-700">
              {formatCurrency(grossProfit)}
            </div>
            <p className="text-[11px] text-emerald-800 font-semibold mt-0.5">
              Margem bruta: {profitMargin.toFixed(1)}%
            </p>
          </div>

          {/* Card Fiado / A Receber gerado */}
          <div
            onClick={() => setActiveTab('receber')}
            className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs cursor-pointer hover:border-orange-400 transition-all"
          >
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-semibold">Total a Receber (Fiados)</span>
              <CreditCard className="w-4 h-4 text-orange-500" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-orange-600">
              {formatCurrency(totalReceivables)}
            </div>
            <p className="text-[11px] text-orange-700 font-medium mt-0.5">
              {overdueReceivables > 0 ? `${formatCurrency(overdueReceivables)} vencido` : 'Em dia'}
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 3: ENTREGAS & CAIXA */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        {/* Entregas Card Box */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <Truck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Entregas Delivery</h3>
                <span className="text-[11px] text-slate-500">
                  {inProgressDeliveriesCount} em rota no momento
                </span>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('em_andamento')}
              className="text-xs font-bold text-amber-600 hover:text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200"
            >
              Abrir Painel →
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center pt-1">
            <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200">
              <span className="text-[11px] font-semibold text-amber-800 block">
                Aguardando Saída
              </span>
              <span className="text-lg font-black text-amber-900">
                {pendingDeliveries}
              </span>
            </div>
            <div className="bg-blue-50 p-2.5 rounded-xl border border-blue-200">
              <span className="text-[11px] font-semibold text-blue-800 block">
                Em Rota (Rua)
              </span>
              <span className="text-lg font-black text-blue-900">
                {onTheWayDeliveries}
              </span>
            </div>
            <div className="bg-purple-50 p-2.5 rounded-xl border border-purple-200">
              <span className="text-[11px] font-semibold text-purple-800 block">
                No Cliente
              </span>
              <span className="text-lg font-black text-purple-900">
                {waitingFinalizeDeliveries}
              </span>
            </div>
          </div>
        </div>

        {/* Caixa Status Box */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Wallet className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Caixa do Dia</h3>
                <span className="text-[11px] text-slate-500">
                  Status: {cashRegister?.status === 'aberto' ? 'Aberto' : 'Fechado'}
                </span>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('caixa')}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200"
            >
              Movimentar Caixa →
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
              <span className="text-[10px] text-slate-500 block">Saldo Inicial</span>
              <span className="text-xs font-bold text-slate-800">
                {formatCurrency(cashRegister?.initialBalance || 0)}
              </span>
            </div>
            <div className="bg-emerald-50/50 p-2 rounded-xl border border-emerald-100">
              <span className="text-[10px] text-emerald-700 block">+ Entradas</span>
              <span className="text-xs font-bold text-emerald-800">
                {formatCurrency(todayCashEntries)}
              </span>
            </div>
            <div className="bg-rose-50/50 p-2 rounded-xl border border-rose-100">
              <span className="text-[10px] text-rose-700 block">- Saídas</span>
              <span className="text-xs font-bold text-rose-800">
                {formatCurrency(todayCashExits)}
              </span>
            </div>
            <div className="bg-emerald-100/70 p-2 rounded-xl border border-emerald-200">
              <span className="text-[10px] text-emerald-900 font-bold block">
                Saldo Atual
              </span>
              <span className="text-xs font-black text-emerald-900">
                {formatCurrency(cashRegister?.currentBalance || 0)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 4: CONTAS A PAGAR RESUMO */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-slate-600" />
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Contas a Pagar & Obrigações
            </h3>
          </div>
          <button
            onClick={() => setActiveTab('pagar')}
            className="text-xs text-amber-600 hover:text-amber-700 font-semibold"
          >
            Gerenciar Contas →
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div
            onClick={() => setActiveTab('pagar')}
            className={`p-3 rounded-xl border cursor-pointer transition-all ${
              overduePayables > 0
                ? 'bg-rose-50/80 border-rose-300 hover:bg-rose-100'
                : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex justify-between items-center">
              <span className="font-semibold text-slate-700">Contas Vencidas:</span>
              <span
                className={`font-black text-sm ${
                  overduePayables > 0 ? 'text-rose-600' : 'text-slate-800'
                }`}
              >
                {formatCurrency(overduePayables)}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {overduePayables > 0
                ? 'Existem contas vencidas que precisam de atenção.'
                : 'Nenhuma conta vencida.'}
            </p>
          </div>

          <div
            onClick={() => setActiveTab('pagar')}
            className="p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 cursor-pointer transition-all"
          >
            <div className="flex justify-between items-center">
              <span className="font-semibold text-slate-700">Vencendo nos Próximos 7 Dias:</span>
              <span className="font-black text-sm text-slate-800">
                {formatCurrency(upcomingPayables)}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Previsão de saídas da semana
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
