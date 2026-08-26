import { Schema, model } from 'mongoose';
import { IOrder } from '../types';

const OrderSchema = new Schema<IOrder>(
  {
    merchantId: { type: Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    orderReference: { type: String, required: true, index: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    status: { type: String, default: 'CREATED' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

OrderSchema.index({ merchantId: 1, orderReference: 1 });

export const Order = model<IOrder>('Order', OrderSchema);
