import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  const defaultName = process.env.DEFAULT_COMPANY_NAME || 'Default Company';
  const company = await prisma.company.findFirst({ where: { name: defaultName } });
  if (!company) {
    throw new Error('Empresa padrão não encontrada. Execute o backfill primeiro.');
  }

  // Roles padrão
  const roles = [
    { name: 'MASTER', scopes: ['commercial.*', 'finance.*'] },
    { name: 'COMMERCIAL', scopes: ['commercial.*'] },
  ];

  for (const r of roles) {
    let role = await prisma.role.findFirst({ where: { companyId: company.id, name: r.name } });
    if (!role) {
      role = await prisma.role.create({ data: { companyId: company.id, name: r.name, scopes: r.scopes } });
      console.log('Role criada:', r.name);
    }
  }

  const master = await prisma.role.findFirst({ where: { companyId: company.id, name: 'MASTER' } });
  if (master) {
    const users = await prisma.user.findMany({ where: { companyId: company.id } });
    for (const u of users) {
      const exists = await prisma.userRole.findFirst({ where: { userId: u.id, roleId: master.id } });
      if (!exists) {
        await prisma.userRole.create({ data: { userId: u.id, roleId: master.id } });
        console.log('MASTER atribuído a usuário:', u.email);
      }
    }
  }
}

run()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
