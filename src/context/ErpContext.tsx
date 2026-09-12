import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import {
  Product,
  StockItem,
  StockMovement,
  StockAdjustment,
  Client,
  DeliveryPerson,
  Supplier,
  Sale,
  SaleItem,
  SaleStatus,
  SaleType,
  PaymentSplit,
  PaymentMethod,
  AccountReceivable,
  CashRegister,
  CashMovement,
  Expense,
  AccountPayable,
  AuditLog,
  StockConference,
  CashConference,
  AppSettings,
} from '../types';
import {
  INITIAL_PRODUCTS,
  INITIAL_STOCK,
  INITIAL_CLIENTS,
  INITIAL_DELIVERY_PERSONS,
  INITIAL_SUPPLIERS,
  INITIAL_CASH_REGISTER,
  INITIAL_CASH_MOVEMENTS,
  INITIAL_SALES,
  INITIAL_RECEIVABLES,
  INITIAL_PAYABLES,
  INITIAL_EXPENSES,
  INITIAL_AUDIT_LOGS,
  INITIAL_STOCK_MOVEMENTS,
  DEFAULT_SETTINGS,
} from '../data/initialData';
import { generateNextCode } from '../utils/formatters';

interface ErpContextType {
  // State
  products: Product[];
  stock: Record<string, StockItem>;
  stockMovements: StockMovement[];
  stockAdjustments: StockAdjustment[];
  clients: Client[];
  deliveryPersons: DeliveryPerson[];
  suppliers: Supplier[];
  sales: Sale[];
  receivables: AccountReceivable[];
  payables: AccountPayable[];
  cashRegister: CashRegister | null;
  cashMovements: CashMovement[];
  expenses: Expense[];
  auditLogs: AuditLog[];
  stockConferences: StockConference[];
  cashConferences: CashConference[];

  // Sales
  createSale: (saleData: {
    type: SaleType;
    items: { productId: string; quantity: number; unitPrice?: number }[];
    clientId?: string;
    deliveryPersonId?: string;
    deliveryAddress?: string;
    deliveryNeighborhood?: string;
    deliveryPhone?: string;
    payments?: PaymentSplit[];
    returnedCylinders?: number;
    notes?: string;
  }) => { success: boolean; error?: string; saleId?: string };
  updateDeliveryStatus: (saleId: string, status: 'em_entrega' | 'aguardando_finalizacao') => void;
  finalizeDelivery: (
    saleId: string,
    params: {
      returnedCylinders: number;
      payments: PaymentSplit[];
      clientId?: string;
      notes?: string;
    }
  ) => { success: boolean; error?: string };
  cancelSale: (saleId: string, reason: string) => { success: boolean; error?: string };

  // Stock
  adjustStock: (params: {
    productId: string;
    newFull: number;
    newEmpty: number;
    reason: string;
    notes?: string;
  }) => void;
  performStockConference: (params: {
    productId: string;
    physicalFull: number;
    physicalEmpty: number;
    reason: string;
    applyAdjustment: boolean;
  }) => void;

  // Receivables
  registerReceivablePayment: (params: {
    receivableId: string;
    amount: number;
    method: PaymentMethod;
    notes?: string;
  }) => { success: boolean; error?: string };

  // Cash Register
  openCashRegister: (initialBalance: number) => void;
  closeCashRegister: (physicalCounted: number, notes?: string) => { difference: number };
  addManualCashMovement: (params: {
    type: 'entrada' | 'saida' | 'sangria' | 'suprimento';
    amount: number;
    method: PaymentMethod;
    description: string;
  }) => void;
  performCashConference: (physicalCounted: number, notes?: string) => { difference: number };

  // Settings
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;

  // Expenses & Payables
  addExpense: (expense: Omit<Expense, 'id' | 'date'>) => void;
  updateExpense: (id: string, updates: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;
  addAccountPayable: (payable: Omit<AccountPayable, 'id' | 'status'>) => void;
  payAccountPayable: (payableId: string, paymentMethod: PaymentMethod, paidFromCash: boolean) => void;
  addPayable: (payable: Omit<AccountPayable, 'id' | 'status'>) => void;
  payBill: (payableId: string, paymentMethod: PaymentMethod, amount?: number, paidFromCash?: boolean) => void;
  deletePayable: (payableId: string) => void;

  // Products & Entities
  addProduct: (product: Omit<Product, 'id' | 'code'>) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteOrDeactivateProduct: (productId: string) => { action: 'deleted' | 'deactivated'; message: string };
  addClient: (client: Omit<Client, 'id' | 'createdAt'>) => string;
  updateClient: (id: string, updates: Partial<Client>) => void;
  addDeliveryPerson: (dp: Omit<DeliveryPerson, 'id'>) => void;
  updateDeliveryPerson: (id: string, updates: Partial<DeliveryPerson>) => void;
  addSupplier: (supplier: Omit<Supplier, 'id'>) => void;
  updateSupplier: (id: string, updates: Partial<Supplier>) => void;

  // Utilities & Data Management
  resetToSampleData: () => void;
  clearAllData: () => void;
  clearOperationalData: () => void;
  generateSampleData: () => void;
  exportDatabaseJson: () => string;
  importDatabaseJson: (jsonString: string) => boolean;

  // Computed Helpers
  totalFullCylinders: number;
  totalEmptyCylinders: number;
  criticalStockCount: number;
  inProgressDeliveriesCount: number;
  pendingDeliveriesCount: number;
  totalReceivablesAmount: number;
  overdueReceivablesAmount: number;
  overduePayablesCount: number;
  todaySalesCount: number;
  todayRevenue: number;
  todayGrossProfit: number;
  todayNetResult: number;
}

const STORAGE_KEY = 'erpglp_database_v1';

const ErpContext = createContext<ErpContextType | null>(null);

export function ErpProvider({ children }: { children: ReactNode }) {
  // Load from localStorage or initialize with seed data
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_products`);
    return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
  });

  const [stock, setStock] = useState<Record<string, StockItem>>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_stock`);
    return saved ? JSON.parse(saved) : INITIAL_STOCK;
  });

  const [stockMovements, setStockMovements] = useState<StockMovement[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_stockMovements`);
    return saved ? JSON.parse(saved) : INITIAL_STOCK_MOVEMENTS;
  });

  const [stockAdjustments, setStockAdjustments] = useState<StockAdjustment[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_stockAdjustments`);
    return saved ? JSON.parse(saved) : [];
  });

  const [clients, setClients] = useState<Client[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_clients`);
    return saved ? JSON.parse(saved) : INITIAL_CLIENTS;
  });

  const [deliveryPersons, setDeliveryPersons] = useState<DeliveryPerson[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_deliveryPersons`);
    return saved ? JSON.parse(saved) : INITIAL_DELIVERY_PERSONS;
  });

  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_suppliers`);
    return saved ? JSON.parse(saved) : INITIAL_SUPPLIERS;
  });

  const [sales, setSales] = useState<Sale[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_sales`);
    return saved ? JSON.parse(saved) : INITIAL_SALES;
  });

  const [receivables, setReceivables] = useState<AccountReceivable[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_receivables`);
    return saved ? JSON.parse(saved) : INITIAL_RECEIVABLES;
  });

  const [payables, setPayables] = useState<AccountPayable[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_payables`);
    return saved ? JSON.parse(saved) : INITIAL_PAYABLES;
  });

  const [cashRegister, setCashRegister] = useState<CashRegister | null>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_cashRegister`);
    return saved ? JSON.parse(saved) : INITIAL_CASH_REGISTER;
  });

  const [cashMovements, setCashMovements] = useState<CashMovement[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_cashMovements`);
    return saved ? JSON.parse(saved) : INITIAL_CASH_MOVEMENTS;
  });

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_expenses`);
    return saved ? JSON.parse(saved) : INITIAL_EXPENSES;
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_auditLogs`);
    return saved ? JSON.parse(saved) : INITIAL_AUDIT_LOGS;
  });

  const [stockConferences, setStockConferences] = useState<StockConference[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_stockConferences`);
    return saved ? JSON.parse(saved) : [];
  });

  const [cashConferences, setCashConferences] = useState<CashConference[]>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_cashConferences`);
    return saved ? JSON.parse(saved) : [];
  });

  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem(`${STORAGE_KEY}_settings`);
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      try {
        localStorage.setItem(`${STORAGE_KEY}_settings`, JSON.stringify(updated));
      } catch (e) {
        console.error('Error saving settings', e);
      }
      return updated;
    });
    addAuditLog('Configurações atualizadas', 'sistema', 'Parâmetros da empresa/revenda alterados.');
  };

  // Auto-persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY}_products`, JSON.stringify(products));
      localStorage.setItem(`${STORAGE_KEY}_stock`, JSON.stringify(stock));
      localStorage.setItem(`${STORAGE_KEY}_stockMovements`, JSON.stringify(stockMovements));
      localStorage.setItem(`${STORAGE_KEY}_stockAdjustments`, JSON.stringify(stockAdjustments));
      localStorage.setItem(`${STORAGE_KEY}_clients`, JSON.stringify(clients));
      localStorage.setItem(`${STORAGE_KEY}_deliveryPersons`, JSON.stringify(deliveryPersons));
      localStorage.setItem(`${STORAGE_KEY}_suppliers`, JSON.stringify(suppliers));
      localStorage.setItem(`${STORAGE_KEY}_sales`, JSON.stringify(sales));
      localStorage.setItem(`${STORAGE_KEY}_receivables`, JSON.stringify(receivables));
      localStorage.setItem(`${STORAGE_KEY}_payables`, JSON.stringify(payables));
      localStorage.setItem(`${STORAGE_KEY}_cashRegister`, JSON.stringify(cashRegister));
      localStorage.setItem(`${STORAGE_KEY}_cashMovements`, JSON.stringify(cashMovements));
      localStorage.setItem(`${STORAGE_KEY}_expenses`, JSON.stringify(expenses));
      localStorage.setItem(`${STORAGE_KEY}_auditLogs`, JSON.stringify(auditLogs));
      localStorage.setItem(`${STORAGE_KEY}_stockConferences`, JSON.stringify(stockConferences));
      localStorage.setItem(`${STORAGE_KEY}_cashConferences`, JSON.stringify(cashConferences));
      localStorage.setItem(`${STORAGE_KEY}_settings`, JSON.stringify(settings));
    } catch (e) {
      console.error('Error saving state to localStorage', e);
    }
  }, [
    products,
    stock,
    stockMovements,
    stockAdjustments,
    clients,
    deliveryPersons,
    suppliers,
    sales,
    receivables,
    payables,
    cashRegister,
    cashMovements,
    expenses,
    auditLogs,
    stockConferences,
    cashConferences,
    settings,
  ]);

  // Helper to log audit events
  const addAuditLog = (
    action: string,
    category: AuditLog['category'],
    details: string,
    extra?: { saleId?: string; productId?: string }
  ) => {
    const newLog: AuditLog = {
      id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      action,
      category,
      details,
      saleId: extra?.saleId,
      productId: extra?.productId,
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  // 1. CREATE SALE
  const createSale = ({
    type,
    items: inputItems,
    clientId,
    deliveryPersonId,
    deliveryAddress,
    deliveryNeighborhood,
    deliveryPhone,
    payments = [],
    returnedCylinders = 0,
    notes,
  }: {
    type: SaleType;
    items: { productId: string; quantity: number; unitPrice?: number }[];
    clientId?: string;
    deliveryPersonId?: string;
    deliveryAddress?: string;
    deliveryNeighborhood?: string;
    deliveryPhone?: string;
    payments?: PaymentSplit[];
    returnedCylinders?: number;
    notes?: string;
  }) => {
    if (!inputItems || inputItems.length === 0) {
      return { success: false, error: 'Selecione ao menos um produto para a venda.' };
    }

    const client = clients.find((c) => c.id === clientId);
    const deliveryPerson = deliveryPersons.find((d) => d.id === deliveryPersonId);

    // Build sale items with FROZEN unit cost at sale time
    const saleItems: SaleItem[] = [];
    let totalAmount = 0;
    let totalCost = 0;
    let dispatchedCylinders = 0;

    for (const item of inputItems) {
      const prod = products.find((p) => p.id === item.productId);
      if (!prod) continue;
      const unitPrice = item.unitPrice !== undefined ? Number(item.unitPrice) : prod.sellPrice;
      const itemTotal = unitPrice * item.quantity;
      const itemCostTotal = prod.costPrice * item.quantity;

      totalAmount += itemTotal;
      totalCost += itemCostTotal;

      if (prod.isCylinder) {
        dispatchedCylinders += item.quantity;
      }

      saleItems.push({
        productId: prod.id,
        productName: prod.name,
        quantity: item.quantity,
        unitCost: prod.costPrice, // REGRA CRÍTICA: guarda custo do momento da venda
        unitPrice,
        total: itemTotal,
        isCylinder: prod.isCylinder,
      });
    }

    const grossProfit = totalAmount - totalCost;
    const profitMargin = totalAmount > 0 ? (grossProfit / totalAmount) * 100 : 0;
    const nextSaleNumber = sales.length > 0 ? Math.max(...sales.map((s) => s.saleNumber)) + 1 : 1001;
    const saleId = `sale-${Date.now()}`;
    const timestamp = new Date().toISOString();

    if (type === 'balcao') {
      // Venda Balcão: Finaliza imediatamente
      const totalPaid = payments.filter((p) => p.method !== 'fiado').reduce((sum, p) => sum + p.amount, 0);
      const fiadoPart = payments.find((p) => p.method === 'fiado')?.amount || 0;

      if (totalPaid + fiadoPart < totalAmount - 0.01) {
        return {
          success: false,
          error: `O valor informado (${(totalPaid + fiadoPart).toFixed(2)}) é menor que o total da venda (${totalAmount.toFixed(2)}).`,
        };
      }

      // Baixa estoque de cheios e adiciona vazios retornados
      setStock((prev) => {
        const nextStock = { ...prev };
        for (const item of saleItems) {
          const current = nextStock[item.productId] || {
            productId: item.productId,
            fullQuantity: 0,
            emptyQuantity: 0,
            lastUpdated: timestamp,
          };

          const newFull = Math.max(0, current.fullQuantity - item.quantity);
          const newEmpty = item.isCylinder
            ? current.emptyQuantity + (returnedCylinders > 0 ? returnedCylinders : item.quantity)
            : current.emptyQuantity;

          nextStock[item.productId] = {
            ...current,
            fullQuantity: newFull,
            emptyQuantity: newEmpty,
            lastUpdated: timestamp,
          };
        }
        return nextStock;
      });

      // Movimentações de estoque
      const newMovements: StockMovement[] = [];
      for (const item of saleItems) {
        newMovements.push({
          id: `sm-${Date.now()}-${item.productId}-out`,
          timestamp,
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          stockType: item.isCylinder ? 'cheio' : 'unitario',
          direction: 'saida',
          type: 'venda',
          origin: `Venda Balcão #${nextSaleNumber}`,
          relatedSaleId: saleId,
          previousQty: stock[item.productId]?.fullQuantity || 0,
          newQty: Math.max(0, (stock[item.productId]?.fullQuantity || 0) - item.quantity),
        });

        if (item.isCylinder) {
          const returned = returnedCylinders > 0 ? returnedCylinders : item.quantity;
          newMovements.push({
            id: `sm-${Date.now()}-${item.productId}-in`,
            timestamp,
            productId: item.productId,
            productName: item.productName,
            quantity: returned,
            stockType: 'vazio',
            direction: 'entrada',
            type: 'retorno_vasilhame',
            origin: `Retorno Venda #${nextSaleNumber}`,
            relatedSaleId: saleId,
            previousQty: stock[item.productId]?.emptyQuantity || 0,
            newQty: (stock[item.productId]?.emptyQuantity || 0) + returned,
          });
        }
      }
      setStockMovements((prev) => [...newMovements, ...prev]);

      // Registra pagamentos no Caixa (apenas os recebidos, fiado não entra no caixa!)
      if (cashRegister && cashRegister.status === 'aberto') {
        const validCashPayments = payments.filter((p) => p.method !== 'fiado' && p.amount > 0);
        if (validCashPayments.length > 0) {
          const newCashMoves: CashMovement[] = validCashPayments.map((p) => ({
            id: `cm-${Date.now()}-${p.method}`,
            cashRegisterId: cashRegister.id,
            timestamp,
            type: 'venda',
            amount: p.amount,
            method: p.method,
            description: `Venda Balcão #${nextSaleNumber} (${client?.name || 'Balcão'})`,
            relatedSaleId: saleId,
          }));

          setCashMovements((prev) => [...newCashMoves, ...prev]);
          setCashRegister((prev) =>
            prev ? { ...prev, currentBalance: prev.currentBalance + totalPaid } : null
          );
        }
      }

      // Se houver fiado, registra em Contas a Receber
      if (fiadoPart > 0) {
        const newReceivable: AccountReceivable = {
          id: `rec-${Date.now()}`,
          saleId,
          saleNumber: nextSaleNumber,
          clientId: client?.id || 'cli-avulso',
          clientName: client?.name || 'Cliente Balcão Fiado',
          clientPhone: client?.phone,
          totalAmount: fiadoPart,
          paidAmount: 0,
          remainingAmount: fiadoPart,
          createdAt: timestamp,
          dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
          status: 'aberto',
          paymentHistory: [],
        };
        setReceivables((prev) => [newReceivable, ...prev]);
      }

      const newSale: Sale = {
        id: saleId,
        saleNumber: nextSaleNumber,
        type: 'balcao',
        status: 'finalizada',
        createdAt: timestamp,
        finalizedAt: timestamp,
        clientId: client?.id,
        clientName: client?.name || 'Consumidor Padrão',
        clientPhone: client?.phone,
        clientAddress: client?.address,
        clientNeighborhood: client?.neighborhood,
        items: saleItems,
        totalAmount,
        totalCost,
        grossProfit,
        profitMargin,
        dispatchedCylinders,
        returnedCylinders: returnedCylinders > 0 ? returnedCylinders : dispatchedCylinders,
        payments,
        paidAmount: totalPaid,
        fiadoAmount: fiadoPart,
        notes,
      };

      setSales((prev) => [newSale, ...prev]);
      addAuditLog(
        `Venda Balcão #${nextSaleNumber} finalizada`,
        'venda',
        `Valor: R$ ${totalAmount.toFixed(2)} | Recebido: R$ ${totalPaid.toFixed(2)} | Fiado: R$ ${fiadoPart.toFixed(2)}`,
        { saleId }
      );

      return { success: true, saleId };
    } else {
      // Venda Delivery:
      // REGRA CRÍTICA:
      // 1. NÃO entra no caixa!
      // 2. Diminui botijões cheios do estoque (saíram para entrega).
      // 3. Fica em "Vendas em Andamento" como 'pendente'.
      setStock((prev) => {
        const nextStock = { ...prev };
        for (const item of saleItems) {
          const current = nextStock[item.productId] || {
            productId: item.productId,
            fullQuantity: 0,
            emptyQuantity: 0,
            lastUpdated: timestamp,
          };
          const newFull = Math.max(0, current.fullQuantity - item.quantity);
          nextStock[item.productId] = {
            ...current,
            fullQuantity: newFull,
            lastUpdated: timestamp,
          };
        }
        return nextStock;
      });

      // Movimentação de saída dos cheios
      const newMovements: StockMovement[] = saleItems.map((item) => ({
        id: `sm-${Date.now()}-${item.productId}-out`,
        timestamp,
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        stockType: item.isCylinder ? 'cheio' : 'unitario',
        direction: 'saida',
        type: 'venda',
        origin: `Saída Delivery #${nextSaleNumber}`,
        relatedSaleId: saleId,
        previousQty: stock[item.productId]?.fullQuantity || 0,
        newQty: Math.max(0, (stock[item.productId]?.fullQuantity || 0) - item.quantity),
      }));
      setStockMovements((prev) => [...newMovements, ...prev]);

      const newSale: Sale = {
        id: saleId,
        saleNumber: nextSaleNumber,
        type: 'delivery',
        status: 'pendente',
        createdAt: timestamp,
        clientId: client?.id,
        clientName: client ? client.name : 'Consumidor Padrão',
        clientPhone: client ? client.phone : (deliveryPhone || undefined),
        clientAddress: client ? client.address : (deliveryAddress || undefined),
        clientNeighborhood: client ? client.neighborhood : (deliveryNeighborhood || undefined),
        deliveryPersonId: deliveryPerson?.id,
        deliveryPersonName: deliveryPerson?.name,
        items: saleItems,
        totalAmount,
        totalCost,
        grossProfit,
        profitMargin,
        dispatchedCylinders,
        returnedCylinders: 0,
        payments: payments || [],
        paidAmount: 0,
        fiadoAmount: 0,
        notes,
      };

      setSales((prev) => [newSale, ...prev]);
      addAuditLog(
        `Venda Delivery #${nextSaleNumber} criada`,
        'venda',
        `Cliente: ${client?.name || 'Consumidor Padrão'} | Total: R$ ${totalAmount.toFixed(2)} | ${dispatchedCylinders} cheios saíram para entrega. Venda NÃO entrou no caixa.`,
        { saleId }
      );

      return { success: true, saleId };
    }
  };

  // 2. UPDATE DELIVERY STATUS (em_entrega / aguardando_finalizacao)
  const updateDeliveryStatus = (saleId: string, newStatus: 'em_entrega' | 'aguardando_finalizacao') => {
    const sale = sales.find((s) => s.id === saleId);
    if (!sale) return;

    setSales((prev) =>
      prev.map((s) => (s.id === saleId ? { ...s, status: newStatus } : s))
    );

    const statusLabel = newStatus === 'em_entrega' ? 'Saiu para entrega' : 'Aguardando finalização';
    addAuditLog(
      `Venda #${sale.saleNumber} status: ${statusLabel}`,
      'venda',
      `Status atualizado para: ${statusLabel}`,
      { saleId }
    );
  };

  // 3. FINALIZE DELIVERY
  const finalizeDelivery = (
    saleId: string,
    {
      returnedCylinders,
      payments,
      clientId,
      notes,
    }: {
      returnedCylinders: number;
      payments: PaymentSplit[];
      clientId?: string;
      notes?: string;
    }
  ) => {
    const sale = sales.find((s) => s.id === saleId);
    if (!sale) {
      return { success: false, error: 'Venda não encontrada.' };
    }
    if (sale.status === 'finalizada') {
      return { success: false, error: 'Esta venda já foi finalizada anteriormente.' };
    }

    const totalPaid = payments.filter((p) => p.method !== 'fiado').reduce((sum, p) => sum + p.amount, 0);
    const fiadoPart = payments.find((p) => p.method === 'fiado')?.amount || 0;

    // Regra: Se houver fiado, é obrigatório ter cliente vinculado
    const targetClientId = clientId || sale.clientId;
    const linkedClient = targetClientId ? clients.find((c) => c.id === targetClientId) : undefined;
    if (fiadoPart > 0 && !targetClientId) {
      return {
        success: false,
        error: 'Para pagamento em FIADO (Contas a Receber), é obrigatório selecionar um cliente cadastrado.',
      };
    }

    // Regra: Total pago + valor fiado deve ser igual ao total da venda
    if (Math.abs(totalPaid + fiadoPart - sale.totalAmount) > 0.05) {
      return {
        success: false,
        error: `O total pago (R$ ${totalPaid.toFixed(2)}) + fiado (R$ ${fiadoPart.toFixed(2)}) não bate com o total da venda (R$ ${sale.totalAmount.toFixed(2)}).`,
      };
    }

    const timestamp = new Date().toISOString();

    // 1. Atualiza estoque com os vasilhames vazios retornados
    if (returnedCylinders > 0) {
      // Find the main cylinder product in this sale
      const cylinderItem = sale.items.find((i) => i.isCylinder) || sale.items[0];
      if (cylinderItem) {
        setStock((prev) => {
          const current = prev[cylinderItem.productId] || {
            productId: cylinderItem.productId,
            fullQuantity: 0,
            emptyQuantity: 0,
            lastUpdated: timestamp,
          };
          return {
            ...prev,
            [cylinderItem.productId]: {
              ...current,
              emptyQuantity: current.emptyQuantity + returnedCylinders,
              lastUpdated: timestamp,
            },
          };
        });

        setStockMovements((prev) => [
          {
            id: `sm-${Date.now()}-return`,
            timestamp,
            productId: cylinderItem.productId,
            productName: cylinderItem.productName,
            quantity: returnedCylinders,
            stockType: 'vazio',
            direction: 'entrada',
            type: 'retorno_vasilhame',
            origin: `Retorno Delivery #${sale.saleNumber}`,
            relatedSaleId: saleId,
            previousQty: stock[cylinderItem.productId]?.emptyQuantity || 0,
            newQty: (stock[cylinderItem.productId]?.emptyQuantity || 0) + returnedCylinders,
          },
          ...prev,
        ]);
      }
    }

    // 2. Registra recebimentos no caixa
    if (cashRegister && cashRegister.status === 'aberto') {
      const validCashPayments = payments.filter((p) => p.method !== 'fiado' && p.amount > 0);
      if (validCashPayments.length > 0) {
        const clientDisplayName = linkedClient?.name || sale.clientName || 'Consumidor Padrão';
        const newCashMoves: CashMovement[] = validCashPayments.map((p) => ({
          id: `cm-${Date.now()}-${p.method}`,
          cashRegisterId: cashRegister.id,
          timestamp,
          type: 'venda',
          amount: p.amount,
          method: p.method,
          description: `Entrega #${sale.saleNumber} - ${clientDisplayName}`,
          relatedSaleId: saleId,
        }));

        setCashMovements((prev) => [...newCashMoves, ...prev]);
        setCashRegister((prev) =>
          prev ? { ...prev, currentBalance: prev.currentBalance + totalPaid } : null
        );
      }
    }

    // 3. Se houver valor fiado, vai para Contas a Receber
    if (fiadoPart > 0) {
      const newReceivable: AccountReceivable = {
        id: `rec-${Date.now()}`,
        saleId,
        saleNumber: sale.saleNumber,
        clientId: targetClientId || 'cli-avulso',
        clientName: linkedClient?.name || sale.clientName || 'Consumidor Padrão (Fiado)',
        clientPhone: linkedClient?.phone || sale.clientPhone,
        totalAmount: fiadoPart,
        paidAmount: 0,
        remainingAmount: fiadoPart,
        createdAt: timestamp,
        dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        status: 'aberto',
        paymentHistory: [],
      };
      setReceivables((prev) => [newReceivable, ...prev]);
    }

    // 4. Marca venda como finalizada
    setSales((prev) =>
      prev.map((s) =>
        s.id === saleId
          ? {
              ...s,
              status: 'finalizada',
              finalizedAt: timestamp,
              clientId: targetClientId || s.clientId,
              clientName: linkedClient ? linkedClient.name : s.clientName,
              clientPhone: linkedClient?.phone || s.clientPhone,
              clientAddress: linkedClient?.address || s.clientAddress,
              clientNeighborhood: linkedClient?.neighborhood || s.clientNeighborhood,
              returnedCylinders,
              payments,
              paidAmount: totalPaid,
              fiadoAmount: fiadoPart,
              notes: notes ? (s.notes ? `${s.notes} | ${notes}` : notes) : s.notes,
            }
          : s
      )
    );

    addAuditLog(
      `Venda Delivery #${sale.saleNumber} finalizada`,
      'venda',
      `Total: R$ ${sale.totalAmount.toFixed(2)} | Recebido Caixa: R$ ${totalPaid.toFixed(2)} | Fiado: R$ ${fiadoPart.toFixed(2)} | Vasilhames Retornados: ${returnedCylinders}`,
      { saleId }
    );

    return { success: true };
  };

  // 4. CANCEL SALE
  const cancelSale = (saleId: string, reason: string) => {
    const sale = sales.find((s) => s.id === saleId);
    if (!sale) return { success: false, error: 'Venda não encontrada.' };
    if (sale.status === 'cancelada') return { success: false, error: 'Venda já cancelada.' };

    const timestamp = new Date().toISOString();

    // Reverter estoque
    setStock((prev) => {
      const nextStock = { ...prev };
      for (const item of sale.items) {
        const current = nextStock[item.productId];
        if (!current) continue;

        // Se era delivery e estava pendente/em entrega, devolve os cheios que saíram
        let newFull = current.fullQuantity;
        let newEmpty = current.emptyQuantity;

        if (sale.status !== 'cancelada') {
          newFull += item.quantity;
        }

        // Se já havia finalizado e recebido vasilhames, deduz os vazios devolvidos
        if (sale.status === 'finalizada' && item.isCylinder && sale.returnedCylinders > 0) {
          newEmpty = Math.max(0, newEmpty - sale.returnedCylinders);
        }

        nextStock[item.productId] = {
          ...current,
          fullQuantity: newFull,
          emptyQuantity: newEmpty,
          lastUpdated: timestamp,
        };
      }
      return nextStock;
    });

    // Se a venda já estava finalizada, estorna pagamentos do caixa
    if (sale.status === 'finalizada' && sale.paidAmount > 0 && cashRegister) {
      const reverseMove: CashMovement = {
        id: `cm-rev-${Date.now()}`,
        cashRegisterId: cashRegister.id,
        timestamp,
        type: 'saida',
        amount: sale.paidAmount,
        method: 'dinheiro',
        description: `Estorno de cancelamento da Venda #${sale.saleNumber}`,
        relatedSaleId: saleId,
      };
      setCashMovements((prev) => [reverseMove, ...prev]);
      setCashRegister((prev) =>
        prev ? { ...prev, currentBalance: prev.currentBalance - sale.paidAmount } : null
      );
    }

    // Se gerou conta a receber fiada, cancela a conta
    if (sale.fiadoAmount > 0) {
      setReceivables((prev) =>
        prev.map((r) => (r.saleId === saleId ? { ...r, status: 'pago', remainingAmount: 0 } : r))
      );
    }

    setSales((prev) =>
      prev.map((s) => (s.id === saleId ? { ...s, status: 'cancelada', cancellationReason: reason } : s))
    );

    addAuditLog(
      `Venda #${sale.saleNumber} cancelada`,
      'cancelamento',
      `Motivo: ${reason} | Estoque restaurado e valores estornados.`,
      { saleId }
    );

    return { success: true };
  };

  // 5. ADJUST STOCK (Ajuste Manual Permanente)
  const adjustStock = ({
    productId,
    newFull,
    newEmpty,
    reason,
    notes,
  }: {
    productId: string;
    newFull: number;
    newEmpty: number;
    reason: string;
    notes?: string;
  }) => {
    const prod = products.find((p) => p.id === productId);
    const currentStock = stock[productId] || {
      productId,
      fullQuantity: 0,
      emptyQuantity: 0,
      lastUpdated: new Date().toISOString(),
    };

    const diffFull = newFull - currentStock.fullQuantity;
    const diffEmpty = newEmpty - currentStock.emptyQuantity;
    const timestamp = new Date().toISOString();

    const adjustment: StockAdjustment = {
      id: `adj-${Date.now()}`,
      timestamp,
      productId,
      productName: prod?.name || 'Produto',
      previousFull: currentStock.fullQuantity,
      newFull,
      diffFull,
      previousEmpty: currentStock.emptyQuantity,
      newEmpty,
      diffEmpty,
      reason,
      notes,
    };

    setStockAdjustments((prev) => [adjustment, ...prev]);

    setStock((prev) => ({
      ...prev,
      [productId]: {
        productId,
        fullQuantity: newFull,
        emptyQuantity: newEmpty,
        lastUpdated: timestamp,
      },
    }));

    // Stock Movement logs
    const movements: StockMovement[] = [];
    if (diffFull !== 0) {
      movements.push({
        id: `sm-${Date.now()}-adj-full`,
        timestamp,
        productId,
        productName: prod?.name || 'Produto',
        quantity: Math.abs(diffFull),
        stockType: 'cheio',
        direction: diffFull > 0 ? 'entrada' : 'saida',
        type: diffFull > 0 ? 'ajuste_positivo' : 'ajuste_negativo',
        origin: `Ajuste manual (${reason})`,
        notes,
        previousQty: currentStock.fullQuantity,
        newQty: newFull,
      });
    }

    if (diffEmpty !== 0) {
      movements.push({
        id: `sm-${Date.now()}-adj-empty`,
        timestamp,
        productId,
        productName: prod?.name || 'Produto',
        quantity: Math.abs(diffEmpty),
        stockType: 'vazio',
        direction: diffEmpty > 0 ? 'entrada' : 'saida',
        type: diffEmpty > 0 ? 'ajuste_positivo' : 'ajuste_negativo',
        origin: `Ajuste manual (${reason})`,
        notes,
        previousQty: currentStock.emptyQuantity,
        newQty: newEmpty,
      });
    }

    setStockMovements((prev) => [...movements, ...prev]);

    addAuditLog(
      `Estoque ajustado: ${prod?.name}`,
      'ajuste',
      `Cheios: ${currentStock.fullQuantity} → ${newFull} (dif: ${diffFull >= 0 ? '+' : ''}${diffFull}) | Vazios: ${currentStock.emptyQuantity} → ${newEmpty} (dif: ${diffEmpty >= 0 ? '+' : ''}${diffEmpty}) | Motivo: ${reason}`,
      { productId }
    );
  };

  // 6. STOCK CONFERENCE
  const performStockConference = ({
    productId,
    physicalFull,
    physicalEmpty,
    reason,
    applyAdjustment,
  }: {
    productId: string;
    physicalFull: number;
    physicalEmpty: number;
    reason: string;
    applyAdjustment: boolean;
  }) => {
    const prod = products.find((p) => p.id === productId);
    const current = stock[productId] || {
      productId,
      fullQuantity: 0,
      emptyQuantity: 0,
      lastUpdated: new Date().toISOString(),
    };

    const diffFull = physicalFull - current.fullQuantity;
    const diffEmpty = physicalEmpty - current.emptyQuantity;
    const timestamp = new Date().toISOString();

    const conf: StockConference = {
      id: `conf-${Date.now()}`,
      timestamp,
      productId,
      productName: prod?.name || 'Produto',
      systemFull: current.fullQuantity,
      physicalFull,
      diffFull,
      systemEmpty: current.emptyQuantity,
      physicalEmpty,
      diffEmpty,
      reason,
      adjusted: applyAdjustment,
    };

    setStockConferences((prev) => [conf, ...prev]);

    if (applyAdjustment) {
      adjustStock({
        productId,
        newFull: physicalFull,
        newEmpty: physicalEmpty,
        reason: reason || 'Conferência física de estoque',
      });
    } else {
      addAuditLog(
        `Conferência de estoque registrada: ${prod?.name}`,
        'estoque',
        `Contagem física informada: ${physicalFull} cheios, ${physicalEmpty} vazios. Divergência: ${diffFull} cheios, ${diffEmpty} vazios.`
      );
    }
  };

  // 7. RECEIVABLES (FIADO)
  const registerReceivablePayment = ({
    receivableId,
    amount,
    method,
    notes,
  }: {
    receivableId: string;
    amount: number;
    method: PaymentMethod;
    notes?: string;
  }) => {
    const rec = receivables.find((r) => r.id === receivableId);
    if (!rec) return { success: false, error: 'Conta a receber não encontrada.' };
    if (amount <= 0) return { success: false, error: 'Informe um valor válido.' };
    if (amount > rec.remainingAmount + 0.01) {
      return { success: false, error: 'O valor excede o saldo devedor restante.' };
    }

    const timestamp = new Date().toISOString();
    const newPaidAmount = rec.paidAmount + amount;
    const newRemaining = Math.max(0, rec.totalAmount - newPaidAmount);
    const newStatus = newRemaining <= 0.01 ? 'pago' : 'parcial';

    setReceivables((prev) =>
      prev.map((r) =>
        r.id === receivableId
          ? {
              ...r,
              paidAmount: newPaidAmount,
              remainingAmount: newRemaining,
              status: newStatus,
              paymentHistory: [
                ...r.paymentHistory,
                {
                  id: `recpay-${Date.now()}`,
                  timestamp,
                  amount,
                  method,
                  notes,
                },
              ],
            }
          : r
      )
    );

    // Entra no Caixa ativo!
    if (cashRegister && cashRegister.status === 'aberto') {
      const cashMove: CashMovement = {
        id: `cm-${Date.now()}-fiado`,
        cashRegisterId: cashRegister.id,
        timestamp,
        type: 'recebimento_fiado',
        amount,
        method,
        description: `Recebimento Fiado - ${rec.clientName} (Venda #${rec.saleNumber})`,
        relatedReceivableId: receivableId,
      };
      setCashMovements((prev) => [cashMove, ...prev]);
      setCashRegister((prev) =>
        prev ? { ...prev, currentBalance: prev.currentBalance + amount } : null
      );
    }

    addAuditLog(
      `Pagamento de Fiado recebido: ${rec.clientName}`,
      'financeiro',
      `Valor recebido: R$ ${amount.toFixed(2)} (${method.toUpperCase()}). Saldo restante: R$ ${newRemaining.toFixed(2)}.`
    );

    return { success: true };
  };

  // 8. CASH REGISTER (CAIXA)
  const openCashRegister = (initialBalance: number) => {
    const timestamp = new Date().toISOString();
    const newRegister: CashRegister = {
      id: `cr-${Date.now()}`,
      openedAt: timestamp,
      initialBalance: Number(initialBalance) || 0,
      currentBalance: Number(initialBalance) || 0,
      status: 'aberto',
    };
    setCashRegister(newRegister);

    addAuditLog(
      'Caixa aberto',
      'caixa',
      `Abertura de caixa com saldo inicial de R$ ${Number(initialBalance).toFixed(2)}`
    );
  };

  const closeCashRegister = (physicalCounted: number, notes?: string) => {
    if (!cashRegister) return { difference: 0 };
    const expected = cashRegister.currentBalance;
    const difference = physicalCounted - expected;
    const timestamp = new Date().toISOString();

    const updated: CashRegister = {
      ...cashRegister,
      closedAt: timestamp,
      status: 'fechado',
      physicalCounted,
      difference,
      closeNotes: notes,
    };
    setCashRegister(updated);

    addAuditLog(
      'Caixa fechado',
      'caixa',
      `Saldo esperado: R$ ${expected.toFixed(2)} | Contado fisicamente: R$ ${physicalCounted.toFixed(2)} | Diferença: R$ ${difference.toFixed(2)} ${notes ? `| Obs: ${notes}` : ''}`
    );

    return { difference };
  };

  const addManualCashMovement = ({
    type,
    amount,
    method,
    description,
  }: {
    type: 'entrada' | 'saida' | 'sangria' | 'suprimento';
    amount: number;
    method: PaymentMethod;
    description: string;
  }) => {
    if (!cashRegister || cashRegister.status !== 'aberto') return;
    const timestamp = new Date().toISOString();
    const isOut = type === 'saida' || type === 'sangria';
    const moveAmount = Number(amount) || 0;

    const move: CashMovement = {
      id: `cm-${Date.now()}-${type}`,
      cashRegisterId: cashRegister.id,
      timestamp,
      type,
      amount: moveAmount,
      method,
      description,
    };

    setCashMovements((prev) => [move, ...prev]);
    setCashRegister((prev) =>
      prev
        ? {
            ...prev,
            currentBalance: isOut
              ? prev.currentBalance - moveAmount
              : prev.currentBalance + moveAmount,
          }
        : null
    );

    addAuditLog(
      `Movimento manual de caixa: ${type.toUpperCase()}`,
      'caixa',
      `${description} | R$ ${moveAmount.toFixed(2)} (${method.toUpperCase()})`
    );
  };

  const performCashConference = (physicalCounted: number, notes?: string) => {
    const expected = cashRegister?.currentBalance || 0;
    const difference = physicalCounted - expected;
    const timestamp = new Date().toISOString();

    const conf: CashConference = {
      id: `cconf-${Date.now()}`,
      timestamp,
      expectedBalance: expected,
      physicalCounted,
      difference,
      notes: notes || '',
    };
    setCashConferences((prev) => [conf, ...prev]);

    addAuditLog(
      'Conferência de caixa realizada',
      'caixa',
      `Esperado: R$ ${expected.toFixed(2)} | Contado: R$ ${physicalCounted.toFixed(2)} | Diferença: R$ ${difference.toFixed(2)} ${notes ? `| Obs: ${notes}` : ''}`
    );

    return { difference };
  };

  // 9. EXPENSES & ACCOUNTS PAYABLE
  const addExpense = (expenseData: Omit<Expense, 'id' | 'date'>) => {
    const timestamp = new Date().toISOString();
    const newExp: Expense = {
      ...expenseData,
      id: `exp-${Date.now()}`,
      date: timestamp,
    };
    setExpenses((prev) => [newExp, ...prev]);

    if (expenseData.paidFromCash && cashRegister && cashRegister.status === 'aberto') {
      const cashMove: CashMovement = {
        id: `cm-${Date.now()}-exp`,
        cashRegisterId: cashRegister.id,
        timestamp,
        type: 'saida',
        amount: expenseData.amount,
        method: expenseData.method,
        description: `Despesa: ${expenseData.description} (${expenseData.category})`,
        relatedExpenseId: newExp.id,
      };
      setCashMovements((prev) => [cashMove, ...prev]);
      setCashRegister((prev) =>
        prev ? { ...prev, currentBalance: prev.currentBalance - expenseData.amount } : null
      );
    }

    addAuditLog(
      `Saída/Despesa registrada: ${expenseData.description}`,
      'financeiro',
      `Categoria: ${expenseData.category} | Valor: R$ ${expenseData.amount.toFixed(2)} | Pago pelo caixa: ${expenseData.paidFromCash ? 'Sim' : 'Não'}`
    );
  };

  const updateExpense = (id: string, updates: Partial<Expense>) => {
    const existing = expenses.find((e) => e.id === id);
    if (!existing) return;

    const oldCashImpact = existing.paidFromCash ? existing.amount : 0;
    const newPaidFromCash = updates.paidFromCash !== undefined ? updates.paidFromCash : existing.paidFromCash;
    const newAmount = updates.amount !== undefined ? updates.amount : existing.amount;
    const newCashImpact = newPaidFromCash ? newAmount : 0;
    const cashDiff = newCashImpact - oldCashImpact;

    if (cashDiff !== 0 && cashRegister && cashRegister.status === 'aberto') {
      setCashRegister((prev) =>
        prev ? { ...prev, currentBalance: prev.currentBalance - cashDiff } : null
      );
      setCashMovements((prev) => {
        const found = prev.find((cm) => cm.relatedExpenseId === id);
        if (found) {
          if (newPaidFromCash) {
            return prev.map((cm) =>
              cm.relatedExpenseId === id
                ? {
                    ...cm,
                    amount: newAmount,
                    description: `Despesa: ${updates.description || existing.description} (${updates.category || existing.category})`,
                  }
                : cm
            );
          } else {
            return prev.filter((cm) => cm.relatedExpenseId !== id);
          }
        } else if (newPaidFromCash) {
          const newMove: CashMovement = {
            id: `cm-${Date.now()}-exp-upd`,
            cashRegisterId: cashRegister.id,
            timestamp: new Date().toISOString(),
            type: 'saida',
            amount: newAmount,
            method: updates.method || existing.method,
            description: `Despesa: ${updates.description || existing.description}`,
            relatedExpenseId: id,
          };
          return [newMove, ...prev];
        }
        return prev;
      });
    }

    setExpenses((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...updates } : e))
    );

    addAuditLog(
      `Despesa alterada: ${updates.description || existing.description}`,
      'financeiro',
      `Valor: R$ ${(updates.amount || existing.amount).toFixed(2)}`
    );
  };

  const deleteExpense = (id: string) => {
    const existing = expenses.find((e) => e.id === id);
    if (!existing) return;

    if (existing.paidFromCash && cashRegister && cashRegister.status === 'aberto') {
      setCashRegister((prev) =>
        prev ? { ...prev, currentBalance: prev.currentBalance + existing.amount } : null
      );
      setCashMovements((prev) => prev.filter((cm) => cm.relatedExpenseId !== id));
    }

    setExpenses((prev) => prev.filter((e) => e.id !== id));
    addAuditLog(
      `Despesa excluída: ${existing.description}`,
      'financeiro',
      `Valor: R$ ${existing.amount.toFixed(2)} estornado.`
    );
  };

  const addAccountPayable = (payableData: Omit<AccountPayable, 'id' | 'status'>) => {
    const newPayable: AccountPayable = {
      ...payableData,
      id: `pay-${Date.now()}`,
      status: 'pendente',
    };
    setPayables((prev) => [newPayable, ...prev]);

    addAuditLog(
      `Conta a pagar cadastrada: ${payableData.description}`,
      'financeiro',
      `Valor: R$ ${payableData.amount.toFixed(2)} | Vencimento: ${payableData.dueDate}`
    );
  };

  const payAccountPayable = (payableId: string, paymentMethod: PaymentMethod, paidFromCash: boolean) => {
    const pay = payables.find((p) => p.id === payableId);
    if (!pay) return;

    const timestamp = new Date().toISOString();
    setPayables((prev) =>
      prev.map((p) =>
        p.id === payableId
          ? {
              ...p,
              status: 'pago',
              paidAt: timestamp,
              paymentMethod,
            }
          : p
      )
    );

    // Also register as expense
    const newExp: Expense = {
      id: `exp-${Date.now()}`,
      description: `Pagamento: ${pay.description}`,
      category: pay.category,
      amount: pay.amount,
      method: paymentMethod,
      date: timestamp,
      paidFromCash,
      notes: pay.supplierName || pay.supplier ? `Fornecedor: ${pay.supplierName || pay.supplier}` : undefined,
    };
    setExpenses((prev) => [newExp, ...prev]);

    if (paidFromCash && cashRegister && cashRegister.status === 'aberto') {
      const cashMove: CashMovement = {
        id: `cm-${Date.now()}-pay`,
        cashRegisterId: cashRegister.id,
        timestamp,
        type: 'saida',
        amount: pay.amount,
        method: paymentMethod,
        description: `Pgto Conta: ${pay.description}`,
      };
      setCashMovements((prev) => [cashMove, ...prev]);
      setCashRegister((prev) =>
        prev ? { ...prev, currentBalance: prev.currentBalance - pay.amount } : null
      );
    }

    addAuditLog(
      `Conta a pagar liquidada: ${pay.description}`,
      'financeiro',
      `Valor: R$ ${pay.amount.toFixed(2)} | Forma: ${paymentMethod.toUpperCase()}`
    );
  };

  const addPayable = (payableData: Omit<AccountPayable, 'id' | 'status'>) => {
    addAccountPayable(payableData);
  };

  const payBill = (payableId: string, paymentMethod: PaymentMethod, amount?: number, paidFromCash?: boolean) => {
    const isCash = paidFromCash !== undefined ? paidFromCash : paymentMethod === 'dinheiro';
    payAccountPayable(payableId, paymentMethod, isCash);
  };

  const deletePayable = (payableId: string) => {
    const pay = payables.find((p) => p.id === payableId);
    if (!pay) return;
    setPayables((prev) => prev.filter((p) => p.id !== payableId));
    addAuditLog(
      `Conta a pagar excluída: ${pay.description}`,
      'financeiro',
      `Valor: R$ ${pay.amount.toFixed(2)}`
    );
  };

  // 10. PRODUCTS & ENTITIES
  const addProduct = (productData: Omit<Product, 'id' | 'code'>) => {
    const nextCode = generateNextCode('GLP', products.map((p) => p.code));
    const newProd: Product = {
      ...productData,
      id: `prod-${Date.now()}`,
      code: nextCode,
    };
    setProducts((prev) => [...prev, newProd]);

    // Initial stock item for this product
    setStock((prev) => ({
      ...prev,
      [newProd.id]: {
        productId: newProd.id,
        fullQuantity: 0,
        emptyQuantity: 0,
        lastUpdated: new Date().toISOString(),
      },
    }));

    addAuditLog(
      `Produto cadastrado: ${newProd.name}`,
      'estoque',
      `Código: ${newProd.code} | Custo: R$ ${newProd.costPrice.toFixed(2)} | Venda: R$ ${newProd.sellPrice.toFixed(2)}`
    );
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
    addAuditLog(
      'Produto alterado',
      'estoque',
      `ID: ${id}. Custo/preço atualizados. Vendas antigas mantêm o custo histórico original.`
    );
  };

  const deleteOrDeactivateProduct = (productId: string): { action: 'deleted' | 'deactivated'; message: string } => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return { action: 'deleted', message: 'Produto não encontrado.' };

    const hasSalesHistory = sales.some((s) => s.items && s.items.some((item) => item.productId === productId));
    const hasStockMovements = stockMovements.some((m) => m.productId === productId);
    const hasStockAdjustments = stockAdjustments.some((a) => a.productId === productId);
    const hasConferences = stockConferences.some((c) => c.productId === productId);

    if (hasSalesHistory || hasStockMovements || hasStockAdjustments || hasConferences) {
      // Inactivate product
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, isActive: false } : p))
      );
      addAuditLog(
        `Produto inativado: ${prod.name}`,
        'estoque',
        `Produto possui histórico de vendas ou estoque. Foi inativado para manter a integridade contábil e fiscal.`,
        { productId }
      );
      return {
        action: 'deactivated',
        message: `O produto "${prod.name}" possui movimentações ou vendas registradas no sistema. Por segurança contábil, ele foi inativado no catálogo (não aparecerá em novas vendas, mas preservará todo o histórico).`,
      };
    } else {
      // Permanently Delete product
      setProducts((prev) => prev.filter((p) => p.id !== productId));
      setStock((prev) => {
        const next = { ...prev };
        delete next[productId];
        return next;
      });
      addAuditLog(
        `Produto excluído: ${prod.name}`,
        'estoque',
        `Produto sem histórico foi excluído definitivamente do cadastro.`,
        { productId }
      );
      return {
        action: 'deleted',
        message: `Produto "${prod.name}" excluído definitivamente com sucesso.`,
      };
    }
  };

  const addClient = (clientData: Omit<Client, 'id' | 'createdAt'>): string => {
    const id = `cli-${Date.now()}`;
    const newClient: Client = {
      ...clientData,
      id,
      createdAt: new Date().toISOString(),
    };
    setClients((prev) => [newClient, ...prev]);
    addAuditLog('Cliente cadastrado', 'cliente', `Nome: ${newClient.name} | Tel: ${newClient.phone}`);
    return id;
  };

  const updateClient = (id: string, updates: Partial<Client>) => {
    setClients((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
  };

  const addDeliveryPerson = (dp: Omit<DeliveryPerson, 'id'>) => {
    const newDp: DeliveryPerson = {
      ...dp,
      id: `del-${Date.now()}`,
    };
    setDeliveryPersons((prev) => [...prev, newDp]);
    addAuditLog('Entregador cadastrado', 'cliente', `Nome: ${newDp.name} | Tel: ${newDp.phone}`);
  };

  const updateDeliveryPerson = (id: string, updates: Partial<DeliveryPerson>) => {
    setDeliveryPersons((prev) =>
      prev.map((d) => (d.id === id ? { ...d, ...updates } : d))
    );
  };

  const addSupplier = (supplier: Omit<Supplier, 'id'>) => {
    const newSup: Supplier = {
      ...supplier,
      id: `sup-${Date.now()}`,
    };
    setSuppliers((prev) => [...prev, newSup]);
    addAuditLog('Fornecedor cadastrado', 'financeiro', `Nome: ${newSup.name}`);
  };

  const updateSupplier = (id: string, updates: Partial<Supplier>) => {
    setSuppliers((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
  };

  // 11. BACKUP & RESTORE
  const resetToSampleData = () => {
    setProducts(INITIAL_PRODUCTS);
    setStock(INITIAL_STOCK);
    setStockMovements(INITIAL_STOCK_MOVEMENTS);
    setStockAdjustments([]);
    setClients(INITIAL_CLIENTS);
    setDeliveryPersons(INITIAL_DELIVERY_PERSONS);
    setSuppliers(INITIAL_SUPPLIERS);
    setSales(INITIAL_SALES);
    setReceivables(INITIAL_RECEIVABLES);
    setPayables(INITIAL_PAYABLES);
    setCashRegister(INITIAL_CASH_REGISTER);
    setCashMovements(INITIAL_CASH_MOVEMENTS);
    setExpenses(INITIAL_EXPENSES);
    setAuditLogs(INITIAL_AUDIT_LOGS);
    setStockConferences([]);
    setCashConferences([]);
  };

  const clearAllData = () => {
    setProducts([]);
    setStock({});
    setStockMovements([]);
    setStockAdjustments([]);
    setClients([]);
    setDeliveryPersons([]);
    setSuppliers([]);
    setSales([]);
    setReceivables([]);
    setPayables([]);
    setCashRegister(null);
    setCashMovements([]);
    setExpenses([]);
    setAuditLogs([]);
    setStockConferences([]);
    setCashConferences([]);
    localStorage.clear();
  };

  const clearOperationalData = () => {
    setSales([]);
    setReceivables([]);
    setPayables([]);
    setCashRegister(null);
    setCashMovements([]);
    setExpenses([]);
    setStockMovements([]);
    setStockAdjustments([]);
    setStockConferences([]);
    setCashConferences([]);
    setAuditLogs([]);

    // Reset stock quantities of all products to 0
    setStock((prev) => {
      const resetStock: Record<string, StockItem> = {};
      products.forEach((p) => {
        resetStock[p.id] = {
          productId: p.id,
          fullQuantity: 0,
          emptyQuantity: 0,
          lastUpdated: new Date().toISOString(),
        };
      });
      return resetStock;
    });

    addAuditLog(
      'Dados operacionais zerados',
      'sistema',
      'Vendas, contas a pagar e receber, caixa, despesas e estoque foram zerados para recomeço limpo.'
    );
  };

  const generateSampleData = () => {
    resetToSampleData();
    addAuditLog(
      'Dados fictícios de teste gerados',
      'sistema',
      'Base completa de produtos, clientes, estoque, vendas balcão e delivery, despesas, caixa e contas gerada para testes.'
    );
  };

  const exportDatabaseJson = () => {
    const data = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      settings,
      products,
      stock,
      stockMovements,
      stockAdjustments,
      clients,
      deliveryPersons,
      suppliers,
      sales,
      receivables,
      payables,
      cashRegister,
      cashMovements,
      expenses,
      auditLogs,
      stockConferences,
      cashConferences,
    };
    return JSON.stringify(data, null, 2);
  };

  const importDatabaseJson = (jsonString: string): boolean => {
    try {
      const data = JSON.parse(jsonString);
      if (!data || !data.products) return false;
      if (data.settings) setSettings(data.settings);
      setProducts(data.products || []);
      setStock(data.stock || {});
      setStockMovements(data.stockMovements || []);
      setStockAdjustments(data.stockAdjustments || []);
      setClients(data.clients || []);
      setDeliveryPersons(data.deliveryPersons || []);
      setSuppliers(data.suppliers || []);
      setSales(data.sales || []);
      setReceivables(data.receivables || []);
      setPayables(data.payables || []);
      setCashRegister(data.cashRegister || null);
      setCashMovements(data.cashMovements || []);
      setExpenses(data.expenses || []);
      setAuditLogs(data.auditLogs || []);
      setStockConferences(data.stockConferences || []);
      setCashConferences(data.cashConferences || []);
      return true;
    } catch (e) {
      console.error('Import database error', e);
      return false;
    }
  };

  // 12. COMPUTED HELPERS
  const totalFullCylinders = useMemo(() => {
    return Object.entries(stock).reduce((acc, [prodId, item]) => {
      const p = products.find((prod) => prod.id === prodId);
      const stockItem = item as StockItem;
      return p?.isCylinder ? acc + (stockItem?.fullQuantity || 0) : acc;
    }, 0);
  }, [stock, products]);

  const totalEmptyCylinders = useMemo(() => {
    return Object.entries(stock).reduce((acc, [prodId, item]) => {
      const p = products.find((prod) => prod.id === prodId);
      const stockItem = item as StockItem;
      return p?.isCylinder ? acc + (stockItem?.emptyQuantity || 0) : acc;
    }, 0);
  }, [stock, products]);

  const criticalStockCount = useMemo(() => {
    return products.filter((p) => {
      const s = stock[p.id]?.fullQuantity || 0;
      return p.minStock !== undefined && s <= p.minStock;
    }).length;
  }, [products, stock]);

  const inProgressDeliveriesCount = useMemo(() => {
    return sales.filter(
      (s) => s.type === 'delivery' && s.status !== 'finalizada' && s.status !== 'cancelada'
    ).length;
  }, [sales]);

  const pendingDeliveriesCount = useMemo(() => {
    return sales.filter((s) => s.type === 'delivery' && s.status === 'pendente').length;
  }, [sales]);

  const totalReceivablesAmount = useMemo(() => {
    return receivables
      .filter((r) => r.status !== 'pago')
      .reduce((sum, r) => sum + r.remainingAmount, 0);
  }, [receivables]);

  const overdueReceivablesAmount = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return receivables
      .filter((r) => r.status !== 'pago' && r.dueDate && r.dueDate < today)
      .reduce((sum, r) => sum + r.remainingAmount, 0);
  }, [receivables]);

  const overduePayablesCount = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return payables.filter((p) => p.status === 'pendente' && p.dueDate < today).length;
  }, [payables]);

  const todayString = new Date().toISOString().split('T')[0];

  const todaySales = useMemo(() => {
    return sales.filter(
      (s) => s.createdAt.startsWith(todayString) && s.status === 'finalizada'
    );
  }, [sales, todayString]);

  const todaySalesCount = todaySales.length;

  const todayRevenue = useMemo(() => {
    return todaySales.reduce((sum, s) => sum + s.totalAmount, 0);
  }, [todaySales]);

  const todayGrossProfit = useMemo(() => {
    return todaySales.reduce((sum, s) => sum + s.grossProfit, 0);
  }, [todaySales]);

  const todayExpenses = useMemo(() => {
    return expenses
      .filter((e) => e.date.startsWith(todayString))
      .reduce((sum, e) => sum + e.amount, 0);
  }, [expenses, todayString]);

  const todayNetResult = todayGrossProfit - todayExpenses;

  return (
    <ErpContext.Provider
      value={{
        products,
        stock,
        stockMovements,
        stockAdjustments,
        clients,
        deliveryPersons,
        suppliers,
        sales,
        receivables,
        payables,
        cashRegister,
        cashMovements,
        expenses,
        auditLogs,
        stockConferences,
        cashConferences,
        createSale,
        updateDeliveryStatus,
        finalizeDelivery,
        cancelSale,
        adjustStock,
        performStockConference,
        registerReceivablePayment,
        openCashRegister,
        closeCashRegister,
        addManualCashMovement,
        performCashConference,
        settings,
        updateSettings,
        addExpense,
        updateExpense,
        deleteExpense,
        addAccountPayable,
        payAccountPayable,
        addPayable,
        payBill,
        deletePayable,
        addProduct,
        updateProduct,
        deleteOrDeactivateProduct,
        addClient,
        updateClient,
        addDeliveryPerson,
        updateDeliveryPerson,
        addSupplier,
        updateSupplier,
        resetToSampleData,
        clearAllData,
        clearOperationalData,
        generateSampleData,
        exportDatabaseJson,
        importDatabaseJson,
        totalFullCylinders,
        totalEmptyCylinders,
        criticalStockCount,
        inProgressDeliveriesCount,
        pendingDeliveriesCount,
        totalReceivablesAmount,
        overdueReceivablesAmount,
        overduePayablesCount,
        todaySalesCount,
        todayRevenue,
        todayGrossProfit,
        todayNetResult,
      }}
    >
      {children}
    </ErpContext.Provider>
  );
}

export function useErp() {
  const context = useContext(ErpContext);
  if (!context) {
    throw new Error('useErp must be used within an ErpProvider');
  }
  return context;
}
