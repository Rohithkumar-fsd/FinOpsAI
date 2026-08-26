export type PaymentStatus = 'SUCCESS' | 'FAILED' | 'PENDING' | 'REFUNDED';
export type PaymentMethod = 'UPI' | 'CARD' | 'NETBANKING' | 'WALLET';
export type RefundStatus = 'PENDING' | 'PROCESSED' | 'FAILED';
export type SettlementStatus = 'EXPECTED' | 'PROCESSING' | 'SETTLED' | 'DELAYED' | 'PARTIAL';
export type DisputeStatus = 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'LOST';
export type ReconciliationStatus = 'MATCHED' | 'UNMATCHED' | 'REVIEW' | 'RESOLVED';
export type MismatchType = 
  | 'NONE'
  | 'AMOUNT_MISMATCH'
  | 'SETTLEMENT_ID_MISMATCH'
  | 'DUPLICATE'
  | 'ORDER_PAYMENT_MISMATCH'
  | 'MISSING_SETTLEMENT'
  | 'DELAYED_SETTLEMENT';
export type AnomalySeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type InvestigationStatus = 'RUNNING' | 'COMPLETED' | 'FAILED' | 'PENDING_APPROVAL' | 'RESOLVED';

export interface IMerchant {
  _id: string;
  name: string;
  email: string;
  currency: string;
  createdAt: string;
}

export interface IPayment {
  _id: string;
  merchantId: string;
  orderId?: any;
  paymentReference: string;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  failureReason?: string;
  createdAt: string;
  settledAt?: string;
}

export interface ISettlement {
  _id: string;
  merchantId: string;
  settlementReference: string;
  expectedAmount: number;
  actualAmount: number;
  expectedDate: string;
  actualDate?: string;
  status: SettlementStatus;
}

export interface IReconciliationRecord {
  _id: string;
  merchantId: string;
  orderId?: any;
  paymentId?: any;
  settlementItemId?: any;
  status: ReconciliationStatus;
  mismatchType: MismatchType;
  expectedAmount: number;
  actualAmount: number;
  difference: number;
  evidence: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface IFinancialAnomaly {
  _id: string;
  merchantId: string;
  type: string;
  severity: AnomalySeverity;
  amount: number;
  description: string;
  evidence: Record<string, any>;
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'DISMISSED';
  detectedAt: string;
}

export interface IRootCause {
  type: string;
  title: string;
  count: number;
  amount: number;
  description: string;
  confidence: number;
}

export interface IAgentInvestigation {
  _id: string;
  merchantId: string;
  question: string;
  status: InvestigationStatus;
  summary: string;
  severity: AnomalySeverity;
  financialImpact: number;
  rootCauses: IRootCause[];
  recommendations: string[];
  evidence: any[];
  requiresApproval?: boolean;
  startedAt: string;
  completedAt?: string;
}

export interface IAgentAction {
  _id: string;
  investigationId: string;
  merchantId: string;
  toolName: string;
  actionType: string;
  input: Record<string, any>;
  output: Record<string, any>;
  status: 'SUCCESS' | 'FAILED';
  createdAt: string;
}

export interface DashboardSummary {
  totalProcessedVolume: number;
  successfulPaymentsCount: number;
  failedPaymentsCount: number;
  totalSettlementReceived: number;
  expectedSettlementVolume: number;
  settlementLeakage: number;
  unreconciledDiscrepanciesCount: number;
  openAnomaliesCount: number;
  disputesCount: number;
  disputeAmountTotal: number;
  healthScore: number;
}

export interface ChartDataPoint {
  date: string;
  revenue: number;
  settled: number;
  leakage: number;
  volume: number;
}

export type WebhookStatus = 'SUCCESS' | 'DUPLICATE' | 'INVALID_SIGNATURE' | 'OUT_OF_ORDER' | 'FAILED' | 'RETRIED';

export interface IWebhookLog {
  _id: string;
  merchantId: string;
  eventId: string;
  eventType: string;
  eventTimestamp: string;
  receivedAt: string;
  payload: Record<string, any>;
  headers: Record<string, any>;
  signature: string;
  signatureValid: boolean;
  status: WebhookStatus;
  processingError?: string;
  idempotencyKey?: string;
  orderId?: string;
  paymentId?: string;
  amount?: number;
  retryCount: number;
  lastRetryAt?: string;
  anomalyId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookSummary {
  totalIngested: number;
  successCount: number;
  duplicateCount: number;
  invalidSignatureCount: number;
  outOfOrderCount: number;
  failedCount: number;
  retriedCount: number;
  successRate: number;
  recentAnomaliesCount: number;
}
