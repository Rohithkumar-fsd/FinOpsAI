import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Dispute } from '../models';

export class DisputesController {
  static async getDisputes(req: AuthRequest, res: Response): Promise<void> {
    try {
      const merchantId = req.merchant._id;
      const status = req.query.status as string;
      const query: any = { merchantId };

      if (status && status !== 'ALL') {
        query.status = status;
      }

      const disputes = await Dispute.find(query)
        .sort({ createdAt: -1 })
        .populate('paymentId')
        .lean();

      res.status(200).json({
        success: true,
        data: disputes,
      });
    } catch (err: any) {
      console.error('[Disputes] Error fetching disputes:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }
}
