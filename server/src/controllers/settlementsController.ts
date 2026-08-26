import { Response } from 'express';
import { Types } from 'mongoose';
import { AuthRequest } from '../middleware/auth';
import { Settlement, SettlementItem } from '../models';

export class SettlementsController {
  static async getSettlements(req: AuthRequest, res: Response): Promise<void> {
    try {
      const merchantId = req.merchant._id;
      const settlements = await Settlement.find({ merchantId })
        .sort({ expectedDate: -1 })
        .lean();

      res.status(200).json({
        success: true,
        data: settlements,
      });
    } catch (err: any) {
      console.error('[Settlements] Error fetching settlements:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async getSettlementById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const merchantId = req.merchant._id;
      const { id } = req.params;

      const settlement = await Settlement.findOne({
        _id: new Types.ObjectId(id as string),
        merchantId,
      }).lean();

      if (!settlement) {
        res.status(404).json({ success: false, message: 'Settlement record not found' });
        return;
      }

      const items = await SettlementItem.find({ settlementId: settlement._id })
        .populate('paymentId')
        .limit(50)
        .lean();

      res.status(200).json({
        success: true,
        data: {
          settlement,
          items,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}
