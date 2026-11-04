import React, { useState } from 'react';
import {
  ShieldAlert,
  Search,
  Filter,
  AlertTriangle,
  Ban,
  Package,
  Wallet,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { useErp } from '../context/ErpContext';
import { AuditLog } from '../types';
import { formatDateTime } from '../utils/formatters';

export const AuditView: React.FC = () => {
  const { auditLogs } = useErp();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState<string>('todos');

  const filteredLogs = auditLogs.filter((log) => {
    if (filterAction !== 'todos' && log.action !== filterAction) return false;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchDesc = log.description.toLowerCase().includes(term);
      const matchAction = log.action.toLowerCase().includes(term);
      return matchDesc || matchAction;
    }
    return true;
  });

  const getActionBadge = (action: AuditLog['action']) => {
    switch (action) {
      case 'cancelamento_venda':
        return {
          label: 'Cancelamento de Venda',
          icon: Ban,
          class: 'bg-rose-100 text-rose-800 border-rose-300',
        };
      case 'ajuste_estoque':
        return {
          label: 'Ajuste de Estoque',
          icon: Package,
          class: 'bg-amber-100 text-amber-800 border-amber-300',
        };
      case 'divergencia_vasilhame':
        return {
          label: 'Divergência de Vasilhame',
          icon: AlertTriangle,
          class: 'bg-orange-100 text-orange-900 border-orange-300',
        };
      case 'divergencia_caixa':
        return {
          label: 'Divergência de Caixa',
          icon: Wallet,
          class: 'bg-red-100 text-red-900 border-red-300',
        };
      case 'conferencia_estoque':
        return {
          label: 'Conferência Física',
          icon: CheckCircle2,
          class: 'bg-blue-100 text-blue-800 border-blue-300',
        };
      default:
        return {
          label: action,
          icon: ShieldAlert,
          class: 'bg-slate-100 text-slate-800 border-slate-300',
        };
    }
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div className="flex items-center gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Auditoria
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Cancelamentos, ajustes de estoque e diferenças de caixa.
            </p>
          </div>
        </div>

        <div className="bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl text-right">
          <span className="text-[10px] font-bold text-rose-700 block uppercase">
            Total de Registros
          </span>
          <span className="text-base font-black text-rose-950">
            {auditLogs.length} eventos
          </span>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por ocorrência, descrição ou motivo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs sm:text-sm bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-rose-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setFilterAction('todos')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
              filterAction === 'todos'
                ? 'bg-slate-900 text-white'
                : 'bg-white border border-slate-200 text-slate-600'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setFilterAction('cancelamento_venda')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
              filterAction === 'cancelamento_venda'
                ? 'bg-rose-600 text-white'
                : 'bg-white border border-slate-200 text-slate-600'
            }`}
          >
            Cancelamentos
          </button>
          <button
            onClick={() => setFilterAction('ajuste_estoque')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
              filterAction === 'ajuste_estoque'
                ? 'bg-amber-500 text-white'
                : 'bg-white border border-slate-200 text-slate-600'
            }`}
          >
            Ajustes Estoque
          </button>
          <button
            onClick={() => setFilterAction('divergencia_vasilhame')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
              filterAction === 'divergencia_vasilhame'
                ? 'bg-orange-500 text-white'
                : 'bg-white border border-slate-200 text-slate-600'
            }`}
          >
            Vasilhames Faltantes
          </button>
        </div>
      </div>

      {/* Audit Log Timeline */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="divide-y divide-slate-100">
          {filteredLogs.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Nenhuma ocorrência encontrada para este filtro.
            </div>
          ) : (
            filteredLogs.map((log) => {
              const badge = getActionBadge(log.action);
              const Icon = badge.icon;

              return (
                <div key={log.id} className="py-3 flex items-start gap-3 text-xs">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className="w-4 h-4" />
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center justify-between gap-1">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.class}`}
                      >
                        {badge.label}
                      </span>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDateTime(log.timestamp)}
                      </span>
                    </div>

                    <p className="font-semibold text-slate-900 text-xs sm:text-sm">
                      {log.description}
                    </p>

                    {log.details && (
                      <div className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100 font-mono">
                        {typeof log.details === 'object'
                          ? JSON.stringify(log.details)
                          : String(log.details)}
                      </div>
                    )}
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
