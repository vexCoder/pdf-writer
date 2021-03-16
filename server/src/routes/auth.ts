import { Router } from 'express';
import AuthHandler from '../handler/AuthHandler';

const router = Router();

router.get('/generate', AuthHandler.generateAuth);
router.get('/loginStatus', AuthHandler.fetchCurrentLogin);
router.post('/auth', AuthHandler.saveToken);
router.post('/logout', AuthHandler.logout);

export default router;
