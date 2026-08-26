import { Router } from 'express';
import { WebhookController } from '../controllers/webhookController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Protect all webhook routes with merchant auth
router.use(authMiddleware);

router.post('/ingest', WebhookController.ingestWebhook);
router.post('/simulate', WebhookController.simulateScenario);
router.get('/summary', WebhookController.getSummary);
router.get('/logs', WebhookController.getLogs);
router.get('/logs/:id', WebhookController.getLogById);
router.post('/logs/:id/retry', WebhookController.retryWebhook);

export default router;
