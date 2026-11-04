import { Router } from 'express';
import {
  AuthController,
  changePasswordSchema,
  loginSchema,
  updateCurrentUserProfileSchema,
} from '../controllers/AuthController';
import { validateRequest } from '../middlewares/validateRequestMiddleware';
import { authMiddleware } from '../middlewares/authMiddleware';
import { SelfServiceAuthController } from '../controllers/SelfServiceAuthController';
import {FitSsoController} from '../controllers/FitSsoController';

const authRouter = Router();
const controller = new AuthController();
const self = new SelfServiceAuthController();
const sso = new FitSsoController();
authRouter.post('/sso/start',sso.start);
authRouter.get('/sso/callback',sso.callback);
authRouter.get('/sso/pending',sso.pending);
authRouter.post('/sso/link',sso.link);
authRouter.post('/sso/profile',authMiddleware,sso.profile);
authRouter.post('/sso/logout',authMiddleware,sso.logout);
authRouter.get('/sso/logout-redirect',sso.logoutRedirect);
authRouter.get('/config', self.config);
authRouter.post('/account-setup', authMiddleware, self.accountSetup);
authRouter.get('/me/security', authMiddleware, self.security);
authRouter.post('/register/request-code', self.requestRegister);
authRouter.post('/register/verify-code', self.verifyRegister);
authRouter.post('/register/complete', self.complete);
authRouter.post('/otp/resend', self.resend);
authRouter.post('/password/request-reset', self.requestReset);
authRouter.post('/password/verify-reset', self.verifyReset);
authRouter.post('/password/reset', self.reset);
authRouter.post('/google/nonce', self.googleNonce);
authRouter.post('/google', self.google);
authRouter.post('/me/google/link', authMiddleware, self.linkGoogle);
authRouter.post('/me/password/request-code', authMiddleware, self.requestSetPassword);
authRouter.post('/me/password/verify-code', authMiddleware, self.verifySetPassword);
authRouter.post('/me/password/set', authMiddleware, self.setPassword);
authRouter.post('/me/email/request-code', authMiddleware, self.requestEmailChange);
authRouter.post('/me/email/verify-current', authMiddleware, self.verifyCurrentEmail);
authRouter.post('/me/email/request-new', authMiddleware, self.requestNewEmail);
authRouter.post('/me/email/verify-code', authMiddleware, self.verifyNewEmail);
authRouter.post('/me/email/change', authMiddleware, self.changeEmail);
authRouter.get('/csrf', controller.csrf);
authRouter.post('/logout-all', authMiddleware, controller.logoutAll);

authRouter.post('/login', validateRequest(loginSchema), (req, res, next) => controller.login(req, res, next));
authRouter.post('/refresh', (req, res, next) => controller.refresh(req, res, next));
authRouter.post('/logout', (req, res, next) => controller.logout(req, res, next));
authRouter.get('/me', authMiddleware, (req, res, next) => controller.me(req, res, next));
authRouter.put('/me', authMiddleware, validateRequest(updateCurrentUserProfileSchema), (req, res, next) => controller.updateMe(req, res, next));
authRouter.post('/change-password', authMiddleware, validateRequest(changePasswordSchema), (req, res, next) => controller.changePassword(req, res, next));

export { authRouter };
