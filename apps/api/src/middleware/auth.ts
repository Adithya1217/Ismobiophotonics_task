import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { HttpError } from '../errors';

declare global { namespace Express { interface Request { userId: string } } }

export const COOKIE = 'tf_token';
const secret = () => {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET is not set');
  return s;
};

export const signToken = (userId: string) =>
  jwt.sign({ sub: userId }, secret(), { algorithm: 'HS256', expiresIn: '24h' });

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : req.cookies?.[COOKIE];
  if (!token) return next(new HttpError(401, 'UNAUTHORIZED', 'Please log in'));
  try {
    const payload = jwt.verify(token, secret(), { algorithms: ['HS256'] });
    req.userId = payload.sub as string;
    next();
  } catch (e) {
    const expired = e instanceof jwt.TokenExpiredError;
    next(new HttpError(401, expired ? 'TOKEN_EXPIRED' : 'UNAUTHORIZED',
      expired ? 'Your session expired. Please log in again.' : 'Please log in'));
  }
}
