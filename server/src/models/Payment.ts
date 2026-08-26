import { Schema, model } from 'mongoose';
import { IPayment } from '../types';

const PaymentSchema = new Schema<IPayment>(
  {
    merchantId: { type: Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    paymentReference: { type: String, required: true, index: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    paymentMethod: {
      type: String,
      enum: ['UPI', 'CARD', 'NETBANKING', 'WALLET'],
      required: true,
    },
    status: {
      type: String,
      enum: ['SUCCESS', 'FAILED', 'PENDING', 'REFUNDED'],
      required: true,
      index: true,
    },
    failureReason: { type: String },
    settledAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

PaymentSchema.index({ merchantId: 1, status: 1, createdAt: -1 });
PaymentSchema.index({ merchantId: 1, paymentReference: 1 });

export const Payment = model<IPayment>('Payment', PaymentSchema);
