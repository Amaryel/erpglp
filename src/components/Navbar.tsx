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
              className="lg:hidden p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Abrir Menu"
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
            <div
              onClick={() => handleSelectTab('dashboard')}
              className="flex items-center gap-2 cursor-pointer select-none"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white font-bold text-lg shadow-inner shrink-0">
                <Flame className="w-5 h-5 fill-white text-orange-500" />
              </div>
              <div>
                <span className="text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                  Erp<span className="text-amber-400">GLP</span>
                  <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Pro
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Supabase Online DB Badge */}
            {isSuperadmin ? (
              <button
                id="header-supabase-btn"
                onClick={onOpenSupabase}
                title="Gerenciar Banco de Dados Online (Superadmin)"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border bg-emerald-950/70 text-emerald-300 border-emerald-600/60 hover:bg-emerald-900/70 transition-all cursor-pointer"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <Database className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">
                  Banco Online
                </span>
                {dbSyncState === 'syncing' && (
                  <span className="text-[10px] text-emerald-200 animate-pulse">Sync...</span>
                )}
              </button>
            ) : (
              <div
                title="Banco de Dados Online Conectado"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border bg-emerald-950/70 text-emerald-300 border-emerald-600/60 select-none"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <Database className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">
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
              className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
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
              className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold text-xs sm:text-sm px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg shadow-md shadow-orange-500/20 transition-all transform active:scale-95 shrink-0"
            >
              <PlusCircle className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Nova Venda</span>
            </button>

            {/* Current User & Logout Button */}
            {currentUser && (
              <div className="flex items-center gap-1.5 sm:gap-2 pl-1.5 sm:pl-2.5 border-l border-slate-800">
                <div
                  onClick={() => isAdminOrSuper && handleSelectTab('usuarios')}
                  className="hidden md:flex flex-col text-right cursor-pointer hover:opacity-80 transition-opacity"
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
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-rose-950/50 hover:bg-rose-900/90 text-rose-300 hover:text-white border border-rose-800/60 text-xs font-bold transition-all shadow-xs active:scale-95 shrink-0"
                  aria-label="Sair da Conta"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-400" />
                  <span className="hidden sm:inline">Sair</span>
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
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                logout();
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-950/60 text-rose-300 border border-rose-800/60 text-xs font-bold"
              aria-label="Sair"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sair</span>
            </button>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Fechar Menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
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
                className={`w-full flex items-center rounded-lg text-sm font-medium transition-all ${
                  sidebarCollapsed
                    ? 'justify-center p-2.5 lg:px-2'
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
                {!sidebarCollapsed && item.badge && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${item.badgeColor}`}
                  >
                    {item.badge}
                  </span>
                )}
                {!sidebarCollapsed && item.extra && (
                  <span className="text-[11px] text-slate-400 font-normal shrink-0">
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
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/80 text-rose-300 hover:text-white border border-rose-800/40 font-bold transition-all active:scale-95 shadow-xs ${
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

      {/* Mobile Sticky Bottom Bar (< md) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900 border-t border-slate-800 px-2 py-1 flex items-center justify-around shadow-lg">
        <button
          onClick={() => handleSelectTab('dashboard')}
          className={`flex flex-col items-center py-1 px-2 rounded-lg text-[10px] font-medium transition-colors ${
            activeTab === 'dashboard' ? 'text-amber-400' : 'text-slate-400'
          }`}
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          <span>Início</span>
        </button>

        <button
          onClick={() => handleSelectTab('em_andamento')}
          className={`relative flex flex-col items-center py-1 px-2 rounded-lg text-[10px] font-medium transition-colors ${
            activeTab === 'em_andamento' ? 'text-amber-400' : 'text-slate-400'
          }`}
        >
          <div className="relative">
            <Truck className="w-5 h-5 mb-0.5" />
            {inProgressDeliveriesCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-amber-500 text-slate-950 font-black text-[9px] w-4 h-4 rounded-full flex items-center justify-center">
                {inProgressDeliveriesCount}
              </span>
            )}
          </div>
          <span>Entregas</span>
        </button>

        {/* Central Floating Action: Nova Venda */}
        <button
          onClick={onOpenNewSale}
          className="-mt-5 bg-gradient-to-tr from-amber-500 to-orange-600 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg shadow-orange-500/30 active:scale-90 transition-transform"
          aria-label="Nova Venda"
        >
          <PlusCircle className="w-7 h-7" />
        </button>

        <button
          onClick={() => handleSelectTab('estoque')}
          className={`flex flex-col items-center py-1 px-2 rounded-lg text-[10px] font-medium transition-colors ${
            activeTab === 'estoque' ? 'text-amber-400' : 'text-slate-400'
          }`}
        >
          <Package className="w-5 h-5 mb-0.5" />
          <span>Estoque</span>
        </button>

        <button
          onClick={() => setMobileMenuOpen(true)}
          className="flex flex-col items-center py-1 px-2 rounded-lg text-[10px] font-medium text-slate-400 hover:text-white"
        >
          <Menu className="w-5 h-5 mb-0.5" />
          <span>Menu</span>
        </button>
      </nav>
    </>
  );
};
