import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.user.deleteMany({ where: { email: { in: ['demo@taskflow.test', 'other@taskflow.test'] } } });
  const passwordHash = await bcrypt.hash('Password123!', 10); // test data only
  const demo = await prisma.user.create({ data: { name: 'Demo User', email: 'demo@taskflow.test', passwordHash } });
  await prisma.user.create({ data: { name: 'Other User', email: 'other@taskflow.test', passwordHash } });

  const d = (n: number) => new Date(Date.now() + n * 86400000);
  const mk = (name: string, description: string, status: any, tasks: [string, any, any, number?][]) =>
    prisma.project.create({
      data: {
        name, description, status, userId: demo.id,
        tasks: { create: tasks.map(([n, priority, st, due]) => ({ name: n, priority, status: st, dueDate: due ? d(due) : null })) },
      },
    });

  await mk('Website Redesign', 'Refresh the marketing site', 'IN_PROGRESS', [
    ['Draft new homepage copy', 'HIGH', 'IN_PROGRESS', 3],
    ['Pick colour palette', 'MEDIUM', 'COMPLETED'],
    ['Build pricing page', 'MEDIUM', 'PENDING', 10],
    ['Fix mobile nav', 'LOW', 'PENDING'],
  ]);
  await mk('Mobile App Launch', 'Ship v1 to Android', 'IN_PROGRESS', [
    ['Set up Expo project', 'HIGH', 'COMPLETED'],
    ['Wire login screen', 'HIGH', 'COMPLETED'],
    ['Write store listing', 'LOW', 'PENDING', 14],
    ['Run QA pass', 'HIGH', 'IN_PROGRESS', 7],
  ]);
  await mk('Q4 Planning', 'Roadmap and budget', 'NOT_STARTED', [
    ['Collect team input', 'MEDIUM', 'PENDING', 5],
    ['Draft budget', 'HIGH', 'PENDING', 12],
    ['Review with leadership', 'MEDIUM', 'PENDING', 20],
  ]);
  await mk('Onboarding Docs', 'Handbook for new hires', 'COMPLETED', [
    ['Write setup guide', 'MEDIUM', 'COMPLETED'],
    ['Record walkthrough video', 'LOW', 'COMPLETED'],
  ]);
  console.log('Seeded. Login: demo@taskflow.test / Password123!');
}

main().finally(() => prisma.$disconnect());
