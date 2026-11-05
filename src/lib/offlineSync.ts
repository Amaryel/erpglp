/**
 * Fila de sincronização (modo offline).
 *
 * Toda gravação do sistema entra numa fila guardada no aparelho e é enviada ao
 * Supabase na ordem em que aconteceu. Sem internet, os lançamentos continuam
 * funcionando e ficam pendentes; quando a conexão volta, a fila é enviada sozinha.
 *
 * - Estoque e saldo do caixa são enviados como DIFERENÇA (+1 vazio, −2 cheios)
 *   com um código único, para não duplicar se o envio se repetir.
 * - Leituras (select) e o tempo real continuam indo direto ao Supabase.
 */
import { getSupabaseClient } from './supabase';

type Filter = ['eq' | 'neq', string, unknown];

export interface OutboxOp {
  id: string;
  kind: 'insert' | 'upsert' | 'update' | 'delete' | 'rpc';
  table?: string;
  payload?: unknown;
  options?: Record<string, unknown>;
  filters?: Filter[];
  fn?: string;
  args?: Record<string, unknown>;
  createdAt: string;
  attempts: number;
  lastError?: string;
}

export interface SyncStatus {
  online: boolean;
  syncing: boolean;
  pending: number;
  failed: number;
  lastSyncAt?: string;
  /** Mensagem amigável do último problema (ex.: banco sem atualização). */
  notice?: string;
}

const QUEUE_KEY = 'erpglp_outbox_v1';
const FAILED_KEY = 'erpglp_outbox_failed_v1';
const RETRY_MS = 15_000;

const load = (key: string): OutboxOp[] => {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

let queue: OutboxOp[] = load(QUEUE_KEY);
let failed: OutboxOp[] = load(FAILED_KEY);
let status: SyncStatus = {
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
  syncing: false,
  pending: queue.length,
  failed: failed.length,
};

const listeners = new Set<(s: SyncStatus) => void>();
const drainListeners = new Set<() => void>();

function persist() {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    localStorage.setItem(FAILED_KEY, JSON.stringify(failed.slice(-100)));
  } catch (e) {
    console.error('Não foi possível salvar a fila offline:', e);
  }
}

function setStatus(patch: Partial<SyncStatus>) {
  status = { ...status, ...patch, pending: queue.length, failed: failed.length };
  listeners.forEach((fn) => fn(status));
}

export const getSyncStatus = () => status;
export const hasPendingSync = () => queue.length > 0;

export function subscribeSyncStatus(fn: (s: SyncStatus) => void) {
  listeners.add(fn);
  fn(status);
  return () => {
    listeners.delete(fn);
  };
}

/** Chamado quando a fila esvazia (momento seguro para recarregar dados do servidor). */
export function onSyncDrained(fn: () => void) {
  drainListeners.add(fn);
  return () => {
    drainListeners.delete(fn);
  };
}

const newOpId = () =>
  `op-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 6)}`;

function enqueue(op: Omit<OutboxOp, 'id' | 'createdAt' | 'attempts'>, id = newOpId()) {
  queue.push({ ...op, id, createdAt: new Date().toISOString(), attempts: 0 });
  persist();
  setStatus({});
  scheduleFlush(0);
}

// ---------- classificação de erros ----------
type ErrLike = { message?: string; code?: string; status?: number } | null | undefined;

const isNetworkError = (e: ErrLike) =>
  !!e && (/failed to fetch|network|load failed|timeout|fetch/i.test(e.message || '') || e.status === 0) && !e.code;
const isAuthError = (e: ErrLike) =>
  !!e && (e.code === 'PGRST301' || e.code === 'PGRST303' || /jwt|token/i.test(e.message || ''));
// Banco ainda sem o script novo (função ou coluna inexistente): segura a fila até atualizar
const isMissingFunction = (e: ErrLike) =>
  !!e &&
  (e.code === 'PGRST202' ||
    e.code === 'PGRST204' ||
    e.code === '42883' ||
    e.code === '42703' ||
    /could not find the (function|.* column)/i.test(e.message || ''));
const isDuplicate = (e: ErrLike) => !!e && e.code === '23505';

async function execute(op: OutboxOp): Promise<ErrLike> {
  const client = getSupabaseClient();
  if (!client) return { message: 'network: sem cliente' };
  try {
    if (op.kind === 'rpc') {
      const { error } = await client.rpc(op.fn!, op.args || {});
      return error;
    }
    const table = client.from(op.table!);
    let q: any;
    if (op.kind === 'insert') q = table.insert(op.payload as any, op.options as any);
    else if (op.kind === 'upsert') q = table.upsert(op.payload as any, op.options as any);
    else if (op.kind === 'update') q = table.update(op.payload as any);
    else q = table.delete();
    for (const [f, col, val] of op.filters || []) q = q[f](col, val);
    const { error } = await q;
    return error;
  } catch (err: any) {
    return { message: err?.message || 'Failed to fetch' };
  }
}

let flushing = false;
let timer: ReturnType<typeof setTimeout> | null = null;

function scheduleFlush(delay = RETRY_MS) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    flushQueue();
  }, delay);
}

/** Envia a fila ao Supabase, na ordem. Para no primeiro problema de conexão. */
export async function flushQueue(): Promise<void> {
  if (flushing) return;
  if (queue.length === 0) {
    setStatus({ syncing: false });
    return;
  }
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    setStatus({ online: false, syncing: false });
    scheduleFlush();
    return;
  }

  flushing = true;
  setStatus({ syncing: true });
  let stoppedEarly = false;

  while (queue.length > 0) {
    const op = queue[0];
    const error = await execute(op);

    if (!error || (isDuplicate(error) && op.kind === 'insert')) {
      queue.shift();
      persist();
      setStatus({ online: true, notice: undefined });
      continue;
    }

    op.attempts += 1;
    op.lastError = error.message;

    if (isNetworkError(error)) {
      setStatus({ online: false });
      stoppedEarly = true;
      break;
    }
    if (isAuthError(error)) {
      // Sessão expirou enquanto estava offline: renova e tenta de novo depois
      try {
        await getSupabaseClient()?.auth.refreshSession();
      } catch {
        /* sem conexão */
      }
      stoppedEarly = true;
      break;
    }
    if (isMissingFunction(error)) {
      setStatus({
        notice: 'O banco precisa ser atualizado (script SQL) para enviar os lançamentos pendentes.',
      });
      stoppedEarly = true;
      break;
    }

    // Erro definitivo (permissão, dado inválido): separa para não travar a fila
    console.error('Lançamento não aceito pelo servidor:', op, error);
    failed.push(queue.shift()!);
    persist();
    setStatus({ notice: 'Algum lançamento foi recusado pelo servidor. Veja a auditoria.' });
  }

  flushing = false;
  persist();
  if (stoppedEarly) {
    setStatus({ syncing: false });
    scheduleFlush();
    return;
  }
  setStatus({ syncing: false, online: true, lastSyncAt: new Date().toISOString() });
  drainListeners.forEach((fn) => fn());
}

/** Descarta a fila (usado ao sair da conta com confirmação). */
export function clearOutbox() {
  queue = [];
  failed = [];
  persist();
  setStatus({});
}

// ---------- cliente com a mesma "cara" do supabase-js usada no sistema ----------
type WriteResult = { data: null; error: null };

function writeBuilder(base: Omit<OutboxOp, 'id' | 'createdAt' | 'attempts'>) {
  const op = { ...base, filters: [] as Filter[] };
  let queued = false;
  const commit = () => {
    if (!queued) {
      queued = true;
      enqueue(op);
    }
  };
  // Filtros são encadeados na mesma linha; a gravação entra na fila logo em seguida
  queueMicrotask(commit);
  const builder: any = {
    eq(col: string, val: unknown) {
      op.filters.push(['eq', col, val]);
      return builder;
    },
    neq(col: string, val: unknown) {
      op.filters.push(['neq', col, val]);
      return builder;
    },
    then(resolve: (r: WriteResult) => unknown, reject?: (e: unknown) => unknown) {
      commit();
      return Promise.resolve<WriteResult>({ data: null, error: null }).then(resolve, reject);
    },
  };
  return builder;
}

export interface SyncDb {
  from: (table: string) => any;
  /** Função do banco enviada pela fila. Com `idempotent`, recebe p_op_id único. */
  queueRpc: (fn: string, args: Record<string, unknown>, idempotent?: boolean) => void;
  channel: (name: string) => any;
  removeChannel: (channel: any) => any;
}

let facade: SyncDb | null = null;

/** Cliente usado pelo sistema: leituras ao vivo, gravações pela fila. */
export function getSyncDb(): SyncDb | null {
  const client = getSupabaseClient();
  if (!client) return null;
  if (!facade) {
    facade = {
      from: (table: string) => ({
        select: (...args: any[]) => (getSupabaseClient() as any).from(table).select(...args),
        insert: (payload: unknown, options?: Record<string, unknown>) =>
          writeBuilder({ kind: 'insert', table, payload, options }),
        upsert: (payload: unknown, options?: Record<string, unknown>) =>
          writeBuilder({ kind: 'upsert', table, payload, options }),
        update: (payload: unknown) => writeBuilder({ kind: 'update', table, payload }),
        delete: () => writeBuilder({ kind: 'delete', table }),
      }),
      queueRpc: (fn, args, idempotent = true) => {
        const id = newOpId();
        enqueue({ kind: 'rpc', fn, args: idempotent ? { p_op_id: id, ...args } : args }, id);
      },
      channel: (name: string) => getSupabaseClient()!.channel(name),
      removeChannel: (ch: any) => getSupabaseClient()!.removeChannel(ch),
    };
  }
  return facade;
}

// ---------- reconexão automática ----------
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    setStatus({ online: true });
    // Renova a sessão antes de enviar (o token pode ter vencido offline)
    getSupabaseClient()
      ?.auth.getSession()
      .finally(() => flushQueue());
  });
  window.addEventListener('offline', () => setStatus({ online: false }));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && queue.length > 0) flushQueue();
  });
  if (queue.length > 0) scheduleFlush(2_000);
}

/** Atualiza o indicador de conexão a partir de outras partes do sistema (ex.: carga de dados). */
export function setNetworkOnline(online: boolean) {
  if (status.online !== online) setStatus({ online });
  if (online && queue.length > 0) scheduleFlush(500);
}
