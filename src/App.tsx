import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ErpProvider, useErp } from './context/ErpContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar, ActiveTab, TAB_LABELS } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { ActiveDeliveriesView } from './components/ActiveDeliveriesView';
import { SalesHistoryView } from './components/SalesHistoryView';
import { StockView } from './components/StockView';
import { CashRegisterView } from './components/CashRegisterView';
import { ReceivablesView } from './components/ReceivablesView';
import { PayablesView } from './components/PayablesView';
import { ExpensesView } from './components/ExpensesView';
import { ProfitView } from './components/ProfitView';
import { ReportsView } from './components/ReportsView';
import { AuditView } from './components/AuditView';
import { ClientsView } from './components/ClientsView';
import { ProductsView } from './components/ProductsView';
import { ConfigView } from './components/ConfigView';
import { UsersManagementView } from './components/UsersManagementView';
import { LoginView } from './components/LoginView';
import { NewSaleModal } from './components/NewSaleModal';
import { SupabaseModal } from './components/SupabaseModal';
import { RefreshCw, ArrowLeft, ChevronRight, Home } from 'lucide-react';

const ADMIN_TABS: ActiveTab[] = ['usuarios'];

/** Lê a tela atual do endereço (#/estoque), permitindo atualizar a página sem perder a tela. */
function readTabFromHash(): ActiveTab {
  const raw = window.location.hash.replace(/^#\/?/, '');
  return raw in TAB_LABELS ? (raw as ActiveTab) : 'dashboard';
}

const MainLayout: React.FC = () => {
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'superadmin';
  const canOpen = useCallback((tab: ActiveTab) => isAdmin || !ADMIN_TABS.includes(tab), [isAdmin]);

  const [activeTab, setActiveTabState] = useState<ActiveTab>(() => {
    const tab = readTabFromHash();
    return canOpen(tab) ? tab : 'dashboard';
  });
  // Quantas telas foram abertas nesta sessão (define se "Voltar" usa o histórico do navegador)
  const historyDepth = useRef(0);
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;

  // Integra com o botão "voltar" do celular/navegador
  useEffect(() => {
    window.history.replaceState({ tab: activeTab }, '', `#/${activeTab}`);
    const onPopState = () => {
      const tab = readTabFromHash();
      historyDepth.current = Math.max(0, historyDepth.current - 1);
      setActiveTabState(canOpen(tab) ? tab : 'dashboard');
      setMobileMenuOpen(false);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setActiveTab = useCallback(
    (tab: ActiveTab) => {
      const target = canOpen(tab) ? tab : 'dashboard';
      if (target === activeTabRef.current) return;
      window.history.pushState({ tab: target }, '', `#/${target}`);
      historyDepth.current += 1;
      activeTabRef.current = target;
      setActiveTabState(target);
      window.scrollTo({ top: 0 });
    },
    [canOpen]
  );

  const goBack = () => {
    if (historyDepth.current > 0) {
      window.history.back();
    } else {
      setActiveTab('dashboard');
    }
  };

  const [isNewSaleOpen, setIsNewSaleOpen] = useState(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleSaleCreated = (saleId: string) => {
    setActiveTab('em_andamento');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans antialiased text-slate-900">
      {/* Top and Mobile/Desktop Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenNewSale={() => setIsNewSaleOpen(true)}
        onOpenSupabase={() => setIsSupabaseModalOpen(true)}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        sidebarCollapsed={sidebarCollapsed}
        setSidebarCollapsed={setSidebarCollapsed}
      />

      {/* Main Content Wrapper: dynamically offsets content on desktop so it never overlaps with sidebar */}
      <div
        className={`transition-[padding] duration-300 flex-1 flex flex-col min-w-0 ${
          sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'
        }`}
      >
        <main className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 pt-3 sm:pt-4 pb-28 lg:pb-8 min-w-0">
          {activeTab !== 'dashboard' && (
            <nav aria-label="Navegação da página" className="flex items-center gap-2 mb-3">
              <button
                type="button"
                onClick={goBack}
                className="inline-flex items-center gap-1.5 h-10 pl-2.5 pr-3.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-semibold shadow-xs hover:bg-slate-50 active:scale-95 transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar</span>
              </button>
              <ol className="flex items-center gap-1 text-xs text-slate-500 min-w-0">
                <li className="hidden sm:block">
                  <button
                    type="button"
                    onClick={() => setActiveTab('dashboard')}
                    className="inline-flex items-center gap-1 h-10 px-2 rounded-lg hover:text-slate-900 hover:bg-white"
                  >
                    <Home className="w-3.5 h-3.5" />
                    <span>Início</span>
                  </button>
                </li>
                <li aria-hidden="true" className="hidden sm:block">
                  <ChevronRight className="w-3.5 h-3.5" />
                </li>
                <li className="font-semibold text-slate-800 truncate" aria-current="page">
                  {TAB_LABELS[activeTab]}
                </li>
              </ol>
            </nav>
          )}

          {activeTab === 'dashboard' && (
            <DashboardView
              setActiveTab={setActiveTab}
              onOpenNewSale={() => setIsNewSaleOpen(true)}
            />
          )}

          {activeTab === 'em_andamento' && (
            <ActiveDeliveriesView onOpenNewSale={() => setIsNewSaleOpen(true)} />
          )}

          {activeTab === 'historico_vendas' && <SalesHistoryView />}

          {activeTab === 'estoque' && <StockView />}

          {activeTab === 'caixa' && <CashRegisterView />}

          {activeTab === 'receber' && <ReceivablesView />}

          {activeTab === 'pagar' && <PayablesView />}

          {activeTab === 'despesas' && <ExpensesView />}

          {activeTab === 'lucro' && <ProfitView />}

          {activeTab === 'relatorios' && <ReportsView />}

          {activeTab === 'auditoria' && <AuditView />}

          {activeTab === 'clientes' && <ClientsView />}

          {activeTab === 'produtos' && <ProductsView />}

          {activeTab === 'usuarios' && <UsersManagementView />}

          {activeTab === 'config' && <ConfigView />}
        </main>
      </div>

      {/* Global New Sale Modal */}
      <NewSaleModal
        isOpen={isNewSaleOpen}
        onClose={() => setIsNewSaleOpen(false)}
        onSuccessSaleId={handleSaleCreated}
      />

      {/* Supabase Online DB Configuration Modal */}
      <SupabaseModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
      />
    </div>
  );
};

const AuthGate: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center text-white p-4">
        <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mb-3" />
        <span className="text-xs font-bold text-slate-300">Carregando sistema de gestão...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginView />;
  }

  // Os dados da empresa só são carregados depois do login (o banco exige sessão autenticada)
  return (
    <ErpProvider>
      <MainLayout />
    </ErpProvider>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}

