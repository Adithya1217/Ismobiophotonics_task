import request from 'supertest';
import jwt from 'jsonwebtoken';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { app } from '../src/app';
import { prisma } from '../src/db';

const run = Date.now();
const A = { name: 'Alice', email: `alice${run}@test.dev`, password: 'Password123!' };
const B = { name: 'Bob', email: `bob${run}@test.dev`, password: 'Password123!' };
let tokenA = '', tokenB = '', projectId = '', taskId = '';
const authA = () => ({ Authorization: `Bearer ${tokenA}` });
const authB = () => ({ Authorization: `Bearer ${tokenB}` });

beforeAll(async () => {
  tokenA = (await request(app).post('/api/auth/register').send(A)).body.token;
  tokenB = (await request(app).post('/api/auth/register').send(B)).body.token;
});
afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { in: [A.email, B.email] } } });
  await prisma.$disconnect();
});

describe('auth', () => {
  it('rejects duplicate email', async () => {
    const r = await request(app).post('/api/auth/register').send(A);
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe('EMAIL_TAKEN');
  });
  it('rejects invalid email and short password', async () => {
    const r = await request(app).post('/api/auth/register').send({ name: 'X', email: 'nope', password: 'short' });
    expect(r.status).toBe(400);
    expect(r.body.error.details).toHaveProperty('email');
    expect(r.body.error.details).toHaveProperty('password');
  });
  it('hashes passwords and never returns them', async () => {
    const row = await prisma.user.findUnique({ where: { email: A.email } });
    expect(row!.passwordHash).not.toBe(A.password);
    expect(row!.passwordHash.startsWith('$2')).toBe(true);
    const me = await request(app).get('/api/auth/me').set(authA());
    expect(me.body.user.email).toBe(A.email);
    expect(JSON.stringify(me.body)).not.toContain('passwordHash');
  });
  it('logs in, rejects bad credentials, logs out', async () => {
    expect((await request(app).post('/api/auth/login').send(A)).status).toBe(200);
    const bad = await request(app).post('/api/auth/login').send({ ...A, password: 'wrong-pass' });
    expect(bad.status).toBe(401);
    const out = await request(app).post('/api/auth/logout');
    expect(out.status).toBe(200);
    expect(out.headers['set-cookie'][0]).toMatch(/tf_token=;/);
  });
  it('protects routes and reports expired tokens', async () => {
    expect((await request(app).get('/api/projects')).status).toBe(401);
    const me = await prisma.user.findUnique({ where: { email: A.email } });
    const expired = jwt.sign({ sub: me!.id }, 'test-secret', { expiresIn: -10 });
    const r = await request(app).get('/api/projects').set('Authorization', `Bearer ${expired}`);
    expect(r.status).toBe(401);
    expect(r.body.error.code).toBe('TOKEN_EXPIRED');
  });
});

describe('projects and tasks', () => {
  it('creates, lists, filters and searches projects', async () => {
    const p1 = await request(app).post('/api/projects').set(authA()).send({ name: 'Alpha Site', status: 'IN_PROGRESS' });
    expect(p1.status).toBe(201);
    projectId = p1.body.project.id;
    await request(app).post('/api/projects').set(authA()).send({ name: 'Beta App' });
    expect((await request(app).get('/api/projects').set(authA())).body.projects).toHaveLength(2);
    expect((await request(app).get('/api/projects?search=alpha').set(authA())).body.projects).toHaveLength(1);
    expect((await request(app).get('/api/projects?status=NOT_STARTED').set(authA())).body.projects).toHaveLength(1);
    expect((await request(app).post('/api/projects').set(authA()).send({ name: '' })).status).toBe(400);
  });
  it('task CRUD with search, status and priority filters', async () => {
    const mk = (name: string, priority: string, status: string) =>
      request(app).post(`/api/projects/${projectId}/tasks`).set(authA()).send({ name, priority, status });
    const t = await mk('Write copy', 'HIGH', 'PENDING');
    expect(t.status).toBe(201);
    taskId = t.body.task.id;
    await mk('Fix nav', 'LOW', 'COMPLETED');
    const list = (q: string) => request(app).get(`/api/projects/${projectId}/tasks${q}`).set(authA());
    expect((await list('')).body.tasks).toHaveLength(2);
    expect((await list('?search=copy')).body.tasks).toHaveLength(1);
    expect((await list('?status=COMPLETED')).body.tasks).toHaveLength(1);
    expect((await list('?priority=HIGH')).body.tasks).toHaveLength(1);
    const up = await request(app).put(`/api/tasks/${taskId}`).set(authA()).send({ name: 'Write copy v2', priority: 'HIGH', status: 'IN_PROGRESS' });
    expect(up.body.task.status).toBe('IN_PROGRESS');
  });
  it('project dates are stored and validated; /api/tasks lists and creates', async () => {
    const ok = await request(app).post('/api/projects').set(authA()).send({ name: 'Dated', startDate: '2026-01-01T00:00:00.000Z', endDate: '2026-02-01T00:00:00.000Z' });
    expect(ok.status).toBe(201);
    expect(ok.body.project.startDate).toBe('2026-01-01T00:00:00.000Z');
    const bad = await request(app).post('/api/projects').set(authA()).send({ name: 'Bad', startDate: '2026-02-01T00:00:00.000Z', endDate: '2026-01-01T00:00:00.000Z' });
    expect(bad.status).toBe(400);
    expect((await request(app).post('/api/projects').set(authA()).send({ name: 'Bad', startDate: 'nope' })).status).toBe(400);
    await request(app).delete(`/api/projects/${ok.body.project.id}`).set(authA());

    const created = await request(app).post('/api/tasks').set(authA()).send({ projectId, name: 'Top-level task' });
    expect(created.status).toBe(201);
    expect((await request(app).get('/api/tasks?search=top-level').set(authA())).body.tasks).toHaveLength(1);
    expect((await request(app).get('/api/tasks').set(authB())).body.tasks).toHaveLength(0);
    expect((await request(app).post('/api/tasks').set(authB()).send({ projectId, name: 'Sneaky' })).status).toBe(404);
    await request(app).delete(`/api/tasks/${created.body.task.id}`).set(authA());
  });
  it('dashboard totals are correct and user-scoped', async () => {
    const a = await request(app).get('/api/dashboard').set(authA());
    expect(a.body).toEqual({ totalProjects: 2, totalTasks: 2, completedTasks: 1, pendingTasks: 0, inProgressProjects: 1 });
    const b = await request(app).get('/api/dashboard').set(authB());
    expect(b.body).toEqual({ totalProjects: 0, totalTasks: 0, completedTasks: 0, pendingTasks: 0, inProgressProjects: 0 });
  });
  it('second user gets 404 on first user data', async () => {
    const calls = [
      request(app).get(`/api/projects/${projectId}`).set(authB()),
      request(app).put(`/api/projects/${projectId}`).set(authB()).send({ name: 'Hacked' }),
      request(app).delete(`/api/projects/${projectId}`).set(authB()),
      request(app).get(`/api/projects/${projectId}/tasks`).set(authB()),
      request(app).post(`/api/projects/${projectId}/tasks`).set(authB()).send({ name: 'x' }),
      request(app).get(`/api/tasks/${taskId}`).set(authB()),
      request(app).put(`/api/tasks/${taskId}`).set(authB()).send({ name: 'Hacked' }),
      request(app).delete(`/api/tasks/${taskId}`).set(authB()),
    ];
    for (const r of await Promise.all(calls)) expect(r.status).toBe(404);
    expect((await request(app).get('/api/projects').set(authB())).body.projects).toHaveLength(0);
  });
  it('deletes task and project (cascade)', async () => {
    expect((await request(app).delete(`/api/tasks/${taskId}`).set(authA())).status).toBe(204);
    expect((await request(app).delete(`/api/projects/${projectId}`).set(authA())).status).toBe(204);
    expect((await request(app).get(`/api/projects/${projectId}`).set(authA())).status).toBe(404);
  });
});
