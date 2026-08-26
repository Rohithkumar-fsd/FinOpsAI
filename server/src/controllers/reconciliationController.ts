import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { ReconciliationRecord } from '../models';
import { ReconciliationEngine } from '../services/reconciliationService';
import { FinancialService } from '../services/financialService';

export class ReconciliationController {
  static async getSummary(req: AuthRequest, res: Response): Promise<void> {
    try {
      const merchantId = req.merchant._id;
      const [unreconciled, preview, settlement] = await Promise.all([
        FinancialService.getUnreconciledSummary(merchantId),
        ReconciliationEngine.preview(merchantId),
        FinancialService.getSettlementSummary(merchantId),
      ]);

      res.status(200).json({
        success: true,
        data: {
          unreconciled,
          preview,
          settlement,
        },
      });
    } catch (err: any) {
      console.error('[Reconciliation] Error fetching summary:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async getRecords(req: AuthRequest, res: Response): Promise<void> {
    try {
      const merchantId = req.merchant._id;
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
      const status = req.query.status as string;
      const mismatchType = req.query.mismatchType as string;

      const query: any = { merchantId };

      if (status && status !== 'ALL') {
        query.status = status;
      }

      if (mismatchType && mismatchType !== 'ALL') {
        query.mismatchType = mismatchType;
      }

      const [records, total] = await Promise.all([
        ReconciliationRecord.find(query)
          .sort({ updatedAt: -1, createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .populate('paymentId')
          .populate('orderId')
          .lean(),
        ReconciliationRecord.countDocuments(query),
      ]);

      res.status(200).json({
        success: true,
        data: {
          records,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        },
      });
    } catch (err: any) {
      console.error('[Reconciliation] Error fetching records:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async getPreview(req: AuthRequest, res: Response): Promise<void> {
    try {
      const merchantId = req.merchant._id;
      const preview = await ReconciliationEngine.preview(merchantId);

      res.status(200).json({
        success: true,
        data: preview,
      });
    } catch (err: any) {
      console.error('[Reconciliation] Error generating preview:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async runReconciliation(req: AuthRequest, res: Response): Promise<void> {
    try {
      const merchantId = req.merchant._id;
      const result = await ReconciliationEngine.runReconciliation(merchantId, req.body);

      res.status(200).json({
        success: true,
        message: `Reconciliation executed successfully. Matched ${result.matchedCount} records, recovered ₹${(result.matchedAmount / 100000).toFixed(2)}L.`,
        data: result,
      });
    } catch (err: any) {
      console.error('[Reconciliation] Error running reconciliation:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }
}
