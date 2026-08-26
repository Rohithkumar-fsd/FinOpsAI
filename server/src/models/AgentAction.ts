import { Schema, model } from 'mongoose';
import { IAgentAction } from '../types';

const AgentActionSchema = new Schema<IAgentAction>(
  {
    investigationId: { type: Schema.Types.ObjectId, ref: 'AgentInvestigation', required: true, index: true },
    merchantId: { type: Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
    toolName: { type: String, required: true },
    actionType: { type: String, required: true },
    input: { type: Schema.Types.Mixed, default: {} },
    output: { type: Schema.Types.Mixed, default: {} },
    status: { type: String, enum: ['SUCCESS', 'FAILED'], default: 'SUCCESS' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const AgentAction = model<IAgentAction>('AgentAction', AgentActionSchema);
