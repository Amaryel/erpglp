import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, RefreshCw, Search, ShieldCheck, X } from 'lucide-react';
import { useErp } from '../context/ErpContext';
import { getSupabaseClient, mapDbAuditLog } from '../lib/supabase';
import { AuditLog } from '../types';
import { userInitials } from './Navbar';

type Period = 'hoje' | '7d' | '30d' | '90d';

const PERIODS: { id: Period; label: string; days: number }[] = [
  { id: 'hoje', label: 'Hoje', days: 0 },
  { id: '7d', label: '7 dias', days: 7 },
  { id: '30d', label: '30 dias', days: 30 },
  { id: '90d', label: '90 dias', days: 90 },
];

const CATEGORY_LABELS: Record<string, string> = {
  venda: 'Vendas',
  caixa: 'Caixa',
  estoque: 'Estoque',
  financeiro: 'Financeiro',
  cliente: 'Cadastros',
  ajuste: 'Ajustes',
  cancelamento: 'Cancelamentos',
  sistema: 'Sistema',
};

/** Ações que merecem conferência (cancelamentos, exclusões, ajustes, diferenças). */
const ATTENTION = /cancel|exclu|apag|ajust|diverg|diferen|estorn|inativ|sangria|não retorn|nao retorn|não devolv/i;

const NO_USER = '(sem usuário)';

function periodStart(p: Period): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - (PERIODS.find((x) => x.id === p)?.days || 0));
  return d;
}

const detailsText = (log: AuditLog) =>
  typeof log.details === 'string' ? log.details : log.details ? JSON.stringify(log.details) : log.description || '';

const dayLabel = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Hoje';
  if (d.toDateString() === yesterday.toDateString()) return 'Ontem';
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
};

/**
 * Histórico de ações (somente Superadmin): quem fez o quê e quando.
 * O nome do usuário é gravado pelo servidor, não pode ser alterado pelo aparelho.
 */
export const AuditView: React.FC = () => {
  const { auditLogs: localLogs } = useErp();
  const [period, setPeriod] = useState<Period>('7d');
  const [userFilter, setUserFilter] = useState('todos');
  const [categoryFilter, setCategoryFilter] = useState('todas');
  const [onlyAttention, setOnlyAttention] = useState(false);
  const [search, setSearch] = useState('');
  const [remoteLogs, setRemoteLogs] = useState<AuditLog[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const client = getSupabaseClient();
    if (!client) return;
    setLoading(true);
    setLoadError(null);
    const { data, error } = await client
      .from('audit_logs')
      .select('*')
      .gte('timestamp', periodStart(period).toISOString())
      .order('timestamp', { ascending: false })
      .limit(2000);
    setLoading(false);
    if (error) {
      setLoadError('Não foi possível carregar o histórico do servidor. Mostrando o que está salvo neste aparelho.');
      return;
    }
    setRemoteLogs((data || []).map(mapDbAuditLog));
  }, [period]);

  useEffect(() => {
    load();
  }, [load]);

  // Servidor + lançamentos deste aparelho que ainda não subiram
  const logs = useMemo(() => {
    const start = periodStart(period).getTime();
    const byId = new Map<string, AuditLog>();
    for (const l of remoteLogs || []) byId.set(l.id, l);
    for (const l of localLogs) {
      if (!byId.has(l.id) && new Date(l.timestamp).getTime() >= start) byId.set(l.id, l);
    }
    return [...byId.values()].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }, [remoteLogs, localLogs, period]);

  const users = useMemo(() => {
    const map = new Map<string, { name: string; total: number; attention: number; last: string }>();
    for (const l of logs) {
      const name = l.userName || NO_USER;
      const cur = map.get(name) || { name, total: 0, attention: 0, last: l.timestamp };
      cur.total += 1;
      if (ATTENTION.test(`${l.action} ${detailsText(l)}`)) cur.attention += 1;
      if (l.timestamp > cur.last) cur.last = l.timestamp;
      map.set(name, cur);
    }
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [logs]);

  const categories = useMemo(() => [...new Set(logs.map((l) => l.category).filter(Boolean))], [logs]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return logs.filter((l) => {
      if (userFilter !== 'todos' && (l.userName || NO_USER) !== userFilter) return false;
      if (categoryFilter !== 'todas' && l.category !== categoryFilter) return false;
      const text = `${l.action} ${detailsText(l)}`;
      if (onlyAttention && !ATTENTION.test(text)) return false;
      if (term && !`${text} ${l.userName || ''}`.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [logs, userFilter, categoryFilter, onlyAttention, search]);

  const groups = useMemo(() => {
    const out: { label: string; items: AuditLog[] }[] = [];
    for (const l of filtered) {
      const label = dayLabel(l.timestamp);
      if (out.length === 0 || out[out.length - 1].label !== label) out.push({ label, items: [] });
      out[out.length - 1].items.push(l);
    }
    return out;
  }, [filtered]);

  const hasFilters = userFilter !== 'todos' || categoryFilter !== 'todas' || onlyAttention || search.trim() !== '';
  const clearFilters = () => {
    setUserFilter('todos');
    setCategoryFilter('todas');
    setOnlyAttention(false);
    setSearch('');
  };

  const card = 'bg-white rounded-xl border border-slate-200';
  const select = 'h-10 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-sm text-slate-800';

  return (
    <div className="space-y-5 pb-12">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            Histórico de ações
            <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Só Superadmin
            </span>
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Quem fez cada lançamento, alteração e cancelamento no sistema.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 p-0.5 bg-slate-100 rounded-lg">
            {PERIODS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPeriod(p.id)}
                aria-pressed={period === p.id}
                className={`h-8 px-3 rounded-md text-sm whitespace-nowrap ${
                  period === p.id ? 'bg-white text-slate-900 font-medium shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            aria-label="Atualizar histórico"
            title="Atualizar"
            className="w-9 h-9 rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 flex items-center justify-center disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      {loadError && (
        <p role="status" className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          {loadError}
        </p>
      )}

      {/* Resumo por usuário */}
      <section className={card} aria-label="Ações por usuário">
        <h2 className="px-4 sm:px-5 pt-4 text-base font-semibold text-slate-900">Por usuário</h2>
        {users.length === 0 ? (
          <p className="px-5 py-6 text-sm text-slate-500">Nenhuma ação registrada no período.</p>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-px bg-slate-100 border-t border-slate-100 mt-3 rounded-b-xl overflow-hidden">
            {users.map((u) => {
              const active = userFilter === u.name;
              return (
                <li key={u.name} className="bg-white">
                  <button
                    type="button"
                    onClick={() => setUserFilter(active ? 'todos' : u.name)}
                    aria-pressed={active}
                    className={`w-full flex items-center gap-3 px-4 sm:px-5 py-3 text-left transition-colors ${
                      active ? 'bg-orange-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <span className="w-9 h-9 rounded-full bg-slate-900 text-white text-xs font-semibold flex items-center justify-center shrink-0">
                      {u.name === NO_USER ? '?' : userInitials(u.name)}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-medium text-slate-900 truncate">{u.name}</span>
                      <span className="block text-xs text-slate-500">
                        Última ação{' '}
                        {new Date(u.last).toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </span>
                    <span className="text-right shrink-0">
                      <span className="block text-sm font-semibold tabular-nums text-slate-900">{u.total}</span>
                      {u.attention > 0 ? (
                        <span className="block text-xs font-medium text-amber-700 tabular-nums">{u.attention} p/ conferir</span>
                      ) : (
                        <span className="block text-xs text-slate-400">ações</span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Filtros */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_200px_200px_auto] gap-2 items-center">
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar: venda #1003, cliente, produto…"
            aria-label="Buscar no histórico"
            className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm"
          />
        </div>
        <select value={userFilter} onChange={(e) => setUserFilter(e.target.value)} aria-label="Usuário" className={select}>
          <option value="todos">Todos os usuários</option>
          {users.map((u) => (
            <option key={u.name} value={u.name}>
              {u.name}
            </option>
          ))}
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          aria-label="Tipo de ação"
          className={select}
        >
          <option value="todas">Todos os tipos</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c] || c}
            </option>
          ))}
        </select>
        <label className="h-10 flex items-center gap-2 px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-700 cursor-pointer select-none sm:col-span-2 lg:col-span-1">
          <input
            type="checkbox"
            checked={onlyAttention}
            onChange={(e) => setOnlyAttention(e.target.checked)}
            className="w-4 h-4 accent-orange-600"
          />
          Só pontos de atenção
        </label>
      </div>

      <div className="flex items-center justify-between text-sm text-slate-500">
        <span className="tabular-nums">
          {filtered.length} {filtered.length === 1 ? 'ação' : 'ações'}
          {loading ? ' · atualizando…' : ''}
        </span>
        {hasFilters && (
          <button type="button" onClick={clearFilters} className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900">
            <X className="w-4 h-4" /> Limpar filtros
          </button>
        )}
      </div>

      {/* Linha do tempo */}
      {groups.length === 0 ? (
        <div className={`${card} px-5 py-12 text-center text-sm text-slate-500`}>
          {loading ? 'Carregando histórico…' : 'Nenhuma ação encontrada com esses filtros.'}
        </div>
      ) : (
        groups.map((g) => (
          <section key={g.label} className={card}>
            <h2 className="px-4 sm:px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500 border-b border-slate-100 first-letter:uppercase">
              {g.label}
            </h2>
            <ol className="divide-y divide-slate-100">
              {g.items.map((l) => {
                const text = detailsText(l);
                const attention = ATTENTION.test(`${l.action} ${text}`);
                return (
                  <li key={l.id} className={`px-4 sm:px-5 py-3 flex gap-3 ${attention ? 'bg-amber-50/50' : ''}`}>
                    <time
                      dateTime={l.timestamp}
                      className="w-11 shrink-0 pt-0.5 text-xs font-medium text-slate-500 tabular-nums"
                    >
                      {new Date(l.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </time>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 flex items-start gap-1.5">
                        {attention && <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" aria-label="Ponto de atenção" />}
                        <span className="min-w-0 break-words">{l.action}</span>
                      </p>
                      {text && <p className="mt-0.5 text-sm text-slate-600 break-words">{text}</p>}
                      <p className="mt-1 text-xs text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="font-medium text-slate-700">{l.userName || NO_USER}</span>
                        {l.category && <span>· {CATEGORY_LABELS[l.category] || l.category}</span>}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        ))
      )}
    </div>
  );
};
