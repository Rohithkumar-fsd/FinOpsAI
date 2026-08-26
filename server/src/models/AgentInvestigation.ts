import { Schema, model } from 'mongoose';
import { IAgentInvestigation } from '../types';

const RootCauseSchema = new Schema(
  {
    type: { type: String, required: true },
    title: { type: String, required: true },
    count: { type: Number, required: true },
    amount: { type: Number, required: true },
    description: { type: String, required: true },
    confidence: { type: Number, required: true },
  },
  { _id: false }
);

const AgentInvestigationSchema = new Schema<IAgentInvestigation>(
  {
    merchantId: { type: Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
    question: { type: String, required: true },
    status: {
      type: String,
      enum: ['RUNNING', 'COMPLETED', 'FAILED', 'PENDING_APPROVAL', 'RESOLVED'],
      default: 'RUNNING',
      index: true,
    },
    summary: { type: String, default: '' },
    severity: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'HIGH',
    },
    financialImpact: { type: Number, default: 0 },
    rootCauses: [RootCauseSchema],
    recommendations: [{ type: String }],
    evidence: [{ type: Schema.Types.Mixed }],
    requiresApproval: { type: Boolean, default: true },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

export const AgentInvestigation = model<IAgentInvestigation>(
  'AgentInvestigation',
  AgentInvestigationSchema
);
