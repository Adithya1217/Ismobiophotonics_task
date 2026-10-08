import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

export class HttpError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}
export const notFound = () => new HttpError(404, 'NOT_FOUND', 'Not found');

// Wraps async handlers so rejections reach the error middleware.
export const wrap = (fn: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req, res).catch(next);

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    const details = err.flatten().fieldErrors as Record<string, string[]>;
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Check the highlighted fields', details } });
  }
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message } });
  }
  if ((err as any)?.code === 'P2002') {
    return res.status(409).json({ error: { code: 'EMAIL_TAKEN', message: 'That email is already registered' } });
  }
  if ((err as any)?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'BAD_JSON', message: 'Invalid JSON body' } });
  }
  console.error(err); // server-side only; never sent to the client
  res.status(500).json({ error: { code: 'INTERNAL', message: 'Something went wrong on our side' } });
}
