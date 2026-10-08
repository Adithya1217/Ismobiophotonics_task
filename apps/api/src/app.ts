import 'dotenv/config';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import path from 'node:path';
import helmet from 'helmet';
import { errorHandler } from './errors';
import { authRouter } from './routes/auth';
import { dashboardRouter } from './routes/dashboard';
import { projectsRouter } from './routes/projects';
import { tasksRouter } from './routes/tasks';

export const app = express();
app.set('trust proxy', 1); // behind Render/Vercel proxies, so rate limiting sees real IPs
app.use(helmet({
  contentSecurityPolicy: { directives: {
    ...helmet.contentSecurityPolicy.getDefaultDirectives(),
    'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    'font-src': ["'self'", 'https://fonts.gstatic.com'],
  } },
}));
app.use(cors({ origin: (process.env.WEB_ORIGIN ?? '').split(',').filter(Boolean), credentials: true }));
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/dashboard', dashboardRouter);
// One-service deploy: serve the built web app (apps/web/dist) from the API when it exists.
const webDist = path.resolve(__dirname, '../../web/dist');
if (process.env.SERVE_WEB === 'true') {
  app.use(express.static(webDist));
  app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(path.join(webDist, 'index.html')));
}
app.use((_req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found' } }));
app.use(errorHandler);
