import React, { useState, useMemo } from 'react';
import {
  Package,
  Truck,
  Wallet,
  AlertTriangle,
  CreditCard,
  Plus,
  ChevronRight,
  ArrowRight,
  Receipt,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { DailyRevenueChart, PaymentMixChart, TopProductsChart } from './DashboardCharts';
import { useErp } from '../context/ErpContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import { ActiveTab } from './Navbar';

interface DashboardViewProps {
  setActiveTab: (tab: ActiveTab) => void;
  onOpenNewSale: () => void;
}

type DatePeriod = 'hoje' | 'ontem' | '7dias' | 'este_mes' | 'mes_anterior' | 'custom';

export const DashboardView: React.FC<DashboardViewProps> = ({ setActiveTab, onOpenNewSale }) => {
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
    const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

    const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
    const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];

    return sales.filter((s) => {
      const sDate = s.createdAt.split('T')[0];

      if (period === 'hoje') return sDate === todayStr;
      if (period === 'ontem') return sDate === yesterdayStr;
      if (period === '7dias') return s.createdAt >= sevenDaysAgo.toISOString();
      if (period === 'este_mes') return sDate >= firstDayThisMonth;
      if (period === 'mes_anterior') return sDate >= firstDayLastMonth && sDate <= lastDayLastMonth;
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
  const pendingDeliveries = sales.filter((s) => s.type === 'delivery' && s.status === 'pendente').length;
  const onTheWayDeliveries = sales.filter((s) => s.type === 'delivery' && s.status === 'em_entrega').length;
  const waitingFinalizeDeliveries = sales.filter(
    (s) => s.type === 'delivery' && s.status === 'aguardando_finalizacao',
  ).length;

  // Cash calculations today
  const todayStr = new Date().toISOString().split('T')[0];
  const todayCashEntries = cashMovements
    .filter(
      (m) =>
        m.timestamp.startsWith(todayStr) &&
        (m.type === 'venda' || m.type === 'recebimento_fiado' || m.type === 'entrada' || m.type === 'suprimento'),
    )
    .reduce((sum, m) => sum + m.amount, 0);

  const todayCashExits = cashMovements
    .filter((m) => m.timestamp.startsWith(todayStr) && (m.type === 'saida' || m.type === 'sangria'))
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

  const { currentUser } = useAuth();
  const firstName = currentUser?.name.replace(/\s*\(.*?\)/g, '').split(' ')[0] || '';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  const todayLabel = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  const averageTicket = salesCount > 0 ? totalRevenue / salesCount : 0;
  const cashOpen = cashRegister?.status === 'aberto';

  const PERIODS = [
    { id: 'hoje', label: 'Hoje' },
    { id: 'ontem', label: 'Ontem' },
    { id: '7dias', label: '7 dias' },
    { id: 'este_mes', label: 'Este mês' },
    { id: 'mes_anterior', label: 'Mês anterior' },
    { id: 'custom', label: 'Período' },
  ] as const;

  const cylinderRows = products
    .filter((p) => p.isActive && p.isCylinder)
    .map((p) => {
      const item = stock[p.id];
      const full = item?.fullQuantity ?? 0;
      const empty = item?.emptyQuantity ?? 0;
      const min = p.minStock ?? 0;
      const scale = Math.max(full, empty, min * 2, 1);
      return { id: p.id, name: p.name, full, empty, min, low: min > 0 && full <= min, scale };
    });

  const alerts = [
    criticalStockCount > 0 && {
      key: 'estoque',
      tone: 'rose',
      icon: AlertTriangle,
      text: `${criticalStockCount} produto(s) com estoque abaixo do mínimo`,
      tab: 'estoque' as ActiveTab,
    },
    overdueReceivables > 0 && {
      key: 'fiado',
      tone: 'amber',
      icon: CreditCard,
      text: `${formatCurrency(overdueReceivables)} em fiado vencido`,
      tab: 'receber' as ActiveTab,
    },
    overduePayables > 0 && {
      key: 'pagar',
      tone: 'rose',
      icon: Receipt,
      text: `${formatCurrency(overduePayables)} em contas a pagar vencidas`,
      tab: 'pagar' as ActiveTab,
    },
  ].filter(Boolean) as { key: string; tone: 'rose' | 'amber'; icon: React.ElementType; text: string; tab: ActiveTab }[];

  const card = 'bg-white rounded-xl border border-slate-200';
  const linkBtn =
    'inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-900 rounded-md -mr-1 px-1 py-0.5';

  return (
    <div className="space-y-6 pb-12">
      {/* Cabeçalho */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500 first-letter:uppercase">{todayLabel}</p>
          <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-slate-900 mt-0.5">
            {greeting}
            {firstName ? `, ${firstName}` : ''}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('em_andamento')}
            className="h-10 px-3.5 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
          >
            <Truck className="w-4 h-4 text-slate-500" />
            <span>Entregas</span>
            {inProgressDeliveriesCount > 0 && (
              <span className="min-w-5 h-5 px-1.5 rounded-full bg-orange-600 text-white text-xs font-semibold flex items-center justify-center">
                {inProgressDeliveriesCount}
              </span>
            )}
          </button>
          <button
            onClick={onOpenNewSale}
            className="lg:hidden h-10 px-4 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" strokeWidth={2.5} />
            <span>Nova venda</span>
          </button>
        </div>
      </header>

      {/* Avisos */}
      {alerts.length > 0 && (
        <ul className={`${card} divide-y divide-slate-100 overflow-hidden`}>
          {alerts.map((a) => {
            const Icon = a.icon;
            return (
              <li key={a.key}>
                <button
                  onClick={() => setActiveTab(a.tab)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50"
                >
                  <span
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      a.tone === 'rose' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </span>
                  <span className="flex-1 text-sm text-slate-800">{a.text}</span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Resumo de vendas */}
      <section className={card}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-5 pt-4">
          <h2 className="text-base font-semibold text-slate-900">Resumo de vendas</h2>
          <div className="flex items-center gap-0.5 p-0.5 bg-slate-100 rounded-lg overflow-x-auto max-w-full">
            {PERIODS.map((item) => (
              <button
                key={item.id}
                onClick={() => setPeriod(item.id)}
                className={`h-8 px-3 rounded-md text-sm whitespace-nowrap transition-colors ${
                  period === item.id
                    ? 'bg-white text-slate-900 font-medium shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {period === 'custom' && (
          <div className="flex flex-wrap items-center gap-2 px-4 sm:px-5 pt-3">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              aria-label="Data inicial"
              className="h-9 text-sm border border-slate-300 rounded-lg px-2"
            />
            <span className="text-sm text-slate-400">até</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              aria-label="Data final"
              className="h-9 text-sm border border-slate-300 rounded-lg px-2"
            />
          </div>
        )}

        <dl className="grid grid-cols-2 lg:grid-cols-4 mt-4 border-t border-slate-100">
          {[
            {
              label: 'Faturamento',
              value: formatCurrency(totalRevenue),
              sub: `${salesCount} venda${salesCount === 1 ? '' : 's'} finalizada${salesCount === 1 ? '' : 's'}`,
            },
            {
              label: 'Lucro bruto',
              value: formatCurrency(grossProfit),
              sub: `Margem de ${profitMargin.toFixed(1).replace('.', ',')}%`,
              accent: grossProfit > 0 ? 'text-emerald-700' : undefined,
            },
            {
              label: 'Ticket médio',
              value: formatCurrency(averageTicket),
              sub: `Custo dos produtos ${formatCurrency(totalCost)}`,
            },
            {
              label: 'Fiado em aberto',
              value: formatCurrency(totalReceivables),
              sub: overdueReceivables > 0 ? `${formatCurrency(overdueReceivables)} vencido` : 'Nada vencido',
              onClick: () => setActiveTab('receber'),
            },
          ].map((m, i) => (
            <div
              key={m.label}
              onClick={m.onClick}
              className={`px-4 sm:px-5 py-4 ${i % 2 === 1 ? 'border-l border-slate-100' : ''} ${
                i >= 2 ? 'border-t lg:border-t-0 border-slate-100' : ''
              } ${i === 2 ? 'lg:border-l' : ''} ${m.onClick ? 'cursor-pointer hover:bg-slate-50' : ''}`}
            >
              <dt className="text-sm text-slate-500">{m.label}</dt>
              <dd
                className={`mt-1 text-xl sm:text-2xl font-semibold tracking-tight tabular-nums ${m.accent || 'text-slate-900'}`}
              >
                {m.value}
              </dd>
              <dd className="mt-0.5 text-xs text-slate-500">{m.sub}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Gráficos de vendas */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          <DailyRevenueChart sales={sales} />
        </div>
        <div className="lg:col-span-2">
          <PaymentMixChart sales={filteredSales} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Estoque de botijões */}
        <section className={`${card} lg:col-span-3`}>
          <div className="flex items-center justify-between px-4 sm:px-5 pt-4 pb-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Botijões</h2>
              <p className="text-sm text-slate-500 tabular-nums">
                {totalFullCylinders} cheios · {totalEmptyCylinders} vazios
              </p>
            </div>
            <button onClick={() => setActiveTab('estoque')} className={linkBtn}>
              Ver estoque <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {cylinderRows.length === 0 ? (
            <p className="px-5 pb-5 text-sm text-slate-500">Nenhum botijão cadastrado em Produtos.</p>
          ) : (
            <ul className="divide-y divide-slate-100 border-t border-slate-100">
              {cylinderRows.map((r) => (
                <li key={r.id} className="px-4 sm:px-5 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-slate-800 truncate">{r.name}</span>
                    {r.low && (
                      <span className="text-xs font-medium text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full shrink-0">
                        Abaixo do mínimo
                      </span>
                    )}
                  </div>
                  <div className="mt-2 grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1.5 text-xs text-slate-500">
                    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${r.low ? 'bg-rose-500' : 'bg-slate-800'}`}
                        style={{ width: `${Math.min(100, (r.full / r.scale) * 100)}%` }}
                      />
                    </div>
                    <span className="tabular-nums w-24 text-right">
                      <strong className="font-semibold text-slate-900">{r.full}</strong> cheios
                    </span>
                    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-slate-300"
                        style={{ width: `${Math.min(100, (r.empty / r.scale) * 100)}%` }}
                      />
                    </div>
                    <span className="tabular-nums w-24 text-right">
                      <strong className="font-semibold text-slate-900">{r.empty}</strong> vazios
                    </span>
                  </div>
                  {r.min > 0 && <p className="mt-1.5 text-xs text-slate-400">Mínimo: {r.min} cheios</p>}
                </li>
              ))}
            </ul>
          )}
          {otherProductsCount > 0 && (
            <button
              onClick={() => setActiveTab('produtos')}
              className="w-full text-left px-4 sm:px-5 py-3 border-t border-slate-100 text-sm text-slate-500 hover:bg-slate-50 rounded-b-xl"
            >
              + {otherProductsCount} outro(s) produto(s) (água, reguladores, mangueiras)
            </button>
          )}
        </section>

        <div className="lg:col-span-2 space-y-6">
          {/* Entregas */}
          <section className={card}>
            <div className="flex items-center justify-between px-4 sm:px-5 pt-4">
              <h2 className="text-base font-semibold text-slate-900">Entregas</h2>
              <button onClick={() => setActiveTab('em_andamento')} className={linkBtn}>
                Abrir <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <dl className="grid grid-cols-3 px-4 sm:px-5 py-4 gap-3">
              {[
                { label: 'Aguardando', value: pendingDeliveries },
                { label: 'Em rota', value: onTheWayDeliveries },
                { label: 'No cliente', value: waitingFinalizeDeliveries },
              ].map((d) => (
                <div key={d.label}>
                  <dt className="text-xs text-slate-500">{d.label}</dt>
                  <dd className="text-2xl font-semibold tabular-nums text-slate-900 mt-0.5">{d.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          {/* Caixa */}
          <section className={card}>
            <div className="flex items-center justify-between px-4 sm:px-5 pt-4">
              <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                Caixa
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    cashOpen ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {cashOpen ? 'Aberto' : 'Fechado'}
                </span>
              </h2>
              <button onClick={() => setActiveTab('caixa')} className={linkBtn}>
                {cashOpen ? 'Movimentar' : 'Abrir caixa'} <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <div className="px-4 sm:px-5 py-4">
              <p className="text-xs text-slate-500">Saldo atual</p>
              <p className="text-2xl font-semibold tracking-tight tabular-nums text-slate-900 mt-0.5">
                {formatCurrency(cashRegister?.currentBalance || 0)}
              </p>
              <dl className="mt-3 grid grid-cols-3 gap-3 text-xs">
                <div>
                  <dt className="text-slate-500">Abertura</dt>
                  <dd className="font-medium text-slate-800 tabular-nums mt-0.5">
                    {formatCurrency(cashRegister?.initialBalance || 0)}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Entradas hoje</dt>
                  <dd className="font-medium text-emerald-700 tabular-nums mt-0.5">
                    {formatCurrency(todayCashEntries)}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Saídas hoje</dt>
                  <dd className="font-medium text-rose-700 tabular-nums mt-0.5">{formatCurrency(todayCashExits)}</dd>
                </div>
              </dl>
            </div>
          </section>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <TopProductsChart sales={filteredSales} />

        {/* Contas */}
        <section className={card}>
          <div className="flex items-center justify-between px-4 sm:px-5 pt-4 pb-3">
            <h2 className="text-base font-semibold text-slate-900">Contas a pagar</h2>
            <button onClick={() => setActiveTab('pagar')} className={linkBtn}>
              Ver contas <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <dl className="grid grid-cols-2 border-t border-slate-100">
            <div className="px-4 sm:px-5 py-4">
              <dt className="text-sm text-slate-500">Vencidas</dt>
              <dd
                className={`mt-1 text-xl font-semibold tabular-nums ${overduePayables > 0 ? 'text-rose-600' : 'text-slate-900'}`}
              >
                {formatCurrency(overduePayables)}
              </dd>
            </div>
            <div className="px-4 sm:px-5 py-4 border-l border-slate-100">
              <dt className="text-sm text-slate-500">Próximos 7 dias</dt>
              <dd className="mt-1 text-xl font-semibold tabular-nums text-slate-900">
                {formatCurrency(upcomingPayables)}
              </dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  );
};
