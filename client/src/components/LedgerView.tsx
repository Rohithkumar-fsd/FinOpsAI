import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { FinOpsAPI } from '../services/api';
import type { IPayment, ISettlement } from '../types';

export const LedgerView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'payments' | 'settlements' | 'disputes' | 'refunds'>('payments');
  const [payments, setPayments] = useState<IPayment[]>([]);
  const [settlements, setSettlements] = useState<ISettlement[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [refunds, setRefunds] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [methodFilter, setMethodFilter] = useState<string>('ALL');

  const loadData = async () => {
    try {
      if (activeSubTab === 'payments') {
        const res = await FinOpsAPI.getPayments({
          method: methodFilter !== 'ALL' ? methodFilter : undefined,
          search: searchQuery || undefined,
          limit: 50,
        });
        if (res.success && res.data) {
          const list = Array.isArray(res.data) ? res.data : (res.data.payments || []);
          setPayments(list);
        }
      } else if (activeSubTab === 'settlements') {
        const res = await FinOpsAPI.getSettlements({ limit: 50 });
        if (res.success && res.data) {
          const list = Array.isArray(res.data) ? res.data : (res.data.settlements || []);
          setSettlements(list);
        }
      } else if (activeSubTab === 'disputes') {
        const res = await FinOpsAPI.getDisputes({ limit: 50 });
        if (res.success && res.data) {
          const list = Array.isArray(res.data) ? res.data : (res.data.disputes || []);
          setDisputes(list);
        }
      } else if (activeSubTab === 'refunds') {
        const res = await FinOpsAPI.getRefunds({ limit: 50 });
        if (res.success && res.data) {
          const list = Array.isArray(res.data) ? res.data : (res.data.refunds || []);
          setRefunds(list);
        }
      }
    } catch {
      // Fallback
    }
  };

  useEffect(() => {
    loadData();
  }, [activeSubTab, methodFilter, searchQuery]);

  const formatINR = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUCCESS':
      case 'SETTLED':
      case 'PROCESSED':
      case 'RESOLVED':
        return <span className="badge badge-success">{status}</span>;
      case 'FAILED':
      case 'LOST':
        return <span className="badge badge-danger">{status}</span>;
      case 'PENDING':
      case 'PROCESSING':
      case 'UNDER_REVIEW':
        return <span className="badge badge-warning">{status}</span>;
      case 'DELAYED':
        return <span className="badge badge-danger">DELAYED</span>;
      case 'REFUNDED':
        return <span className="badge badge-agent">REFUNDED</span>;
      default:
        return <span className="badge badge-info">{status}</span>;
    }
  };

  const safePayments = Array.isArray(payments) ? payments : [];
  const safeSettlements = Array.isArray(settlements) ? settlements : [];
  const safeDisputes = Array.isArray(disputes) ? disputes : [];
  const safeRefunds = Array.isArray(refunds) ? refunds : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1.75rem 2rem' }}>
      {/* Sub-Tab Navigation Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.85rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {[
            { id: 'payments', label: 'Payments Ledger', count: safePayments.length },
            { id: 'settlements', label: 'Settlement Batches', count: safeSettlements.length },
            { id: 'disputes', label: 'Disputes & Chargebacks', count: safeDisputes.length },
            { id: 'refunds', label: 'Refund Logs', count: safeRefunds.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              style={{
                fontSize: '0.85rem',
                fontWeight: 600,
                padding: '0.5rem 1rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid',
                borderColor: activeSubTab === tab.id ? 'var(--border-glow)' : 'transparent',
                background: activeSubTab === tab.id ? 'rgba(56, 189, 248, 0.1)' : 'transparent',
                color: activeSubTab === tab.id ? 'var(--primary)' : 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Filter / Search */}
        {activeSubTab === 'payments' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ position: 'relative', width: '220px' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search reference..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '2rem', paddingRight: '0.5rem', fontSize: '0.8rem', height: '34px' }}
              />
            </div>

            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="form-input"
              style={{ width: 'auto', fontSize: '0.8rem', height: '34px', padding: '0 0.75rem' }}
            >
              <option value="ALL">All Methods</option>
              <option value="UPI">UPI</option>
              <option value="CARD">Card</option>
              <option value="NETBANKING">Netbanking</option>
              <option value="WALLET">Wallet</option>
            </select>
          </div>
        )}
      </div>

      {/* Tables based on active tab */}
      {activeSubTab === 'payments' && (
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Payment Reference</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Status</th>
                <th>Customer / Order</th>
                <th>Failure / Reason</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {safePayments.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    No payments found.
                  </td>
                </tr>
              ) : (
                safePayments.map((p) => (
                  <tr key={p._id}>
                    <td style={{ fontFamily: 'JetBrains Mono', fontWeight: 600, color: '#ffffff' }}>
                      {p.paymentReference}
                    </td>
                    <td style={{ fontFamily: 'Outfit', fontWeight: 700 }}>
                      {formatINR(p.amount)}
                    </td>
                    <td>
                      <span className="badge badge-info">{p.paymentMethod}</span>
                    </td>
                    <td>{getStatusBadge(p.status)}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {p.orderId?.orderReference || 'N/A'}
                    </td>
                    <td style={{ fontSize: '0.78rem', color: p.failureReason ? 'var(--danger)' : 'var(--text-subtle)' }}>
                      {p.failureReason || '—'}
                    </td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {new Date(p.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeSubTab === 'settlements' && (
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Settlement Batch</th>
                <th>Expected Amount</th>
                <th>Actual Settled</th>
                <th>Variance (Δ)</th>
                <th>Status</th>
                <th>Expected Date</th>
                <th>Settled Date</th>
              </tr>
            </thead>
            <tbody>
              {safeSettlements.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    No settlement records found.
                  </td>
                </tr>
              ) : (
                safeSettlements.map((s) => (
                  <tr key={s._id}>
                    <td style={{ fontFamily: 'JetBrains Mono', fontWeight: 600, color: '#ffffff' }}>
                      {s.settlementReference}
                    </td>
                    <td style={{ fontFamily: 'Outfit', fontWeight: 600 }}>{formatINR(s.expectedAmount)}</td>
                    <td style={{ fontFamily: 'Outfit', fontWeight: 600, color: s.actualAmount > 0 ? '#ffffff' : 'var(--danger)' }}>
                      {formatINR(s.actualAmount)}
                    </td>
                    <td style={{ fontFamily: 'Outfit', fontWeight: 700, color: s.expectedAmount !== s.actualAmount ? 'var(--danger)' : 'var(--success)' }}>
                      {formatINR(s.expectedAmount - s.actualAmount)}
                    </td>
                    <td>{getStatusBadge(s.status)}</td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {new Date(s.expectedDate).toLocaleDateString()}
                    </td>
                    <td style={{ fontSize: '0.75rem', color: s.actualDate ? 'var(--text-main)' : 'var(--text-subtle)' }}>
                      {s.actualDate ? new Date(s.actualDate).toLocaleDateString() : 'Pending'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeSubTab === 'disputes' && (
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Dispute ID / Payment</th>
                <th>Disputed Amount</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Raised Date</th>
              </tr>
            </thead>
            <tbody>
              {safeDisputes.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    No active disputes found.
                  </td>
                </tr>
              ) : (
                safeDisputes.map((d) => (
                  <tr key={d._id}>
                    <td style={{ fontFamily: 'JetBrains Mono', fontWeight: 600, color: '#ffffff' }}>
                      {d.paymentId?.paymentReference || d._id}
                    </td>
                    <td style={{ fontFamily: 'Outfit', fontWeight: 700, color: 'var(--warning)' }}>
                      {formatINR(d.amount)}
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-main)' }}>{d.reason}</td>
                    <td>{getStatusBadge(d.status)}</td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {new Date(d.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeSubTab === 'refunds' && (
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Refund ID / Payment</th>
                <th>Refund Amount</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Requested Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {safeRefunds.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    No refund transactions logged.
                  </td>
                </tr>
              ) : (
                safeRefunds.map((rf) => (
                  <tr key={rf._id}>
                    <td style={{ fontFamily: 'JetBrains Mono', fontWeight: 600, color: '#ffffff' }}>
                      {rf.paymentId?.paymentReference || rf._id}
                    </td>
                    <td style={{ fontFamily: 'Outfit', fontWeight: 700 }}>{formatINR(rf.amount)}</td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-main)' }}>{rf.reason}</td>
                    <td>{getStatusBadge(rf.status)}</td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {new Date(rf.requestedAt || rf.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
