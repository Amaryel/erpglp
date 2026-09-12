import React, { useState, useMemo } from 'react';
import {
  FileText,
  Calendar,
  DollarSign,
  TrendingUp,
  Package,
  Truck,
  Store,
  CreditCard,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Printer,
  Flame,
  CheckCircle2,
  AlertTriangle,
  PieChart,
  BarChart3,
  Download,
} from 'lucide-react';
import { useErp } from '../context/ErpContext';
import { formatCurrency, formatDate, formatPaymentMethod } from '../utils/formatters';

type Period = 'hoje' | 'ontem' | '7dias' | 'mes' | 'todos';
type ReportTab = 'geral' | 'vendas' | 'estoque' | 'financeiro' | 'dre';

export const ReportsView: React.FC = () => {
  const {
    sales,
    products,
    stock,
    expenses,
    payables,
    receivables,
    cashRegister,
    settings,
  } = useErp();

  const [period, setPeriod] = useState<Period>('mes');
  const [activeTab, setActiveTab] = useState<ReportTab>('geral');

  // Filter dates
  const { filteredSales, filteredExpenses, filteredPayables } = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const yesterdayStr = new Date(now.getTime() - 86400000).toISOString().split('T')[0];
    const sevenDaysAgoStr = new Date(now.getTime() - 7 * 86400000).toISOString().split('T')[0];
    const firstDayMonthStr = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split('T')[0];

    const matchDate = (dateIso: string) => {
      const d = dateIso.split('T')[0];
      if (period === 'hoje') return d === todayStr;
      if (period === 'ontem') return d === yesterdayStr;
      if (period === '7dias') return d >= sevenDaysAgoStr;
      if (period === 'mes') return d >= firstDayMonthStr;
      return true;
    };

    const s = sales.filter((x) => x.status === 'finalizada' && matchDate(x.createdAt));
    const e = expenses.filter((x) => matchDate(x.date));
    const p = payables.filter((x) => x.status === 'pago' && x.paidAt && matchDate(x.paidAt));

    return { filteredSales: s, filteredExpenses: e, filteredPayables: p };
  }, [sales, expenses, payables, period]);

  // 1. Vendas Metrics
  const salesMetrics = useMemo(() => {
    const totalRevenue = filteredSales.reduce((acc, s) => acc + s.totalAmount, 0);
    const totalCost = filteredSales.reduce((acc, s) => acc + s.totalCost, 0);
    const grossProfit = totalRevenue - totalCost;
    const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
    const count = filteredSales.length;
    const averageTicket = count > 0 ? totalRevenue / count : 0;

    // By type
    const balcaoSales = filteredSales.filter((s) => s.type === 'balcao');
    const deliverySales = filteredSales.filter((s) => s.type === 'entrega');
    const balcaoRevenue = balcaoSales.reduce((acc, s) => acc + s.totalAmount, 0);
    const deliveryRevenue = deliverySales.reduce((acc, s) => acc + s.totalAmount, 0);

    // By payment method
    const paymentsByMethod: Record<string, number> = {};
    filteredSales.forEach((s) => {
      s.payments.forEach((pm) => {
        paymentsByMethod[pm.method] = (paymentsByMethod[pm.method] || 0) + pm.amount;
      });
    });

    // Product ranking
    const prodStats: Record<string, { name: string; qty: number; revenue: number; cost: number; profit: number }> = {};
    filteredSales.forEach((s) => {
      s.items.forEach((item) => {
        if (!prodStats[item.productId]) {
          prodStats[item.productId] = {
            name: item.productName,
            qty: 0,
            revenue: 0,
            cost: 0,
            profit: 0,
          };
        }
        prodStats[item.productId].qty += item.quantity;
        prodStats[item.productId].revenue += item.totalPrice;
        prodStats[item.productId].cost += item.totalCost;
        prodStats[item.productId].profit += item.totalPrice - item.totalCost;
      });
    });
    const productRanking = Object.values(prodStats).sort((a, b) => b.revenue - a.revenue);

    // Cylinders
    const cylindersSent = filteredSales.reduce((acc, s) => acc + s.cylindersDispatched, 0);
    const cylindersRet = filteredSales.reduce((acc, s) => acc + s.cylindersReturned, 0);

    return {
      totalRevenue,
      totalCost,
      grossProfit,
      grossMargin,
      count,
      averageTicket,
      balcaoSalesCount: balcaoSales.length,
      balcaoRevenue,
      deliverySalesCount: deliverySales.length,
      deliveryRevenue,
      paymentsByMethod,
      productRanking,
      cylindersSent,
      cylindersRet,
    };
  }, [filteredSales]);

  // 2. Estoque Metrics (Real-time snapshot)
  const stockMetrics = useMemo(() => {
    let totalFull = 0;
    let totalEmpty = 0;
    let totalStockCost = 0;
    let totalStockSaleValue = 0;
    const items = products.map((p) => {
      const st = stock[p.id] || { full: 0, empty: 0, total: 0 };
      totalFull += st.full;
      totalEmpty += st.empty;
      totalStockCost += st.full * p.costPrice;
      totalStockSaleValue += st.full * p.sellPrice;
      const min = p.minStock ?? 10;
      const isCritical = st.full <= min / 2;
      const isLow = st.full <= min;

      return {
        product: p,
        full: st.full,
        empty: st.empty,
        total: st.full + st.empty,
        costValue: st.full * p.costPrice,
        saleValue: st.full * p.sellPrice,
        min,
        status: isCritical ? 'Crítico' : isLow ? 'Baixo' : 'Normal',
      };
    });

    return {
      totalFull,
      totalEmpty,
      totalStockCost,
      totalStockSaleValue,
      items,
    };
  }, [products, stock]);

  // 3. Financeiro & DRE Metrics
  const financialMetrics = useMemo(() => {
    // Operating expenses from both expenses table and paid payables (deduplicating if any)
    const expTotal = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    const netProfit = salesMetrics.grossProfit - expTotal;
    const netMargin = salesMetrics.totalRevenue > 0 ? (netProfit / salesMetrics.totalRevenue) * 100 : 0;

    // Receivables
    const totalReceivables = receivables
      .filter((r) => r.status === 'pendente')
      .reduce((sum, r) => sum + r.remainingAmount, 0);
    const todayStr = new Date().toISOString().split('T')[0];
    const overdueReceivables = receivables
      .filter((r) => r.status === 'pendente' && r.dueDate < todayStr)
      .reduce((sum, r) => sum + r.remainingAmount, 0);

    // Payables
    const totalPayables = payables
      .filter((p) => p.status === 'pendente')
      .reduce((sum, p) => sum + p.amount, 0);
    const overduePayables = payables
      .filter((p) => p.status === 'pendente' && p.dueDate < todayStr)
      .reduce((sum, p) => sum + p.amount, 0);

    return {
      expensesTotal: expTotal,
      netProfit,
      netMargin,
      totalReceivables,
      overdueReceivables,
      totalPayables,
      overduePayables,
      cashBalance: cashRegister?.currentBalance || 0,
      cashStatus: cashRegister?.status || 'fechado',
    };
  }, [filteredExpenses, salesMetrics, receivables, payables, cashRegister]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Header */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/15 flex items-center justify-center text-indigo-600">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-black text-slate-900">
              Relatórios Gerenciais & DRE
            </h1>
            <p className="text-xs text-slate-500">
              Dados consolidados em tempo real de vendas, estoque, fluxo de caixa e rentabilidade líquida
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Period Selector */}
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
            {(['hoje', 'ontem', '7dias', 'mes', 'todos'] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg transition-all capitalize ${
                  period === p ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {p === '7dias' ? '7 Dias' : p === 'mes' ? 'Este Mês' : p}
              </button>
            ))}
          </div>

          <button
            onClick={handlePrint}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
            title="Imprimir Relatório"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-100 p-1 rounded-2xl gap-1 text-xs font-bold overflow-x-auto">
        <button
          onClick={() => setActiveTab('geral')}
          className={`flex-1 py-2 px-3 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'geral' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
          }`}
        >
          Visão Geral Executiva
        </button>
        <button
          onClick={() => setActiveTab('vendas')}
          className={`flex-1 py-2 px-3 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'vendas' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
          }`}
        >
          Relatório de Vendas
        </button>
        <button
          onClick={() => setActiveTab('estoque')}
          className={`flex-1 py-2 px-3 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'estoque' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
          }`}
        >
          Estoque & Vasilhames
        </button>
        <button
          onClick={() => setActiveTab('financeiro')}
          className={`flex-1 py-2 px-3 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'financeiro' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
          }`}
        >
          Caixa & Contas
        </button>
        <button
          onClick={() => setActiveTab('dre')}
          className={`flex-1 py-2 px-3 rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'dre' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600'
          }`}
        >
          DRE & Lucro Real
        </button>
      </div>

      {/* TAB 1: VISÃO GERAL EXECUTIVA */}
      {activeTab === 'geral' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <p className="text-xs font-semibold text-slate-500">Faturamento Bruto</p>
              <p className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                {formatCurrency(salesMetrics.totalRevenue)}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                {salesMetrics.count} pedidos • Ticket Médio: {formatCurrency(salesMetrics.averageTicket)}
              </p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <p className="text-xs font-semibold text-slate-500">Lucro Bruto (CMV deduzido)</p>
              <p className="text-xl sm:text-2xl font-black text-emerald-700 mt-1">
                {formatCurrency(salesMetrics.grossProfit)}
              </p>
              <p className="text-[11px] font-bold text-emerald-600 mt-1">
                Margem Bruta: {salesMetrics.grossMargin.toFixed(1)}%
              </p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <p className="text-xs font-semibold text-slate-500">Despesas Operacionais</p>
              <p className="text-xl sm:text-2xl font-black text-rose-700 mt-1">
                - {formatCurrency(financialMetrics.expensesTotal)}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Custos fixos e variáveis do período
              </p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <p className="text-xs font-semibold text-slate-500">Lucro Líquido Real</p>
              <p
                className={`text-xl sm:text-2xl font-black mt-1 ${
                  financialMetrics.netProfit >= 0 ? 'text-emerald-800' : 'text-rose-700'
                }`}
              >
                {formatCurrency(financialMetrics.netProfit)}
              </p>
              <p className="text-[11px] font-bold text-slate-600 mt-1">
                Margem Líquida: {financialMetrics.netMargin.toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Quick highlights grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Vendas por canal */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <h3 className="font-black text-sm text-slate-900 flex items-center justify-between">
                <span>Vendas por Canal</span>
                <span className="text-xs font-normal text-slate-400">{period}</span>
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-amber-50 p-3 rounded-xl border border-amber-200">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                    <Truck className="w-4 h-4 text-amber-600" />
                    Delivery
                  </div>
                  <p className="text-lg font-black text-slate-900 mt-1">
                    {formatCurrency(salesMetrics.deliveryRevenue)}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {salesMetrics.deliverySalesCount} entregas
                  </p>
                </div>

                <div className="bg-blue-50 p-3 rounded-xl border border-blue-200">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
                    <Store className="w-4 h-4 text-blue-600" />
                    Balcão
                  </div>
                  <p className="text-lg font-black text-slate-900 mt-1">
                    {formatCurrency(salesMetrics.balcaoRevenue)}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {salesMetrics.balcaoSalesCount} vendas na portaria
                  </p>
                </div>
              </div>
            </div>

            {/* Posição do Estoque Snapshot */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <h3 className="font-black text-sm text-slate-900 flex items-center justify-between">
                <span>Posição Geral dos Vasilhames</span>
                <span className="text-xs font-normal text-slate-400">Total: {stockMetrics.totalFull + stockMetrics.totalEmpty}</span>
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                  <p className="text-xs font-bold text-emerald-900">Botijões Cheios (Prontos)</p>
                  <p className="text-lg font-black text-emerald-800 mt-1">
                    {stockMetrics.totalFull} un
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Valor a Custo: {formatCurrency(stockMetrics.totalStockCost)}
                  </p>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <p className="text-xs font-bold text-slate-700">Botijões Vazios (Pátio)</p>
                  <p className="text-lg font-black text-slate-800 mt-1">
                    {stockMetrics.totalEmpty} un
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Prontos para troca/reposição
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: RELATÓRIO DE VENDAS */}
      {activeTab === 'vendas' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h3 className="text-sm font-black text-slate-900">
              Produtos Mais Vendidos no Período
            </h3>
            <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">Produto</th>
                    <th className="p-2.5 text-center">Qtd Vendida</th>
                    <th className="p-2.5 text-right">Faturamento</th>
                    <th className="p-2.5 text-right">Custo Total</th>
                    <th className="p-2.5 text-right">Lucro Bruto</th>
                    <th className="p-2.5 text-right">Margem %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {salesMetrics.productRanking.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-slate-400">
                        Nenhuma venda registrada no período selecionado.
                      </td>
                    </tr>
                  ) : (
                    salesMetrics.productRanking.map((p, idx) => {
                      const m = p.revenue > 0 ? (p.profit / p.revenue) * 100 : 0;
                      return (
                        <tr key={idx} className="hover:bg-slate-50/60">
                          <td className="p-2.5 font-bold text-slate-900">{p.name}</td>
                          <td className="p-2.5 text-center font-bold text-slate-700">{p.qty} un</td>
                          <td className="p-2.5 text-right font-black text-slate-900">
                            {formatCurrency(p.revenue)}
                          </td>
                          <td className="p-2.5 text-right text-slate-500">
                            {formatCurrency(p.cost)}
                          </td>
                          <td className="p-2.5 text-right font-black text-emerald-700">
                            {formatCurrency(p.profit)}
                          </td>
                          <td className="p-2.5 text-right font-bold text-slate-600">
                            {m.toFixed(1)}%
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Formas de pagamento */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h3 className="text-sm font-black text-slate-900">
              Recebimentos por Forma de Pagamento
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {(Object.entries(salesMetrics.paymentsByMethod) as [string, number][]).map(([method, val]) => (
                <div key={method} className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <p className="text-xs font-semibold text-slate-600">
                    {formatPaymentMethod(method)}
                  </p>
                  <p className="text-base font-black text-slate-900 mt-1">
                    {formatCurrency(val)}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {salesMetrics.totalRevenue > 0
                      ? ((val / salesMetrics.totalRevenue) * 100).toFixed(1)
                      : 0}
                    % do total
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ESTOQUE & VASILHAMES */}
      {activeTab === 'estoque' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h3 className="text-sm font-black text-slate-900">
              Posição Atual de Botijões por Produto
            </h3>
            <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">Item</th>
                    <th className="p-2.5 text-center">Cheios</th>
                    <th className="p-2.5 text-center">Vazios</th>
                    <th className="p-2.5 text-center">Total Vasilhames</th>
                    <th className="p-2.5 text-right">Valor em Custo</th>
                    <th className="p-2.5 text-right">Potencial Venda</th>
                    <th className="p-2.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stockMetrics.items.map((it) => (
                    <tr key={it.product.id} className="hover:bg-slate-50/60">
                      <td className="p-2.5 font-bold text-slate-900">
                        {it.product.name}
                        <span className="text-[10px] text-slate-400 block">
                          Mínimo: {it.min} un
                        </span>
                      </td>
                      <td className="p-2.5 text-center font-black text-emerald-700">
                        {it.full}
                      </td>
                      <td className="p-2.5 text-center font-bold text-slate-600">
                        {it.empty}
                      </td>
                      <td className="p-2.5 text-center font-bold text-slate-900">
                        {it.total}
                      </td>
                      <td className="p-2.5 text-right text-slate-600">
                        {formatCurrency(it.costValue)}
                      </td>
                      <td className="p-2.5 text-right font-black text-slate-900">
                        {formatCurrency(it.saleValue)}
                      </td>
                      <td className="p-2.5 text-center">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            it.status === 'Crítico'
                              ? 'bg-red-100 text-red-800'
                              : it.status === 'Baixo'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {it.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: FINANCEIRO, CAIXA & CONTAS */}
      {activeTab === 'financeiro' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Caixa Físico */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <p className="text-xs font-bold text-slate-500">Caixa Físico do Dia</p>
              <p className="text-2xl font-black text-slate-900">
                {formatCurrency(financialMetrics.cashBalance)}
              </p>
              <p className="text-xs">
                Status:{' '}
                <strong
                  className={
                    financialMetrics.cashStatus === 'aberto' ? 'text-emerald-700' : 'text-slate-500'
                  }
                >
                  {financialMetrics.cashStatus.toUpperCase()}
                </strong>
              </p>
            </div>

            {/* Contas a Receber (Fiados) */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <p className="text-xs font-bold text-slate-500">Contas a Receber (Fiados)</p>
              <p className="text-2xl font-black text-amber-700">
                {formatCurrency(financialMetrics.totalReceivables)}
              </p>
              {financialMetrics.overdueReceivables > 0 && (
                <p className="text-xs text-red-600 font-bold">
                  {formatCurrency(financialMetrics.overdueReceivables)} vencidos
                </p>
              )}
            </div>

            {/* Contas a Pagar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <p className="text-xs font-bold text-slate-500">Contas a Pagar Pendentes</p>
              <p className="text-2xl font-black text-rose-700">
                {formatCurrency(financialMetrics.totalPayables)}
              </p>
              {financialMetrics.overduePayables > 0 && (
                <p className="text-xs text-red-600 font-bold">
                  {formatCurrency(financialMetrics.overduePayables)} vencidas
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: DRE REAL */}
      {activeTab === 'dre' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 max-w-2xl mx-auto">
          <div className="border-b border-slate-200 pb-3 text-center">
            <h2 className="text-base font-black text-slate-900">
              Demonstrativo do Resultado do Exercício (DRE)
            </h2>
            <p className="text-xs text-slate-500">
              Período selecionado: <strong className="capitalize">{period}</strong>
            </p>
          </div>

          <div className="space-y-2 text-xs divide-y divide-slate-100">
            <div className="flex justify-between py-2 font-bold text-slate-900 text-sm">
              <span>(+) Receita Bruta de Vendas</span>
              <span className="text-slate-900 font-black">
                {formatCurrency(salesMetrics.totalRevenue)}
              </span>
            </div>

            <div className="flex justify-between py-2 text-slate-600">
              <span>(-) Custo das Mercadorias Vendidas (CMV)</span>
              <span className="text-rose-700 font-bold">
                - {formatCurrency(salesMetrics.totalCost)}
              </span>
            </div>

            <div className="flex justify-between py-2 bg-emerald-50/70 px-2 rounded-xl font-black text-emerald-900 text-sm">
              <span>(=) Lucro Bruto</span>
              <span>{formatCurrency(salesMetrics.grossProfit)}</span>
            </div>

            <div className="flex justify-between py-2 text-slate-600">
              <span>(-) Despesas Operacionais (Saídas)</span>
              <span className="text-rose-700 font-bold">
                - {formatCurrency(financialMetrics.expensesTotal)}
              </span>
            </div>

            <div
              className={`flex justify-between py-3 px-3 rounded-xl font-black text-base ${
                financialMetrics.netProfit >= 0
                  ? 'bg-emerald-100 text-emerald-900'
                  : 'bg-rose-100 text-rose-900'
              }`}
            >
              <span>(=) Resultado Líquido Real</span>
              <span>{formatCurrency(financialMetrics.netProfit)}</span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Margem Bruta sobre Vendas:</span>
              <span className="font-bold text-slate-800">{salesMetrics.grossMargin.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Margem Líquida Real:</span>
              <span className="font-bold text-slate-800">{financialMetrics.netMargin.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
