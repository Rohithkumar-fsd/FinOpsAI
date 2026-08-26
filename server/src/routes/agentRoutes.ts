import { Router } from 'express';
import { AgentController } from '../controllers/agentController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);
router.get('/investigations', AgentController.listInvestigations);
router.post('/investigate', AgentController.investigate);
router.get('/investigations/:id', AgentController.getInvestigationById);
router.get('/investigations/:id/activity', AgentController.getInvestigationActivity);
router.get('/activity', AgentController.getAllActivity);
router.post('/investigations/:id/approve', AgentController.approveResolution);
router.post('/resolutions/:id/approve', AgentController.approveResolution);
router.post('/:id/approve', AgentController.approveResolution);

export default router;
