import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { loginSchema, registerSchema } from '@taskflow/shared';
import { prisma } from '../db';
import { HttpError, wrap } from '../errors';
import { COOKIE, requireAuth, signToken } from '../middleware/auth';

export const authRouter = Router();

authRouter.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: process.env.NODE_ENV === 'test' ? 10_000 : 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many attempts. Try again in a few minutes.' } },
}));

const publicUser = { id: true, name: true, email: true } as const;
const cookieOpts = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 24 * 60 * 60 * 1000,
};

authRouter.post('/register', wrap(async (req, res) => {
  const { name, email, password } = registerSchema.parse(req.body);
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ data: { name, email, passwordHash }, select: publicUser });
  const token = signToken(user.id);
  res.cookie(COOKIE, token, cookieOpts).status(201).json({ user, token });
}));

authRouter.post('/login', wrap(async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  const found = await prisma.user.findUnique({ where: { email } });
  const ok = found && (await bcrypt.compare(password, found.passwordHash));
  if (!found || !ok) throw new HttpError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect');
  const token = signToken(found.id);
  const user = { id: found.id, name: found.name, email: found.email };
  res.cookie(COOKIE, token, cookieOpts).json({ user, token });
}));

authRouter.post('/logout', (_req, res) => {
  res.clearCookie(COOKIE, { ...cookieOpts, maxAge: undefined }).json({ ok: true });
});

authRouter.get('/me', requireAuth, wrap(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId }, select: publicUser });
  if (!user) throw new HttpError(401, 'UNAUTHORIZED', 'Please log in');
  res.json({ user });
}));
