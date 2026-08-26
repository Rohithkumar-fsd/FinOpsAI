import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  Clock, 
  ShieldAlert, 
  Filter
} from 'lucide-react';
import { FinOpsAPI } from '../services/api';
import type { IFinancialAnomaly } from '../types';

interface AnomaliesViewProps {
  onInvestigatePrompt: (prompt: string) => void;
}

export const AnomaliesView: React.FC<AnomaliesViewProps> = ({ onInvestigatePrompt }) => {
  const [anomalies, setAnomalies] = useState<IFinancialAnomaly[]>([]);
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');

  const loadAnomalies = async () => {
    try {
      const res = await FinOpsAPI.getAnomalies({
        severity: severityFilter !== 'ALL' ? severityFilter : undefined,
      });
      if (res.success && res.data) {
        const list = Array.isArray(res.data) ? res.data : (res.data.anomalies || []);
        setAnomalies(list);
      } else {
        // Fallback sample anomalies
        setAnomalies([
          {
            _id: 'anom-1',
            merchantId: 'm1',
            type: 'SETTLEMENT_DELAY_SPIKE',
            severity: 'HIGH',
            amount: 284000,
            description: 'Unsettled volume for HDFC UPI gateway exceeded normal 24h rolling baseline by 340%.',
            evidence: { delayedBatchesCount: 4, averageDelayHours: 38 },
            status: 'OPEN',
            detectedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
          },
          {
            _id: 'anom-2',
            merchantId: 'm1',
            type: 'DUPLICATE_REFUND_SURGE',
            severity: 'CRITICAL',
            amount: 62400,
            description: 'Customer refund transactions #RF-8012 and #RF-8019 originated from duplicate webhook firing.',
            evidence: { duplicateTransactions: ['pay_9021', 'pay_9024'] },
            status: 'OPEN',
            detectedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
          },
          {
            _id: 'anom-3',
            merchantId: 'm1',
            type: 'MDR_FEE_MISCALCULATION',
            severity: 'MEDIUM',
            amount: 14200,
            description: 'Gateway debited 2.4% MDR on RuPay debit card instead of zero-MDR mandate regulation.',
            evidence: { impactedVolume: 590000, overchargedFee: 14200 },
            status: 'OPEN',
            detectedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
          },
        ]);
      }
    } catch {
      // Handled
    }
  };

  useEffect(() => {
    loadAnomalies();
  }, [severityFilter]);

  const formatINR = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'CRITICAL': return <span className="badge badge-danger">CRITICAL</span>;
      case 'HIGH': return <span className="badge badge-danger">HIGH</span>;
      case 'MEDIUM': return <span className="badge badge-warning">MEDIUM</span>;
      case 'LOW': return <span className="badge badge-info">LOW</span>;
      default: return <span className="badge badge-info">{sev}</span>;
    }
  };

  const totalLeakageAmount = anomalies.reduce((acc, curr) => acc + (curr.amount || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', padding: '1.75rem 2rem' }}>
      {/* Header Banner */}
      <div
        className="glass-panel"
        style={{
          padding: '1.25rem 1.75rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, rgba(16, 22, 36, 0.9) 0%, rgba(38, 20, 32, 0.7) 100%)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <ShieldAlert size={16} color="var(--danger)" />
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--danger)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Real-Time Anomaly & Leakage Radar
            </span>
          </div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0 }}>
            {anomalies.length} Active Financial Anomalies Detected
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Automated anomaly detection identifies abnormal gateway fee deductions, missing settlements, and duplicate payouts.
          </p>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Cumulative Impact
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--danger)', fontFamily: 'Outfit' }}>
            {formatINR(totalLeakageAmount)}
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Filter size={15} color="var(--primary)" />
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Severity Filter:</span>
          <div style={{ display: 'flex', gap: '0.35rem', background: 'var(--bg-secondary)', padding: '0.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', marginLeft: '0.5rem' }}>
            {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((s) => (
              <button
                key={s}
                onClick={() => setSeverityFilter(s)}
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  padding: '0.35rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: severityFilter === s ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                  color: severityFilter === s ? 'var(--primary)' : 'var(--text-muted)',
                  cursor: 'pointer',
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => onInvestigatePrompt('Perform a comprehensive scan across all active financial anomalies')}
          className="btn btn-agent btn-sm"
        >
          <Bot size={14} />
          <span>Investigate All with AI</span>
        </button>
      </div>

      {/* Anomalies Cards List */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.25rem' }}>
        {anomalies.map((anom) => (
          <div
            key={anom._id}
            className="glass-card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '1rem',
              borderLeft: `3px solid ${anom.severity === 'CRITICAL' || anom.severity === 'HIGH' ? 'var(--danger)' : 'var(--warning)'}`,
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {getSeverityBadge(anom.severity)}
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {anom.status}
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Clock size={12} />
                  {new Date(anom.detectedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                </div>
              </div>

              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.4rem' }}>
                {anom.type.replace(/_/g, ' ')}
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                {anom.description}
              </p>

              {anom.evidence && Object.keys(anom.evidence).length > 0 && (
                <div
                  style={{
                    marginTop: '0.75rem',
                    padding: '0.65rem',
                    background: 'rgba(7, 9, 14, 0.85)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.72rem',
                    fontFamily: 'JetBrains Mono',
                    color: '#a5f3fc',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  {JSON.stringify(anom.evidence, null, 2)}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
              <div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Calculated Leakage
                </div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--danger)', fontFamily: 'Outfit' }}>
                  {formatINR(anom.amount)}
                </div>
              </div>

              <button
                onClick={() => onInvestigatePrompt(`Investigate root cause and resolution plan for anomaly: ${anom.type} (${anom.description}) with financial impact of ${formatINR(anom.amount)}`)}
                className="btn btn-agent btn-sm"
              >
                <Bot size={14} />
                <span>Investigate with AI</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
