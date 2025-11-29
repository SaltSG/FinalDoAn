import { Router } from 'express';
import { register, login, googleSignIn, resetPassword } from '../controllers/authController';

export const authRouter = Router();

authRouter.post('/register', register);
authRouter.post('/login', login);
authRouter.post('/google', googleSignIn);
authRouter.post('/reset-password', resetPassword);
