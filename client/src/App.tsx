import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { AgentInvestigatorView } from './components/AgentInvestigatorView';
import { ReconciliationView } from './components/ReconciliationView';
import { WebhooksView } from './components/WebhooksView';
import { AnomaliesView } from './components/AnomaliesView';
import { LedgerView } from './components/LedgerView';
import { AuthView } from './components/AuthView';
import { DemoModal } from './components/DemoModal';
import { FinOpsAPI } from './services/api';

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [agentPrompt, setAgentPrompt] = useState<string>('');
  const [isDemoModalOpen, setIsDemoModalOpen] = useState<boolean>(false);
  const [demoModalMode, setDemoModalMode] = useState<'scenario' | 'stress'>('scenario');
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  if (isLoading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-primary)', color: 'var(--primary)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: 40, height: 40, border: '3px solid rgba(56, 189, 248, 0.2)', borderTopColor: 'var(--primary)', borderRadius: '50%' }} className="animate-spin-slow" />
          <span style={{ fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.05em' }}>INITIALIZING FINOPS ENGINE...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthView />;
  }

  const handleInvestigatePrompt = (prompt: string) => {
    setAgentPrompt(prompt);
    setActiveTab('agent');
  };

  const handleResetDemo = async () => {
    setIsResetting(true);
    try {
      await FinOpsAPI.resetDemo();
      setRefreshKey((prev) => prev + 1);
    } catch {
      // Ignore
    } finally {
      setIsResetting(false);
    }
  };

  const openDemoModal = (mode: 'scenario' | 'stress') => {
    setDemoModalMode(mode);
    setIsDemoModalOpen(true);
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        openDemoModal={() => openDemoModal('scenario')}
        openStressModal={() => openDemoModal('stress')}
      />

      {/* Main Content Area */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Navbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onResetDemo={handleResetDemo}
          isResetting={isResetting}
        />

        <div key={refreshKey} style={{ flex: 1, overflowY: 'auto' }}>
          {activeTab === 'dashboard' && (
            <DashboardView
              onInvestigatePrompt={handleInvestigatePrompt}
              setActiveTab={setActiveTab}
              openStressModal={() => openDemoModal('stress')}
            />
          )}

          {activeTab === 'agent' && (
            <AgentInvestigatorView initialPrompt={agentPrompt} />
          )}

          {activeTab === 'reconciliation' && <ReconciliationView />}

          {activeTab === 'webhooks' && (
            <WebhooksView onInvestigatePrompt={handleInvestigatePrompt} />
          )}

          {activeTab === 'anomalies' && (
            <AnomaliesView onInvestigatePrompt={handleInvestigatePrompt} />
          )}

          {activeTab === 'ledger' && <LedgerView />}
        </div>
      </main>

      {/* Scenario & Stress Generator Modal */}
      <DemoModal
        isOpen={isDemoModalOpen}
        onClose={() => setIsDemoModalOpen(false)}
        onSuccess={() => setRefreshKey((prev) => prev + 1)}
        mode={demoModalMode}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
