import React, { useState } from 'react';
import {
  Package,
  Plus,
  Edit2,
  Trash2,
  Flame,
  Truck,
  Phone,
  Search,
  Check,
  Percent,
  AlertTriangle,
  CheckCircle2,
  Power,
  Info,
} from 'lucide-react';
import { useErp } from '../context/ErpContext';
import { Product, DeliveryPerson } from '../types';
import { formatCurrency } from '../utils/formatters';

type Tab = 'produtos' | 'entregadores';

export const ProductsView: React.FC = () => {
  const {
    products,
    deliveryPersons,
    addProduct,
    updateProduct,
    deleteOrDeactivateProduct,
    addDeliveryPerson,
    updateDeliveryPerson,
  } = useErp();

  const [activeTab, setActiveTab] = useState<Tab>('produtos');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');

  // Product modal
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProdId, setEditingProdId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Gás GLP');
  const [costPrice, setCostPrice] = useState<number>(0);
  const [sellPrice, setSellPrice] = useState<number>(0);
  const [minStock, setMinStock] = useState<number>(10);
  const [isCylinder, setIsCylinder] = useState(true);
  const [isActive, setIsActive] = useState(true);

  // Deletion feedback modal
  const [confirmDeleteProd, setConfirmDeleteProd] = useState<Product | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{
    type: 'deleted' | 'deactivated' | 'info';
    text: string;
  } | null>(null);

  // Delivery person modal
  const [showDpModal, setShowDpModal] = useState(false);
  const [editingDpId, setEditingDpId] = useState<string | null>(null);
  const [dpName, setDpName] = useState('');
  const [dpPhone, setDpPhone] = useState('');
  const [dpVehicle, setDpVehicle] = useState('');

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.code.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    if (filterActive === 'active') return p.isActive;
    if (filterActive === 'inactive') return !p.isActive;
    return true;
  });

  const handleOpenNewProduct = () => {
    setEditingProdId(null);
    setName('');
    setCategory('Gás GLP');
    setCostPrice(0);
    setSellPrice(0);
    setMinStock(10);
    setIsCylinder(true);
    setIsActive(true);
    setShowProductModal(true);
  };

  const handleOpenEditProduct = (p: Product) => {
    setEditingProdId(p.id);
    setName(p.name);
    setCategory(p.category || 'Gás GLP');
    setCostPrice(p.costPrice);
    setSellPrice(p.sellPrice);
    setMinStock(p.minStock ?? 10);
    setIsCylinder(p.isCylinder);
    setIsActive(p.isActive);
    setShowProductModal(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingProdId) {
      updateProduct(editingProdId, {
        name: name.trim(),
        category,
        costPrice: Number(costPrice),
        sellPrice: Number(sellPrice),
        minStock: Number(minStock),
        isCylinder,
        isActive,
      });
    } else {
      addProduct({
        name: name.trim(),
        category,
        costPrice: Number(costPrice),
        sellPrice: Number(sellPrice),
        minStock: Number(minStock),
        isCylinder,
        isActive,
      });
    }

    setShowProductModal(false);
  };

  const handleConfirmDelete = () => {
    if (!confirmDeleteProd) return;
    const result = deleteOrDeactivateProduct(confirmDeleteProd.id);
    setConfirmDeleteProd(null);
    if (showProductModal) setShowProductModal(false);
    setFeedbackMessage({
      type: result.action,
      text: result.message,
    });
  };

  const handleOpenNewDp = () => {
    setEditingDpId(null);
    setDpName('');
    setDpPhone('');
    setDpVehicle('');
    setShowDpModal(true);
  };

  const handleOpenEditDp = (dp: DeliveryPerson) => {
    setEditingDpId(dp.id);
    setDpName(dp.name);
    setDpPhone(dp.phone);
    setDpVehicle(dp.vehicle || '');
    setShowDpModal(true);
  };

  const handleSaveDp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dpName.trim()) return;

    if (editingDpId) {
      updateDeliveryPerson(editingDpId, {
        name: dpName.trim(),
        phone: dpPhone.trim(),
        vehicle: dpVehicle.trim() || undefined,
      });
    } else {
      addDeliveryPerson({
        name: dpName.trim(),
        phone: dpPhone.trim(),
        vehicle: dpVehicle.trim() || undefined,
        isActive: true,
      });
    }

    setShowDpModal(false);
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Header */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-600">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-black text-slate-900">
              Produtos & Entregadores
            </h1>
            <p className="text-xs text-slate-500">
              Gerencie a tabela de preços, custos de reposição, estoque mínimo e equipe de entrega
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('produtos')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'produtos'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600'
              }`}
            >
              Produtos ({products.length})
            </button>
            <button
              onClick={() => setActiveTab('entregadores')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'entregadores'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600'
              }`}
            >
              Entregadores ({deliveryPersons.length})
            </button>
          </div>

          <button
            onClick={
              activeTab === 'produtos' ? handleOpenNewProduct : handleOpenNewDp
            }
            className="bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold text-xs sm:text-sm px-3.5 py-2 rounded-xl shadow-xs flex items-center gap-1.5 transition-transform"
          >
            <Plus className="w-4 h-4" />
            <span>{activeTab === 'produtos' ? 'Novo Produto' : 'Novo Entregador'}</span>
          </button>
        </div>
      </div>

      {activeTab === 'produtos' ? (
        <div className="space-y-3">
          {/* Feedback alert if any */}
          {feedbackMessage && (
            <div
              className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 text-xs ${
                feedbackMessage.type === 'deleted'
                  ? 'bg-red-50 border-red-200 text-red-900'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}
            >
              <div className="flex items-start gap-2">
                {feedbackMessage.type === 'deleted' ? (
                  <CheckCircle2 className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                ) : (
                  <Info className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                )}
                <div>
                  <p className="font-bold">
                    {feedbackMessage.type === 'deleted' ? 'Produto Excluído' : 'Produto Inativado'}
                  </p>
                  <p className="text-[11px] mt-0.5 opacity-90">{feedbackMessage.text}</p>
                </div>
              </div>
              <button
                onClick={() => setFeedbackMessage(null)}
                className="text-xs font-bold underline shrink-0 hover:opacity-80"
              >
                Entendi
              </button>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por código ou nome do produto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs sm:text-sm bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div className="flex bg-slate-100 p-1 rounded-xl shrink-0 text-xs font-semibold">
              <button
                onClick={() => setFilterActive('all')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  filterActive === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                Todos ({products.length})
              </button>
              <button
                onClick={() => setFilterActive('active')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  filterActive === 'active' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600'
                }`}
              >
                Ativos ({products.filter((p) => p.isActive).length})
              </button>
              <button
                onClick={() => setFilterActive('inactive')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  filterActive === 'inactive' ? 'bg-white text-slate-700 shadow-xs' : 'text-slate-600'
                }`}
              >
                Inativos ({products.filter((p) => !p.isActive).length})
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredProducts.map((p) => {
              const unitProfit = p.sellPrice - p.costPrice;
              const margin = p.sellPrice > 0 ? (unitProfit / p.sellPrice) * 100 : 0;

              return (
                <div
                  key={p.id}
                  className={`rounded-2xl border p-4 shadow-xs transition-all flex flex-col justify-between gap-3 ${
                    p.isActive
                      ? 'bg-white border-slate-200 hover:border-amber-400'
                      : 'bg-slate-50/80 border-slate-200 opacity-80'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          {p.code}
                        </span>
                        {!p.isActive && (
                          <span className="text-[10px] font-bold text-slate-600 bg-slate-200 px-2 py-0.5 rounded">
                            Inativo
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditProduct(p)}
                          title="Editar produto"
                          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setConfirmDeleteProd(p)}
                          title="Excluir ou inativar produto"
                          className="p-1 rounded-lg text-red-400 hover:text-red-700 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-1.5">
                      {p.isCylinder && <Flame className="w-4 h-4 text-amber-500 shrink-0" />}
                      {p.name}
                    </h3>
                    <span className="text-[11px] text-slate-400">
                      {p.category} {p.isCylinder ? '• Vasilhame GLP' : ''}
                    </span>
                  </div>

                  {/* Financials of the product */}
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs space-y-1">
                    <div className="flex justify-between text-slate-600">
                      <span>Custo de Reposição:</span>
                      <span className="font-semibold">{formatCurrency(p.costPrice)}</span>
                    </div>
                    <div className="flex justify-between text-slate-900 font-bold">
                      <span>Preço de Venda:</span>
                      <span className="text-base text-emerald-700 font-black">
                        {formatCurrency(p.sellPrice)}
                      </span>
                    </div>
                    <div className="pt-1 border-t border-slate-200 flex justify-between text-[11px] text-emerald-800">
                      <span>Lucro Unitário:</span>
                      <span className="font-bold">
                        {formatCurrency(unitProfit)} ({margin.toFixed(0)}%)
                      </span>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-400 flex items-center justify-between">
                    <span>Estoque Mínimo: {p.minStock ?? 0}</span>
                    <button
                      onClick={() => updateProduct(p.id, { isActive: !p.isActive })}
                      className={`text-[11px] font-semibold flex items-center gap-1 hover:underline ${
                        p.isActive ? 'text-emerald-700' : 'text-slate-500'
                      }`}
                    >
                      <Power className="w-3 h-3" />
                      {p.isActive ? 'Ativo (clique p/ pausar)' : 'Inativo (clique p/ ativar)'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Entregadores Tab */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {deliveryPersons.map((dp) => (
            <div
              key={dp.id}
              className="bg-white rounded-2xl border border-slate-200 hover:border-amber-400 p-4 shadow-xs transition-all flex flex-col justify-between gap-3"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <h3 className="font-bold text-slate-900 text-base flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-amber-500" />
                    {dp.name}
                  </h3>
                  <button
                    onClick={() => handleOpenEditDp(dp)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{dp.phone}</span>
                </div>

                {dp.vehicle && (
                  <div className="text-xs text-slate-500 mt-1">
                    Veículo / Placa: <strong>{dp.vehicle}</strong>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span
                  className={`font-semibold ${
                    dp.isActive ? 'text-emerald-700' : 'text-slate-400'
                  }`}
                >
                  {dp.isActive ? 'Disponível para rotas' : 'Inativo'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Add/Edit Product */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/80">
          <form
            onSubmit={handleSaveProduct}
            className="bg-white rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                {editingProdId ? 'Editar Produto' : 'Cadastrar Novo Produto'}
              </h3>
              <button
                type="button"
                onClick={() => setShowProductModal(false)}
                className="text-slate-400 hover:text-slate-700 text-xs"
              >
                Cancelar
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Nome do Produto *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Botijão P13 Cheio"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Categoria</label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl p-2"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Estoque Mínimo
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={minStock}
                    onChange={(e) => setMinStock(parseInt(e.target.value) || 0)}
                    className="w-full border border-slate-300 rounded-xl p-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Preço de Custo (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={costPrice || ''}
                    onChange={(e) => setCostPrice(parseFloat(e.target.value) || 0)}
                    className="w-full border border-slate-300 rounded-xl p-2 font-bold text-slate-800"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Preço de Venda (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={sellPrice || ''}
                    onChange={(e) => setSellPrice(parseFloat(e.target.value) || 0)}
                    className="w-full border border-slate-300 rounded-xl p-2 font-black text-emerald-700"
                  />
                </div>
              </div>

              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 block">
                    É um Botijão/Vasilhame GLP?
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Habilita segregação de botijões cheios e vazios
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={isCylinder}
                  onChange={(e) => setIsCylinder(e.target.checked)}
                  className="w-4 h-4 text-amber-500 rounded focus:ring-amber-400"
                />
              </div>

              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 block">
                    Produto Ativo no Catálogo?
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Produtos inativos não aparecem na tela de vendas
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-400"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              {editingProdId && (
                <button
                  type="button"
                  onClick={() => {
                    const prodToDel = products.find((p) => p.id === editingProdId);
                    if (prodToDel) setConfirmDeleteProd(prodToDel);
                  }}
                  className="py-2.5 px-3 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Excluir</span>
                </button>
              )}
              <button
                type="submit"
                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md transition-all"
              >
                Salvar Produto
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Confirmation Modal for Delete/Deactivate Product */}
      {confirmDeleteProd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/80">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Excluir ou Inativar Produto?
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  Produto selecionado: <strong className="text-slate-900">{confirmDeleteProd.name}</strong> ({confirmDeleteProd.code})
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2 text-slate-700 leading-relaxed">
              <p className="font-semibold text-slate-900">Regra de Segurança do Sistema:</p>
              <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-600">
                <li>
                  <strong>Sem histórico:</strong> Se o produto nunca teve movimentações no estoque ou vendas, ele será <strong>excluído definitivamente</strong>.
                </li>
                <li>
                  <strong>Com histórico:</strong> Se o produto já possui vendas ou histórico de estoque, ele será apenas <strong>inativado</strong> para preservar relatórios, lucro e auditoria fiscal.
                </li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteProd(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 active:scale-95 rounded-xl shadow-xs transition-all flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirmar Ação</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Add/Edit Delivery Person */}
      {showDpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/80">
          <form
            onSubmit={handleSaveDp}
            className="bg-white rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                {editingDpId ? 'Editar Entregador' : 'Cadastrar Entregador'}
              </h3>
              <button
                type="button"
                onClick={() => setShowDpModal(false)}
                className="text-slate-400 hover:text-slate-700 text-xs"
              >
                Cancelar
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Nome do Entregador *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Carlos Santos"
                  value={dpName}
                  onChange={(e) => setDpName(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2 font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Telefone / WhatsApp *
                </label>
                <input
                  type="text"
                  required
                  placeholder="(XX) XXXXX-XXXX"
                  value={dpPhone}
                  onChange={(e) => setDpPhone(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Veículo / Moto / Placa (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Moto Honda Cargo 160 - Placa ABC-1234"
                  value={dpVehicle}
                  onChange={(e) => setDpVehicle(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-md transition-colors"
            >
              Salvar Entregador
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
