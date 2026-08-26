import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { FinancialAnomaly } from '../models';

export class AnomaliesController {
  static async getAnomalies(req: AuthRequest, res: Response): Promise<void> {
    try {
      const merchantId = req.merchant._id;
      const severity = req.query.severity as string;
      const status = req.query.status as string;

      const query: any = { merchantId };

      if (severity && severity !== 'ALL') {
        query.severity = severity;
      }

      if (status && status !== 'ALL') {
        query.status = status;
      }

      const anomalies = await FinancialAnomaly.find(query)
        .sort({ severity: 1, amount: -1, detectedAt: -1 })
        .lean();

      res.status(200).json({
        success: true,
        data: anomalies,
      });
    } catch (err: any) {
      console.error('[Anomalies] Error fetching anomalies:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }
}
