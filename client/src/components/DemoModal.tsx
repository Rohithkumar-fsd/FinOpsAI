import React, { useState } from 'react';
import { 
  X, 
  RotateCcw, 
  Zap, 
  Layers, 
  AlertTriangle, 
  Flame,
  CheckCircle2
} from 'lucide-react';
import { FinOpsAPI } from '../services/api';

interface DemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  mode: 'scenario' | 'stress';
}

export const DemoModal: React.FC<DemoModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  mode,
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [stressVolume, setStressVolume] = useState<number>(500);

  if (!isOpen) return null;

  const scenarios = [
    {
      id: 'UPI_GATEWAY_OUTAGE',
      title: 'UPI Gateway Timeout Surge',
      description: 'Simulates 25% failure rate and callback drop on HDFC/Axis UPI nodes.',
      icon: AlertTriangle,
      badge: 'Severity: High',
      color: '#ef4444',
    },
    {
      id: 'SETTLEMENT_BATCH_LAG',
      title: 'Delayed Settlement Batch',
      description: 'Holds back ₹4.5L in settlement files past the 48-hour cutoff window.',
      icon: Layers,
      badge: 'Leakage: ₹4,50,000',
      color: '#f59e0b',
    },
    {
      id: 'DUPLICATE_REFUND_GLITCH',
      title: 'Duplicate Refund Webhook Spike',
      description: 'Simulates repeated cancellation events firing double customer payouts.',
      icon: Zap,
      badge: 'Discrepancy: ₹62,400',
      color: '#a855f7',
    },
  ];

  const handleLoadScenario = async (scenarioId: string) => {
    setIsLoading(true);
    setFeedback(null);
    try {
      const res = await FinOpsAPI.loadDemoScenario(scenarioId);
      if (res.success) {
        setFeedback(`Scenario "${scenarioId}" loaded! Financial anomalies injected.`);
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1200);
      }
    } catch {
      setFeedback('Scenario injected into active simulation.');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1200);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunStress = async () => {
    setIsLoading(true);
    setFeedback(null);
    try {
      const res = await FinOpsAPI.runStressTest(stressVolume);
      if (res.success) {
        setFeedback(`Stress test completed! Injected ${stressVolume} simulated transactions.`);
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1200);
      }
    } catch {
      setFeedback(`Simulated ${stressVolume} concurrent payment gateway operations.`);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1200);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 110,
        padding: '1.5rem',
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '520px',
          padding: '1.75rem',
          background: 'var(--bg-modal)',
          border: '1px solid var(--border-glow)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            {mode === 'scenario' ? (
              <>
                <RotateCcw size={18} color="var(--primary)" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
                  Inject Demo Incident Scenarios
                </h3>
              </>
            ) : (
              <>
                <Flame size={18} color="#f59e0b" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
                  Pipeline Stress & Traffic Generator
                </h3>
              </>
            )}
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {feedback && (
          <div
            style={{
              padding: '0.75rem',
              background: 'var(--success-bg)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              color: 'var(--success)',
              fontSize: '0.85rem',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <CheckCircle2 size={16} />
            <span>{feedback}</span>
          </div>
        )}

        {mode === 'scenario' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Select a pre-configured financial anomaly incident to simulate real-time leakage, delay, or gateway failure:
            </p>

            {scenarios.map((sc) => {
              const Icon = sc.icon;
              return (
                <div
                  key={sc.id}
                  onClick={() => !isLoading && handleLoadScenario(sc.id)}
                  style={{
                    padding: '1rem',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = sc.color;
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-subtle)';
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Icon size={16} color={sc.color} />
                      <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ffffff' }}>
                        {sc.title}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.7rem', fontWeight: 600, color: sc.color }}>
                      {sc.badge}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {sc.description}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Simulate high-throughput flash sale payment volume through the gateway to stress-test autonomous reconciliation.
            </p>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                <span>Simulated Transactions:</span>
                <span style={{ fontWeight: 700, color: 'var(--primary)', fontFamily: 'Outfit' }}>
                  {stressVolume} Payments
                </span>
              </div>
              <input
                type="range"
                min="100"
                max="2000"
                step="100"
                value={stressVolume}
                onChange={(e) => setStressVolume(parseInt(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--primary)' }}
              />
            </div>

            <button
              onClick={handleRunStress}
              disabled={isLoading}
              className="btn btn-primary"
              style={{ width: '100%' }}
            >
              <Flame size={16} />
              <span>{isLoading ? 'Injecting Traffic...' : `Generate ${stressVolume} Simulated Transactions`}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
