import React, { useState, useMemo } from 'react';
import {
  Flame,
  Search,
  Calendar,
  Filter,
  Eye,
  XCircle,
  Truck,
  Store,
  CheckCircle2,
  Clock,
  Printer,
  ChevronDown,
  AlertTriangle,
  FileText,
  User,
  Phone,
  MapPin,
  DollarSign,
  Package,
  RotateCcw,
} from 'lucide-react';
import { useErp } from '../context/ErpContext';
import { useAuth } from '../context/AuthContext';
import { canSeeFinance } from '../lib/permissions';
import { Sale, SaleStatus, SaleType, PaymentMethod } from '../types';
import { formatCurrency, formatDate, formatPaymentMethod } from '../utils/formatters';

type DateFilter = 'hoje' | 'ontem' | '7dias' | 'mes' | 'todos';

export const SalesHistoryView: React.FC = () => {
  const { sales, cancelSale, settings } = useErp();
  const { currentUser } = useAuth();
  const finance = canSeeFinance(currentUser?.role);

  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('todos');
  const [statusFilter, setStatusFilter] = useState<SaleStatus | 'todos'>('todos');
  const [typeFilter, setTypeFilter] = useState<SaleType | 'todos'>('todos');

  // Modal details
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  // Modal cancel sale
  const [saleToCancel, setSaleToCancel] = useState<Sale | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  // Print receipt state
  const [printReceiptSale, setPrintReceiptSale] = useState<Sale | null>(null);

  // Filtered sales
  const filteredSales = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const yesterdayStr = new Date(now.getTime() - 86400000).toISOString().split('T')[0];
    const sevenDaysAgoStr = new Date(now.getTime() - 7 * 86400000).toISOString();
    const firstDayMonthStr = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split('T')[0];

    return sales
      .filter((s) => {
        // Date filter
        const sDate = s.createdAt.split('T')[0];
        if (dateFilter === 'hoje' && sDate !== todayStr) return false;
        if (dateFilter === 'ontem' && sDate !== yesterdayStr) return false;
        if (dateFilter === '7dias' && s.createdAt < sevenDaysAgoStr) return false;
        if (dateFilter === 'mes' && sDate < firstDayMonthStr) return false;

        // Status filter
        if (statusFilter !== 'todos' && s.status !== statusFilter) return false;

        // Type filter
        if (typeFilter !== 'todos' && s.type !== typeFilter) return false;

        // Search term (Sale #, Client, Address, Phone, Driver)
        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase();
          const matchNumber = s.saleNumber.toLowerCase().includes(term);
          const matchClient = s.clientName?.toLowerCase().includes(term);
          const matchPhone = s.clientPhone?.toLowerCase().includes(term);
          const matchAddress = s.clientAddress?.toLowerCase().includes(term);
          const matchDriver = s.deliveryPersonName?.toLowerCase().includes(term);
          if (!matchNumber && !matchClient && !matchPhone && !matchAddress && !matchDriver) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [sales, dateFilter, statusFilter, typeFilter, searchTerm]);

  // Aggregate stats
  const stats = useMemo(() => {
    const activeList = filteredSales.filter((s) => s.status !== 'cancelada');
    const totalRevenue = activeList.reduce((sum, s) => sum + s.totalAmount, 0);
    const totalGrossProfit = activeList.reduce((sum, s) => sum + s.grossProfit, 0);
    const totalCount = activeList.length;
    const cylindersSent = activeList.reduce((sum, s) => sum + s.dispatchedCylinders, 0);
    const cylindersReturned = activeList.reduce((sum, s) => sum + s.returnedCylinders, 0);

    return {
      totalRevenue,
      totalGrossProfit,
      totalCount,
      cylindersSent,
      cylindersReturned,
      margin: totalRevenue > 0 ? (totalGrossProfit / totalRevenue) * 100 : 0,
    };
  }, [filteredSales]);

  const handleConfirmCancel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!saleToCancel) return;
    cancelSale(saleToCancel.id, cancelReason.trim() || 'Cancelamento solicitado no Histórico de Vendas');
    setSaleToCancel(null);
    setCancelReason('');
    // Refresh modal if opened
    if (selectedSale?.id === saleToCancel.id) {
      const updated = sales.find((s) => s.id === saleToCancel.id);
      setSelectedSale(updated ? { ...updated, status: 'cancelada' } : null);
    }
  };

  const getStatusBadge = (status: SaleStatus) => {
    switch (status) {
      case 'finalizada':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Finalizada
          </span>
        );
      case 'em_entrega':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
            <Truck className="w-3 h-3 text-amber-600 animate-pulse" />
            Em Rota
          </span>
        );
      case 'pendente':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
            <Clock className="w-3 h-3 text-blue-600" />
            Pendente
          </span>
        );
      case 'cancelada':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
            <XCircle className="w-3 h-3 text-rose-600" />
            Cancelada
          </span>
        );
    }
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div className="flex items-center gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Vendas
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Todas as vendas, com filtros e comprovantes.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl font-medium">
            Total de {sales.length} vendas registradas
          </span>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className={`grid grid-cols-2 gap-3 ${finance ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-medium text-slate-500">Vendas no Filtro</p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-black text-slate-900">{stats.totalCount}</span>
            <span className="text-xs text-slate-500">vendas</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-medium text-slate-500">Faturamento Filtrado</p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-black text-emerald-700">
              {formatCurrency(stats.totalRevenue)}
            </span>
          </div>
        </div>

        {finance && (
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-medium text-slate-500">Lucro Bruto (Margem)</p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-black text-slate-900">
              {formatCurrency(stats.totalGrossProfit)}
            </span>
            <span className="text-xs font-bold text-emerald-600">
              ({stats.margin.toFixed(1)}%)
            </span>
          </div>
        </div>
        )}

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-[11px] font-medium text-slate-500">Vasilhames (Cheio / Vazio)</p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-base font-black text-amber-600">{stats.cylindersSent} enviados</span>
            <span className="text-xs text-slate-400">/</span>
            <span className="text-sm font-bold text-slate-700">{stats.cylindersReturned} ret.</span>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {/* Search box */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar pedido, cliente, entregador..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
            />
          </div>

          {/* Date Range Selector */}
          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
            {(['hoje', 'ontem', '7dias', 'mes', 'todos'] as DateFilter[]).map((df) => (
              <button
                key={df}
                onClick={() => setDateFilter(df)}
                className={`flex-1 py-1 text-[11px] font-bold rounded-lg transition-all capitalize ${
                  dateFilter === df
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {df === '7dias' ? '7 Dias' : df === 'mes' ? 'Mês' : df}
              </button>
            ))}
          </div>

          {/* Status Selector */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="todos">Todos os Status</option>
              <option value="finalizada">Finalizadas</option>
              <option value="em_entrega">Em Rota (Entrega)</option>
              <option value="pendente">Pendentes</option>
              <option value="cancelada">Canceladas</option>
            </select>
          </div>

          {/* Type Selector */}
          <div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="todos">Todos os Tipos</option>
              <option value="balcao">Venda Balcão (Portaria)</option>
              <option value="entrega">Entrega Delivery</option>
            </select>
          </div>
        </div>
      </div>

      {/* Sales List */}
      <div className="space-y-2">
        {filteredSales.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
            <p className="text-sm font-semibold text-slate-600">
              Nenhuma venda encontrada com os filtros selecionados.
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Ajuste as opções de busca ou data acima para localizar as vendas.
            </p>
          </div>
        ) : (
          filteredSales.map((s) => {
            const hasCylinderDiff =
              s.dispatchedCylinders > 0 && s.dispatchedCylinders !== s.returnedCylinders;

            return (
              <div
                key={s.id}
                className={`bg-white rounded-2xl border transition-all p-3.5 sm:p-4 shadow-xs hover:border-amber-400 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  s.status === 'cancelada' ? 'opacity-60 bg-slate-50 border-dashed' : 'border-slate-200'
                }`}
              >
                {/* Left info */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                      {s.saleNumber}
                    </span>
                    {getStatusBadge(s.status)}
                    <span className="text-[11px] font-semibold text-slate-600 flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                      {s.type === 'delivery' ? (
                        <>
                          <Truck className="w-3 h-3 text-amber-500" />
                          Delivery
                        </>
                      ) : (
                        <>
                          <Store className="w-3 h-3 text-blue-500" />
                          Balcão
                        </>
                      )}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {formatDate(s.createdAt)}
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <p className="text-xs sm:text-sm font-bold text-slate-900">
                      {s.clientName || 'Cliente Balcão'}
                    </p>
                    {s.clientPhone && (
                      <span className="text-[11px] text-slate-400">({s.clientPhone})</span>
                    )}
                  </div>

                  {s.type === 'delivery' && s.clientAddress && (
                    <p className="text-[11px] text-slate-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      {s.clientAddress}
                      {s.deliveryPersonName ? ` • Entregador: ${s.deliveryPersonName}` : ''}
                    </p>
                  )}

                  <div className="text-[11px] text-slate-600 flex items-center gap-2 flex-wrap pt-0.5">
                    <span>
                      Itens: <strong>{s.items.map((i) => `${i.quantity}x ${i.productName}`).join(', ')}</strong>
                    </span>
                    {s.dispatchedCylinders > 0 && (
                      <span
                        className={`font-semibold ${
                          hasCylinderDiff ? 'text-amber-700 font-bold' : 'text-slate-500'
                        }`}
                      >
                        • Botijões: {s.dispatchedCylinders} cheios / {s.returnedCylinders} vazios
                      </span>
                    )}
                    {s.createdByName && (
                      <span className="text-slate-500">
                        • Lançada por <strong className="text-slate-700">{s.createdByName.replace(/\s*\(.*?\)/g, '')}</strong>
                      </span>
                    )}
                  </div>
                </div>

                {/* Right info & Actions */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 gap-2 shrink-0">
                  <div className="text-right">
                    <span className="text-base sm:text-lg font-black text-slate-900">
                      {formatCurrency(s.totalAmount)}
                    </span>
                    <div className="text-[10px] text-slate-500">
                      {s.payments.map((p) => `${formatPaymentMethod(p.method)}`).join(', ')}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setSelectedSale(s)}
                      className="px-2.5 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-500" />
                      <span>Detalhes</span>
                    </button>

                    <button
                      onClick={() => setPrintReceiptSale(s)}
                      className="p-1.5 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
                      title="Imprimir / Comprovante"
                    >
                      <Printer className="w-4 h-4" />
                    </button>

                    {s.status !== 'cancelada' && (
                      <button
                        onClick={() => {
                          setSaleToCancel(s);
                          setCancelReason('');
                        }}
                        className="p-1.5 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors"
                        title="Cancelar Venda"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Sale Details */}
      {selectedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-5 shadow-2xl space-y-4">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-slate-900">
                    Venda #{selectedSale.saleNumber}
                  </h3>
                  {getStatusBadge(selectedSale.status)}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Realizada em {formatDate(selectedSale.createdAt)}
                </p>
              </div>

              <button
                onClick={() => setSelectedSale(null)}
                className="text-slate-400 hover:text-slate-700 text-xs font-bold p-1 rounded-lg"
              >
                Fechar
              </button>
            </div>

            {/* Client & Delivery block */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-700">Tipo de Atendimento:</span>
                <span className="font-black text-slate-900 uppercase">
                  {selectedSale.type === 'delivery' ? 'Delivery (Entrega em Domicílio)' : 'Venda Balcão / Portaria'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Cliente:</span>
                <span className="font-semibold text-slate-800">
                  {selectedSale.clientName || 'Cliente Balcão'}
                </span>
              </div>
              {selectedSale.clientPhone && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Telefone:</span>
                  <span className="font-semibold text-slate-800">{selectedSale.clientPhone}</span>
                </div>
              )}
              {selectedSale.clientAddress && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Endereço de Entrega:</span>
                  <span className="font-semibold text-slate-800 text-right">
                    {selectedSale.clientAddress}
                  </span>
                </div>
              )}
              {selectedSale.deliveryPersonName && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Entregador Responsável:</span>
                  <span className="font-semibold text-slate-800">
                    {selectedSale.deliveryPersonName}
                  </span>
                </div>
              )}
              {[
                ['Lançada por', selectedSale.createdByName],
                ['Finalizada por', selectedSale.finalizedByName],
                ['Cancelada por', selectedSale.canceledByName],
              ]
                .filter(([, name]) => !!name)
                .map(([label, name]) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-slate-500">{label}:</span>
                    <span className="font-semibold text-slate-800">{String(name).replace(/\s*\(.*?\)/g, '')}</span>
                  </div>
                ))}
            </div>

            {/* Items Table */}
            <div>
              <p className="text-xs font-bold text-slate-700 mb-1.5">Itens do Pedido</p>
              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-2">Item</th>
                      <th className="p-2 text-center">Qtd</th>
                      <th className="p-2 text-right">Preço Unit.</th>
                      <th className="p-2 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedSale.items.map((it, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60">
                        <td className="p-2 font-medium text-slate-900">
                          {it.productName}
                          {it.isCylinder && (
                            <span className="text-[10px] text-amber-600 block">
                              Controle de vasilhame ativo
                            </span>
                          )}
                        </td>
                        <td className="p-2 text-center font-bold text-slate-800">
                          {it.quantity}
                        </td>
                        <td className="p-2 text-right text-slate-600">
                          {formatCurrency(it.unitPrice)}
                        </td>
                        <td className="p-2 text-right font-black text-slate-900">
                          {formatCurrency(it.totalPrice)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Vasilhames check */}
            {selectedSale.dispatchedCylinders > 0 && (
              <div
                className={`p-3 rounded-xl border text-xs ${
                  selectedSale.dispatchedCylinders === selectedSale.returnedCylinders
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-amber-50 border-amber-200 text-amber-900'
                }`}
              >
                <p className="font-bold flex items-center gap-1.5">
                  <Package className="w-4 h-4" />
                  Controle de Vasilhames desta Venda:
                </p>
                <div className="flex justify-between mt-1 text-[11px]">
                  <span>Botijões Cheios Saídos: <strong>{selectedSale.dispatchedCylinders}</strong></span>
                  <span>Vazios Retornados: <strong>{selectedSale.returnedCylinders}</strong></span>
                </div>
                {selectedSale.dispatchedCylinders !== selectedSale.returnedCylinders && (
                  <p className="text-[11px] font-bold mt-1 text-amber-800">
                    Aviso: Divergência de {selectedSale.dispatchedCylinders - selectedSale.returnedCylinders} vasilhame(s) pendente(s).
                  </p>
                )}
              </div>
            )}

            {/* Financials & Payments */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1.5">
              <p className="font-bold text-slate-700">Composição Financeira</p>
              <div className="space-y-1">
                {selectedSale.payments.map((pm, idx) => (
                  <div key={idx} className="flex justify-between text-slate-700">
                    <span>
                      {formatPaymentMethod(pm.method)}
                      {pm.method === 'fiado' ? ' (Conta a Receber)' : ''}:
                    </span>
                    <span className="font-bold">{formatCurrency(pm.amount)}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline font-black text-sm">
                <span>Total da Venda:</span>
                <span className="text-emerald-700 text-base">
                  {formatCurrency(selectedSale.totalAmount)}
                </span>
              </div>

              {finance && (
              <>
              <div className="pt-1 text-[11px] text-slate-500 flex justify-between">
                <span>Custo das Mercadorias (CMV):</span>
                <span>{formatCurrency(selectedSale.totalCost)}</span>
              </div>
              <div className="text-[11px] text-emerald-800 font-bold flex justify-between">
                <span>Lucro Bruto Gerado:</span>
                <span>
                  {formatCurrency(selectedSale.grossProfit)} (
                  {selectedSale.totalAmount > 0
                    ? ((selectedSale.grossProfit / selectedSale.totalAmount) * 100).toFixed(0)
                    : 0}
                  %)
                </span>
              </div>
              </>
              )}
            </div>

            {/* Actions in details */}
            <div className="flex items-center justify-between gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPrintReceiptSale(selectedSale)}
                className="px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4 text-slate-600" />
                <span>Imprimir Comprovante</span>
              </button>

              {selectedSale.status !== 'cancelada' && (
                <button
                  type="button"
                  onClick={() => {
                    setSaleToCancel(selectedSale);
                    setCancelReason('');
                  }}
                  className="px-3 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <XCircle className="w-4 h-4 text-rose-600" />
                  <span>Cancelar Venda</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Cancel Sale Confirmation */}
      {saleToCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-xs">
          <form
            onSubmit={handleConfirmCancel}
            className="bg-white rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-3"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Cancelar Venda #{saleToCancel.saleNumber}?
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Valor total: <strong>{formatCurrency(saleToCancel.totalAmount)}</strong>
                </p>
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed">
              <p className="font-bold">Atenção ao estorno automático:</p>
              <ul className="list-disc pl-4 space-y-0.5 text-[11px] mt-1 text-amber-800">
                <li>Os botijões cheios retornam para o estoque de Cheios.</li>
                <li>Os botijões vazios recolhidos são retirados do estoque de Vazios.</li>
                <li>O valor em dinheiro/cartão/pix é estornado do caixa ou contas a receber.</li>
                <li>O cancelamento fica registrado na Auditoria.</li>
              </ul>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Motivo do Cancelamento *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Cliente desistiu da compra / Endereço incorreto"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSaleToCancel(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Voltar
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs"
              >
                Confirmar Cancelamento
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Printable Receipt Preview Modal */}
      {printReceiptSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-black text-slate-900">Comprovante de Venda</h3>
              <button
                onClick={() => setPrintReceiptSale(null)}
                className="text-xs font-bold text-slate-400 hover:text-slate-700"
              >
                Fechar
              </button>
            </div>

            {/* Thermal receipt look */}
            <div
              id="thermal-receipt"
              className="bg-amber-50/50 font-mono text-[11px] p-4 rounded-xl border border-dashed border-slate-300 space-y-2 text-slate-800"
            >
              <div className="text-center pb-2 border-b border-dashed border-slate-300">
                <p className="font-bold text-sm tracking-tight">{settings?.tradeName || 'ErpGLP Distribuidora'}</p>
                {settings?.cnpj && <p className="text-[10px]">CNPJ: {settings.cnpj}</p>}
                {settings?.phone && <p className="text-[10px]">Tel: {settings.phone}</p>}
                {settings?.address && <p className="text-[10px]">{settings.address}</p>}
              </div>

              <div className="flex justify-between text-[10px]">
                <span>PEDIDO #{printReceiptSale.saleNumber}</span>
                <span>{formatDate(printReceiptSale.createdAt)}</span>
              </div>

              <div className="border-t border-dashed border-slate-300 pt-1">
                <p className="font-bold">CLIENTE:</p>
                <p>{printReceiptSale.clientName || 'Consumidor Final / Balcão'}</p>
                {printReceiptSale.clientAddress && (
                  <p className="text-[10px]">Entr: {printReceiptSale.clientAddress}</p>
                )}
              </div>

              <div className="border-t border-dashed border-slate-300 pt-1 space-y-1">
                <p className="font-bold">ITENS:</p>
                {printReceiptSale.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span>{it.quantity}x {it.productName}</span>
                    <span>{formatCurrency(it.totalPrice)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-dashed border-slate-300 pt-1 flex justify-between font-bold text-xs">
                <span>TOTAL:</span>
                <span>{formatCurrency(printReceiptSale.totalAmount)}</span>
              </div>

              <div className="border-t border-dashed border-slate-300 pt-1 text-[10px]">
                <p className="font-bold">PAGAMENTO:</p>
                {printReceiptSale.payments.map((p, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span>{formatPaymentMethod(p.method)}</span>
                    <span>{formatCurrency(p.amount)}</span>
                  </div>
                ))}
              </div>

              {printReceiptSale.dispatchedCylinders > 0 && (
                <div className="border-t border-dashed border-slate-300 pt-1 text-[10px]">
                  <p>Cheios entregues: {printReceiptSale.dispatchedCylinders}</p>
                  <p>Vazios recolhidos: {printReceiptSale.returnedCylinders}</p>
                </div>
              )}

              <div className="border-t border-dashed border-slate-300 pt-2 text-center text-[10px] text-slate-500">
                <p>{settings?.receiptFooter || 'Agradecemos a preferência! Disk Gás.'}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  window.print();
                }}
                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Recibo</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
