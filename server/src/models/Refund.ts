import { Schema, model } from 'mongoose';
import { IRefund } from '../types';

const RefundSchema = new Schema<IRefund>(
  {
    merchantId: { type: Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
    paymentId: { type: Schema.Types.ObjectId, ref: 'Payment', required: true, index: true },
    amount: { type: Number, required: true },
    status: {
      type: String,
      enum: ['PENDING', 'PROCESSED', 'FAILED'],
      default: 'PENDING',
      index: true,
    },
    reason: { type: String, required: true },
    requestedAt: { type: Date, default: Date.now },
    processedAt: { type: Date },
  },
  { timestamps: true }
);

export const Refund = model<IRefund>('Refund', RefundSchema);
