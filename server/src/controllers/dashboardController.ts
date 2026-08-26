import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { FinancialService } from '../services/financialService';

export class DashboardController {
  static async getSummary(req: AuthRequest, res: Response): Promise<void> {
    try {
      const merchantId = req.merchant._id;

      const [payments, settlements, unreconciled, refunds, disputes] = await Promise.all([
        FinancialService.getPaymentSummary(merchantId),
        FinancialService.getSettlementSummary(merchantId),
        FinancialService.getUnreconciledSummary(merchantId),
        FinancialService.getRefundSummary(merchantId),
        FinancialService.getDisputeSummary(merchantId),
      ]);

      res.status(200).json({
        success: true,
        data: {
          payments,
          settlements,
          unreconciled,
          refunds,
          disputes,
        },
      });
    } catch (err: any) {
      console.error('[Dashboard] Error fetching summary:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async getHealth(req: AuthRequest, res: Response): Promise<void> {
    try {
      const merchantId = req.merchant._id;
      const health = await FinancialService.calculateFinancialHealthScore(merchantId);

      res.status(200).json({
        success: true,
        data: health,
      });
    } catch (err: any) {
      console.error('[Dashboard] Error fetching health score:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async getCharts(req: AuthRequest, res: Response): Promise<void> {
    try {
      const merchantId = req.merchant._id;
      const charts = await FinancialService.getTimeSeriesData(merchantId);

      res.status(200).json({
        success: true,
        data: charts,
      });
    } catch (err: any) {
      console.error('[Dashboard] Error fetching chart data:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async runStressTest(req: AuthRequest, res: Response): Promise<void> {
    try {
      const merchantId = req.merchant._id;
      const {
        revenueDropPercent = 20,
        refundIncreasePercent = 30,
        settlementDelayDays = 2,
        unexpectedExpense = 100000,
      } = req.body;

      const result = await FinancialService.runStressTest(merchantId, {
        revenueDropPercent: Number(revenueDropPercent),
        refundIncreasePercent: Number(refundIncreasePercent),
        settlementDelayDays: Number(settlementDelayDays),
        unexpectedExpense: Number(unexpectedExpense),
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      console.error('[Dashboard] Error running stress test:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }
}
