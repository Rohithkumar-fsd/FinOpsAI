import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { WebhookService } from '../services/webhookService';

export class WebhookController {
  /**
   * POST /api/webhooks/ingest
   * Ingest a webhook payload
   */
  static async ingestWebhook(req: AuthRequest, res: Response): Promise<void> {
    try {
      const merchantId = req.merchant._id;
      const {
        eventId,
        eventType,
        eventTimestamp,
        payload,
        signature,
        idempotencyKey,
        simulateFailure,
      } = req.body;

      if (!eventId || !eventType || !payload) {
        res.status(400).json({
          success: false,
          message: 'Missing required webhook fields: eventId, eventType, and payload are required.',
        });
        return;
      }

      const result = await WebhookService.ingestWebhook({
        merchantId,
        eventId,
        eventType,
        eventTimestamp,
        payload,
        headers: req.headers,
        signature,
        idempotencyKey,
        simulateFailure,
      });

      const statusCode = result.status === 'SUCCESS' ? 200 : result.status === 'INVALID_SIGNATURE' ? 401 : 202;

      res.status(statusCode).json({
        success: result.status === 'SUCCESS',
        data: result,
      });
    } catch (err: any) {
      console.error('[WebhookController] Ingestion error:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * POST /api/webhooks/simulate
   * Trigger demo scenario (SUCCESS, DUPLICATE, INVALID_SIGNATURE, OUT_OF_ORDER, FAILED)
   */
  static async simulateScenario(req: AuthRequest, res: Response): Promise<void> {
    try {
      const merchantId = req.merchant._id;
      const { scenario } = req.body;

      if (!scenario) {
        res.status(400).json({
          success: false,
          message: 'Scenario is required. Choose from: SUCCESS, DUPLICATE, INVALID_SIGNATURE, OUT_OF_ORDER, FAILED',
        });
        return;
      }

      const outcome = await WebhookService.simulateScenario(merchantId, scenario);

      res.status(200).json({
        success: true,
        data: outcome,
      });
    } catch (err: any) {
      console.error('[WebhookController] Simulation error:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * GET /api/webhooks/summary
   * Webhook audit stats and health rates
   */
  static async getSummary(req: AuthRequest, res: Response): Promise<void> {
    try {
      const merchantId = req.merchant._id;
      const summary = await WebhookService.getWebhookSummary(merchantId);

      res.status(200).json({
        success: true,
        data: summary,
      });
    } catch (err: any) {
      console.error('[WebhookController] Error fetching summary:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * GET /api/webhooks/logs
   * List paginated audit logs with search and filter
   */
  static async getLogs(req: AuthRequest, res: Response): Promise<void> {
    try {
      const merchantId = req.merchant._id;
      const { status, eventType, search, page, limit } = req.query;

      const result = await WebhookService.getWebhookLogs(merchantId, {
        status: status as string,
        eventType: eventType as string,
        search: search as string,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 20,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      console.error('[WebhookController] Error fetching logs:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * GET /api/webhooks/logs/:id
   * Get single webhook log detail
   */
  static async getLogById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const merchantId = req.merchant._id;
      const log = await WebhookService.getWebhookDetails(merchantId, req.params.id as string);

      if (!log) {
        res.status(404).json({ success: false, message: 'Webhook log not found' });
        return;
      }

      res.status(200).json({
        success: true,
        data: log,
      });
    } catch (err: any) {
      console.error('[WebhookController] Error fetching log by id:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * POST /api/webhooks/logs/:id/retry
   * Retry a webhook event
   */
  static async retryWebhook(req: AuthRequest, res: Response): Promise<void> {
    try {
      const merchantId = req.merchant._id;
      const result = await WebhookService.retryWebhook(merchantId, req.params.id as string);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      console.error('[WebhookController] Error retrying webhook:', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }
}
