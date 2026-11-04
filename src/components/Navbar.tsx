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
  ShieldAlert,
  Settings,
  PlusCircle,
  Menu,
  X,
  CreditCard,
  Layers,
  ChevronLeft,
  ChevronRight,
  Database,
  Cloud,
  LogOut,
  UserCheck,
  Shield,
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

/** Rótulos das telas navegáveis (usados no menu, na barra de navegação e no endereço). */
export const TAB_LABELS: Partial<Record<ActiveTab, string>> = {
  dashboard: 'Início',
  em_andamento: 'Vendas em Andamento',
  historico_vendas: 'Histórico de Vendas',
  estoque: 'Estoque & Vasilhames',
  clientes: 'Clientes',
  receber: 'Contas a Receber (Fiados)',
  caixa: 'Caixa do Dia',
  pagar: 'Contas a Pagar',
  despesas: 'Saídas & Despesas',
  produtos: 'Produtos & Cadastros',
  lucro: 'Lucro & Resultados',
  relatorios: 'Relatórios Gerenciais',
  auditoria: 'Auditoria & Divergências',
  usuarios: 'Usuários & Acessos',
  config: 'Configurações & Backup',
};

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
  const {
    inProgressDeliveriesCount,
    overduePayablesCount,
    cashRegister,
    criticalStockCount,
    isOnlineDb,
    dbSyncState,
  } = useErp();

  const { currentUser, logout } = useAuth();
  const isSuperadmin = currentUser?.role === 'superadmin';
  const isAdminOrSuper = currentUser?.role === 'superadmin' || currentUser?.role === 'admin';

  const navItems = [
    { id: 'dashboard' as ActiveTab, label: 'Dashboard', icon: LayoutDashboard },
    {
      id: 'em_andamento' as ActiveTab,
      label: 'Vendas em Andamento',
      icon: Truck,
      badge: inProgressDeliveriesCount > 0 ? inProgressDeliveriesCount : undefined,
      badgeColor: 'bg-amber-500 text-white',
    },
    { id: 'historico_vendas' as ActiveTab, label: 'Histórico de Vendas', icon: Flame },
    {
      id: 'estoque' as ActiveTab,
      label: 'Estoque & Vasilhames',
      icon: Package,
      badge: criticalStockCount > 0 ? `${criticalStockCount} baixos` : undefined,
      badgeColor: 'bg-rose-500 text-white',
    },
    { id: 'clientes' as ActiveTab, label: 'Clientes', icon: Users },
    {
      id: 'receber' as ActiveTab,
      label: 'Contas a Receber (Fiados)',
      icon: CreditCard,
    },
    {
      id: 'caixa' as ActiveTab,
      label: 'Caixa do Dia',
      icon: Wallet,
      extra: cashRegister?.status === 'aberto' ? 'Aberto' : 'Fechado',
    },
    {
      id: 'pagar' as ActiveTab,
      label: 'Contas a Pagar',
      icon: Layers,
      badge: overduePayablesCount > 0 ? `${overduePayablesCount} vencidas` : undefined,
      badgeColor: 'bg-red-600 text-white',
    },
    { id: 'despesas' as ActiveTab, label: 'Saídas & Despesas', icon: Layers },
    { id: 'produtos' as ActiveTab, label: 'Produtos & Cadastros', icon: Package },
    { id: 'lucro' as ActiveTab, label: 'Lucro & Resultados', icon: TrendingUp },
    { id: 'relatorios' as ActiveTab, label: 'Relatórios Gerenciais', icon: FileText },
    { id: 'auditoria' as ActiveTab, label: 'Auditoria & Divergências', icon: ShieldAlert },
    ...(isAdminOrSuper
      ? [
          {
            id: 'usuarios' as ActiveTab,
            label: 'Usuários & Acessos',
            icon: Shield,
            badge: isSuperadmin ? 'Superadmin' : undefined,
            badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-500/40',
          },
        ]
      : []),
    { id: 'config' as ActiveTab, label: 'Configurações & Backup', icon: Settings },
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
        className={`relative flex flex-col items-center justify-center gap-0.5 min-h-14 rounded-xl text-[11px] font-semibold transition-colors ${
          isActive ? 'text-amber-400' : 'text-slate-400 hover:text-white'
        }`}
      >
        <span className="relative">
          <Icon className="w-5 h-5" />
          {!!item.count && item.count > 0 && (
            <span className="absolute -top-1.5 -right-2.5 bg-amber-500 text-slate-950 font-black text-[10px] min-w-4 h-4 px-1 rounded-full flex items-center justify-center">
              {item.count}
            </span>
          )}
        </span>
        <span>{item.label}</span>
        {isActive && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-amber-400" />}
      </button>
    );
  };

  return (
    <>
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 bg-slate-900 text-white border-b border-slate-800 shadow-sm">
        <div className="w-full px-3 sm:px-4 lg:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Mobile / Tablet Drawer Toggle Button (< lg) */}
            <button
              id="mobile-menu-toggle-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden w-10 h-10 -ml-1 flex items-center justify-center rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Desktop Sidebar Collapse / Expand Toggle (>= lg) */}
            <button
              id="desktop-sidebar-collapse-btn"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden lg:flex p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title={sidebarCollapsed ? 'Expandir Menu Lateral' : 'Recolher Menu Lateral'}
              aria-label={sidebarCollapsed ? 'Expandir Menu' : 'Recolher Menu'}
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Brand */}
            <button
              type="button"
              onClick={() => handleSelectTab('dashboard')}
              className="flex items-center gap-2 cursor-pointer select-none rounded-lg focus-visible:outline-2 focus-visible:outline-amber-400"
              aria-label="Ir para o início"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white font-bold text-lg shadow-inner shrink-0">
                <Flame className="w-5 h-5 fill-white text-orange-500" />
              </div>
              <div>
                <span className="text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                  Erp<span className="text-amber-400">GLP</span>
                  <span className="hidden sm:inline text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Pro
                  </span>
                </span>
              </div>
            </button>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Supabase Online DB Badge */}
            {isSuperadmin ? (
              <button
                id="header-supabase-btn"
                onClick={onOpenSupabase}
                title="Gerenciar Banco de Dados Online (Superadmin)"
                className="flex items-center gap-1.5 h-8 px-2.5 rounded-full text-xs font-semibold border bg-emerald-950/70 text-emerald-300 border-emerald-600/60 hover:bg-emerald-900/70 transition-all cursor-pointer"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <Database className="w-3.5 h-3.5" />
                <span className="hidden xl:inline">
                  Banco Online
                </span>
                {dbSyncState === 'syncing' && (
                  <span className="text-[10px] text-emerald-200 animate-pulse">Sync...</span>
                )}
              </button>
            ) : (
              <div
                title="Banco de Dados Online Conectado"
                className="flex items-center gap-1.5 h-8 px-2.5 rounded-full text-xs font-semibold border bg-emerald-950/70 text-emerald-300 border-emerald-600/60 select-none"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <Database className="w-3.5 h-3.5" />
                <span className="hidden xl:inline">
                  Banco Online
                </span>
                {dbSyncState === 'syncing' && (
                  <span className="text-[10px] text-emerald-200 animate-pulse">Sync...</span>
                )}
              </div>
            )}

            {/* Caixa Status Indicator */}
            <button
              id="header-cash-status-btn"
              onClick={() => handleSelectTab('caixa')}
              className={`hidden md:flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-medium border transition-colors ${
                cashRegister?.status === 'aberto'
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/50 hover:bg-emerald-900/60'
                  : 'bg-rose-950/60 text-rose-300 border-rose-700/50 hover:bg-rose-900/60'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  cashRegister?.status === 'aberto' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
                }`}
              />
              <span>Caixa {cashRegister?.status === 'aberto' ? 'Aberto' : 'Fechado'}</span>
              {cashRegister?.status === 'aberto' && (
                <span className="font-bold text-white ml-0.5">
                  {formatCurrency(cashRegister.currentBalance)}
                </span>
              )}
            </button>

            {/* Big Primary Action: Nova Venda */}
            <button
              id="header-new-sale-btn"
              onClick={onOpenNewSale}
              className="hidden lg:flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold text-sm px-4 h-10 rounded-lg shadow-md shadow-orange-500/20 transition-all transform active:scale-95 shrink-0"
            >
              <PlusCircle className="w-5 h-5" />
              <span>Nova Venda</span>
            </button>

            {/* Current User & Logout Button */}
            {currentUser && (
              <div className="hidden md:flex items-center gap-2 pl-2.5 border-l border-slate-800">
                <div
                  onClick={() => isAdminOrSuper && handleSelectTab('usuarios')}
                  className="hidden lg:flex flex-col text-right cursor-pointer hover:opacity-80 transition-opacity"
                  title={`Usuário logado: ${currentUser.name}`}
                >
                  <span className="text-xs font-bold text-slate-200 leading-tight truncate max-w-[120px]">
                    {currentUser.name.split(' ')[0]}
                  </span>
                  <span className="text-[10px] text-amber-400 uppercase font-bold leading-none">
                    {currentUser.role}
                  </span>
                </div>

                <button
                  id="header-logout-btn"
                  onClick={() => {
                    logout();
                  }}
                  title="Sair do Sistema (Logout)"
                  className="flex items-center gap-1.5 h-9 px-3 rounded-xl bg-rose-950/50 hover:bg-rose-900/90 text-rose-300 hover:text-white border border-rose-800/60 text-xs font-bold transition-all shadow-xs active:scale-95 shrink-0"
                  aria-label="Sair da Conta"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-400" />
                  <span>Sair</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile/Tablet Backdrop Overlay (< lg) */}
      <div
        className={`fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-40 transition-opacity lg:hidden ${
          mobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setMobileMenuOpen(false)}
        aria-hidden="true"
      />

      {/* SIDEBAR */}
      <aside
        className={`fixed top-0 lg:top-14 left-0 bottom-0 bg-slate-900 border-r border-slate-800 text-slate-300 z-50 lg:z-30 flex flex-col justify-between transition-all duration-300 ease-in-out ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${
          sidebarCollapsed ? 'w-72 lg:w-20' : 'w-72 lg:w-64'
        }`}
      >
        {/* Drawer Header (mobile only) */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3.5 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white font-bold">
              <Flame className="w-4 h-4 fill-white text-orange-500" />
            </div>
            <span className="font-black text-sm text-white">
              Erp<span className="text-amber-400">GLP</span> Menu
            </span>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="w-10 h-10 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Fechar menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-item-${item.id}`}
                onClick={() => handleSelectTab(item.id)}
                title={sidebarCollapsed ? item.label : undefined}
                aria-current={isActive ? 'page' : undefined}
                className={`relative w-full min-h-11 flex items-center rounded-lg text-sm font-medium transition-all ${
                  sidebarCollapsed
                    ? 'justify-between px-3 py-2.5 lg:justify-center lg:px-2'
                    : 'justify-between px-3 py-2.5'
                } ${
                  isActive
                    ? 'bg-amber-500/15 text-amber-400 font-semibold border-l-4 border-amber-500'
                    : 'hover:bg-slate-800/70 hover:text-white text-slate-300'
                }`}
              >
                <div className={`flex items-center gap-3 ${sidebarCollapsed ? 'lg:justify-center' : ''}`}>
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-amber-400' : 'text-slate-400'
                    }`}
                  />
                  <span className={`${sidebarCollapsed ? 'lg:hidden' : 'block'} truncate`}>
                    {item.label}
                  </span>
                </div>

                {/* Badges */}
                {item.badge && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${item.badgeColor} ${
                      sidebarCollapsed ? 'lg:hidden' : ''
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
                {item.extra && (
                  <span className={`text-[11px] text-slate-400 font-normal shrink-0 ${sidebarCollapsed ? 'lg:hidden' : ''}`}>
                    {item.extra}
                  </span>
                )}

                {sidebarCollapsed && item.badge && (
                  <span className="hidden lg:block absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-500" />
                )}
              </button>
            );
          })}
        </div>

        {/* Sidebar Footer with current user info and logout */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/60 text-xs text-slate-400 space-y-2">
          <div className="flex items-center justify-between">
            <div className={`${sidebarCollapsed ? 'lg:hidden' : 'block'} truncate`}>
              <div className="font-bold text-slate-200 truncate">
                {currentUser?.name || 'ErpGLP Gestão'}
              </div>
              <div className="text-[10px] text-amber-400 uppercase font-bold">
                {currentUser?.role || 'Modo Operacional'}
              </div>
            </div>

            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden lg:flex p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-amber-400 transition-colors"
              title={sidebarCollapsed ? 'Expandir Menu' : 'Recolher Menu'}
            >
              {sidebarCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>
          </div>

          <button
            onClick={() => {
              setMobileMenuOpen(false);
              logout();
            }}
            className={`w-full min-h-11 flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/80 text-rose-300 hover:text-white border border-rose-800/40 font-bold transition-all active:scale-95 shadow-xs ${
              sidebarCollapsed ? 'justify-center lg:px-2' : ''
            }`}
            title="Sair do Sistema (Logout)"
          >
            <LogOut className="w-4 h-4 text-rose-400 shrink-0" />
            <span className={`${sidebarCollapsed ? 'lg:hidden' : 'block'} truncate`}>
              Sair do Sistema
            </span>
          </button>
        </div>
      </aside>

      {/* Barra de navegação inferior (celular e tablet) */}
      <nav
        aria-label="Navegação principal"
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-slate-900/95 backdrop-blur border-t border-slate-800 shadow-[0_-4px_16px_rgba(0,0,0,0.25)] pb-[env(safe-area-inset-bottom)]"
      >
        <div className="max-w-xl mx-auto grid grid-cols-5 items-end px-1">
          {bottomItems.slice(0, 2).map(renderBottomItem)}

          <div className="flex justify-center">
            <button
              onClick={onOpenNewSale}
              className="-mt-6 mb-1 bg-gradient-to-tr from-amber-500 to-orange-600 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg shadow-orange-500/30 ring-4 ring-slate-900 active:scale-90 transition-transform"
              aria-label="Nova Venda"
            >
              <PlusCircle className="w-7 h-7" />
            </button>
          </div>

          {bottomItems.slice(2).map(renderBottomItem)}
        </div>
      </nav>
    </>
  );
};
