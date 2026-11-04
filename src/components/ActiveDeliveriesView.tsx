import React, { useState } from 'react';
import {
  Truck,
  Clock,
  MapPin,
  Phone,
  User,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Package,
  Plus,
  Ban,
  Search,
  Check,
} from 'lucide-react';
import { useErp } from '../context/ErpContext';
import { Sale, SaleStatus } from '../types';
import { formatCurrency, formatTime, getElapsedTime } from '../utils/formatters';
import { FinalizeDeliveryModal } from './FinalizeDeliveryModal';

interface ActiveDeliveriesViewProps {
  onOpenNewSale: () => void;
}

export const ActiveDeliveriesView: React.FC<ActiveDeliveriesViewProps> = ({
  onOpenNewSale,
}) => {
  const { sales, updateDeliveryStatus, cancelSale } = useErp();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | SaleStatus>('todos');

  // Modal finalize state
  const [selectedSaleToFinalize, setSelectedSaleToFinalize] = useState<Sale | null>(null);

  // Modal cancel state
  const [saleToCancel, setSaleToCancel] = useState<Sale | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  // Filter in-progress delivery sales only
  const activeSales = sales.filter((s) => {
    if (s.type !== 'delivery') return false;
    if (s.status === 'finalizada' || s.status === 'cancelada') return false;

    if (statusFilter !== 'todos' && s.status !== statusFilter) return false;

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchClient = s.clientName?.toLowerCase().includes(term);
      const matchAddress = s.clientAddress?.toLowerCase().includes(term);
      const matchPhone = s.clientPhone?.includes(term);
      const matchNum = s.saleNumber.toString().includes(term);
      return matchClient || matchAddress || matchPhone || matchNum;
    }

    return true;
  });

  const handleConfirmCancel = () => {
    if (!saleToCancel || !cancelReason.trim()) return;
    cancelSale(saleToCancel.id, cancelReason.trim());
    setSaleToCancel(null);
    setCancelReason('');
  };

  return (
    <div className="space-y-4 pb-16">
      {/* Top Title & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                Entregas em andamento
                <span className="bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {activeSales.length}
                </span>
              </h1>
              <p className="text-xs text-slate-500">
                Acompanhamento em tempo real de pedidos em rota e aguardando entrega
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={onOpenNewSale}
          className="bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-sm flex items-center justify-center gap-2 transition-transform"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Venda Delivery</span>
        </button>
      </div>

      {/* Filters & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por cliente, endereço, telefone ou nº do pedido..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs sm:text-sm bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setStatusFilter('todos')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
              statusFilter === 'todos'
                ? 'bg-slate-900 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Todos ({activeSales.length})
          </button>
          <button
            onClick={() => setStatusFilter('pendente')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
              statusFilter === 'pendente'
                ? 'bg-amber-500 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Aguardando Saída
          </button>
          <button
            onClick={() => setStatusFilter('em_entrega')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
              statusFilter === 'em_entrega'
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Em Entrega
          </button>
          <button
            onClick={() => setStatusFilter('aguardando_finalizacao')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
              statusFilter === 'aguardando_finalizacao'
                ? 'bg-purple-600 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            No Cliente
          </button>
        </div>
      </div>

      {/* Sales In Progress Cards List */}
      {activeSales.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            Nenhuma entrega pendente no momento!
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
            Todas as vendas delivery foram finalizadas e estão devidamente registradas no caixa e estoque.
          </p>
          <button
            onClick={onOpenNewSale}
            className="inline-flex items-center gap-2 bg-amber-500 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xs hover:bg-amber-600"
          >
            <Plus className="w-4 h-4" />
            <span>Lançar Nova Venda</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
          {activeSales.map((sale) => {
            // Status style badges
            let statusBadge = {
              text: 'Pendente',
              bg: 'bg-amber-100 text-amber-900 border-amber-300',
            };
            if (sale.status === 'em_entrega') {
              statusBadge = {
                text: 'Em Entrega',
                bg: 'bg-blue-100 text-blue-900 border-blue-300',
              };
            } else if (sale.status === 'aguardando_finalizacao') {
              statusBadge = {
                text: 'No Cliente / Aguardando Finalização',
                bg: 'bg-purple-100 text-purple-900 border-purple-300',
              };
            }

            return (
              <div
                key={sale.id}
                id={`delivery-card-${sale.saleNumber}`}
                className="bg-white rounded-2xl border-2 border-slate-200 hover:border-amber-400 p-4 shadow-xs transition-all flex flex-col justify-between gap-3 relative"
              >
                {/* Header of Card */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-900 text-sm bg-slate-100 px-2 py-0.5 rounded-lg">
                        #{sale.saleNumber}
                      </span>
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${statusBadge.bg}`}
                      >
                        {statusBadge.text}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-slate-500 text-xs font-semibold">
                      <Clock className="w-3.5 h-3.5 text-amber-500" />
                      <span>{getElapsedTime(sale.createdAt)}</span>
                      <span className="text-slate-300">•</span>
                      <span>{formatTime(sale.createdAt)}</span>
                    </div>
                  </div>

                  {/* Client Info */}
                  <div className="space-y-1 my-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-black text-slate-900 text-base flex items-center gap-1.5">
                        <User className="w-4 h-4 text-amber-600 shrink-0" />
                        {sale.clientName || 'Cliente Delivery'}
                      </h4>
                      {sale.clientPhone && (
                        <a
                          href={`tel:${sale.clientPhone}`}
                          className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded-lg border border-emerald-200 transition-colors"
                        >
                          <Phone className="w-3 h-3" />
                          <span>{sale.clientPhone}</span>
                        </a>
                      )}
                    </div>

                    {sale.clientAddress && (
                      <div className="text-xs text-slate-600 flex items-start gap-1.5 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span>
                          {sale.clientAddress} {sale.clientNeighborhood ? `- ${sale.clientNeighborhood}` : ''}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Delivery Person tag */}
                  <div className="flex items-center justify-between text-xs py-1.5 px-2 bg-slate-50 rounded-lg border border-slate-100 mb-2">
                    <span className="text-slate-500 font-medium">Entregador:</span>
                    <span className="font-bold text-slate-800">
                      {sale.deliveryPersonName || 'Não atribuído'}
                    </span>
                  </div>

                  {/* Items List */}
                  <div className="bg-slate-50/70 p-2.5 rounded-xl border border-slate-100 space-y-1">
                    {sale.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-xs">
                        <span className="font-semibold text-slate-800">
                          {item.quantity}x {item.productName}
                        </span>
                        <span className="font-bold text-slate-900">
                          {formatCurrency(item.total)}
                        </span>
                      </div>
                    ))}
                    {sale.notes && (
                      <div className="text-[11px] text-amber-900 bg-amber-50 p-1.5 rounded border border-amber-200/60 mt-1 font-medium">
                        Obs: {sale.notes}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Footer with Big Action Buttons */}
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  {/* Total Value Bar */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-medium">Total a Receber:</span>
                    <span className="text-lg sm:text-xl font-black text-slate-900">
                      {formatCurrency(sale.totalAmount)}
                    </span>
                  </div>

                  {/* Fast Status Change Pills */}
                  <div className="flex items-center gap-1.5">
                    {sale.status === 'pendente' && (
                      <button
                        onClick={() => updateDeliveryStatus(sale.id, 'em_entrega')}
                        className="flex-1 py-1.5 px-2 rounded-lg text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100 transition-colors text-center"
                      >
                        Marcar: Saiu p/ Entrega
                      </button>
                    )}
                    {sale.status === 'em_entrega' && (
                      <button
                        onClick={() => updateDeliveryStatus(sale.id, 'aguardando_finalizacao')}
                        className="flex-1 py-1.5 px-2 rounded-lg text-xs font-bold bg-purple-50 text-purple-800 border border-purple-200 hover:bg-purple-100 transition-colors text-center"
                      >
                        Marcar: Chegou no Cliente
                      </button>
                    )}

                    <button
                      onClick={() => setSaleToCancel(sale)}
                      className="py-1.5 px-2 rounded-lg text-xs font-medium text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Cancelar venda"
                    >
                      <Ban className="w-4 h-4" />
                    </button>
                  </div>

                  {/* BIG PROMINENT ACTION: FINALIZAR VENDA (Requirements #12) */}
                  <button
                    id={`btn-finalizar-venda-${sale.saleNumber}`}
                    onClick={() => setSelectedSaleToFinalize(sale)}
                    className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-black text-sm sm:text-base rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    <span>FINALIZAR VENDA</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal for Finalizing Delivery */}
      {selectedSaleToFinalize && (
        <FinalizeDeliveryModal
          sale={selectedSaleToFinalize}
          isOpen={Boolean(selectedSaleToFinalize)}
          onClose={() => setSelectedSaleToFinalize(null)}
        />
      )}

      {/* Modal for Canceling Sale */}
      {saleToCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/80">
          <div className="bg-white rounded-2xl w-full max-w-md p-4 shadow-2xl space-y-3">
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <Ban className="w-5 h-5 text-red-600" />
              <span>Cancelar Venda #{saleToCancel.saleNumber}</span>
            </h3>
            <p className="text-xs text-slate-600">
              O cancelamento irá restaurar o estoque dos botijões que haviam saído para entrega e registrar o evento na auditoria.
            </p>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Motivo do Cancelamento *
              </label>
              <textarea
                rows={2}
                required
                placeholder="Ex: Cliente desistiu da compra, endereço incorreto, etc."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-red-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSaleToCancel(null)}
                className="px-3 py-1.5 border rounded-lg text-xs font-medium text-slate-700"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={!cancelReason.trim()}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold disabled:opacity-50"
              >
                Confirmar Cancelamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
