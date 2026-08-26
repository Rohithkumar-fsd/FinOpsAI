import { Types } from 'mongoose';

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
  _id: Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICustomer {
  _id: Types.ObjectId;
  merchantId: Types.ObjectId;
  name: string;
  email: string;
  phone: string;
  createdAt: Date;
}

export interface IOrder {
  _id: Types.ObjectId;
  merchantId: Types.ObjectId;
  customerId: Types.ObjectId;
  orderReference: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: Date;
}

export interface IPayment {
  _id: Types.ObjectId;
  merchantId: Types.ObjectId;
  orderId: Types.ObjectId;
  paymentReference: string;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  failureReason?: string;
  createdAt: Date;
  settledAt?: Date;
}

export interface IRefund {
  _id: Types.ObjectId;
  merchantId: Types.ObjectId;
  paymentId: Types.ObjectId;
  amount: number;
  status: RefundStatus;
  reason: string;
  requestedAt: Date;
  processedAt?: Date;
}

export interface ISettlement {
  _id: Types.ObjectId;
  merchantId: Types.ObjectId;
  settlementReference: string;
  expectedAmount: number;
  actualAmount: number;
  expectedDate: Date;
  actualDate?: Date;
  status: SettlementStatus;
}

export interface ISettlementItem {
  _id: Types.ObjectId;
  settlementId: Types.ObjectId;
  paymentId: Types.ObjectId;
  expectedAmount: number;
  settledAmount: number;
  status: string;
}

export interface IDispute {
  _id: Types.ObjectId;
  merchantId: Types.ObjectId;
  paymentId: Types.ObjectId;
  amount: number;
  reason: string;
  status: DisputeStatus;
  createdAt: Date;
  resolvedAt?: Date;
}

export interface IReconciliationRecord {
  _id: Types.ObjectId;
  merchantId: Types.ObjectId;
  orderId?: Types.ObjectId;
  paymentId?: Types.ObjectId;
  settlementItemId?: Types.ObjectId;
  status: ReconciliationStatus;
  mismatchType: MismatchType;
  expectedAmount: number;
  actualAmount: number;
  difference: number;
  evidence: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IFinancialAnomaly {
  _id: Types.ObjectId;
  merchantId: Types.ObjectId;
  type: string;
  severity: AnomalySeverity;
  amount: number;
  description: string;
  evidence: Record<string, any>;
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'DISMISSED';
  detectedAt: Date;
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
  _id: Types.ObjectId;
  merchantId: Types.ObjectId;
  question: string;
  status: InvestigationStatus;
  summary: string;
  severity: AnomalySeverity;
  financialImpact: number;
  rootCauses: IRootCause[];
  recommendations: string[];
  evidence: any[];
  requiresApproval?: boolean;
  startedAt: Date;
  completedAt?: Date;
}

export interface IAgentAction {
  _id: Types.ObjectId;
  investigationId: Types.ObjectId;
  merchantId: Types.ObjectId;
  toolName: string;
  actionType: string;
  input: Record<string, any>;
  output: Record<string, any>;
  status: 'SUCCESS' | 'FAILED';
  createdAt: Date;
}
