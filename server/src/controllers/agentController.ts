import { Response } from 'express';
import { Types } from 'mongoose';
import { AuthRequest } from '../middleware/auth';
import { AgentInvestigation, AgentAction } from '../models';
import { InvestigatorAgent } from '../agents/investigatorAgent';
import { ReconciliationEngine } from '../services/reconciliationService';

export class AgentController {
  static async listInvestigations(req: AuthRequest, res: Response): Promise<void> {
    try {
      const merchantId = req.merchant._id;
      const investigations = await AgentInvestigation.find({ merchantId })
        .sort({ startedAt: -1 })
        .limit(20)
        .lean();

      res.status(200).json({
        success: true,
        data: investigations,
      });
    } catch (err: any) {
      console.error('[Agent] Error listing investigations:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async investigate(req: AuthRequest, res: Response): Promise<void> {
    try {
      const merchantId = req.merchant._id;
      const { question } = req.body;

      const queryText = question && question.trim() !== '' 
        ? question.trim() 
        : 'Something is wrong with my finances. Investigate.';

      const agent = new InvestigatorAgent(merchantId);
      const result = await agent.investigate(queryText);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      console.error('[Agent] Investigation execution error:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async getInvestigationById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const merchantId = req.merchant._id;
      const { id } = req.params;

      const investigation = await AgentInvestigation.findOne({
        _id: new Types.ObjectId(id as string),
        merchantId,
      }).lean();

      if (!investigation) {
        res.status(404).json({ success: false, message: 'Investigation record not found' });
        return;
      }

      const actions = await AgentAction.find({
        investigationId: investigation._id,
      })
        .sort({ createdAt: 1 })
        .lean();

      res.status(200).json({
        success: true,
        data: {
          investigation,
          actions,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async getInvestigationActivity(req: AuthRequest, res: Response): Promise<void> {
    try {
      const merchantId = req.merchant._id;
      const { id } = req.params;

      const actions = await AgentAction.find({
        merchantId,
        investigationId: new Types.ObjectId(id as string),
      })
        .sort({ createdAt: 1 })
        .lean();

      res.status(200).json({
        success: true,
        data: actions,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async getAllActivity(req: AuthRequest, res: Response): Promise<void> {
    try {
      const merchantId = req.merchant._id;
      const limit = parseInt(req.query.limit as string) || 50;

      const actions = await AgentAction.find({ merchantId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('investigationId')
        .lean();

      res.status(200).json({
        success: true,
        data: actions,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async approveResolution(req: AuthRequest, res: Response): Promise<void> {
    try {
      const merchantId = req.merchant._id;
      const { id } = req.params;

      const investigation = await AgentInvestigation.findOne({
        _id: new Types.ObjectId(id as string),
        merchantId,
      });

      if (!investigation) {
        res.status(404).json({ success: false, message: 'Investigation record not found' });
        return;
      }

      // Execute actual reconciliation engine
      const reconciliationResult = await ReconciliationEngine.runReconciliation(merchantId);

      // Record agent resolution action
      await AgentAction.create({
        investigationId: investigation._id,
        merchantId,
        toolName: 'runReconciliation',
        actionType: 'EXECUTION',
        input: { approvedByMerchant: true, investigationId: id },
        output: reconciliationResult,
        status: 'SUCCESS',
      });

      investigation.status = 'RESOLVED';
      await investigation.save();

      res.status(200).json({
        success: true,
        message: 'Resolution approved and reconciliation completed successfully.',
        data: {
          investigationId: investigation._id,
          status: 'RESOLVED',
          reconciliationResult,
        },
      });
    } catch (err: any) {
      console.error('[Agent] Error approving resolution:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }
}
