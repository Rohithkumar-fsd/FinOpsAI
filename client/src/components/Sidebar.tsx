import React from 'react';
import { 
  LayoutDashboard, 
  Bot, 
  Layers, 
  AlertTriangle, 
  Receipt, 
  Flame, 
  ShieldCheck,
  RefreshCw,
  Webhook
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  openDemoModal: () => void;
  openStressModal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  openDemoModal,
  openStressModal,
}) => {
  const { merchant } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Executive Radar', icon: LayoutDashboard, badge: null },
    { id: 'agent', label: 'AI Investigator', icon: Bot, badge: 'Agentic' },
    { id: 'reconciliation', label: 'Reconciliation Hub', icon: Layers, badge: null },
    { id: 'webhooks', label: 'Webhook Explorer', icon: Webhook, badge: 'Gateway' },
    { id: 'anomalies', label: 'Anomaly Radar', icon: AlertTriangle, badge: 'Live' },
    { id: 'ledger', label: 'Ledger & Payments', icon: Receipt, badge: null },
  ];

  return (
    <aside
      style={{
        width: 'var(--sidebar-width)',
        backgroundColor: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        padding: '1.25rem 1rem',
      }}
    >
      {/* Brand Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.5rem 1.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 16px var(--primary-glow)',
          }}
        >
          <ShieldCheck size={22} color="#04131f" strokeWidth={2.5} />
        </div>
        <div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            FinOps <span style={{ color: 'var(--primary)', fontWeight: 700 }}>AI</span>
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Autonomous Engine
          </div>
        </div>
      </div>

      {/* Merchant Info Card */}
      {merchant && (
        <div
          style={{
            marginTop: '1rem',
            padding: '0.75rem',
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#ffffff', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>
              {merchant.name}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              {merchant.currency} Merchant
            </div>
          </div>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 8px var(--success-glow)' }} />
        </div>
      )}

      {/* Navigation Links */}
      <nav style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1 }}>
        <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 0.5rem 0.35rem' }}>
          Operations Matrix
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.7rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid',
                borderColor: isActive ? 'var(--border-glow)' : 'transparent',
                background: isActive ? 'rgba(56, 189, 248, 0.08)' : 'transparent',
                color: isActive ? '#ffffff' : 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'all 0.18s ease',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                  e.currentTarget.style.color = '#ffffff';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--text-muted)';
                }
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Icon size={18} color={isActive ? 'var(--primary)' : 'currentColor'} />
                <span style={{ fontSize: '0.85rem', fontWeight: isActive ? 600 : 500 }}>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  style={{
                    fontSize: '0.62rem',
                    fontWeight: 700,
                    padding: '0.15rem 0.45rem',
                    borderRadius: 'var(--radius-full)',
                    background: item.badge === 'Agentic' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                    color: item.badge === 'Agentic' ? '#c084fc' : '#f87171',
                    border: `1px solid ${item.badge === 'Agentic' ? 'rgba(168, 85, 247, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
                  }}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Demo & Stress Controls */}
      <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <button
          onClick={openDemoModal}
          className="btn btn-secondary btn-sm"
          style={{ width: '100%', justifyContent: 'flex-start' }}
        >
          <RefreshCw size={14} color="var(--primary)" />
          <span>Demo Scenarios</span>
        </button>

        <button
          onClick={openStressModal}
          className="btn btn-secondary btn-sm"
          style={{ width: '100%', justifyContent: 'flex-start' }}
        >
          <Flame size={14} color="#f59e0b" />
          <span>Run Stress Test</span>
        </button>
      </div>
    </aside>
  );
};
