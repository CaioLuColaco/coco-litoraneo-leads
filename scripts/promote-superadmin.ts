import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  const email = process.argv[2];
  if (!email) throw new Error('Uso: ts-node scripts/promote-superadmin.ts <email>');
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) throw new Error('Usuário não encontrado');
  const updated = await prisma.user.update({ where: { id: user.id }, data: { isSuperAdmin: true } });
  console.log('Promovido a Super Admin:', { id: updated.id, email: updated.email });
}

run().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });


