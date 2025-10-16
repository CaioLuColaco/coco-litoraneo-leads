import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  const email = process.argv[2];
  const companyName = process.argv[3] || process.env.DEFAULT_COMPANY_NAME || 'Default Company';
  if (!email) throw new Error('Uso: ts-node scripts/fix-master-company.ts <email> [companyName]');

  const company = await prisma.company.findFirst({ where: { name: companyName } });
  if (!company) throw new Error('Empresa alvo não encontrada');

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) throw new Error('Usuário não encontrado');

  if (user.companyId === company.id) {
    console.log('Usuário já vinculado à empresa', company.id);
    return;
  }

  const updated = await prisma.user.update({ where: { id: user.id }, data: { companyId: company.id } });
  console.log('Vinculado usuário', updated.email, 'à empresa', company.name, company.id);
}

run().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1)});


