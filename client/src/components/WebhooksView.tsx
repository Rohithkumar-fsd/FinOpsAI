import React, { useState, useEffect } from 'react';
import { 
  Webhook, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  RotateCw, 
  Search, 
  Filter, 
  Bot, 
  Copy, 
  Check, 
  Code2, 
  Layers, 
  ShieldCheck,
  X,
  Sparkles,
  RefreshCw,
  Clock
} from 'lucide-react';
import { FinOpsAPI } from '../services/api';
import type { IWebhookLog, WebhookSummary, WebhookStatus } from '../types';

interface WebhooksViewProps {
  onInvestigatePrompt?: (prompt: string) => void;
}

export const WebhooksView: React.FC<WebhooksViewProps> = ({ onInvestigatePrompt }) => {
  const [summary, setSummary] = useState<WebhookSummary | null>(null);
  const [logs, setLogs] = useState<IWebhookLog[]>([]);
  const [totalLogs, setTotalLogs] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedLog, setSelectedLog] = useState<IWebhookLog | null>(null);
  const [isSimulating, setIsSimulating] = useState<string | null>(null);
  const [simulationToast, setSimulationToast] = useState<{ message: string; type: 'success' | 'warning' | 'error' } | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [copiedPayload, setCopiedPayload] = useState<boolean>(false);

  const loadData = async (currentPage = page, status = statusFilter, eventType = eventTypeFilter, search = searchQuery) => {
    setIsLoading(true);
    try {
      const [sumRes, logsRes] = await Promise.all([
        FinOpsAPI.getWebhookSummary(),
        FinOpsAPI.getWebhookLogs({
          page: currentPage,
          limit: 15,
          status: status !== 'ALL' ? status : undefined,
          eventType: eventType !== 'ALL' ? eventType : undefined,
          search: search.trim() || undefined,
        }),
      ]);

      if (sumRes.success && sumRes.data) {
        setSummary(sumRes.data);
      }
      if (logsRes.success && logsRes.data) {
        setLogs(logsRes.data.logs || []);
        setTotalLogs(logsRes.data.total || 0);
        setTotalPages(logsRes.data.totalPages || 1);
      }
    } catch (err) {
      console.error('Error loading webhook audit data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData(1, statusFilter, eventTypeFilter, searchQuery);
  }, [statusFilter, eventTypeFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadData(1, statusFilter, eventTypeFilter, searchQuery);
  };

  const handleSimulate = async (scenario: 'SUCCESS' | 'DUPLICATE' | 'INVALID_SIGNATURE' | 'OUT_OF_ORDER' | 'FAILED') => {
    setIsSimulating(scenario);
    setSimulationToast(null);
    try {
      const res = await FinOpsAPI.simulateWebhook(scenario);
      if (res.success && res.data) {
        setSimulationToast({
          message: res.data.summary,
          type: scenario === 'SUCCESS' ? 'success' : scenario === 'INVALID_SIGNATURE' ? 'error' : 'warning',
        });
        loadData(1, statusFilter, eventTypeFilter, searchQuery);
      }
    } catch (err: any) {
      setSimulationToast({
        message: err.response?.data?.message || 'Simulation execution failed.',
        type: 'error',
      });
    } finally {
      setIsSimulating(null);
    }
  };

  const handleRetry = async (id: string) => {
    setRetryingId(id);
    try {
      const res = await FinOpsAPI.retryWebhook(id);
      if (res.success) {
        setSimulationToast({
          message: res.data?.message || 'Webhook successfully reprocessed.',
          type: 'success',
        });
        loadData(page, statusFilter, eventTypeFilter, searchQuery);
        if (selectedLog && selectedLog._id === id) {
          setSelectedLog(res.data?.webhookLog);
        }
      }
    } catch (err: any) {
      setSimulationToast({
        message: err.response?.data?.message || 'Webhook retry failed.',
        type: 'error',
      });
    } finally {
      setRetryingId(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2000);
  };

  const renderStatusBadge = (status: WebhookStatus) => {
    switch (status) {
      case 'SUCCESS':
        return (
          <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <CheckCircle2 size={12} /> SUCCESS
          </span>
        );
      case 'DUPLICATE':
        return (
          <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <Layers size={12} /> DUPLICATE
          </span>
        );
      case 'INVALID_SIGNATURE':
        return (
          <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <ShieldAlert size={12} /> INVALID_SIG
          </span>
        );
      case 'OUT_OF_ORDER':
        return (
          <span className="badge" style={{ backgroundColor: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.3)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <Clock size={12} /> OUT_OF_ORDER
          </span>
        );
      case 'FAILED':
        return (
          <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <AlertTriangle size={12} /> FAILED
          </span>
        );
      case 'RETRIED':
        return (
          <span className="badge" style={{ backgroundColor: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <RotateCw size={12} /> RETRIED
          </span>
        );
      default:
        return <span className="badge">{status}</span>;
    }
  };

  return (
    <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.75rem' }} className="animate-fade-in">
      {/* Header Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
            <div style={{ padding: '0.5rem', borderRadius: '10px', backgroundColor: 'rgba(56, 189, 248, 0.1)', color: 'var(--primary)' }}>
              <Webhook size={24} />
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              Webhook Ingestion & Audit Explorer
            </h1>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
            Real-time gateway event pipeline with cryptographic signature verification, idempotency tracking, and anomaly detection.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={() => loadData()}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin-slow' : ''} />
            Refresh Feed
          </button>
          {onInvestigatePrompt && (
            <button
              onClick={() => onInvestigatePrompt('Why are my payment records inconsistent? Investigate webhook logs and duplicate events.')}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}
            >
              <Bot size={15} />
              Investigate Webhooks with AI
            </button>
          )}
        </div>
      </div>

      {/* Simulator Response Toast Banner */}
      {simulationToast && (
        <div
          style={{
            padding: '1rem 1.25rem',
            borderRadius: '10px',
            backgroundColor: simulationToast.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : simulationToast.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
            border: `1px solid ${simulationToast.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : simulationToast.type === 'error' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
          className="animate-slide-up"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Sparkles size={18} color={simulationToast.type === 'success' ? '#10b981' : simulationToast.type === 'error' ? '#ef4444' : '#f59e0b'} />
            <span style={{ fontSize: '0.88rem', color: 'var(--text-primary)', fontWeight: 500 }}>
              {simulationToast.message}
            </span>
          </div>
          <button
            onClick={() => setSimulationToast(null)}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div className="card" style={{ padding: '1.25rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Total Ingested Events
          </span>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, marginTop: '0.35rem', color: 'var(--text-primary)' }}>
            {(summary?.totalIngested || 0).toLocaleString()}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '0.25rem', display: 'block' }}>
            {summary?.successRate || 100}% Delivery Success Rate
          </span>
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Duplicate Replays Blocked
          </span>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, marginTop: '0.35rem', color: '#f59e0b' }}>
            {summary?.duplicateCount || 0}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
            Idempotency Replay Guard
          </span>
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Invalid Signatures Rejected
          </span>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, marginTop: '0.35rem', color: '#ef4444' }}>
            {summary?.invalidSignatureCount || 0}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
            HMAC SHA-256 Validation
          </span>
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Out-of-Order Sequences
          </span>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, marginTop: '0.35rem', color: '#c084fc' }}>
            {summary?.outOfOrderCount || 0}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
            Inverted State Transitions
          </span>
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Failed / Retry Queue
          </span>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, marginTop: '0.35rem', color: (summary?.failedCount || 0) > 0 ? '#ef4444' : '#10b981' }}>
            {summary?.failedCount || 0}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
            {summary?.retriedCount || 0} Reprocessed
          </span>
        </div>
      </div>

      {/* Demo Webhook Simulator Action Bar */}
      <div className="card" style={{ padding: '1.25rem', backgroundColor: 'rgba(15, 23, 42, 0.75)', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={16} color="var(--primary)" />
            <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
              Mock Webhook Provider Simulator
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', backgroundColor: 'var(--bg-secondary)', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
              Real Database Mutations
            </span>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Simulates gateway webhook payloads to test detection and AI reasoning
          </span>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem' }}>
          <button
            onClick={() => handleSimulate('SUCCESS')}
            disabled={isSimulating !== null}
            className="btn"
            style={{
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              color: '#34d399',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
            }}
          >
            <CheckCircle2 size={14} />
            {isSimulating === 'SUCCESS' ? 'Sending...' : 'Send Successful Webhook'}
          </button>

          <button
            onClick={() => handleSimulate('DUPLICATE')}
            disabled={isSimulating !== null}
            className="btn"
            style={{
              backgroundColor: 'rgba(245, 158, 11, 0.15)',
              color: '#fbbf24',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
            }}
          >
            <Layers size={14} />
            {isSimulating === 'DUPLICATE' ? 'Replaying...' : 'Send Duplicate Webhook'}
          </button>

          <button
            onClick={() => handleSimulate('INVALID_SIGNATURE')}
            disabled={isSimulating !== null}
            className="btn"
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              color: '#f87171',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
            }}
          >
            <ShieldAlert size={14} />
            {isSimulating === 'INVALID_SIGNATURE' ? 'Injecting...' : 'Send Invalid Signature'}
          </button>

          <button
            onClick={() => handleSimulate('OUT_OF_ORDER')}
            disabled={isSimulating !== null}
            className="btn"
            style={{
              backgroundColor: 'rgba(168, 85, 247, 0.15)',
              color: '#c084fc',
              border: '1px solid rgba(168, 85, 247, 0.3)',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
            }}
          >
            <Clock size={14} />
            {isSimulating === 'OUT_OF_ORDER' ? 'Triggering...' : 'Send Out-of-Order Webhook'}
          </button>

          <button
            onClick={() => handleSimulate('FAILED')}
            disabled={isSimulating !== null}
            className="btn"
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              color: '#fca5a5',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
            }}
          >
            <AlertTriangle size={14} />
            {isSimulating === 'FAILED' ? 'Failing...' : 'Send Failed Webhook'}
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.82rem', marginRight: '0.25rem' }}>
            <Filter size={14} /> Filter:
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input"
            style={{ width: 'auto', fontSize: '0.82rem', padding: '0.4rem 0.75rem' }}
          >
            <option value="ALL">All Statuses</option>
            <option value="SUCCESS">SUCCESS</option>
            <option value="DUPLICATE">DUPLICATE</option>
            <option value="INVALID_SIGNATURE">INVALID_SIGNATURE</option>
            <option value="OUT_OF_ORDER">OUT_OF_ORDER</option>
            <option value="FAILED">FAILED</option>
            <option value="RETRIED">RETRIED</option>
          </select>

          <select
            value={eventTypeFilter}
            onChange={(e) => setEventTypeFilter(e.target.value)}
            className="input"
            style={{ width: 'auto', fontSize: '0.82rem', padding: '0.4rem 0.75rem' }}
          >
            <option value="ALL">All Event Types</option>
            <option value="payment.captured">payment.captured</option>
            <option value="payment.authorized">payment.authorized</option>
            <option value="payment.failed">payment.failed</option>
            <option value="payment.refunded">payment.refunded</option>
            <option value="order.paid">order.paid</option>
          </select>
        </div>

        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.5rem', flex: '1', maxWidth: '350px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search Event ID, Payment ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input"
              style={{ width: '100%', paddingLeft: '2.25rem', fontSize: '0.82rem' }}
            />
          </div>
          <button type="submit" className="btn btn-secondary" style={{ fontSize: '0.82rem' }}>
            Search
          </button>
        </form>
      </div>

      {/* Audit Log Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
            Audit Log Records ({totalLogs})
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Page {page} of {totalPages}
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                <th style={{ padding: '0.75rem 1rem' }}>STATUS</th>
                <th style={{ padding: '0.75rem 1rem' }}>EVENT ID</th>
                <th style={{ padding: '0.75rem 1rem' }}>EVENT TYPE</th>
                <th style={{ padding: '0.75rem 1rem' }}>PAYMENT / ORDER ID</th>
                <th style={{ padding: '0.75rem 1rem' }}>AMOUNT</th>
                <th style={{ padding: '0.75rem 1rem' }}>SIGNATURE</th>
                <th style={{ padding: '0.75rem 1rem' }}>RECEIVED AT</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'inline-block', width: 24, height: 24, border: '2px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%' }} className="animate-spin-slow" />
                    <div style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>Loading webhook audit feed...</div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No webhook logs match the selected filters.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log._id}
                    style={{
                      borderBottom: '1px solid var(--border-color)',
                      backgroundColor: selectedLog?._id === log._id ? 'rgba(56, 189, 248, 0.05)' : undefined,
                      transition: 'background-color 0.15s ease',
                      fontSize: '0.85rem',
                    }}
                  >
                    <td style={{ padding: '0.75rem 1rem' }}>{renderStatusBadge(log.status)}</td>
                    <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', color: 'var(--text-primary)', fontWeight: 600 }}>
                      {log.eventId}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{ backgroundColor: 'var(--bg-secondary)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.78rem' }}>
                        {log.eventType}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                      {log.paymentId || log.orderId || '—'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {log.amount ? `₹${log.amount.toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      {log.signatureValid ? (
                        <span style={{ color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.78rem' }}>
                          <ShieldCheck size={13} /> Verified
                        </span>
                      ) : (
                        <span style={{ color: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.78rem' }}>
                          <ShieldAlert size={13} /> Failed
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                      {new Date(log.receivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        {(log.status === 'FAILED' || log.status === 'OUT_OF_ORDER') && (
                          <button
                            onClick={() => handleRetry(log._id)}
                            disabled={retryingId === log._id}
                            className="btn btn-secondary"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                            title="Retry Webhook"
                          >
                            <RotateCw size={12} className={retryingId === log._id ? 'animate-spin-slow' : ''} />
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="btn btn-secondary"
                          style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                        >
                          <Code2 size={12} /> Inspect
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ padding: '0.85rem 1.25rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              onClick={() => { setPage((p) => Math.max(1, p - 1)); loadData(page - 1); }}
              disabled={page <= 1}
              className="btn btn-secondary"
              style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}
            >
              Previous
            </button>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => { setPage((p) => Math.min(totalPages, p + 1)); loadData(page + 1); }}
              disabled={page >= totalPages}
              className="btn btn-secondary"
              style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Webhook Details Inspector Drawer / Modal */}
      {selectedLog && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            justifyContent: 'flex-end',
            zIndex: 1000,
          }}
          className="animate-fade-in"
          onClick={() => setSelectedLog(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '620px',
              height: '100%',
              backgroundColor: 'var(--bg-card)',
              borderLeft: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              padding: '1.75rem',
              overflowY: 'auto',
              boxShadow: '-10px 0 30px rgba(0,0,0,0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
            className="animate-slide-left"
          >
            {/* Drawer Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                  {renderStatusBadge(selectedLog.status)}
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Attempt #{selectedLog.retryCount + 1}
                  </span>
                </div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                  {selectedLog.eventId}
                </h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.25rem' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Error or Notice Alert */}
            {selectedLog.processingError && (
              <div
                style={{
                  padding: '0.85rem 1rem',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  marginBottom: '1.25rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.65rem',
                }}
              >
                <AlertTriangle size={16} color="#ef4444" style={{ marginTop: '2px', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#ef4444' }}>
                    Diagnostics & Processing Error
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    {selectedLog.processingError}
                  </div>
                </div>
              </div>
            )}

            {/* Meta Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', marginBottom: '1.25rem' }}>
              <div className="card" style={{ padding: '0.85rem', backgroundColor: 'var(--bg-secondary)' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Event Type</span>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, marginTop: '0.2rem', color: 'var(--text-primary)' }}>
                  {selectedLog.eventType}
                </div>
              </div>
              <div className="card" style={{ padding: '0.85rem', backgroundColor: 'var(--bg-secondary)' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Amount</span>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, marginTop: '0.2rem', color: 'var(--text-primary)' }}>
                  {selectedLog.amount ? `₹${selectedLog.amount.toLocaleString('en-IN')}` : 'N/A'}
                </div>
              </div>
              <div className="card" style={{ padding: '0.85rem', backgroundColor: 'var(--bg-secondary)' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Idempotency Key</span>
                <div style={{ fontSize: '0.8rem', fontWeight: 500, marginTop: '0.2rem', color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                  {selectedLog.idempotencyKey || selectedLog.eventId}
                </div>
              </div>
              <div className="card" style={{ padding: '0.85rem', backgroundColor: 'var(--bg-secondary)' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>HMAC Signature</span>
                <div style={{ fontSize: '0.8rem', fontWeight: 500, marginTop: '0.2rem', color: selectedLog.signatureValid ? '#10b981' : '#ef4444', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  {selectedLog.signatureValid ? <ShieldCheck size={13} /> : <ShieldAlert size={13} />}
                  {selectedLog.signatureValid ? 'Cryptographically Valid' : 'Signature Mismatch'}
                </div>
              </div>
            </div>

            {/* Payload JSON Inspector */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem', flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Payload Data (JSON)
                </span>
                <button
                  onClick={() => copyToClipboard(JSON.stringify(selectedLog.payload, null, 2))}
                  className="btn btn-secondary"
                  style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                >
                  {copiedPayload ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                  {copiedPayload ? 'Copied' : 'Copy JSON'}
                </button>
              </div>

              <pre
                style={{
                  backgroundColor: '#090d16',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '1rem',
                  color: '#38bdf8',
                  fontSize: '0.78rem',
                  fontFamily: 'monospace',
                  overflowX: 'auto',
                  maxHeight: '260px',
                  margin: 0,
                }}
              >
                {JSON.stringify(selectedLog.payload, null, 2)}
              </pre>
            </div>

            {/* Headers JSON */}
            {selectedLog.headers && Object.keys(selectedLog.headers).length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  HTTP Headers
                </span>
                <pre
                  style={{
                    backgroundColor: '#090d16',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '0.75rem 1rem',
                    color: 'var(--text-muted)',
                    fontSize: '0.75rem',
                    fontFamily: 'monospace',
                    overflowX: 'auto',
                    margin: 0,
                  }}
                >
                  {JSON.stringify(selectedLog.headers, null, 2)}
                </pre>
              </div>
            )}

            {/* Bottom Actions */}
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
              {(selectedLog.status === 'FAILED' || selectedLog.status === 'OUT_OF_ORDER') && (
                <button
                  onClick={() => handleRetry(selectedLog._id)}
                  disabled={retryingId === selectedLog._id}
                  className="btn btn-secondary"
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                >
                  <RotateCw size={14} className={retryingId === selectedLog._id ? 'animate-spin-slow' : ''} />
                  Retry Ingestion Pipeline
                </button>
              )}
              {onInvestigatePrompt && (
                <button
                  onClick={() => {
                    setSelectedLog(null);
                    onInvestigatePrompt(`Investigate webhook event [${selectedLog.eventId}] for eventType '${selectedLog.eventType}' which is marked ${selectedLog.status}.`);
                  }}
                  className="btn btn-primary"
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                >
                  <Bot size={14} />
                  Analyze with Agent
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
