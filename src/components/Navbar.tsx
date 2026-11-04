import React from 'react';
import {
  LayoutDashboard,
  Flame,
  Truck,
  Package,
  Users,
  Wallet,
  TrendingUp,
  FileText,
  ShieldCheck,
  Settings,
  Plus,
  Menu,
  X,
  HandCoins,
  Receipt,
  ArrowDownCircle,
  ChevronsLeft,
  ChevronsRight,
  Database,
  LogOut,
  UserCog,
  ShoppingBag,
  Boxes,
} from 'lucide-react';
import { useErp } from '../context/ErpContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/formatters';

export type ActiveTab =
  | 'dashboard'
  | 'em_andamento'
  | 'nova_venda'
  | 'historico_vendas'
  | 'entregas'
  | 'estoque'
  | 'clientes'
  | 'receber'
  | 'caixa'
  | 'pagar'
  | 'despesas'
  | 'produtos'
  | 'lucro'
  | 'relatorios'
  | 'auditoria'
  | 'usuarios'
  | 'config';

/** Rótulos das telas navegáveis (menu, trilha de navegação e endereço). */
export const TAB_LABELS: Partial<Record<ActiveTab, string>> = {
  dashboard: 'Início',
  em_andamento: 'Entregas',
  historico_vendas: 'Vendas',
  estoque: 'Estoque',
  clientes: 'Clientes',
  receber: 'Fiado',
  caixa: 'Caixa',
  pagar: 'Contas a pagar',
  despesas: 'Despesas',
  produtos: 'Produtos',
  lucro: 'Resultados',
  relatorios: 'Relatórios',
  auditoria: 'Auditoria',
  usuarios: 'Usuários',
  config: 'Configurações',
};

export const ROLE_LABELS: Record<string, string> = {
  superadmin: 'Superadmin',
  admin: 'Administrador',
  operador: 'Operador',
  entregador: 'Entregador',
};

/** Iniciais para o avatar (ignora textos entre parênteses). */
export function userInitials(name?: string) {
  if (!name) return '?';
  const parts = name.replace(/\(.*?\)/g, '').trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenNewSale: () => void;
  onOpenSupabase: () => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

type NavItem = {
  id: ActiveTab;
  icon: React.ElementType;
  badge?: number;
  tone?: 'brand' | 'danger';
  hint?: string;
};

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenNewSale,
  onOpenSupabase,
  mobileMenuOpen,
  setMobileMenuOpen,
  sidebarCollapsed,
  setSidebarCollapsed,
}) => {
  const { inProgressDeliveriesCount, overduePayablesCount, cashRegister, criticalStockCount, isOnlineDb, dbSyncState } =
    useErp();

  const { currentUser, logout } = useAuth();
  const isSuperadmin = currentUser?.role === 'superadmin';
  const isAdminOrSuper = isSuperadmin || currentUser?.role === 'admin';
  const cashOpen = cashRegister?.status === 'aberto';
  const firstName = currentUser?.name.replace(/\s*\(.*?\)/g, '').split(' ')[0] || '';

  const sections: { title: string; items: NavItem[] }[] = [
    {
      title: 'Operação',
      items: [
        { id: 'dashboard', icon: LayoutDashboard },
        {
          id: 'em_andamento',
          icon: Truck,
          badge: inProgressDeliveriesCount > 0 ? inProgressDeliveriesCount : undefined,
          tone: 'brand',
        },
        { id: 'historico_vendas', icon: ShoppingBag },
        {
          id: 'estoque',
          icon: Package,
          badge: criticalStockCount > 0 ? criticalStockCount : undefined,
          tone: 'danger',
          hint: criticalStockCount > 0 ? `${criticalStockCount} produto(s) abaixo do mínimo` : undefined,
        },
        { id: 'clientes', icon: Users },
      ],
    },
    {
      title: 'Financeiro',
      items: [
        { id: 'caixa', icon: Wallet, hint: cashOpen ? 'Caixa aberto' : 'Caixa fechado' },
        { id: 'receber', icon: HandCoins },
        {
          id: 'pagar',
          icon: Receipt,
          badge: overduePayablesCount > 0 ? overduePayablesCount : undefined,
          tone: 'danger',
          hint: overduePayablesCount > 0 ? `${overduePayablesCount} conta(s) vencida(s)` : undefined,
        },
        { id: 'despesas', icon: ArrowDownCircle },
        { id: 'lucro', icon: TrendingUp },
      ],
    },
    {
      title: 'Gestão',
      items: [
        { id: 'produtos', icon: Boxes },
        { id: 'relatorios', icon: FileText },
        { id: 'auditoria', icon: ShieldCheck },
      ],
    },
    {
      title: 'Sistema',
      items: [
        ...(isAdminOrSuper ? [{ id: 'usuarios' as ActiveTab, icon: UserCog }] : []),
        { id: 'config', icon: Settings },
      ],
    },
  ];

  const handleSelectTab = (tab: ActiveTab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  const bottomItems: { id: ActiveTab | 'menu'; label: string; icon: React.ElementType; count?: number }[] = [
    { id: 'dashboard', label: 'Início', icon: LayoutDashboard },
    { id: 'em_andamento', label: 'Entregas', icon: Truck, count: inProgressDeliveriesCount },
    { id: 'estoque', label: 'Estoque', icon: Package },
    { id: 'menu', label: 'Menu', icon: Menu },
  ];

  const renderBottomItem = (item: (typeof bottomItems)[number]) => {
    const Icon = item.icon;
    const isMenu = item.id === 'menu';
    const isActive = isMenu ? mobileMenuOpen : activeTab === item.id && !mobileMenuOpen;
    return (
      <button
        key={item.id}
        onClick={() => (isMenu ? setMobileMenuOpen(!mobileMenuOpen) : handleSelectTab(item.id as ActiveTab))}
        aria-current={!isMenu && isActive ? 'page' : undefined}
        aria-expanded={isMenu ? mobileMenuOpen : undefined}
        className={`relative flex flex-col items-center justify-center gap-1 min-h-14 text-[11px] font-medium transition-colors ${
          isActive ? 'text-slate-900' : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        <span className="relative">
          <Icon className="w-[22px] h-[22px]" strokeWidth={isActive ? 2.2 : 1.8} />
          {!!item.count && item.count > 0 && (
            <span className="absolute -top-1.5 -right-2.5 bg-orange-600 text-white font-semibold text-[10px] min-w-4 h-4 px-1 rounded-full flex items-center justify-center ring-2 ring-white">
              {item.count}
            </span>
          )}
        </span>
        <span>{item.label}</span>
        {isActive && <span className="absolute top-0 h-0.5 w-6 rounded-full bg-orange-600" />}
      </button>
    );
  };

  const dbDotClass =
    dbSyncState === 'error' ? 'bg-rose-500' : isOnlineDb ? 'bg-emerald-500' : 'bg-amber-500';

  return (
    <>
      {/* Topo */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="w-full px-3 sm:px-4 lg:px-5 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              id="mobile-menu-toggle-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden w-10 h-10 -ml-1 flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
              aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <button
              type="button"
              onClick={() => handleSelectTab('dashboard')}
              className="flex items-center gap-2.5 rounded-lg select-none"
              aria-label="Ir para o início"
            >
              <span className="w-8 h-8 rounded-lg bg-orange-600 flex items-center justify-center text-white shrink-0">
                <Flame className="w-[18px] h-[18px]" strokeWidth={2.2} />
              </span>
              <span className="text-[17px] font-bold tracking-tight text-slate-900">
                Erp<span className="text-orange-600">GLP</span>
              </span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              id="header-cash-status-btn"
              onClick={() => handleSelectTab('caixa')}
              className="hidden md:flex items-center gap-2 h-9 px-3 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50"
            >
              <span className={`w-2 h-2 rounded-full ${cashOpen ? 'bg-emerald-500' : 'bg-slate-300'}`} />
              <span>{cashOpen ? 'Caixa aberto' : 'Caixa fechado'}</span>
              {cashOpen && (
                <span className="font-semibold text-slate-900 tabular-nums">
                  {formatCurrency(cashRegister!.currentBalance)}
                </span>
              )}
            </button>

            {isSuperadmin ? (
              <button
                id="header-supabase-btn"
                onClick={onOpenSupabase}
                title="Banco de dados online"
                aria-label="Banco de dados online"
                className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <span className="relative flex">
                  <Database className="w-4 h-4" />
                  <span className={`absolute -bottom-0.5 -right-1 w-2 h-2 rounded-full ring-2 ring-white ${dbDotClass}`} />
                </span>
              </button>
            ) : (
              <span
                title={isOnlineDb ? 'Banco de dados conectado' : 'Sem conexão com o banco'}
                className="w-9 h-9 flex items-center justify-center text-slate-400"
              >
                <span className="relative flex">
                  <Database className="w-4 h-4" />
                  <span className={`absolute -bottom-0.5 -right-1 w-2 h-2 rounded-full ring-2 ring-white ${dbDotClass}`} />
                </span>
              </span>
            )}

            <button
              id="header-new-sale-btn"
              onClick={onOpenNewSale}
              className="hidden lg:flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold transition-colors"
            >
              <Plus className="w-4 h-4" strokeWidth={2.5} />
              <span>Nova venda</span>
            </button>

            {currentUser && (
              <div className="hidden md:flex items-center gap-1 pl-2 ml-1 border-l border-slate-200">
                <button
                  type="button"
                  onClick={() => isAdminOrSuper && handleSelectTab('usuarios')}
                  className="flex items-center gap-2 rounded-lg p-1 hover:bg-slate-50"
                  title={currentUser.name}
                >
                  <span className="w-8 h-8 rounded-full bg-slate-900 text-white text-xs font-semibold flex items-center justify-center">
                    {userInitials(currentUser.name)}
                  </span>
                  <span className="hidden xl:flex flex-col text-left leading-tight pr-1">
                    <span className="text-sm font-semibold text-slate-900 max-w-[140px] truncate">{firstName}</span>
                    <span className="text-xs text-slate-500">{ROLE_LABELS[currentUser.role] || currentUser.role}</span>
                  </span>
                </button>
                <button
                  id="header-logout-btn"
                  onClick={() => logout()}
                  title="Sair"
                  aria-label="Sair da conta"
                  className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Fundo escurecido do menu no celular/tablet */}
      <div
        className={`fixed inset-0 bg-slate-950/40 z-40 transition-opacity lg:hidden ${
          mobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setMobileMenuOpen(false)}
        aria-hidden="true"
      />

      {/* Menu lateral */}
      <aside
        aria-label="Menu principal"
        className={`fixed top-0 lg:top-14 left-0 bottom-0 bg-slate-950 text-slate-300 z-50 lg:z-30 flex flex-col transition-all duration-300 ease-in-out ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${sidebarCollapsed ? 'w-72 lg:w-[68px]' : 'w-72 lg:w-60'}`}
      >
        <div className="lg:hidden flex items-center justify-between px-4 h-14 border-b border-white/10">
          <span className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-orange-600 flex items-center justify-center text-white">
              <Flame className="w-[18px] h-[18px]" strokeWidth={2.2} />
            </span>
            <span className="text-[17px] font-bold tracking-tight text-white">
              Erp<span className="text-orange-500">GLP</span>
            </span>
          </span>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="w-10 h-10 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
            aria-label="Fechar menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-2.5 space-y-5 lg:space-y-4">
          {sections.map((section) => (
            <div key={section.title}>
              <div className={`px-2.5 mb-1.5 text-xs font-medium text-slate-500 ${sidebarCollapsed ? 'lg:sr-only' : ''}`}>
                {section.title}
              </div>
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const label = TAB_LABELS[item.id] || item.id;
                  const isActive = activeTab === item.id;
                  return (
                    <li key={item.id}>
                      <button
                        id={`nav-item-${item.id}`}
                        onClick={() => handleSelectTab(item.id)}
                        title={sidebarCollapsed ? label : item.hint}
                        aria-current={isActive ? 'page' : undefined}
                        className={`relative w-full min-h-10 lg:min-h-9 flex items-center gap-3 rounded-lg px-2.5 text-sm transition-colors ${
                          sidebarCollapsed ? 'lg:justify-center lg:px-0' : ''
                        } ${
                          isActive
                            ? 'bg-white/[0.08] text-white font-medium'
                            : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                        }`}
                      >
                        {isActive && (
                          <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-orange-500" />
                        )}
                        <Icon className={`w-[18px] h-[18px] shrink-0 ${isActive ? 'text-orange-400' : ''}`} />
                        <span className={`flex-1 text-left truncate ${sidebarCollapsed ? 'lg:hidden' : ''}`}>{label}</span>

                        {item.id === 'caixa' && (
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${cashOpen ? 'bg-emerald-400' : 'bg-slate-600'} ${
                              sidebarCollapsed ? 'lg:hidden' : ''
                            }`}
                            aria-label={item.hint}
                          />
                        )}
                        {item.badge !== undefined && (
                          <span
                            className={`text-[11px] font-semibold min-w-5 h-5 px-1.5 rounded-full flex items-center justify-center shrink-0 ${
                              item.tone === 'danger' ? 'bg-rose-500/15 text-rose-300' : 'bg-orange-500/15 text-orange-300'
                            } ${sidebarCollapsed ? 'lg:absolute lg:top-0.5 lg:right-1 lg:min-w-4 lg:h-4 lg:px-1 lg:text-[10px]' : ''}`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 p-2.5 space-y-0.5">
          <div className={`flex items-center gap-3 px-2 py-2 ${sidebarCollapsed ? 'lg:justify-center lg:px-0' : ''}`}>
            <span className="w-8 h-8 rounded-full bg-white/10 text-white text-xs font-semibold flex items-center justify-center shrink-0">
              {userInitials(currentUser?.name)}
            </span>
            <div className={`min-w-0 flex-1 ${sidebarCollapsed ? 'lg:hidden' : ''}`}>
              <div className="text-sm font-medium text-white truncate">
                {currentUser?.name.replace(/\s*\(.*?\)/g, '') || 'ErpGLP'}
              </div>
              <div className="text-xs text-slate-500">{ROLE_LABELS[currentUser?.role || ''] || ''}</div>
            </div>
          </div>

          <button
            onClick={() => {
              setMobileMenuOpen(false);
              logout();
            }}
            className={`w-full min-h-10 flex items-center gap-3 px-2.5 rounded-lg text-sm text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors ${
              sidebarCollapsed ? 'lg:justify-center lg:px-0' : ''
            }`}
            title="Sair"
          >
            <LogOut className="w-[18px] h-[18px] shrink-0" />
            <span className={sidebarCollapsed ? 'lg:hidden' : ''}>Sair</span>
          </button>

          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={`hidden lg:flex w-full min-h-10 items-center gap-3 rounded-lg text-sm text-slate-500 hover:text-white hover:bg-white/[0.04] ${
              sidebarCollapsed ? 'justify-center' : 'px-2.5'
            }`}
            title={sidebarCollapsed ? 'Expandir menu' : 'Recolher menu'}
          >
            {sidebarCollapsed ? (
              <ChevronsRight className="w-[18px] h-[18px]" />
            ) : (
              <ChevronsLeft className="w-[18px] h-[18px]" />
            )}
            {!sidebarCollapsed && <span>Recolher menu</span>}
          </button>
        </div>
      </aside>

      {/* Barra inferior (celular e tablet) */}
      <nav
        aria-label="Navegação principal"
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 pb-[env(safe-area-inset-bottom)]"
      >
        <div className="max-w-xl mx-auto grid grid-cols-5 items-end px-1">
          {bottomItems.slice(0, 2).map(renderBottomItem)}
          <div className="flex justify-center">
            <button
              onClick={onOpenNewSale}
              className="-mt-5 mb-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl w-14 h-14 flex items-center justify-center shadow-lg ring-4 ring-white active:scale-95 transition-transform"
              aria-label="Nova Venda"
            >
              <Plus className="w-7 h-7" strokeWidth={2.4} />
            </button>
          </div>
          {bottomItems.slice(2).map(renderBottomItem)}
        </div>
      </nav>
    </>
  );
};
