import { Schema, model } from 'mongoose';
import { ISettlement, ISettlementItem } from '../types';

const SettlementSchema = new Schema<ISettlement>(
  {
    merchantId: { type: Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
    settlementReference: { type: String, required: true, index: true },
    expectedAmount: { type: Number, required: true },
    actualAmount: { type: Number, required: true },
    expectedDate: { type: Date, required: true },
    actualDate: { type: Date },
    status: {
      type: String,
      enum: ['EXPECTED', 'PROCESSING', 'SETTLED', 'DELAYED', 'PARTIAL'],
      default: 'EXPECTED',
      index: true,
    },
  },
  { timestamps: true }
);

export const Settlement = model<ISettlement>('Settlement', SettlementSchema);

const SettlementItemSchema = new Schema<ISettlementItem>(
  {
    settlementId: { type: Schema.Types.ObjectId, ref: 'Settlement', required: true, index: true },
    paymentId: { type: Schema.Types.ObjectId, ref: 'Payment', required: true, index: true },
    expectedAmount: { type: Number, required: true },
    settledAmount: { type: Number, required: true },
    status: { type: String, default: 'SETTLED' },
  },
  { timestamps: true }
);

export const SettlementItem = model<ISettlementItem>('SettlementItem', SettlementItemSchema);
