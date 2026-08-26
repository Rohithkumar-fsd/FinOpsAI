import { Schema, model } from 'mongoose';
import { ICustomer } from '../types';

const CustomerSchema = new Schema<ICustomer>(
  {
    merchantId: { type: Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
    name: { type: String, required: true },
    email: { type: String, required: true, index: true },
    phone: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const Customer = model<ICustomer>('Customer', CustomerSchema);
