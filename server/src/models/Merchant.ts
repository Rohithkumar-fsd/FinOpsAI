import { Schema, model } from 'mongoose';
import { IMerchant } from '../types';

const MerchantSchema = new Schema<IMerchant>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    currency: { type: String, default: 'INR' },
  },
  { timestamps: true }
);

export const Merchant = model<IMerchant>('Merchant', MerchantSchema);
