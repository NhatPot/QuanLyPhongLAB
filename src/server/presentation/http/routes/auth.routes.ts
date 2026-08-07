import { Router } from 'express';
import {
  AuthController,
  changePasswordSchema,
  loginSchema,
  updateCurrentUserProfileSchema,
} from '../controllers/AuthController';
import { validateRequest } from '../middlewares/validateRequestMiddleware';
import { authMiddleware } from '../middlewares/authMiddleware';

const authRouter = Router();
const controller = new AuthController();

authRouter.post('/login', validateRequest(loginSchema), (req, res, next) => controller.login(req, res, next));
authRouter.post('/refresh', (req, res, next) => controller.refresh(req, res, next));
authRouter.post('/logout', (req, res, next) => controller.logout(req, res, next));
authRouter.get('/me', authMiddleware, (req, res, next) => controller.me(req, res, next));
authRouter.put('/me', authMiddleware, validateRequest(updateCurrentUserProfileSchema), (req, res, next) => controller.updateMe(req, res, next));
authRouter.post('/change-password', authMiddleware, validateRequest(changePasswordSchema), (req, res, next) => controller.changePassword(req, res, next));

export { authRouter };
