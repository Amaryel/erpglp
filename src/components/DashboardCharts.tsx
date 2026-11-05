import React, { useMemo, useState } from 'react';
import { Sale, PaymentMethod } from '../types';
import { formatCurrency } from '../utils/formatters';
import { PAYMENT_LABELS, normalizePayments } from '../lib/payments';

const card = 'bg-white rounded-xl border border-slate-200';
const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const shortMoney = (v: number) =>
  v >= 1000 ? `R$ ${(v / 1000).toFixed(v >= 10000 ? 0 : 1).replace('.', ',')} mil` : formatCurrency(v);

/** Faturamento por dia (vendas finalizadas), últimos N dias. */
export const DailyRevenueChart: React.FC<{ sales: Sale[]; days?: number }> = ({ sales, days = 14 }) => {
  const [hover, setHover] = useState<number | null>(null);

  const data = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const buckets = Array.from({ length: days }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (days - 1 - i));
      return { date: d, key: dayKey(d), total: 0, count: 0 };
    });
    const index = new Map(buckets.map((b, i) => [b.key, i]));
    for (const s of sales) {
      if (s.status !== 'finalizada') continue;
      const d = new Date(s.finalizedAt || s.createdAt);
      const i = index.get(dayKey(d));
      if (i === undefined) continue;
      buckets[i].total += s.totalAmount;
      buckets[i].count += 1;
    }
    return buckets;
  }, [sales, days]);

  const max = Math.max(...data.map((d) => d.total), 1);
  const niceMax = (() => {
    const pow = Math.pow(10, Math.floor(Math.log10(max)));
    return Math.ceil(max / pow) * pow;
  })();
  const total = data.reduce((s, d) => s + d.total, 0);
  const average = total / days;
  const active = hover !== null ? data[hover] : null;

  return (
    <section className={`${card} p-4 sm:p-5 h-full flex flex-col`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Faturamento por dia</h2>
          <p className="text-sm text-slate-500">Últimos {days} dias · vendas finalizadas</p>
        </div>
        <div className="sm:text-right">
          <p className="text-xl font-semibold tabular-nums text-slate-900">{formatCurrency(total)}</p>
          <p className="text-xs text-slate-500 tabular-nums">média de {formatCurrency(average)}/dia</p>
        </div>
      </div>

      <div className="relative mt-5 flex-1 flex flex-col justify-end">
        {/* Linhas de grade discretas */}
        <div
          className="absolute inset-x-0 top-0 bottom-6 flex flex-col justify-between pointer-events-none"
          aria-hidden="true"
        >
          {[niceMax, niceMax / 2, 0].map((v) => (
            <div key={v} className="flex items-center gap-2">
              <span className="w-14 shrink-0 text-[10px] text-slate-400 tabular-nums text-right">{shortMoney(v)}</span>
              <span className="flex-1 border-t border-dashed border-slate-200" />
            </div>
          ))}
        </div>

        <div
          className="relative pl-16 h-48 flex items-end gap-[3px] sm:gap-1.5"
          role="list"
          aria-label="Faturamento por dia"
        >
          {data.map((d, i) => {
            const isToday = i === data.length - 1;
            const h = (d.total / niceMax) * 100;
            const label = d.date.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' });
            return (
              <button
                key={d.key}
                type="button"
                role="listitem"
                aria-label={`${label}: ${formatCurrency(d.total)}, ${d.count} venda(s)`}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                onClick={() => setHover(hover === i ? null : i)}
                className="flex-1 h-full flex flex-col justify-end items-center group pb-6 relative outline-none"
              >
                <span
                  className={`w-full max-w-7 rounded-t-[4px] transition-colors ${
                    isToday
                      ? 'bg-orange-600'
                      : hover === i
                        ? 'bg-orange-500'
                        : 'bg-orange-300 group-hover:bg-orange-400'
                  } ${d.total === 0 ? 'bg-slate-200!' : ''}`}
                  style={{ height: d.total > 0 ? `max(${h}%, 3px)` : '2px' }}
                />
                <span
                  className={`absolute bottom-0 text-[10px] tabular-nums ${
                    isToday ? 'text-slate-900 font-semibold' : 'text-slate-400'
                  } ${i % 2 === (data.length - 1) % 2 ? '' : 'hidden sm:block'}`}
                >
                  {d.date.getDate()}
                </span>
              </button>
            );
          })}
        </div>

        {active && hover !== null && (
          <div
            className="absolute -top-2 z-10 pointer-events-none bg-slate-900 text-white rounded-lg px-3 py-2 text-xs shadow-lg"
            style={{
              left: `calc(4rem + (100% - 4rem) * ${(hover + 0.5) / data.length})`,
              transform: `translateX(${hover > data.length * 0.6 ? '-100%' : hover < data.length * 0.3 ? '0%' : '-50%'})`,
            }}
          >
            <div className="text-slate-300 capitalize">
              {active.date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' })}
            </div>
            <div className="font-semibold tabular-nums">{formatCurrency(active.total)}</div>
            <div className="text-slate-300">{active.count} venda(s)</div>
          </div>
        )}
      </div>
    </section>
  );
};

/** Quanto entrou por forma de pagamento no período (barras com rótulo direto). */
export const PaymentMixChart: React.FC<{ sales: Sale[] }> = ({ sales }) => {
  const { rows, total, balcao, delivery } = useMemo(() => {
    const sums = new Map<PaymentMethod, number>();
    let b = 0;
    let d = 0;
    for (const s of sales) {
      if (s.status !== 'finalizada') continue;
      if (s.type === 'balcao') b += 1;
      else d += 1;
      for (const p of normalizePayments(s.payments || [])) sums.set(p.method, (sums.get(p.method) || 0) + p.amount);
    }
    const t = [...sums.values()].reduce((a, v) => a + v, 0);
    const r = [...sums.entries()].map(([method, amount]) => ({ method, amount })).sort((x, y) => y.amount - x.amount);
    return { rows: r, total: t, balcao: b, delivery: d };
  }, [sales]);

  return (
    <section className={`${card} p-4 sm:p-5 h-full flex flex-col`}>
      <h2 className="text-base font-semibold text-slate-900">Formas de pagamento</h2>
      <p className="text-sm text-slate-500">No período selecionado</p>

      {rows.length === 0 ? (
        <p className="flex-1 flex items-center justify-center text-sm text-slate-400 py-10">Sem vendas no período.</p>
      ) : (
        <ul className="mt-4 mb-5 space-y-3.5">
          {rows.map((r) => {
            const pct = total > 0 ? (r.amount / total) * 100 : 0;
            return (
              <li key={r.method} title={`${PAYMENT_LABELS[r.method]}: ${formatCurrency(r.amount)}`}>
                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-slate-700">{PAYMENT_LABELS[r.method]}</span>
                  <span className="tabular-nums">
                    <span className="font-semibold text-slate-900">{formatCurrency(r.amount)}</span>
                    <span className="text-slate-400 ml-2 text-xs">{pct.toFixed(0)}%</span>
                  </span>
                </div>
                <div className="mt-1.5 h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${r.method === 'fiado' ? 'bg-amber-500' : 'bg-slate-800'}`}
                    style={{ width: `${Math.max(pct, 1.5)}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-auto pt-4 grid grid-cols-2 gap-3 border-t border-slate-100">
        <div>
          <p className="text-xs text-slate-500">Balcão</p>
          <p className="text-lg font-semibold tabular-nums text-slate-900">{balcao}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Delivery</p>
          <p className="text-lg font-semibold tabular-nums text-slate-900">{delivery}</p>
        </div>
      </div>
    </section>
  );
};

/** Produtos mais vendidos no período, por quantidade. */
export const TopProductsChart: React.FC<{ sales: Sale[]; limit?: number }> = ({ sales, limit = 5 }) => {
  const rows = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; revenue: number }>();
    for (const s of sales) {
      if (s.status !== 'finalizada') continue;
      for (const it of s.items) {
        const cur = map.get(it.productId) || { name: it.productName, qty: 0, revenue: 0 };
        cur.qty += it.quantity;
        cur.revenue += it.total;
        map.set(it.productId, cur);
      }
    }
    return [...map.values()].sort((a, b) => b.qty - a.qty).slice(0, limit);
  }, [sales, limit]);
  const max = Math.max(...rows.map((r) => r.qty), 1);

  return (
    <section className={`${card} p-4 sm:p-5 h-full flex flex-col`}>
      <h2 className="text-base font-semibold text-slate-900">Mais vendidos</h2>
      <p className="text-sm text-slate-500">Quantidade no período selecionado</p>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-400 py-10 text-center">Sem vendas no período.</p>
      ) : (
        <ol className="mt-4 space-y-3">
          {rows.map((r, i) => (
            <li key={r.name} className="grid grid-cols-[1.25rem_1fr_auto] items-center gap-x-3 gap-y-1.5">
              <span className="text-xs font-semibold text-slate-400 tabular-nums">{i + 1}</span>
              <span className="text-sm text-slate-800 truncate">{r.name}</span>
              <span className="text-sm font-semibold tabular-nums text-slate-900">{r.qty}</span>
              <span />
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={`h-full rounded-full ${i === 0 ? 'bg-orange-600' : 'bg-orange-300'}`}
                  style={{ width: `${(r.qty / max) * 100}%` }}
                />
              </div>
              <span className="text-xs text-slate-500 tabular-nums">{formatCurrency(r.revenue)}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
};
