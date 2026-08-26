import { Schema, model } from 'mongoose';
import { IFinancialAnomaly } from '../types';

const FinancialAnomalySchema = new Schema<IFinancialAnomaly>(
  {
    merchantId: { type: Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
    type: { type: String, required: true, index: true },
    severity: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      required: true,
      index: true,
    },
    amount: { type: Number, required: true },
    description: { type: String, required: true },
    evidence: { type: Schema.Types.Mixed, default: {} },
    status: {
      type: String,
      enum: ['OPEN', 'INVESTIGATING', 'RESOLVED', 'DISMISSED'],
      default: 'OPEN',
      index: true,
    },
    detectedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const FinancialAnomaly = model<IFinancialAnomaly>('FinancialAnomaly', FinancialAnomalySchema);
