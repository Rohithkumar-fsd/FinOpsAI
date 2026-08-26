import { Schema, model } from 'mongoose';
import { IReconciliationRecord } from '../types';

const ReconciliationRecordSchema = new Schema<IReconciliationRecord>(
  {
    merchantId: { type: Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', index: true },
    paymentId: { type: Schema.Types.ObjectId, ref: 'Payment', index: true },
    settlementItemId: { type: Schema.Types.ObjectId, ref: 'SettlementItem', index: true },
    status: {
      type: String,
      enum: ['MATCHED', 'UNMATCHED', 'REVIEW', 'RESOLVED'],
      default: 'UNMATCHED',
      index: true,
    },
    mismatchType: {
      type: String,
      enum: [
        'NONE',
        'AMOUNT_MISMATCH',
        'SETTLEMENT_ID_MISMATCH',
        'DUPLICATE',
        'ORDER_PAYMENT_MISMATCH',
        'MISSING_SETTLEMENT',
        'DELAYED_SETTLEMENT',
      ],
      default: 'NONE',
      index: true,
    },
    expectedAmount: { type: Number, required: true },
    actualAmount: { type: Number, required: true },
    difference: { type: Number, required: true },
    evidence: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

ReconciliationRecordSchema.index({ merchantId: 1, status: 1, mismatchType: 1 });

export const ReconciliationRecord = model<IReconciliationRecord>(
  'ReconciliationRecord',
  ReconciliationRecordSchema
);
