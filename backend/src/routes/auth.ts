import { Router } from 'express';
import { register, login, googleSignIn, resetPassword } from '../controllers/authController';
import { setFirstAdmin } from '../controllers/adminController';

export const authRouter = Router();

authRouter.post('/register', register);
authRouter.post('/login', login);
authRouter.post('/google', googleSignIn);
authRouter.post('/reset-password', resetPassword);
// Public endpoint to set first admin (only works when no admin exists)
authRouter.post('/setup-admin', setFirstAdmin);
