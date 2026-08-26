import mongoose, { Schema, Document, Types } from 'mongoose';

export type WebhookStatus = 'SUCCESS' | 'DUPLICATE' | 'INVALID_SIGNATURE' | 'OUT_OF_ORDER' | 'FAILED' | 'RETRIED';

export interface IWebhookLog extends Document {
  merchantId: Types.ObjectId;
  eventId: string;
  eventType: string;
  eventTimestamp: Date;
  receivedAt: Date;
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
  lastRetryAt?: Date;
  anomalyId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const WebhookLogSchema = new Schema<IWebhookLog>(
  {
    merchantId: { type: Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
    eventId: { type: String, required: true, index: true },
    eventType: { type: String, required: true, index: true },
    eventTimestamp: { type: Date, required: true },
    receivedAt: { type: Date, default: Date.now },
    payload: { type: Schema.Types.Mixed, required: true },
    headers: { type: Schema.Types.Mixed, default: {} },
    signature: { type: String, default: '' },
    signatureValid: { type: Boolean, default: true },
    status: {
      type: String,
      enum: ['SUCCESS', 'DUPLICATE', 'INVALID_SIGNATURE', 'OUT_OF_ORDER', 'FAILED', 'RETRIED'],
      default: 'SUCCESS',
      index: true,
    },
    processingError: { type: String },
    idempotencyKey: { type: String, index: true },
    orderId: { type: String, index: true },
    paymentId: { type: String, index: true },
    amount: { type: Number, default: 0 },
    retryCount: { type: Number, default: 0 },
    lastRetryAt: { type: Date },
    anomalyId: { type: Schema.Types.ObjectId, ref: 'FinancialAnomaly' },
  },
  { timestamps: true }
);

// Compound index for idempotency and ordering
WebhookLogSchema.index({ merchantId: 1, eventId: 1 });
WebhookLogSchema.index({ merchantId: 1, idempotencyKey: 1 });
WebhookLogSchema.index({ merchantId: 1, paymentId: 1, eventType: 1 });
WebhookLogSchema.index({ merchantId: 1, status: 1, createdAt: -1 });

export const WebhookLog = mongoose.model<IWebhookLog>('WebhookLog', WebhookLogSchema);
