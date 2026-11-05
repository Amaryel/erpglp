export type UserRole = 'superadmin' | 'admin' | 'operador' | 'entregador';
export type UserStatus = 'ativo' | 'bloqueado';

export interface AppUser {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  hasDefinedPassword?: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export type PaymentMethod = 'dinheiro' | 'pix' | 'debito' | 'credito' | 'fiado' | 'outro';

export type SaleType = 'balcao' | 'delivery';

export type SaleStatus = 'pendente' | 'em_entrega' | 'aguardando_finalizacao' | 'finalizada' | 'cancelada';

export type ExpenseCategory =
  | 'combustivel'
  | 'manutencao'
  | 'compras'
  | 'energia'
  | 'agua'
  | 'aluguel'
  | 'Gás / Distribuidora'
  | 'Combustível'
  | 'Manutenção de Veículos'
  | 'Aluguel'
  | 'Energia Elétrica'
  | 'Água'
  | 'Funcionários / Diárias'
  | 'Internet / Telefonia'
  | 'Impostos / Taxas'
  | 'Outros'
  | 'outros'
  | string;

export type CashMovementType =
  | 'venda'
  | 'recebimento_fiado'
  | 'entrada'
  | 'saida'
  | 'sangria'
  | 'suprimento'
  | 'pagamento_despesa'
  | 'pagamento_fornecedor';

export type StockMovementType = 
  | 'venda'
  | 'retorno_vasilhame'
  | 'entrada'
  | 'ajuste_positivo'
  | 'ajuste_negativo'
  | 'perda'
  | 'cancelamento'
  | 'outros';

export interface Product {
  id: string;
  code: string; // Auto-gerado (ex: GLP-0001)
  name: string;
  /** Custo total por unidade = produto + frete + impostos (usado no cálculo de lucro). */
  costPrice: number;
  /** Custo do produto em si (ex.: o gás pago à distribuidora). */
  baseCost?: number;
  /** Frete por unidade. */
  freightCost?: number;
  /** Impostos por unidade. */
  taxCost?: number;
  sellPrice: number;
  category?: string;
  minStock?: number;
  description?: string;
  unit?: string;
  isActive: boolean;
  isCylinder: boolean; // Se movimenta botijão cheio/vazio
}

export interface StockItem {
  productId: string;
  fullQuantity: number;
  emptyQuantity: number;
  lastUpdated: string;
}

export interface StockMovement {
  id: string;
  timestamp: string;
  productId: string;
  productName: string;
  quantity: number;
  stockType: 'cheio' | 'vazio' | 'unitario';
  direction: 'entrada' | 'saida';
  type: StockMovementType;
  origin: string;
  relatedSaleId?: string;
  notes?: string;
  previousQty: number;
  newQty: number;
}

export interface StockAdjustment {
  id: string;
  timestamp: string;
  productId: string;
  productName: string;
  previousFull: number;
  newFull: number;
  diffFull: number;
  previousEmpty: number;
  newEmpty: number;
  diffEmpty: number;
  reason: string;
  notes?: string;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  address: string;
  neighborhood: string;
  reference?: string;
  document?: string;
  creditLimit?: number;
  notes?: string;
  createdAt: string;
}

export interface DeliveryPerson {
  id: string;
  name: string;
  phone: string;
  vehicle?: string;
  isActive: boolean;
}

export interface Supplier {
  id: string;
  name: string;
  document?: string;
  phone?: string;
  address?: string;
  contactPerson?: string;
  productsSupplied?: string;
  notes?: string;
}

export interface PaymentSplit {
  method: PaymentMethod;
  amount: number;
}

export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unitCost: number; // PREÇO DE CUSTO CONGELADO NO ATO DA VENDA
  unitPrice: number;
  total: number;
  isCylinder: boolean;
  /** Vasilhames vazios devolvidos deste produto (troca). */
  returnedQuantity?: number;
}

export interface Sale {
  id: string;
  saleNumber: number;
  type: SaleType;
  status: SaleStatus;
  createdAt: string;
  finalizedAt?: string;
  clientId?: string;
  clientName?: string;
  clientPhone?: string;
  clientAddress?: string;
  clientNeighborhood?: string;
  deliveryPersonId?: string;
  deliveryPersonName?: string;
  items: SaleItem[];
  totalAmount: number;
  totalCost: number;
  grossProfit: number;
  profitMargin: number;
  dispatchedCylinders: number; // Botijões cheios que saíram
  returnedCylinders: number;   // Vasilhames vazios retornados
  payments: PaymentSplit[];
  paidAmount: number;
  fiadoAmount: number;
  notes?: string;
  cancellationReason?: string;
  /** Usuário que lançou a venda/entrega (confirmado pelo servidor). */
  createdByName?: string;
  /** Usuário que finalizou (balcão: o mesmo que lançou). */
  finalizedByName?: string;
  canceledByName?: string;
}

export interface ReceivablePayment {
  id: string;
  timestamp: string;
  amount: number;
  method: PaymentMethod;
  notes?: string;
}

export interface AccountReceivable {
  id: string;
  saleId: string;
  saleNumber: number;
  clientId: string;
  clientName: string;
  clientPhone?: string;
  originalAmount?: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  createdAt: string;
  dueDate?: string;
  status: 'aberto' | 'parcial' | 'pago' | 'vencido';
  paymentHistory: ReceivablePayment[];
}

export type Receivable = AccountReceivable;

export interface CashMovement {
  id: string;
  cashRegisterId: string;
  timestamp: string;
  type: CashMovementType;
  amount: number;
  method?: PaymentMethod;
  paymentMethod?: PaymentMethod;
  description: string;
  relatedSaleId?: string;
  relatedReceivableId?: string;
  relatedExpenseId?: string;
}

export interface CashRegister {
  id: string;
  openedAt: string;
  closedAt?: string;
  initialBalance: number;
  currentBalance: number;
  status: 'aberto' | 'fechado';
  physicalCounted?: number;
  difference?: number;
  closeNotes?: string;
}

export interface Expense {
  id: string;
  description: string;
  category: ExpenseCategory | string;
  amount: number;
  method?: PaymentMethod;
  paymentMethod?: PaymentMethod;
  date: string;
  paidFromCash: boolean;
  supplier?: string;
  notes?: string;
}

export interface AccountPayable {
  id: string;
  description: string;
  supplierId?: string;
  supplierName?: string;
  supplier?: string;
  category: ExpenseCategory | string;
  amount: number;
  dueDate: string;
  paidAt?: string;
  paymentMethod?: PaymentMethod;
  status: 'pendente' | 'pago' | 'vencido' | 'cancelado';
  notes?: string;
}

export type Payable = AccountPayable;

export interface AppSettings {
  companyName: string;
  tradingName: string;
  cnpj: string;
  phone: string;
  address: string;
  neighborhood: string;
  city: string;
  pixKey: string;
  defaultMinStock: number;
  deliveryFee: number;
  deliveryTimeMinutes: number;
  receiptFooterMessage: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action: 'cancelamento_venda' | 'ajuste_estoque' | 'divergencia_vasilhame' | 'divergencia_caixa' | 'conferencia_estoque' | string;
  category: 'venda' | 'estoque' | 'caixa' | 'financeiro' | 'cliente' | 'ajuste' | 'cancelamento' | string;
  description?: string;
  details: any;
  saleId?: string;
  productId?: string;
  /** Usuário que gerou o registro (confirmado pelo servidor). */
  userName?: string;
}

export interface StockConference {
  id: string;
  timestamp: string;
  productId: string;
  productName: string;
  systemFull: number;
  physicalFull: number;
  diffFull: number;
  systemEmpty: number;
  physicalEmpty: number;
  diffEmpty: number;
  reason: string;
  adjusted: boolean;
}

export interface CashConference {
  id: string;
  timestamp: string;
  expectedBalance: number;
  physicalCounted: number;
  difference: number;
  notes: string;
}
