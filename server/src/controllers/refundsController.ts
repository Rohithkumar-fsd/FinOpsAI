import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Refund } from '../models';

export class RefundsController {
  static async getRefunds(req: AuthRequest, res: Response): Promise<void> {
    try {
      const merchantId = req.merchant._id;
      const status = req.query.status as string;
      const query: any = { merchantId };

      if (status && status !== 'ALL') {
        query.status = status;
      }

      const refunds = await Refund.find(query)
        .sort({ requestedAt: -1 })
        .populate('paymentId')
        .lean();

      res.status(200).json({
        success: true,
        data: refunds,
      });
    } catch (err: any) {
      console.error('[Refunds] Error fetching refunds:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }
}
