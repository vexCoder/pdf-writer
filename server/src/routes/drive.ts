import { Router } from 'express';
import DriveHandler from '../handler/DriveHandler';

const router = Router();

router.post('/list', DriveHandler.listFiles);

export default router;
