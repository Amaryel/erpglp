import React, { useState } from 'react';
import {
  Package,
  Flame,
  ArrowUpDown,
  History,
  Sliders,
  CheckSquare,
  AlertTriangle,
  Plus,
  Minus,
  Check,
  Search,
  Filter,
} from 'lucide-react';
import { useErp } from '../context/ErpContext';
import { NumberField } from './NumberField';
import { formatDateTime } from '../utils/formatters';

type StockTab = 'atual' | 'movimentacoes' | 'ajustar' | 'conferencia';

export const StockView: React.FC = () => {
  const {
    products,
    stock,
    stockMovements,
    stockAdjustments,
    adjustStock,
    performStockConference,
  } = useErp();

  const [activeTab, setActiveTab] = useState<StockTab>('atual');
  const [searchTerm, setSearchTerm] = useState('');

  // Stock Adjustment Form State
  const [adjustProductId, setAdjustProductId] = useState('');
  const [adjustNewFull, setAdjustNewFull] = useState<number>(0);
  const [adjustNewEmpty, setAdjustNewEmpty] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState('Conferência física');
  const [adjustNotes, setAdjustNotes] = useState('');
  const [adjustSuccessMsg, setAdjustSuccessMsg] = useState(false);

  // Stock Conference Form State
  const [confProductId, setConfProductId] = useState('');
  const [confPhysicalFull, setConfPhysicalFull] = useState<number>(0);
  const [confPhysicalEmpty, setConfPhysicalEmpty] = useState<number>(0);
  const [confReason, setConfReason] = useState('Conferência física');
  const [confResultMsg, setConfResultMsg] = useState<string | null>(null);

  // Selected product for adjustment preview
  const selectedAdjustProd = products.find((p) => p.id === adjustProductId);
  const currentAdjustStock = adjustProductId
    ? stock[adjustProductId] || { fullQuantity: 0, emptyQuantity: 0 }
    : null;

  // Handle setting product to adjust
  const handleSelectProductForAdjust = (prodId: string) => {
    setAdjustProductId(prodId);
    const item = stock[prodId];
    if (item) {
      setAdjustNewFull(item.fullQuantity);
      setAdjustNewEmpty(item.emptyQuantity);
    }
  };

  const handleSubmitAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustProductId) return;

    adjustStock({
      productId: adjustProductId,
      newFull: Number(adjustNewFull) || 0,
      newEmpty: Number(adjustNewEmpty) || 0,
      reason: adjustReason.trim(),
      notes: adjustNotes.trim() || undefined,
    });

    setAdjustSuccessMsg(true);
    setTimeout(() => setAdjustSuccessMsg(false), 3500);
    setAdjustNotes('');
  };

  // Stock conference submission
  const handleSelectProductForConf = (prodId: string) => {
    setConfProductId(prodId);
    const item = stock[prodId];
    if (item) {
      setConfPhysicalFull(item.fullQuantity);
      setConfPhysicalEmpty(item.emptyQuantity);
    }
  };

  const selectedConfProd = products.find((p) => p.id === confProductId);
  const currentConfStock = confProductId
    ? stock[confProductId] || { fullQuantity: 0, emptyQuantity: 0 }
    : null;

  const diffConfFull = currentConfStock
    ? confPhysicalFull - currentConfStock.fullQuantity
    : 0;
  const diffConfEmpty = currentConfStock
    ? confPhysicalEmpty - currentConfStock.emptyQuantity
    : 0;

  const handleApplyConference = (applyAdjust: boolean) => {
    if (!confProductId) return;

    performStockConference({
      productId: confProductId,
      physicalFull: confPhysicalFull,
      physicalEmpty: confPhysicalEmpty,
      reason: confReason.trim(),
      applyAdjustment: applyAdjust,
    });

    setConfResultMsg(
      applyAdjust
        ? 'Conferência registrada e estoque ajustado com sucesso!'
        : 'Conferência registrada para auditoria sem alterar o estoque.'
    );
    setTimeout(() => setConfResultMsg(null), 4000);
  };

  // Filter products
  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div className="flex items-center gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Estoque
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Cheios e vazios por produto, movimentações e ajustes.
            </p>
          </div>
        </div>

        {/* Sub-tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto">
          <button
            onClick={() => setActiveTab('atual')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'atual'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Estoque Atual
          </button>
          <button
            onClick={() => setActiveTab('movimentacoes')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'movimentacoes'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Movimentações ({stockMovements.length})
          </button>
          <button
            onClick={() => {
              setActiveTab('ajustar');
              if (!adjustProductId && products.length > 0) {
                handleSelectProductForAdjust(products[0].id);
              }
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'ajustar'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Ajustar Estoque
          </button>
          <button
            onClick={() => {
              setActiveTab('conferencia');
              if (!confProductId && products.length > 0) {
                handleSelectProductForConf(products[0].id);
              }
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'conferencia'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Conferência Física
          </button>
        </div>
      </div>

      {/* TAB 1: ESTOQUE ATUAL */}
      {activeTab === 'atual' && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por código ou nome do produto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs sm:text-sm bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredProducts.map((prod) => {
              const item = stock[prod.id] || { fullQuantity: 0, emptyQuantity: 0 };
              const isLow = prod.minStock !== undefined && item.fullQuantity <= prod.minStock;

              return (
                <div
                  key={prod.id}
                  className="bg-white rounded-2xl border border-slate-200 hover:border-amber-400 p-4 shadow-xs transition-all flex flex-col justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {prod.code}
                      </span>
                      {prod.category && (
                        <span className="text-[10px] text-slate-400 font-medium">
                          {prod.category}
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-slate-900 text-sm">{prod.name}</h3>
                  </div>

                  {/* Cylinders vs non-cylinder numbers */}
                  {prod.isCylinder ? (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {/* Cheios */}
                      <div className="bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-200 text-center">
                        <span className="text-[11px] font-bold text-emerald-800 flex items-center justify-center gap-1">
                          <Flame className="w-3.5 h-3.5 text-emerald-600" />
                          Cheios
                        </span>
                        <div className="text-2xl font-black text-emerald-950 mt-0.5">
                          {item.fullQuantity}
                        </div>
                        <span className="text-[10px] text-emerald-700">disponíveis</span>
                      </div>

                      {/* Vazios */}
                      <div className="bg-blue-50/70 p-2.5 rounded-xl border border-blue-200 text-center">
                        <span className="text-[11px] font-bold text-blue-800 flex items-center justify-center gap-1">
                          <Package className="w-3.5 h-3.5 text-blue-600" />
                          Vazios
                        </span>
                        <div className="text-2xl font-black text-blue-950 mt-0.5">
                          {item.emptyQuantity}
                        </div>
                        <span className="text-[10px] text-blue-700">vasilhames</span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-600">
                        Estoque em Unidades:
                      </span>
                      <span className="text-2xl font-black text-slate-900">
                        {item.fullQuantity}
                      </span>
                    </div>
                  )}

                  {/* Stock Min warning & Action */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div>
                      {isLow ? (
                        <span className="text-rose-600 font-bold flex items-center gap-1 text-[11px]">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Abaixo do mín ({prod.minStock})
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">
                          Mínimo: {prod.minStock ?? 'Não definido'}
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        handleSelectProductForAdjust(prod.id);
                        setActiveTab('ajustar');
                      }}
                      className="text-amber-600 hover:text-amber-800 font-bold text-xs underline"
                    >
                      Ajustar Estoque
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: HISTÓRICO DE MOVIMENTAÇÕES */}
      {activeTab === 'movimentacoes' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800">
              Histórico Cronológico de Movimentações
            </h2>
            <span className="text-xs text-slate-500">
              {stockMovements.length} registros rastreados
            </span>
          </div>

          <div className="divide-y divide-slate-100 overflow-x-auto">
            {stockMovements.map((m) => {
              const isEntry = m.direction === 'entrada';

              return (
                <div key={m.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-black ${
                        isEntry
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {isEntry ? '+' : '-'}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">
                        {m.productName} ({m.stockType})
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {m.origin} {m.notes ? `• ${m.notes}` : ''}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div
                      className={`font-black text-sm ${
                        isEntry ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {isEntry ? `+${m.quantity}` : `-${m.quantity}`}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {formatDateTime(m.timestamp)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: AJUSTAR ESTOQUE (Requirements #6) */}
      {activeTab === 'ajustar' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Ajuste Manual de Estoque
              </h2>
              <p className="text-xs text-slate-500">
                O ErpGLP registra data, hora, saldo anterior, novo saldo e motivo obrigatoriamente.
              </p>
            </div>

            {adjustSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Ajuste salvo e registrado no histórico de auditoria!</span>
              </div>
            )}

            <form onSubmit={handleSubmitAdjustment} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  1. Selecione o Produto *
                </label>
                <select
                  value={adjustProductId}
                  onChange={(e) => handleSelectProductForAdjust(e.target.value)}
                  className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-amber-500"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} - {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedAdjustProd && currentAdjustStock && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="font-semibold text-slate-800">
                    Estoque Atual no Sistema:
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-slate-600 block mb-1 font-semibold">
                        Cheios (Anterior: {currentAdjustStock.fullQuantity})
                      </label>
                      <div className="flex items-center gap-2">
                        <NumberField
                          min="0"
                          required
                          value={adjustNewFull}
                          onValueChange={(n) => setAdjustNewFull(n)} decimal={false}
                          className="w-full text-base font-black text-slate-900 bg-white border border-slate-300 rounded-xl p-2"
                        />
                      </div>
                      <span className="text-[10px] text-slate-500">
                        Diferença:{' '}
                        <strong
                          className={
                            adjustNewFull - currentAdjustStock.fullQuantity >= 0
                              ? 'text-emerald-700'
                              : 'text-rose-600'
                          }
                        >
                          {adjustNewFull - currentAdjustStock.fullQuantity >= 0 ? '+' : ''}
                          {adjustNewFull - currentAdjustStock.fullQuantity}
                        </strong>
                      </span>
                    </div>

                    {selectedAdjustProd.isCylinder && (
                      <div>
                        <label className="text-[11px] text-slate-600 block mb-1 font-semibold">
                          Vazios (Anterior: {currentAdjustStock.emptyQuantity})
                        </label>
                        <NumberField
                          min="0"
                          required
                          value={adjustNewEmpty}
                          onValueChange={(n) => setAdjustNewEmpty(n)} decimal={false}
                          className="w-full text-base font-black text-slate-900 bg-white border border-slate-300 rounded-xl p-2"
                        />
                        <span className="text-[10px] text-slate-500">
                          Diferença:{' '}
                          <strong
                            className={
                              adjustNewEmpty - currentAdjustStock.emptyQuantity >= 0
                                ? 'text-emerald-700'
                                : 'text-rose-600'
                            }
                          >
                            {adjustNewEmpty - currentAdjustStock.emptyQuantity >= 0 ? '+' : ''}
                            {adjustNewEmpty - currentAdjustStock.emptyQuantity}
                          </strong>
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  2. Motivo do Ajuste * (Obrigatório)
                </label>
                <select
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-amber-500"
                >
                  <option value="Conferência física">Conferência física</option>
                  <option value="Avaria / Vazamento descartado">Avaria / Vazamento descartado</option>
                  <option value="Troca em garantia c/ distribuidora">Troca em garantia c/ distribuidora</option>
                  <option value="Entrada manual de carga avulsa">Entrada manual de carga avulsa</option>
                  <option value="Correção de lançamento anterior">Correção de lançamento anterior</option>
                  <option value="Outro motivo">Outro motivo</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-600 block mb-1">
                  Observações complementares:
                </label>
                <input
                  type="text"
                  placeholder="Ex: Contagem de final de semana pelo proprietário"
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-xl p-2"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-amber-500 hover:bg-amber-600 active:scale-98 text-white font-bold text-sm rounded-xl shadow-md transition-all"
              >
                Salvar Ajuste no Sistema
              </button>
            </form>
          </div>

          {/* Past Adjustments Log */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
            <h3 className="font-bold text-sm text-slate-900">
              Histórico Permanente de Ajustes Manuais
            </h3>
            {stockAdjustments.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">
                Nenhum ajuste manual realizado até o momento.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 space-y-2 max-h-96 overflow-y-auto">
                {stockAdjustments.map((adj) => (
                  <div key={adj.id} className="pt-2 text-xs space-y-1">
                    <div className="flex justify-between items-center font-bold text-slate-900">
                      <span>{adj.productName}</span>
                      <span className="text-[10px] text-slate-400">
                        {formatDateTime(adj.timestamp)}
                      </span>
                    </div>
                    <div className="text-slate-600">
                      Cheios: {adj.previousFull} → <strong>{adj.newFull}</strong> ({adj.diffFull >= 0 ? '+' : ''}{adj.diffFull})
                      {adj.diffEmpty !== 0 && (
                        <span> | Vazios: {adj.previousEmpty} → <strong>{adj.newEmpty}</strong> ({adj.diffEmpty >= 0 ? '+' : ''}{adj.diffEmpty})</span>
                      )}
                    </div>
                    <div className="text-[11px] text-amber-800 bg-amber-50/70 p-1.5 rounded">
                      Motivo: {adj.reason} {adj.notes ? `• ${adj.notes}` : ''}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: CONFERÊNCIA FÍSICA (Requirements #30) */}
      {activeTab === 'conferencia' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4 max-w-2xl mx-auto">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Conferência Física de Estoque
            </h2>
            <p className="text-xs text-slate-500">
              Informe a quantidade física encontrada na contagem do pátio para checar eventuais divergências com o sistema.
            </p>
          </div>

          {confResultMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-bold flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>{confResultMsg}</span>
            </div>
          )}

          <div className="space-y-3 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Produto a Conferir:
              </label>
              <select
                value={confProductId}
                onChange={(e) => handleSelectProductForConf(e.target.value)}
                className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-xl p-2.5"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedConfProd && currentConfStock && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  {/* Cheios */}
                  <div className="space-y-1.5">
                    <span className="font-semibold text-slate-600 block">
                      Botijões Cheios:
                    </span>
                    <div className="text-xs text-slate-500">
                      No Sistema: <strong>{currentConfStock.fullQuantity}</strong>
                    </div>
                    <label className="font-bold text-slate-800 block text-[11px]">
                      Contagem Física:
                    </label>
                    <NumberField
                      min="0"
                      value={confPhysicalFull}
                      onValueChange={(n) => setConfPhysicalFull(n)} decimal={false}
                      className="w-full text-lg font-black text-slate-900 bg-white border border-slate-300 rounded-xl p-2"
                    />
                  </div>

                  {/* Vazios */}
                  {selectedConfProd.isCylinder && (
                    <div className="space-y-1.5">
                      <span className="font-semibold text-slate-600 block">
                        Vasilhames Vazios:
                      </span>
                      <div className="text-xs text-slate-500">
                        No Sistema: <strong>{currentConfStock.emptyQuantity}</strong>
                      </div>
                      <label className="font-bold text-slate-800 block text-[11px]">
                        Contagem Física:
                      </label>
                      <NumberField
                        min="0"
                        value={confPhysicalEmpty}
                        onValueChange={(n) => setConfPhysicalEmpty(n)} decimal={false}
                        className="w-full text-lg font-black text-slate-900 bg-white border border-slate-300 rounded-xl p-2"
                      />
                    </div>
                  )}
                </div>

                {/* Divergence Display */}
                {(diffConfFull !== 0 || diffConfEmpty !== 0) ? (
                  <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs space-y-1">
                    <div className="font-bold text-amber-900 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span>Divergência encontrada na conferência:</span>
                    </div>
                    {diffConfFull !== 0 && (
                      <p className="text-amber-800">
                        Divergência de <strong>{Math.abs(diffConfFull)} botijões cheios</strong> ({diffConfFull > 0 ? 'sobrando' : 'faltando'}).
                      </p>
                    )}
                    {diffConfEmpty !== 0 && (
                      <p className="text-amber-800">
                        Divergência de <strong>{Math.abs(diffConfEmpty)} vasilhames vazios</strong> ({diffConfEmpty > 0 ? 'sobrando' : 'faltando'}).
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-800 font-bold flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>Estoque 100% conferido! Quantidade física igual ao sistema.</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleApplyConference(false)}
                className="flex-1 py-2.5 border border-slate-300 hover:bg-slate-100 rounded-xl font-bold text-slate-700 transition-colors"
              >
                Apenas Registrar Conferência
              </button>

              <button
                type="button"
                onClick={() => handleApplyConference(true)}
                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 active:scale-98 text-white font-bold rounded-xl shadow-xs transition-all"
              >
                Ajustar Estoque com a Contagem
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
