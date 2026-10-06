import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode, useCallback } from 'react';
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
import {
  getSupabaseClient,
  getStoredSupabaseConfig,
  mapDbProduct,
  mapProductToDb,
  mapDbStock,
  mapStockToDb,
  mapDbClient,
  mapClientToDb,
  mapDbDeliveryPerson,
  mapDeliveryPersonToDb,
  mapDbSupplier,
  mapSupplierToDb,
  mapDbSale,
  mapSaleToDb,
  mapDbReceivable,
  mapReceivableToDb,
  mapDbCashRegister,
  mapCashRegisterToDb,
  mapDbCashMovement,
  mapCashMovementToDb,
  mapDbExpense,
  mapExpenseToDb,
  mapDbPayable,
  mapPayableToDb,
  mapDbStockMovement,
  mapStockMovementToDb,
  mapDbStockAdjustment,
  mapStockAdjustmentToDb,
  mapDbAuditLog,
  mapAuditLogToDb,
  mapDbStockConference,
  mapStockConferenceToDb,
  mapDbCashConference,
  mapCashConferenceToDb,
  mapDbAppSettings,
  mapAppSettingsToDb,
} from '../lib/supabase';

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
  settings: AppSettings;

  // Supabase Online DB status
  isOnlineDb: boolean;
  dbSyncState: 'idle' | 'syncing' | 'error';
  lastSyncTime: string | null;
  dbErrorMessage: string | null;
  reloadFromOnlineDb: () => Promise<void>;
  syncCurrentDataToSupabase: () => Promise<{ success: boolean; error?: string }>;

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
  // Local state with localStorage fallback
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

  // Supabase Online DB Sync State
  const [isOnlineDb, setIsOnlineDb] = useState<boolean>(() => {
    const cfg = getStoredSupabaseConfig();
    return cfg.isConfigured;
  });
  const [dbSyncState, setDbSyncState] = useState<'idle' | 'syncing' | 'error'>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [dbErrorMessage, setDbErrorMessage] = useState<string | null>(null);

  // Helper to persist to localStorage for fast initial paint / offline fallback
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

  // Load all data from Supabase Online Database
  const reloadFromOnlineDb = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setIsOnlineDb(false);
      return;
    }

    setDbSyncState('syncing');
    setDbErrorMessage(null);

    try {
      // Execute parallel queries
      const [
        prodsRes,
        stockRes,
        clientsRes,
        delivRes,
        supRes,
        salesRes,
        recRes,
        payRes,
        cashRegRes,
        cashMovesRes,
        expensesRes,
        auditRes,
        stockMovesRes,
        stockAdjRes,
        stockConfRes,
        cashConfRes,
        settingsRes,
      ] = await Promise.all([
        supabase.from('products').select('*').order('created_at', { ascending: true }),
        supabase.from('stock').select('*'),
        supabase.from('clients').select('*').order('created_at', { ascending: false }),
        supabase.from('delivery_persons').select('*').order('created_at', { ascending: true }),
        supabase.from('suppliers').select('*').order('created_at', { ascending: true }),
        supabase.from('sales').select('*').order('created_at', { ascending: false }),
        supabase.from('receivables').select('*').order('created_at', { ascending: false }),
        supabase.from('payables').select('*').order('created_at', { ascending: false }),
        supabase.from('cash_registers').select('*').order('opened_at', { ascending: false }).limit(1),
        supabase.from('cash_movements').select('*').order('timestamp', { ascending: false }),
        supabase.from('expenses').select('*').order('date', { ascending: false }),
        supabase.from('audit_logs').select('*').order('timestamp', { ascending: false }).limit(200),
        supabase.from('stock_movements').select('*').order('timestamp', { ascending: false }).limit(300),
        supabase.from('stock_adjustments').select('*').order('timestamp', { ascending: false }),
        supabase.from('stock_conferences').select('*').order('timestamp', { ascending: false }),
        supabase.from('cash_conferences').select('*').order('timestamp', { ascending: false }),
        supabase.from('app_settings').select('*').eq('id', 'default').single(),
      ]);

      // If products table exists and returned data
      if (prodsRes.data && prodsRes.data.length > 0) {
        const loadedProds = prodsRes.data.map(mapDbProduct);
        setProducts(loadedProds);
      }

      if (stockRes.data) {
        const stockMap: Record<string, StockItem> = {};
        stockRes.data.forEach((row) => {
          const item = mapDbStock(row);
          stockMap[item.productId] = item;
        });
        setStock(stockMap);
      }

      if (clientsRes.data) {
        setClients(clientsRes.data.map(mapDbClient));
      }

      if (delivRes.data) {
        setDeliveryPersons(delivRes.data.map(mapDbDeliveryPerson));
      }

      if (supRes.data) {
        setSuppliers(supRes.data.map(mapDbSupplier));
      }

      if (salesRes.data) {
        setSales(salesRes.data.map(mapDbSale));
      }

      if (recRes.data) {
        setReceivables(recRes.data.map(mapDbReceivable));
      }

      if (payRes.data) {
        setPayables(payRes.data.map(mapDbPayable));
      }

      if (cashRegRes.data && cashRegRes.data.length > 0) {
        setCashRegister(mapDbCashRegister(cashRegRes.data[0]));
      } else if (cashRegRes.data && cashRegRes.data.length === 0) {
        setCashRegister(null);
      }

      if (cashMovesRes.data) {
        setCashMovements(cashMovesRes.data.map(mapDbCashMovement));
      }

      if (expensesRes.data) {
        setExpenses(expensesRes.data.map(mapDbExpense));
      }

      if (auditRes.data) {
        setAuditLogs(auditRes.data.map(mapDbAuditLog));
      }

      if (stockMovesRes.data) {
        setStockMovements(stockMovesRes.data.map(mapDbStockMovement));
      }

      if (stockAdjRes.data) {
        setStockAdjustments(stockAdjRes.data.map(mapDbStockAdjustment));
      }

      if (stockConfRes.data) {
        setStockConferences(stockConfRes.data.map(mapDbStockConference));
      }

      if (cashConfRes.data) {
        setCashConferences(cashConfRes.data.map(mapDbCashConference));
      }

      if (settingsRes.data) {
        setSettings(mapDbAppSettings(settingsRes.data));
      }

      setIsOnlineDb(true);
      setDbSyncState('idle');
      setLastSyncTime(new Date().toLocaleTimeString('pt-BR'));
    } catch (err: any) {
      console.error('Error fetching online database from Supabase:', err);
      setDbSyncState('error');
      setDbErrorMessage(err?.message || 'Falha ao sincronizar dados com o Supabase');
    }
  }, []);

  // Push local data to Supabase (Seeding / Initial Cloud Upload)
  const syncCurrentDataToSupabase = async (): Promise<{ success: boolean; error?: string }> => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return { success: false, error: 'Supabase não configurado.' };
    }

    try {
      setDbSyncState('syncing');

      // 1. Settings
      await supabase.from('app_settings').upsert(mapAppSettingsToDb(settings));

      // 2. Products
      if (products.length > 0) {
        await supabase.from('products').upsert(products.map(mapProductToDb));
      }

      // 3. Stock
      const stockItems = Object.values(stock);
      if (stockItems.length > 0) {
        await supabase.from('stock').upsert(stockItems.map(mapStockToDb));
      }

      // 4. Clients
      if (clients.length > 0) {
        await supabase.from('clients').upsert(clients.map(mapClientToDb));
      }

      // 5. Delivery Persons
      if (deliveryPersons.length > 0) {
        await supabase.from('delivery_persons').upsert(deliveryPersons.map(mapDeliveryPersonToDb));
      }

      // 6. Suppliers
      if (suppliers.length > 0) {
        await supabase.from('suppliers').upsert(suppliers.map(mapSupplierToDb));
      }

      // 7. Sales
      if (sales.length > 0) {
        await supabase.from('sales').upsert(sales.map(mapSaleToDb));
      }

      // 8. Receivables
      if (receivables.length > 0) {
        await supabase.from('receivables').upsert(receivables.map(mapReceivableToDb));
      }

      // 9. Payables
      if (payables.length > 0) {
        await supabase.from('payables').upsert(payables.map(mapPayableToDb));
      }

      // 10. Cash Register
      if (cashRegister) {
        await supabase.from('cash_registers').upsert(mapCashRegisterToDb(cashRegister));
      }

      // 11. Cash Movements
      if (cashMovements.length > 0) {
        await supabase.from('cash_movements').upsert(cashMovements.map(mapCashMovementToDb));
      }

      // 12. Expenses
      if (expenses.length > 0) {
        await supabase.from('expenses').upsert(expenses.map(mapExpenseToDb));
      }

      // 13. Audit Logs
      if (auditLogs.length > 0) {
        await supabase.from('audit_logs').upsert(auditLogs.map(mapAuditLogToDb));
      }

      // 14. Stock Movements
      if (stockMovements.length > 0) {
        await supabase.from('stock_movements').upsert(stockMovements.map(mapStockMovementToDb));
      }

      setDbSyncState('idle');
      setLastSyncTime(new Date().toLocaleTimeString('pt-BR'));
      return { success: true };
    } catch (err: any) {
      console.error('Error seeding data to Supabase:', err);
      setDbSyncState('error');
      return { success: false, error: err?.message || 'Erro desconhecido' };
    }
  };

  // Setup initial load and real-time listeners
  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    // Initial fetch from cloud
    reloadFromOnlineDb();

    // Setup Realtime subscription across public tables
    let debounceTimer: any = null;
    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          reloadFromOnlineDb();
        }, 300);
      })
      .subscribe();

    return () => {
      clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [reloadFromOnlineDb]);

  // Helper to log audit events both locally and to Supabase
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

    const supabase = getSupabaseClient();
    if (supabase) {
      supabase.from('audit_logs').insert(mapAuditLogToDb(newLog)).then();
    }
  };

  // 1. UPDATE SETTINGS
  const updateSettings = (newSettings: Partial<AppSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);

    const supabase = getSupabaseClient();
    if (supabase) {
      supabase.from('app_settings').upsert(mapAppSettingsToDb(updated)).then();
    }

    addAuditLog('Configurações atualizadas', 'sistema', 'Parâmetros da empresa/revenda alterados.');
  };

  // 2. CREATE SALE (Balcão ou Delivery)
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
    const supabase = getSupabaseClient();

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

      // 1. Atualizar estoque
      const updatedStockItems: StockItem[] = [];
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

          const updatedItem = {
            ...current,
            fullQuantity: newFull,
            emptyQuantity: newEmpty,
            lastUpdated: timestamp,
          };
          nextStock[item.productId] = updatedItem;
          updatedStockItems.push(updatedItem);
        }
        return nextStock;
      });

      if (supabase && updatedStockItems.length > 0) {
        supabase.from('stock').upsert(updatedStockItems.map(mapStockToDb)).then();
      }

      // 2. Movimentações de estoque
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
      if (supabase && newMovements.length > 0) {
        supabase.from('stock_movements').insert(newMovements.map(mapStockMovementToDb)).then();
      }

      // 3. Pagamentos no Caixa
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
          const updatedCashRegister: CashRegister = {
            ...cashRegister,
            currentBalance: cashRegister.currentBalance + totalPaid,
          };
          setCashRegister(updatedCashRegister);

          if (supabase) {
            supabase.from('cash_movements').insert(newCashMoves.map(mapCashMovementToDb)).then();
            supabase.from('cash_registers').upsert(mapCashRegisterToDb(updatedCashRegister)).then();
          }
        }
      }

      // 4. Se houver fiado, gera conta a receber
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
        if (supabase) {
          supabase.from('receivables').insert(mapReceivableToDb(newReceivable)).then();
        }
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
      if (supabase) {
        supabase.from('sales').insert(mapSaleToDb(newSale)).then();
      }

      addAuditLog(
        `Venda Balcão #${nextSaleNumber} finalizada`,
        'venda',
        `Valor: R$ ${totalAmount.toFixed(2)} | Recebido: R$ ${totalPaid.toFixed(2)} | Fiado: R$ ${fiadoPart.toFixed(2)}`,
        { saleId }
      );

      return { success: true, saleId };
    } else {
      // Venda Delivery:
      // Diminui botijões cheios do estoque (saíram para entrega)
      const updatedStockItems: StockItem[] = [];
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
          const updatedItem = {
            ...current,
            fullQuantity: newFull,
            lastUpdated: timestamp,
          };
          nextStock[item.productId] = updatedItem;
          updatedStockItems.push(updatedItem);
        }
        return nextStock;
      });

      if (supabase && updatedStockItems.length > 0) {
        supabase.from('stock').upsert(updatedStockItems.map(mapStockToDb)).then();
      }

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
      if (supabase && newMovements.length > 0) {
        supabase.from('stock_movements').insert(newMovements.map(mapStockMovementToDb)).then();
      }

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
      if (supabase) {
        supabase.from('sales').insert(mapSaleToDb(newSale)).then();
      }

      addAuditLog(
        `Venda Delivery #${nextSaleNumber} criada`,
        'venda',
        `Cliente: ${client?.name || 'Consumidor Padrão'} | Total: R$ ${totalAmount.toFixed(2)} | ${dispatchedCylinders} cheios saíram para entrega. Venda NÃO entrou no caixa.`,
        { saleId }
      );

      return { success: true, saleId };
    }
  };

  // 3. UPDATE DELIVERY STATUS
  const updateDeliveryStatus = (saleId: string, newStatus: 'em_entrega' | 'aguardando_finalizacao') => {
    const sale = sales.find((s) => s.id === saleId);
    if (!sale) return;

    setSales((prev) =>
      prev.map((s) => (s.id === saleId ? { ...s, status: newStatus } : s))
    );

    const supabase = getSupabaseClient();
    if (supabase) {
      supabase.from('sales').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', saleId).then();
    }

    const statusLabel = newStatus === 'em_entrega' ? 'Saiu para entrega' : 'Aguardando finalização';
    addAuditLog(
      `Venda #${sale.saleNumber} status: ${statusLabel}`,
      'venda',
      `Status atualizado para: ${statusLabel}`,
      { saleId }
    );
  };

  // 4. FINALIZE DELIVERY
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

    // Se houver fiado, é obrigatório cliente vinculado
    const targetClientId = clientId || sale.clientId;
    const linkedClient = targetClientId ? clients.find((c) => c.id === targetClientId) : undefined;
    if (fiadoPart > 0 && !targetClientId) {
      return {
        success: false,
        error: 'Para pagamento em FIADO (Contas a Receber), é obrigatório selecionar um cliente cadastrado.',
      };
    }

    if (Math.abs(totalPaid + fiadoPart - sale.totalAmount) > 0.05) {
      return {
        success: false,
        error: `O total pago (R$ ${totalPaid.toFixed(2)}) + fiado (R$ ${fiadoPart.toFixed(2)}) não bate com o total da venda (R$ ${sale.totalAmount.toFixed(2)}).`,
      };
    }

    const timestamp = new Date().toISOString();
    const supabase = getSupabaseClient();

    // 1. Atualiza estoque com os vasilhames retornados
    if (returnedCylinders > 0) {
      const cylinderItem = sale.items.find((i) => i.isCylinder) || sale.items[0];
      if (cylinderItem) {
        let updatedItem: StockItem | null = null;
        setStock((prev) => {
          const current = prev[cylinderItem.productId] || {
            productId: cylinderItem.productId,
            fullQuantity: 0,
            emptyQuantity: 0,
            lastUpdated: timestamp,
          };
          updatedItem = {
            ...current,
            emptyQuantity: current.emptyQuantity + returnedCylinders,
            lastUpdated: timestamp,
          };
          return {
            ...prev,
            [cylinderItem.productId]: updatedItem,
          };
        });

        if (supabase && updatedItem) {
          supabase.from('stock').upsert(mapStockToDb(updatedItem)).then();
        }

        const returnMovement: StockMovement = {
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
        };

        setStockMovements((prev) => [returnMovement, ...prev]);
        if (supabase) {
          supabase.from('stock_movements').insert(mapStockMovementToDb(returnMovement)).then();
        }
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
        const updatedCashRegister: CashRegister = {
          ...cashRegister,
          currentBalance: cashRegister.currentBalance + totalPaid,
        };
        setCashRegister(updatedCashRegister);

        if (supabase) {
          supabase.from('cash_movements').insert(newCashMoves.map(mapCashMovementToDb)).then();
          supabase.from('cash_registers').upsert(mapCashRegisterToDb(updatedCashRegister)).then();
        }
      }
    }

    // 3. Se houver valor fiado, gera conta a receber
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
      if (supabase) {
        supabase.from('receivables').insert(mapReceivableToDb(newReceivable)).then();
      }
    }

    // 4. Marca venda como finalizada
    const updatedSale: Sale = {
      ...sale,
      status: 'finalizada',
      finalizedAt: timestamp,
      clientId: targetClientId || sale.clientId,
      clientName: linkedClient ? linkedClient.name : sale.clientName,
      clientPhone: linkedClient?.phone || sale.clientPhone,
      clientAddress: linkedClient?.address || sale.clientAddress,
      clientNeighborhood: linkedClient?.neighborhood || sale.clientNeighborhood,
      returnedCylinders,
      payments,
      paidAmount: totalPaid,
      fiadoAmount: fiadoPart,
      notes: notes ? (sale.notes ? `${sale.notes} | ${notes}` : notes) : sale.notes,
    };

    setSales((prev) => prev.map((s) => (s.id === saleId ? updatedSale : s)));
    if (supabase) {
      supabase.from('sales').upsert(mapSaleToDb(updatedSale)).then();
    }

    addAuditLog(
      `Venda Delivery #${sale.saleNumber} finalizada`,
      'venda',
      `Total: R$ ${sale.totalAmount.toFixed(2)} | Recebido Caixa: R$ ${totalPaid.toFixed(2)} | Fiado: R$ ${fiadoPart.toFixed(2)} | Vasilhames Retornados: ${returnedCylinders}`,
      { saleId }
    );

    return { success: true };
  };

  // 5. CANCEL SALE
  const cancelSale = (saleId: string, reason: string) => {
    const sale = sales.find((s) => s.id === saleId);
    if (!sale) return { success: false, error: 'Venda não encontrada.' };
    if (sale.status === 'cancelada') return { success: false, error: 'Venda já cancelada.' };

    const timestamp = new Date().toISOString();
    const supabase = getSupabaseClient();

    // Reverter estoque
    const updatedStockItems: StockItem[] = [];
    setStock((prev) => {
      const nextStock = { ...prev };
      for (const item of sale.items) {
        const current = nextStock[item.productId];
        if (!current) continue;

        let newFull = current.fullQuantity;
        let newEmpty = current.emptyQuantity;

        if (sale.status !== 'cancelada') {
          newFull += item.quantity;
        }

        if (sale.status === 'finalizada' && item.isCylinder && sale.returnedCylinders > 0) {
          newEmpty = Math.max(0, newEmpty - sale.returnedCylinders);
        }

        const updated = {
          ...current,
          fullQuantity: newFull,
          emptyQuantity: newEmpty,
          lastUpdated: timestamp,
        };
        nextStock[item.productId] = updated;
        updatedStockItems.push(updated);
      }
      return nextStock;
    });

    if (supabase && updatedStockItems.length > 0) {
      supabase.from('stock').upsert(updatedStockItems.map(mapStockToDb)).then();
    }

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
      const updatedRegister: CashRegister = {
        ...cashRegister,
        currentBalance: cashRegister.currentBalance - sale.paidAmount,
      };
      setCashRegister(updatedRegister);

      if (supabase) {
        supabase.from('cash_movements').insert(mapCashMovementToDb(reverseMove)).then();
        supabase.from('cash_registers').upsert(mapCashRegisterToDb(updatedRegister)).then();
      }
    }

    // Se gerou conta a receber fiada, cancela a conta
    if (sale.fiadoAmount > 0) {
      setReceivables((prev) =>
        prev.map((r) => (r.saleId === saleId ? { ...r, status: 'pago', remainingAmount: 0 } : r))
      );
      if (supabase) {
        supabase.from('receivables').update({ status: 'pago', remainingAmount: 0, updated_at: timestamp }).eq('sale_id', saleId).then();
      }
    }

    setSales((prev) =>
      prev.map((s) => (s.id === saleId ? { ...s, status: 'cancelada', cancellationReason: reason } : s))
    );
    if (supabase) {
      supabase.from('sales').update({ status: 'cancelada', cancellation_reason: reason, updated_at: timestamp }).eq('id', saleId).then();
    }

    addAuditLog(
      `Venda #${sale.saleNumber} cancelada`,
      'cancelamento',
      `Motivo: ${reason} | Estoque restaurado e valores estornados.`,
      { saleId }
    );

    return { success: true };
  };

  // 6. ADJUST STOCK
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
    const supabase = getSupabaseClient();

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

    const updatedStockItem: StockItem = {
      productId,
      fullQuantity: newFull,
      emptyQuantity: newEmpty,
      lastUpdated: timestamp,
    };

    setStock((prev) => ({
      ...prev,
      [productId]: updatedStockItem,
    }));

    if (supabase) {
      supabase.from('stock').upsert(mapStockToDb(updatedStockItem)).then();
      supabase.from('stock_adjustments').insert(mapStockAdjustmentToDb(adjustment)).then();
    }

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

    if (movements.length > 0) {
      setStockMovements((prev) => [...movements, ...prev]);
      if (supabase) {
        supabase.from('stock_movements').insert(movements.map(mapStockMovementToDb)).then();
      }
    }

    addAuditLog(
      `Estoque ajustado: ${prod?.name}`,
      'ajuste',
      `Cheios: ${currentStock.fullQuantity} → ${newFull} (dif: ${diffFull >= 0 ? '+' : ''}${diffFull}) | Vazios: ${currentStock.emptyQuantity} → ${newEmpty} (dif: ${diffEmpty >= 0 ? '+' : ''}${diffEmpty}) | Motivo: ${reason}`,
      { productId }
    );
  };

  // 7. STOCK CONFERENCE
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
    const supabase = getSupabaseClient();

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
    if (supabase) {
      supabase.from('stock_conferences').insert(mapStockConferenceToDb(conf)).then();
    }

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

  // 8. RECEIVABLES PAYMENT (FIADO)
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
    const supabase = getSupabaseClient();

    const updatedReceivable: AccountReceivable = {
      ...rec,
      paidAmount: newPaidAmount,
      remainingAmount: newRemaining,
      status: newStatus,
      paymentHistory: [
        ...rec.paymentHistory,
        {
          id: `recpay-${Date.now()}`,
          timestamp,
          amount,
          method,
          notes,
        },
      ],
    };

    setReceivables((prev) => prev.map((r) => (r.id === receivableId ? updatedReceivable : r)));
    if (supabase) {
      supabase.from('receivables').upsert(mapReceivableToDb(updatedReceivable)).then();
    }

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
      const updatedRegister: CashRegister = {
        ...cashRegister,
        currentBalance: cashRegister.currentBalance + amount,
      };
      setCashRegister(updatedRegister);

      if (supabase) {
        supabase.from('cash_movements').insert(mapCashMovementToDb(cashMove)).then();
        supabase.from('cash_registers').upsert(mapCashRegisterToDb(updatedRegister)).then();
      }
    }

    addAuditLog(
      `Pagamento de Fiado recebido: ${rec.clientName}`,
      'financeiro',
      `Valor recebido: R$ ${amount.toFixed(2)} (${method.toUpperCase()}). Saldo restante: R$ ${newRemaining.toFixed(2)}.`
    );

    return { success: true };
  };

  // 9. CASH REGISTER
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

    const supabase = getSupabaseClient();
    if (supabase) {
      supabase.from('cash_registers').insert(mapCashRegisterToDb(newRegister)).then();
    }

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

    const supabase = getSupabaseClient();
    if (supabase) {
      supabase.from('cash_registers').upsert(mapCashRegisterToDb(updated)).then();
    }

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
    const supabase = getSupabaseClient();

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
    const updatedRegister: CashRegister = {
      ...cashRegister,
      currentBalance: isOut
        ? cashRegister.currentBalance - moveAmount
        : cashRegister.currentBalance + moveAmount,
    };
    setCashRegister(updatedRegister);

    if (supabase) {
      supabase.from('cash_movements').insert(mapCashMovementToDb(move)).then();
      supabase.from('cash_registers').upsert(mapCashRegisterToDb(updatedRegister)).then();
    }

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
    const supabase = getSupabaseClient();

    const conf: CashConference = {
      id: `cconf-${Date.now()}`,
      timestamp,
      expectedBalance: expected,
      physicalCounted,
      difference,
      notes: notes || '',
    };
    setCashConferences((prev) => [conf, ...prev]);

    if (supabase) {
      supabase.from('cash_conferences').insert(mapCashConferenceToDb(conf)).then();
    }

    addAuditLog(
      'Conferência de caixa realizada',
      'caixa',
      `Esperado: R$ ${expected.toFixed(2)} | Contado: R$ ${physicalCounted.toFixed(2)} | Diferença: R$ ${difference.toFixed(2)} ${notes ? `| Obs: ${notes}` : ''}`
    );

    return { difference };
  };

  // 10. EXPENSES & PAYABLES
  const addExpense = (expenseData: Omit<Expense, 'id' | 'date'>) => {
    const timestamp = new Date().toISOString();
    const newExp: Expense = {
      ...expenseData,
      id: `exp-${Date.now()}`,
      date: timestamp,
    };
    setExpenses((prev) => [newExp, ...prev]);
    const supabase = getSupabaseClient();

    if (supabase) {
      supabase.from('expenses').insert(mapExpenseToDb(newExp)).then();
    }

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
      const updatedRegister: CashRegister = {
        ...cashRegister,
        currentBalance: cashRegister.currentBalance - expenseData.amount,
      };
      setCashRegister(updatedRegister);

      if (supabase) {
        supabase.from('cash_movements').insert(mapCashMovementToDb(cashMove)).then();
        supabase.from('cash_registers').upsert(mapCashRegisterToDb(updatedRegister)).then();
      }
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
    const supabase = getSupabaseClient();

    if (cashDiff !== 0 && cashRegister && cashRegister.status === 'aberto') {
      const updatedRegister: CashRegister = {
        ...cashRegister,
        currentBalance: cashRegister.currentBalance - cashDiff,
      };
      setCashRegister(updatedRegister);
      if (supabase) {
        supabase.from('cash_registers').upsert(mapCashRegisterToDb(updatedRegister)).then();
      }
    }

    const updatedExpense: Expense = { ...existing, ...updates };
    setExpenses((prev) => prev.map((e) => (e.id === id ? updatedExpense : e)));
    if (supabase) {
      supabase.from('expenses').upsert(mapExpenseToDb(updatedExpense)).then();
    }

    addAuditLog(
      `Despesa alterada: ${updates.description || existing.description}`,
      'financeiro',
      `Valor: R$ ${(updates.amount || existing.amount).toFixed(2)}`
    );
  };

  const deleteExpense = (id: string) => {
    const existing = expenses.find((e) => e.id === id);
    if (!existing) return;
    const supabase = getSupabaseClient();

    if (existing.paidFromCash && cashRegister && cashRegister.status === 'aberto') {
      const updatedRegister: CashRegister = {
        ...cashRegister,
        currentBalance: cashRegister.currentBalance + existing.amount,
      };
      setCashRegister(updatedRegister);
      setCashMovements((prev) => prev.filter((cm) => cm.relatedExpenseId !== id));

      if (supabase) {
        supabase.from('cash_registers').upsert(mapCashRegisterToDb(updatedRegister)).then();
        supabase.from('cash_movements').delete().eq('related_expense_id', id).then();
      }
    }

    setExpenses((prev) => prev.filter((e) => e.id !== id));
    if (supabase) {
      supabase.from('expenses').delete().eq('id', id).then();
    }

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

    const supabase = getSupabaseClient();
    if (supabase) {
      supabase.from('payables').insert(mapPayableToDb(newPayable)).then();
    }

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
    const supabase = getSupabaseClient();

    const updatedPayable: AccountPayable = {
      ...pay,
      status: 'pago',
      paidAt: timestamp,
      paymentMethod,
    };

    setPayables((prev) => prev.map((p) => (p.id === payableId ? updatedPayable : p)));
    if (supabase) {
      supabase.from('payables').upsert(mapPayableToDb(updatedPayable)).then();
    }

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
    if (supabase) {
      supabase.from('expenses').insert(mapExpenseToDb(newExp)).then();
    }

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
      const updatedRegister: CashRegister = {
        ...cashRegister,
        currentBalance: cashRegister.currentBalance - pay.amount,
      };
      setCashRegister(updatedRegister);

      if (supabase) {
        supabase.from('cash_movements').insert(mapCashMovementToDb(cashMove)).then();
        supabase.from('cash_registers').upsert(mapCashRegisterToDb(updatedRegister)).then();
      }
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

    const supabase = getSupabaseClient();
    if (supabase) {
      supabase.from('payables').delete().eq('id', payableId).then();
    }

    addAuditLog(
      `Conta a pagar excluída: ${pay.description}`,
      'financeiro',
      `Valor: R$ ${pay.amount.toFixed(2)}`
    );
  };

  // 11. PRODUCTS & ENTITIES
  const addProduct = (productData: Omit<Product, 'id' | 'code'>) => {
    const nextCode = generateNextCode('GLP', products.map((p) => p.code));
    const newProd: Product = {
      ...productData,
      id: `prod-${Date.now()}`,
      code: nextCode,
    };
    setProducts((prev) => [...prev, newProd]);

    const initialStockItem: StockItem = {
      productId: newProd.id,
      fullQuantity: 0,
      emptyQuantity: 0,
      lastUpdated: new Date().toISOString(),
    };

    setStock((prev) => ({
      ...prev,
      [newProd.id]: initialStockItem,
    }));

    const supabase = getSupabaseClient();
    if (supabase) {
      supabase.from('products').insert(mapProductToDb(newProd)).then();
      supabase.from('stock').insert(mapStockToDb(initialStockItem)).then();
    }

    addAuditLog(
      `Produto cadastrado: ${newProd.name}`,
      'estoque',
      `Código: ${newProd.code} | Custo: R$ ${newProd.costPrice.toFixed(2)} | Venda: R$ ${newProd.sellPrice.toFixed(2)}`
    );
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    const existing = products.find((p) => p.id === id);
    if (!existing) return;

    const updated: Product = { ...existing, ...updates };
    setProducts((prev) => prev.map((p) => (p.id === id ? updated : p)));

    const supabase = getSupabaseClient();
    if (supabase) {
      supabase.from('products').upsert(mapProductToDb(updated)).then();
    }

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
    const supabase = getSupabaseClient();

    if (hasSalesHistory || hasStockMovements || hasStockAdjustments || hasConferences) {
      const deactivated: Product = { ...prod, isActive: false };
      setProducts((prev) => prev.map((p) => (p.id === productId ? deactivated : p)));

      if (supabase) {
        supabase.from('products').upsert(mapProductToDb(deactivated)).then();
      }

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
      setProducts((prev) => prev.filter((p) => p.id !== productId));
      setStock((prev) => {
        const next = { ...prev };
        delete next[productId];
        return next;
      });

      if (supabase) {
        supabase.from('stock').delete().eq('product_id', productId).then();
        supabase.from('products').delete().eq('id', productId).then();
      }

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

    const supabase = getSupabaseClient();
    if (supabase) {
      supabase.from('clients').insert(mapClientToDb(newClient)).then();
    }

    addAuditLog('Cliente cadastrado', 'cliente', `Nome: ${newClient.name} | Tel: ${newClient.phone}`);
    return id;
  };

  const updateClient = (id: string, updates: Partial<Client>) => {
    const existing = clients.find((c) => c.id === id);
    if (!existing) return;

    const updated: Client = { ...existing, ...updates };
    setClients((prev) => prev.map((c) => (c.id === id ? updated : c)));

    const supabase = getSupabaseClient();
    if (supabase) {
      supabase.from('clients').upsert(mapClientToDb(updated)).then();
    }
  };

  const addDeliveryPerson = (dp: Omit<DeliveryPerson, 'id'>) => {
    const newDp: DeliveryPerson = {
      ...dp,
      id: `del-${Date.now()}`,
    };
    setDeliveryPersons((prev) => [...prev, newDp]);

    const supabase = getSupabaseClient();
    if (supabase) {
      supabase.from('delivery_persons').insert(mapDeliveryPersonToDb(newDp)).then();
    }

    addAuditLog('Entregador cadastrado', 'cliente', `Nome: ${newDp.name} | Tel: ${newDp.phone}`);
  };

  const updateDeliveryPerson = (id: string, updates: Partial<DeliveryPerson>) => {
    const existing = deliveryPersons.find((d) => d.id === id);
    if (!existing) return;

    const updated: DeliveryPerson = { ...existing, ...updates };
    setDeliveryPersons((prev) => prev.map((d) => (d.id === id ? updated : d)));

    const supabase = getSupabaseClient();
    if (supabase) {
      supabase.from('delivery_persons').upsert(mapDeliveryPersonToDb(updated)).then();
    }
  };

  const addSupplier = (supplier: Omit<Supplier, 'id'>) => {
    const newSup: Supplier = {
      ...supplier,
      id: `sup-${Date.now()}`,
    };
    setSuppliers((prev) => [...prev, newSup]);

    const supabase = getSupabaseClient();
    if (supabase) {
      supabase.from('suppliers').insert(mapSupplierToDb(newSup)).then();
    }

    addAuditLog('Fornecedor cadastrado', 'financeiro', `Nome: ${newSup.name}`);
  };

  const updateSupplier = (id: string, updates: Partial<Supplier>) => {
    const existing = suppliers.find((s) => s.id === id);
    if (!existing) return;

    const updated: Supplier = { ...existing, ...updates };
    setSuppliers((prev) => prev.map((s) => (s.id === id ? updated : s)));

    const supabase = getSupabaseClient();
    if (supabase) {
      supabase.from('suppliers').upsert(mapSupplierToDb(updated)).then();
    }
  };

  // 12. BACKUP & RESTORE
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

    const supabase = getSupabaseClient();
    if (supabase) {
      syncCurrentDataToSupabase();
    }
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

    const resetStock: Record<string, StockItem> = {};
    products.forEach((p) => {
      resetStock[p.id] = {
        productId: p.id,
        fullQuantity: 0,
        emptyQuantity: 0,
        lastUpdated: new Date().toISOString(),
      };
    });
    setStock(resetStock);

    const supabase = getSupabaseClient();
    if (supabase) {
      // Clear operational tables on Supabase
      supabase.from('sales').delete().neq('id', '0').then();
      supabase.from('receivables').delete().neq('id', '0').then();
      supabase.from('payables').delete().neq('id', '0').then();
      supabase.from('cash_registers').delete().neq('id', '0').then();
      supabase.from('cash_movements').delete().neq('id', '0').then();
      supabase.from('expenses').delete().neq('id', '0').then();
      supabase.from('stock_movements').delete().neq('id', '0').then();
      supabase.from('stock_adjustments').delete().neq('id', '0').then();
      supabase.from('stock_conferences').delete().neq('id', '0').then();
      supabase.from('cash_conferences').delete().neq('id', '0').then();
      supabase.from('stock').upsert(Object.values(resetStock).map(mapStockToDb)).then();
    }

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

      const supabase = getSupabaseClient();
      if (supabase) {
        syncCurrentDataToSupabase();
      }
      return true;
    } catch (e) {
      console.error('Import database error', e);
      return false;
    }
  };

  // 13. COMPUTED HELPERS
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
        settings,
        isOnlineDb,
        dbSyncState,
        lastSyncTime,
        dbErrorMessage,
        reloadFromOnlineDb,
        syncCurrentDataToSupabase,
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
