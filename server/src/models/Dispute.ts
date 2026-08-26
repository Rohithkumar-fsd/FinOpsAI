import { Schema, model } from 'mongoose';
import { IDispute } from '../types';

const DisputeSchema = new Schema<IDispute>(
  {
    merchantId: { type: Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
    paymentId: { type: Schema.Types.ObjectId, ref: 'Payment', required: true, index: true },
    amount: { type: Number, required: true },
    reason: { type: String, required: true },
    status: {
      type: String,
      enum: ['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'LOST'],
      default: 'OPEN',
      index: true,
    },
    resolvedAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const Dispute = model<IDispute>('Dispute', DisputeSchema);
