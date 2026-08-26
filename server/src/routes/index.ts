import { Router } from 'express';
import authRoutes from './authRoutes';
import dashboardRoutes from './dashboardRoutes';
import paymentsRoutes from './paymentsRoutes';
import settlementsRoutes from './settlementsRoutes';
import reconciliationRoutes from './reconciliationRoutes';
import refundsRoutes from './refundsRoutes';
import disputesRoutes from './disputesRoutes';
import anomaliesRoutes from './anomaliesRoutes';
import agentRoutes from './agentRoutes';
import demoRoutes from './demoRoutes';
import webhookRoutes from './webhookRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/payments', paymentsRoutes);
router.use('/settlements', settlementsRoutes);
router.use('/reconciliation', reconciliationRoutes);
router.use('/refunds', refundsRoutes);
router.use('/disputes', disputesRoutes);
router.use('/anomalies', anomaliesRoutes);
router.use('/agent', agentRoutes);
router.use('/resolutions', agentRoutes); // Alias for resolution endpoints
router.use('/demo', demoRoutes);
router.use('/webhooks', webhookRoutes);

export default router;
