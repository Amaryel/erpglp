import React, { useState } from 'react';
import { ErpProvider, useErp } from './context/ErpContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar, ActiveTab } from './components/Navbar';
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
import { RefreshCw } from 'lucide-react';

const MainLayout: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
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
        <main className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 pt-4 pb-24 md:pb-8 min-w-0">
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

  return <MainLayout />;
};

export default function App() {
  return (
    <ErpProvider>
      <AuthProvider>
        <AuthGate />
      </AuthProvider>
    </ErpProvider>
  );
}

