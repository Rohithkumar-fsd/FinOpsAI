import React from 'react';
import { 
  Bot, 
  LogOut, 
  RotateCcw,
  Sparkles,
  Activity
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onResetDemo: () => void;
  isResetting: boolean;
  healthScore?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onResetDemo,
  isResetting,
  healthScore = 92,
}) => {
  const { merchant, logout } = useAuth();

  const getPageTitle = (tab: string) => {
    switch (tab) {
      case 'dashboard': return 'Executive Financial Radar';
      case 'agent': return 'Autonomous Financial Investigator';
      case 'reconciliation': return 'Multi-Gateway Reconciliation Hub';
      case 'anomalies': return 'Real-Time Anomaly & Leakage Monitor';
      case 'ledger': return 'Transactions & Settlement Ledger';
      default: return 'FinOps AI Platform';
    }
  };

  const getHealthBadge = (score: number) => {
    if (score >= 85) return { text: `${score}% HEALTHY`, class: 'badge-success' };
    if (score >= 60) return { text: `${score}% STABLE`, class: 'badge-info' };
    if (score >= 40) return { text: `${score}% LEAKAGE DETECTED`, class: 'badge-warning' };
    return { text: `${score}% CRITICAL DEFICIT`, class: 'badge-danger' };
  };

  const health = getHealthBadge(healthScore);

  return (
    <header
      style={{
        height: '68px',
        backgroundColor: 'rgba(13, 17, 26, 0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 2rem',
        position: 'sticky',
        top: 0,
        zIndex: 30,
      }}
    >
      {/* Title & Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
            {getPageTitle(activeTab)}
          </h1>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Real-time pipeline monitoring: <span style={{ color: 'var(--primary)', fontWeight: 600 }}>NovaKart Enterprise</span>
          </div>
        </div>

        <div className={`badge ${health.class}`} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginLeft: '0.5rem' }}>
          <Activity size={12} className="animate-pulse-glow" />
          <span>{health.text}</span>
        </div>
      </div>

      {/* Action CTA & Profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
        {/* Quick Launch Agent */}
        {activeTab !== 'agent' && (
          <button
            onClick={() => setActiveTab('agent')}
            className="btn btn-agent btn-sm"
          >
            <Bot size={15} />
            <span>AI Investigator</span>
            <Sparkles size={13} color="#fef08a" />
          </button>
        )}

        {/* Quick Reset Baseline */}
        <button
          onClick={onResetDemo}
          disabled={isResetting}
          className="btn btn-secondary btn-sm"
          title="Reset database to clean baseline with pre-computed anomalies"
        >
          <RotateCcw size={14} className={isResetting ? 'animate-spin-slow' : ''} />
          <span>{isResetting ? 'Resetting...' : 'Reset Demo'}</span>
        </button>

        {/* User Info / Logout */}
        <div style={{ height: 24, width: 1, backgroundColor: 'var(--border-subtle)' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#ffffff' }}>
              {merchant?.name || 'Merchant Admin'}
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
              {merchant?.email || 'admin@novakart.demo'}
            </div>
          </div>

          <button
            onClick={logout}
            className="btn btn-secondary btn-sm"
            style={{ padding: '0.45rem', borderRadius: 'var(--radius-sm)' }}
            title="Sign out"
          >
            <LogOut size={14} color="#f87171" />
          </button>
        </div>
      </div>
    </header>
  );
};
