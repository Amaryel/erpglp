import React, { useEffect, useState } from 'react';
import { Cloud, CloudOff, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';
import { flushQueue, getSyncStatus, subscribeSyncStatus, SyncStatus } from '../lib/offlineSync';

export function useSyncStatus(): SyncStatus {
  const [status, setStatus] = useState<SyncStatus>(getSyncStatus());
  useEffect(() => subscribeSyncStatus(setStatus), []);
  return status;
}

/** Indicador no topo: conexão e lançamentos aguardando envio. Toque para enviar agora. */
export const SyncStatusBadge: React.FC = () => {
  const s = useSyncStatus();

  let icon = <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
  let label = 'Sincronizado';
  let tone = 'text-slate-600 border-slate-200 hover:bg-slate-50';
  let title = 'Todos os lançamentos estão na nuvem.';

  if (!s.online) {
    icon = <CloudOff className="w-4 h-4 text-amber-600" />;
    label = s.pending > 0 ? `Offline · ${s.pending}` : 'Offline';
    tone = 'text-amber-800 border-amber-300 bg-amber-50 hover:bg-amber-100';
    title = 'Sem internet. Os lançamentos ficam salvos no aparelho e sobem sozinhos quando a conexão voltar.';
  } else if (s.syncing) {
    icon = <RefreshCw className="w-4 h-4 text-slate-500 animate-spin" />;
    label = `Enviando ${s.pending}`;
    title = 'Enviando lançamentos para a nuvem…';
  } else if (s.pending > 0) {
    icon = <Cloud className="w-4 h-4 text-amber-600" />;
    label = `${s.pending} pendente${s.pending > 1 ? 's' : ''}`;
    tone = 'text-amber-800 border-amber-300 bg-amber-50 hover:bg-amber-100';
    title = s.notice || 'Lançamentos aguardando envio. Toque para tentar agora.';
  }
  if (s.notice && s.pending > 0) {
    icon = <AlertTriangle className="w-4 h-4 text-amber-600" />;
    title = s.notice;
  }

  return (
    <button
      type="button"
      onClick={() => flushQueue()}
      title={title}
      aria-label={`${label}. ${title}`}
      className={`h-9 px-2.5 rounded-lg border flex items-center gap-1.5 text-sm font-medium transition-colors ${tone}`}
    >
      {icon}
      <span className={s.online && s.pending === 0 ? 'hidden xl:inline' : 'tabular-nums'}>{label}</span>
    </button>
  );
};

/** Faixa de aviso logo abaixo do topo quando o aparelho está sem internet. */
export const OfflineBanner: React.FC = () => {
  const s = useSyncStatus();
  if (s.online && !(s.notice && s.pending > 0)) return null;
  const offline = !s.online;
  return (
    <div
      role="status"
      className={`px-4 py-2 text-sm flex items-center justify-center gap-2 text-center border-b ${
        offline ? 'bg-amber-50 text-amber-900 border-amber-200' : 'bg-rose-50 text-rose-900 border-rose-200'
      }`}
    >
      {offline ? <CloudOff className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
      <span>
        {offline
          ? `Sem internet. Pode continuar usando: ${
              s.pending > 0
                ? `${s.pending} lançamento(s) salvo(s) no aparelho`
                : 'os lançamentos ficam salvos no aparelho'
            } e sobem sozinhos quando a conexão voltar.`
          : s.notice}
      </span>
    </div>
  );
};
