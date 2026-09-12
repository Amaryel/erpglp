import React, { useState } from 'react';
import {
  X,
  Store,
  Truck,
  Plus,
  Minus,
  Trash2,
  Check,
  UserPlus,
  Phone,
  MapPin,
  Flame,
  CreditCard,
  Banknote,
  QrCode,
  AlertCircle,
} from 'lucide-react';
import { useErp } from '../context/ErpContext';
import { PaymentMethod, PaymentSplit, SaleType } from '../types';
import { formatCurrency } from '../utils/formatters';

interface NewSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultType?: SaleType;
  onSuccessSaleId?: (saleId: string) => void;
}

export const NewSaleModal: React.FC<NewSaleModalProps> = ({
  isOpen,
  onClose,
  defaultType = 'delivery',
  onSuccessSaleId,
}) => {
  const {
    products,
    stock,
    clients,
    deliveryPersons,
    createSale,
    addClient,
    cashRegister,
  } = useErp();

  const [saleType, setSaleType] = useState<SaleType>(defaultType);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedDeliveryPersonId, setSelectedDeliveryPersonId] = useState<string>('');
  const [deliveryPaymentMethod, setDeliveryPaymentMethod] = useState<PaymentMethod | 'a_combinar'>('dinheiro');
  const [customDeliveryAddress, setCustomDeliveryAddress] = useState<string>('');
  const [customDeliveryNeighborhood, setCustomDeliveryNeighborhood] = useState<string>('');
  const [customDeliveryPhone, setCustomDeliveryPhone] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [returnedCylinders, setReturnedCylinders] = useState<number>(0);

  // Cart items: [{ productId, quantity, unitPrice }]
  const [cart, setCart] = useState<
    { productId: string; quantity: number; unitPrice: number }[]
  >([]);

  // Payment splits for Balcao
  const [payments, setPayments] = useState<PaymentSplit[]>([
    { method: 'dinheiro', amount: 0 },
  ]);

  // Inline Quick Client Add Modal state
  const [showQuickClient, setShowQuickClient] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientAddress, setNewClientAddress] = useState('');
  const [newClientNeighborhood, setNewClientNeighborhood] = useState('');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // Selected client info
  const currentClient = clients.find((c) => c.id === selectedClientId);

  // Cart calculations
  const totalAmount = cart.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);
  const totalCylinders = cart.reduce((acc, item) => {
    const prod = products.find((p) => p.id === item.productId);
    return prod?.isCylinder ? acc + item.quantity : acc;
  }, 0);

  // Handle adding product to cart
  const handleAddProduct = (productId: string) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    setCart((prev) => {
      const existing = prev.find((item) => item.productId === productId);
      if (existing) {
        return prev.map((item) =>
          item.productId === productId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { productId, quantity: 1, unitPrice: prod.sellPrice }];
    });

    // Auto set default returned cylinders for balcao if cylinder
    if (prod.isCylinder && returnedCylinders === 0) {
      setReturnedCylinders(1);
    }
  };

  const handleUpdateQty = (productId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.productId === productId) {
            const newQ = item.quantity + delta;
            return newQ > 0 ? { ...item, quantity: newQ } : null;
          }
          return item;
        })
        .filter(Boolean) as { productId: string; quantity: number; unitPrice: number }[];
    });
  };

  const handleUpdatePrice = (productId: string, price: number) => {
    setCart((prev) =>
      prev.map((item) =>
        item.productId === productId ? { ...item, unitPrice: price } : item
      )
    );
  };

  const handleRemoveProduct = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  // Payment splits management
  const totalPaid = payments
    .filter((p) => p.method !== 'fiado')
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const fiadoAmount = payments.find((p) => p.method === 'fiado')?.amount || 0;
  const remainingToPay = totalAmount - (totalPaid + fiadoAmount);

  const handleAddPaymentRow = () => {
    setPayments((prev) => [...prev, { method: 'pix', amount: Math.max(0, remainingToPay) }]);
  };

  const handleRemovePaymentRow = (index: number) => {
    setPayments((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePaymentChange = (index: number, field: 'method' | 'amount', val: any) => {
    setPayments((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [field]: val } : p))
    );
  };

  // Quick Client creation
  const handleSaveQuickClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) return;
    const newId = addClient({
      name: newClientName.trim(),
      phone: newClientPhone.trim(),
      address: newClientAddress.trim(),
      neighborhood: newClientNeighborhood.trim(),
    });
    setSelectedClientId(newId);
    setShowQuickClient(false);
    setNewClientName('');
    setNewClientPhone('');
    setNewClientAddress('');
    setNewClientNeighborhood('');
  };

  // Submit sale
  const handleSubmitSale = () => {
    setErrorMessage(null);

    if (cart.length === 0) {
      setErrorMessage('Adicione ao menos um produto no pedido.');
      return;
    }

    // Regra: Cliente é OBRIGATÓRIO apenas se o pagamento for FIADO
    if (saleType === 'delivery') {
      if (deliveryPaymentMethod === 'fiado' && !selectedClientId) {
        setErrorMessage('Para pagamento em FIADO, é obrigatório selecionar ou cadastrar o cliente.');
        return;
      }
    }

    if (saleType === 'balcao') {
      const hasFiado = payments.some((p) => p.method === 'fiado' && p.amount > 0);
      if (hasFiado && !selectedClientId) {
        setErrorMessage('Para pagamento em FIADO, é obrigatório selecionar ou cadastrar o cliente.');
        return;
      }

      if (Math.abs(remainingToPay) > 0.05) {
        setErrorMessage(
          `O valor informado nos pagamentos (R$ ${(totalPaid + fiadoAmount).toFixed(
            2
          )}) não confere com o total da venda (R$ ${totalAmount.toFixed(2)}).`
        );
        return;
      }
    }

    // Pagamentos para delivery
    const deliveryPayments: PaymentSplit[] =
      deliveryPaymentMethod && deliveryPaymentMethod !== 'a_combinar'
        ? [{ method: deliveryPaymentMethod, amount: totalAmount }]
        : [];

    const res = createSale({
      type: saleType,
      items: cart,
      clientId: selectedClientId || undefined,
      deliveryPersonId: selectedDeliveryPersonId || undefined,
      deliveryAddress: !selectedClientId ? customDeliveryAddress.trim() || undefined : undefined,
      deliveryNeighborhood: !selectedClientId ? customDeliveryNeighborhood.trim() || undefined : undefined,
      deliveryPhone: !selectedClientId ? customDeliveryPhone.trim() || undefined : undefined,
      payments: saleType === 'balcao' ? payments : deliveryPayments,
      returnedCylinders: saleType === 'balcao' ? returnedCylinders : 0,
      notes: notes.trim() || undefined,
    });

    if (!res.success) {
      setErrorMessage(res.error || 'Erro ao processar venda.');
      return;
    }

    // Reset & close
    setCart([]);
    setSelectedClientId('');
    setSelectedDeliveryPersonId('');
    setCustomDeliveryAddress('');
    setCustomDeliveryNeighborhood('');
    setCustomDeliveryPhone('');
    setDeliveryPaymentMethod('dinheiro');
    setNotes('');
    setReturnedCylinders(0);
    onClose();

    if (res.saleId && onSuccessSaleId) {
      onSuccessSaleId(res.saleId);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[95vh] flex flex-col">
        {/* Modal Header */}
        <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-amber-400" />
            <h2 className="text-base sm:text-lg font-bold">Lançar Nova Venda</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1 space-y-4 text-slate-800">
          {/* Sale Type Selector: Balcão vs Delivery */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
            <button
              id="type-delivery-btn"
              type="button"
              onClick={() => setSaleType('delivery')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg font-bold text-sm transition-all ${
                saleType === 'delivery'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Truck className="w-4 h-4" />
              <span>Venda Delivery (Entrega)</span>
            </button>
            <button
              id="type-balcao-btn"
              type="button"
              onClick={() => {
                setSaleType('balcao');
                // Pre-fill full amount in payment
                if (totalAmount > 0) {
                  setPayments([{ method: 'dinheiro', amount: totalAmount }]);
                }
              }}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg font-bold text-sm transition-all ${
                saleType === 'balcao'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Store className="w-4 h-4" />
              <span>Venda Balcão (Direta)</span>
            </button>
          </div>

          {/* Delivery Specific: Client Selection & Details */}
          {saleType === 'delivery' && (
            <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-amber-600" />
                  <span>Cliente do Delivery</span>
                  {deliveryPaymentMethod === 'fiado' ? (
                    <span className="text-[10px] font-bold text-amber-900 bg-amber-200 px-1.5 py-0.5 rounded ml-1">
                      Obrigatório para FIADO *
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500 font-normal ml-1">
                      (Opcional - Consumidor Padrão)
                    </span>
                  )}
                </label>
                <button
                  type="button"
                  onClick={() => setShowQuickClient(true)}
                  className="text-xs text-amber-700 hover:text-amber-900 font-semibold flex items-center gap-1 underline"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  + Novo Cliente Rápido
                </button>
              </div>

              <select
                id="select-client"
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className={`w-full text-sm font-medium bg-white border rounded-lg p-2.5 focus:ring-2 focus:outline-none ${
                  deliveryPaymentMethod === 'fiado' && !selectedClientId
                    ? 'border-amber-500 focus:ring-amber-500 ring-1 ring-amber-400'
                    : 'border-amber-300 focus:ring-amber-500'
                }`}
              >
                <option value="">Consumidor Padrão (Sem cadastro prévio)</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.phone ? `(${c.phone})` : ''} - {c.neighborhood || c.address}
                  </option>
                ))}
              </select>

              {currentClient ? (
                <div className="text-xs text-amber-950 bg-white/90 p-2.5 rounded-lg border border-amber-200 flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 font-medium">
                    <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>
                      {currentClient.address} - {currentClient.neighborhood}
                    </span>
                  </div>
                  {currentClient.phone && (
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <Phone className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>{currentClient.phone}</span>
                    </div>
                  )}
                  {currentClient.notes && (
                    <div className="text-[11px] text-slate-500 italic mt-0.5">
                      Obs: {currentClient.notes}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs bg-white/90 p-2.5 rounded-lg border border-amber-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      Consumidor Padrão
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {deliveryPaymentMethod === 'fiado'
                        ? '⚠️ FIADO exige cliente cadastrado'
                        : 'Não é obrigatório cadastrar'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-amber-100">
                    <div>
                      <label className="text-[11px] font-medium text-slate-600 block mb-0.5">
                        Endereço de Entrega (Opcional):
                      </label>
                      <input
                        type="text"
                        placeholder="Rua, nº, ponto de ref."
                        value={customDeliveryAddress}
                        onChange={(e) => setCustomDeliveryAddress(e.target.value)}
                        className="w-full text-xs bg-white border border-slate-300 rounded-md p-1.5 text-slate-800 focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <div>
                        <label className="text-[11px] font-medium text-slate-600 block mb-0.5">
                          Bairro (Opcional):
                        </label>
                        <input
                          type="text"
                          placeholder="Bairro"
                          value={customDeliveryNeighborhood}
                          onChange={(e) => setCustomDeliveryNeighborhood(e.target.value)}
                          className="w-full text-xs bg-white border border-slate-300 rounded-md p-1.5 text-slate-800 focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-medium text-slate-600 block mb-0.5">
                          Telefone (Opcional):
                        </label>
                        <input
                          type="text"
                          placeholder="(00) 00000-0000"
                          value={customDeliveryPhone}
                          onChange={(e) => setCustomDeliveryPhone(e.target.value)}
                          className="w-full text-xs bg-white border border-slate-300 rounded-md p-1.5 text-slate-800 focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Forma de Pagamento Prevista para o Delivery */}
              <div className="pt-1 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-amber-600" />
                    <span>Forma de Pagamento (Prevista / Acordada):</span>
                  </label>
                  {deliveryPaymentMethod === 'fiado' && (
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-200/80 px-1.5 py-0.5 rounded">
                      Exige Cliente
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setDeliveryPaymentMethod('dinheiro')}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-colors flex items-center justify-center gap-1 ${
                      deliveryPaymentMethod === 'dinheiro'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Banknote className="w-3.5 h-3.5" />
                    <span>Dinheiro</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeliveryPaymentMethod('pix')}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-colors flex items-center justify-center gap-1 ${
                      deliveryPaymentMethod === 'pix'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>PIX</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeliveryPaymentMethod('debito')}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-colors flex items-center justify-center gap-1 ${
                      deliveryPaymentMethod === 'debito'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Cartão</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeliveryPaymentMethod('a_combinar')}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-colors flex items-center justify-center gap-1 ${
                      deliveryPaymentMethod === 'a_combinar'
                        ? 'bg-slate-800 text-white border-slate-800 shadow-xs'
                        : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>Na Entrega</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeliveryPaymentMethod('fiado')}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-colors flex items-center justify-center gap-1 sm:col-span-1 col-span-2 ${
                      deliveryPaymentMethod === 'fiado'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs ring-2 ring-amber-400'
                        : 'bg-amber-100/70 border-amber-300 text-amber-900 hover:bg-amber-200/70'
                    }`}
                  >
                    <span>FIADO</span>
                  </button>
                </div>

                {deliveryPaymentMethod === 'fiado' && (
                  <div className="p-2 bg-amber-100/90 border border-amber-300 rounded-lg text-xs text-amber-900 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>
                      Venda em <strong>FIADO</strong>: é <strong>obrigatório</strong> selecionar ou cadastrar o cliente acima para vincular em Contas a Receber.
                    </span>
                  </div>
                )}
              </div>

              {/* Delivery Person Selector */}
              <div className="pt-1">
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Vincular Entregador (Opcional):
                </label>
                <select
                  id="select-delivery-person"
                  value={selectedDeliveryPersonId}
                  onChange={(e) => setSelectedDeliveryPersonId(e.target.value)}
                  className="w-full text-sm bg-white border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  <option value="">-- Deixar sem entregador ou selecionar depois --</option>
                  {deliveryPersons
                    .filter((d) => d.isActive)
                    .map((dp) => (
                      <option key={dp.id} value={dp.id}>
                        {dp.name} ({dp.phone})
                      </option>
                    ))}
                </select>
              </div>
            </div>
          )}

          {/* Quick Client Add Modal Inline */}
          {showQuickClient && (
            <form
              onSubmit={handleSaveQuickClient}
              className="bg-white border-2 border-amber-500 rounded-xl p-3 space-y-2 shadow-md animate-fadeIn"
            >
              <div className="flex justify-between items-center pb-1 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-800">
                  Cadastrar Cliente Imediato
                </span>
                <button
                  type="button"
                  onClick={() => setShowQuickClient(false)}
                  className="text-slate-400 hover:text-slate-700 text-xs"
                >
                  Cancelar
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="font-semibold block mb-0.5">Nome *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Dona Laura"
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    className="w-full border rounded p-1.5 focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-0.5">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    placeholder="(XX) XXXXX-XXXX"
                    value={newClientPhone}
                    onChange={(e) => setNewClientPhone(e.target.value)}
                    className="w-full border rounded p-1.5 focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-0.5">Endereço (Rua e Nº)</label>
                  <input
                    type="text"
                    placeholder="Ex: Rua das Palmeiras, 220"
                    value={newClientAddress}
                    onChange={(e) => setNewClientAddress(e.target.value)}
                    className="w-full border rounded p-1.5 focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-0.5">Bairro</label>
                  <input
                    type="text"
                    placeholder="Ex: Centro"
                    value={newClientNeighborhood}
                    onChange={(e) => setNewClientNeighborhood(e.target.value)}
                    className="w-full border rounded p-1.5 focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded text-xs transition-colors"
              >
                Salvar e Selecionar Cliente
              </button>
            </form>
          )}

          {/* Product Quick Picker Buttons */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
              1. Selecione os Produtos:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {products
                .filter((p) => p.isActive)
                .map((prod) => {
                  const stockItem = stock[prod.id];
                  const fullAvailable = stockItem?.fullQuantity ?? 0;
                  const isLow = prod.minStock !== undefined && fullAvailable <= prod.minStock;

                  return (
                    <button
                      key={prod.id}
                      type="button"
                      onClick={() => handleAddProduct(prod.id)}
                      className="text-left p-2.5 rounded-xl border border-slate-200 hover:border-amber-500 bg-slate-50 hover:bg-amber-50/50 transition-all flex flex-col justify-between group active:scale-95"
                    >
                      <div>
                        <div className="font-bold text-xs sm:text-sm text-slate-900 line-clamp-1 group-hover:text-amber-700">
                          {prod.name}
                        </div>
                        <div className="text-xs text-slate-500 font-medium">
                          {formatCurrency(prod.sellPrice)}
                        </div>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[11px]">
                        <span
                          className={`font-semibold ${
                            fullAvailable <= 0
                              ? 'text-red-600'
                              : isLow
                              ? 'text-amber-600'
                              : 'text-emerald-700'
                          }`}
                        >
                          {fullAvailable} {prod.isCylinder ? 'cheios' : 'unid'}
                        </span>
                        <span className="text-amber-600 font-bold bg-amber-100/70 px-1.5 py-0.5 rounded text-[10px]">
                          + Adicionar
                        </span>
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>

          {/* Cart Table / Item List */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
              2. Itens da Venda:
            </label>
            {cart.length === 0 ? (
              <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
                Nenhum produto adicionado ainda. Toque em um dos produtos acima.
              </div>
            ) : (
              <div className="space-y-2">
                {cart.map((item) => {
                  const prod = products.find((p) => p.id === item.productId);
                  const itemTotal = item.unitPrice * item.quantity;

                  return (
                    <div
                      key={item.productId}
                      className="flex items-center justify-between gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-xs sm:text-sm text-slate-900 truncate">
                          {prod?.name}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                          <span>Preço un:</span>
                          <input
                            type="number"
                            step="0.5"
                            value={item.unitPrice}
                            onChange={(e) =>
                              handleUpdatePrice(item.productId, Number(e.target.value))
                            }
                            className="w-18 bg-white border border-slate-300 rounded px-1.5 py-0.5 text-xs font-semibold text-slate-800"
                          />
                        </div>
                      </div>

                      {/* Quantity counter */}
                      <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5">
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(item.productId, -1)}
                          className="p-1 rounded text-slate-600 hover:bg-slate-100"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-7 text-center font-bold text-xs text-slate-900">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(item.productId, 1)}
                          className="p-1 rounded text-slate-600 hover:bg-slate-100"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Item Total */}
                      <div className="text-right min-w-[70px]">
                        <div className="font-bold text-xs sm:text-sm text-slate-900">
                          {formatCurrency(itemTotal)}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveProduct(item.productId)}
                        className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Venda Balcão Payment Section */}
          {saleType === 'balcao' && cart.length > 0 && (
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Pagamento do Balcão</span>
                </label>
                <button
                  type="button"
                  onClick={handleAddPaymentRow}
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 underline"
                >
                  + Dividir Pagamento
                </button>
              </div>

              {/* Cliente for Balcao (Optional, Mandatory if Fiado) */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <span>Cliente:</span>
                    {payments.some((p) => p.method === 'fiado' && p.amount > 0) ? (
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-200 px-1.5 py-0.5 rounded">
                        Obrigatório para FIADO *
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500 font-normal">
                        (Opcional - Consumidor Padrão)
                      </span>
                    )}
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowQuickClient(true)}
                    className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold underline"
                  >
                    + Novo Cliente
                  </button>
                </div>
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className={`w-full text-xs font-medium bg-white border rounded-lg p-2 focus:ring-1 focus:ring-emerald-500 ${
                    payments.some((p) => p.method === 'fiado' && p.amount > 0) && !selectedClientId
                      ? 'border-amber-500 ring-1 ring-amber-400'
                      : 'border-slate-300'
                  }`}
                >
                  <option value="">Consumidor Padrão (Sem cadastro)</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.phone ? `(${c.phone})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Cylinders Returned input for Balcao */}
              {totalCylinders > 0 && (
                <div className="bg-white p-2.5 rounded-lg border border-emerald-200 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-slate-800">
                      Vasilhames Retornados (Vazios):
                    </span>
                    <p className="text-[11px] text-slate-500">
                      Cliente entregou o botijão vazio na troca?
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setReturnedCylinders(Math.max(0, returnedCylinders - 1))}
                      className="p-1 border rounded bg-slate-100 text-slate-700"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center font-bold text-sm">
                      {returnedCylinders}
                    </span>
                    <button
                      type="button"
                      onClick={() => setReturnedCylinders(returnedCylinders + 1)}
                      className="p-1 border rounded bg-slate-100 text-slate-700"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}

              {/* Payment rows */}
              <div className="space-y-2">
                {payments.map((p, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <select
                      value={p.method}
                      onChange={(e) =>
                        handlePaymentChange(idx, 'method', e.target.value as PaymentMethod)
                      }
                      className="text-xs font-medium bg-white border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="dinheiro">Dinheiro</option>
                      <option value="pix">PIX</option>
                      <option value="debito">Cartão Débito</option>
                      <option value="credito">Cartão Crédito</option>
                      <option value="fiado">FIADO (Contas a Receber)</option>
                      <option value="outro">Outro</option>
                    </select>

                    <div className="relative flex-1">
                      <span className="absolute left-2.5 top-2 text-xs text-slate-400 font-semibold">
                        R$
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        value={p.amount || ''}
                        onChange={(e) =>
                          handlePaymentChange(idx, 'amount', parseFloat(e.target.value) || 0)
                        }
                        placeholder="0,00"
                        className="w-full text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-lg py-2 pl-8 pr-2 focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    {payments.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemovePaymentRow(idx)}
                        className="p-1.5 text-slate-400 hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Split calculation status */}
              <div className="text-xs pt-1 flex items-center justify-between border-t border-emerald-200">
                <span className="text-slate-600">
                  Total Pago:{' '}
                  <strong className="text-slate-900">
                    {formatCurrency(totalPaid + fiadoAmount)}
                  </strong>
                </span>
                <span
                  className={`font-bold ${
                    Math.abs(remainingToPay) < 0.05 ? 'text-emerald-700' : 'text-rose-600'
                  }`}
                >
                  {Math.abs(remainingToPay) < 0.05
                    ? 'Total confere (OK)'
                    : remainingToPay > 0
                    ? `Falta: ${formatCurrency(remainingToPay)}`
                    : `Excede: ${formatCurrency(Math.abs(remainingToPay))}`}
                </span>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">
              Observações do Pedido (Opcional):
            </label>
            <input
              type="text"
              placeholder="Ex: Troco para R$ 100, entregar após às 14h, etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-amber-500"
            />
          </div>

          {/* Error display */}
          {errorMessage && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Modal Footer / Big Action Button */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <div>
            <div className="text-xs text-slate-500">Valor Total do Pedido:</div>
            <div className="text-xl sm:text-2xl font-black text-slate-900">
              {formatCurrency(totalAmount)}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2.5 border border-slate-300 hover:bg-slate-100 rounded-xl font-medium text-xs text-slate-700 transition-colors"
            >
              Cancelar
            </button>

            <button
              id="submit-sale-btn"
              type="button"
              onClick={handleSubmitSale}
              disabled={cart.length === 0}
              className={`px-5 py-2.5 rounded-xl font-bold text-sm text-white shadow-md flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none ${
                saleType === 'delivery'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-orange-500/20'
                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>
                {saleType === 'delivery'
                  ? 'Criar Entrega (Em Andamento)'
                  : 'Finalizar Venda Balcão'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
