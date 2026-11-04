import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  DollarSign,
  PieChart,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Download,
  Info,
} from 'lucide-react';
import { useErp } from '../context/ErpContext';
import { formatCurrency, formatDate } from '../utils/formatters';

type PeriodFilter = 'hoje' | 'ontem' | '7dias' | 'este_mes' | 'mes_anterior' | 'custom';

export const ProfitView: React.FC = () => {
  const { sales, payables, expenses } = useErp();

  const [period, setPeriod] = useState<PeriodFilter>('este_mes');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // Date calculations
  const filteredSales = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const yesterdayStr = new Date(now.getTime() - 86400000).toISOString().split('T')[0];
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
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
      if (s.status !== 'finalizada') return false;
      const sDate = s.createdAt.split('T')[0];

      if (period === 'hoje') return sDate === todayStr;
      if (period === 'ontem') return sDate === yesterdayStr;
      if (period === '7dias') return s.createdAt >= sevenDaysAgo;
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

  // Financial calculations
  const totalRevenue = filteredSales.reduce((acc, s) => acc + s.totalAmount, 0);
  const totalCMV = filteredSales.reduce((acc, s) => acc + s.totalCost, 0);
  const grossProfit = totalRevenue - totalCMV;
  const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

  // Paid operating expenses in period
  const operatingExpenses = payables
    .filter((p) => p.status === 'pago' && p.paidAt)
    .reduce((acc, p) => acc + p.amount, 0);

  const netProfit = grossProfit - operatingExpenses;
  const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  // Export report to CSV
  const handleExportCSV = () => {
    const rows = [
      ['Numero Venda', 'Data', 'Cliente', 'Tipo', 'Valor Venda (R$)', 'Custo CMV (R$)', 'Lucro Bruto (R$)'],
      ...filteredSales.map((s) => [
        s.saleNumber,
        formatDate(s.createdAt),
        s.clientName || 'Balcao',
        s.type,
        s.totalAmount.toFixed(2),
        s.totalCost.toFixed(2),
        s.grossProfit.toFixed(2),
      ]),
    ];

    const csvContent =
      'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(';')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `relatorio_lucro_erpglp_${period}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div className="flex items-center gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Resultados
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Faturamento, custos e lucro por período.
            </p>
          </div>
        </div>

        <button
          onClick={handleExportCSV}
          disabled={filteredSales.length === 0}
          className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs px-3.5 py-2 rounded-xl border border-slate-200 flex items-center gap-1.5 transition-colors disabled:opacity-50"
        >
          <Download className="w-4 h-4 text-slate-600" />
          <span>Exportar Relatório CSV</span>
        </button>
      </div>

      {/* Date Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-white p-2.5 rounded-xl border border-slate-200">
        <span className="text-xs font-bold text-slate-500 pl-1">
          Filtrar Período:
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
                  ? 'bg-emerald-600 text-white shadow-xs'
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

      {/* DRE Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        {/* Faturamento */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 block mb-1">
            Faturamento Bruto
          </span>
          <div className="text-xl sm:text-2xl font-black text-slate-900">
            {formatCurrency(totalRevenue)}
          </div>
          <span className="text-[10px] text-slate-400">
            {filteredSales.length} vendas finalizadas
          </span>
        </div>

        {/* CMV */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 block mb-1">
            Custo das Mercadorias (CMV)
          </span>
          <div className="text-xl sm:text-2xl font-black text-slate-700">
            {formatCurrency(totalCMV)}
          </div>
          <span className="text-[10px] text-slate-400">
            Custo gravado na venda
          </span>
        </div>

        {/* Lucro Bruto */}
        <div className="bg-emerald-50/80 p-4 rounded-2xl border border-emerald-300 shadow-xs">
          <span className="text-xs font-bold text-emerald-950 block mb-1">
            Lucro Bruto
          </span>
          <div className="text-xl sm:text-2xl font-black text-emerald-800">
            {formatCurrency(grossProfit)}
          </div>
          <span className="text-[10px] font-bold text-emerald-700">
            Margem Bruta: {grossMargin.toFixed(1)}%
          </span>
        </div>

        {/* Lucro Líquido Estimado */}
        <div className="bg-teal-50/80 p-4 rounded-2xl border border-teal-300 shadow-xs">
          <span className="text-xs font-bold text-teal-950 block mb-1">
            Resultado Líquido Estimado
          </span>
          <div className="text-xl sm:text-2xl font-black text-teal-800">
            {formatCurrency(netProfit)}
          </div>
          <span className="text-[10px] font-bold text-teal-700">
            Despesas: {formatCurrency(operatingExpenses)}
          </span>
        </div>
      </div>

      {/* Business Rule Explanation Banner (Requirements #26) */}
      <div className="bg-blue-50/80 border border-blue-200 rounded-2xl p-4 text-xs text-blue-950 space-y-1">
        <div className="flex items-center gap-1.5 font-bold text-blue-900">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          <span>Regra de Ouro ErpGLP: Histórico Imutável de Custos</span>
        </div>
        <p className="text-blue-800">
          Se o valor do custo do botijão na distribuidora subir hoje, as vendas passadas NÃO são recalculadas. O ErpGLP preserva o custo unitário histórico de cada item no instante exato da venda, garantindo fidelidade contábil e tributária total.
        </p>
      </div>

      {/* Sales Profit Breakdown List */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">
            Vendas do Período & Análise de Margem
          </h3>
          <span className="text-xs text-slate-500">
            {filteredSales.length} vendas analisadas
          </span>
        </div>

        <div className="divide-y divide-slate-100 overflow-x-auto">
          {filteredSales.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Nenhuma venda finalizada no período selecionado.
            </div>
          ) : (
            filteredSales.map((sale) => {
              const saleMargin =
                sale.totalAmount > 0
                  ? (sale.grossProfit / sale.totalAmount) * 100
                  : 0;

              return (
                <div
                  key={sale.id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">
                        #{sale.saleNumber}
                      </span>
                      <span className="text-slate-600 font-medium">
                        {sale.clientName || 'Venda Balcão'}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                        {sale.type === 'delivery' ? 'Delivery' : 'Balcão'}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {sale.items
                        .map((i) => `${i.quantity}x ${i.productName} (Custo un: ${formatCurrency(i.unitCost)})`)
                        .join(', ')}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Venda:</span>
                      <span className="font-bold text-slate-900">
                        {formatCurrency(sale.totalAmount)}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block">Custo (CMV):</span>
                      <span className="font-semibold text-slate-600">
                        {formatCurrency(sale.totalCost)}
                      </span>
                    </div>

                    <div className="bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200 text-center">
                      <span className="text-[10px] text-emerald-800 font-bold block">
                        Lucro Bruto:
                      </span>
                      <span className="font-black text-emerald-900">
                        {formatCurrency(sale.grossProfit)}
                      </span>
                      <span className="text-[9px] text-emerald-700 block">
                        {saleMargin.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
