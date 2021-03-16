import { Router } from 'express';
import pdfRoutes from './pdf';
import authRoutes from './auth';
import driveRoutes from './drive';

const router = Router();

router.use('/d', pdfRoutes);
router.use('/a', authRoutes);
router.use('/f', driveRoutes);

export default router;
