import { Request, Response } from 'express';
import { seedDatabase } from '../seed/seed';

export class DemoController {
  static async resetDemo(req: Request, res: Response): Promise<void> {
    try {
      console.log('[Demo] Resetting demo scenario to deterministic initial state...');
      const summary = await seedDatabase();

      res.status(200).json({
        success: true,
        message: 'Demo dataset reset to initial deterministic state successfully.',
        data: summary,
      });
    } catch (err: any) {
      console.error('[Demo] Error resetting demo:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }

  static async loadScenario(req: Request, res: Response): Promise<void> {
    try {
      console.log('[Demo] Loading standard hackathon demo scenario...');
      const summary = await seedDatabase();

      res.status(200).json({
        success: true,
        message: 'Demo scenario loaded successfully: ₹3.2L discrepancy, 47 unreconciled records.',
        data: summary,
      });
    } catch (err: any) {
      console.error('[Demo] Error loading scenario:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }
}
