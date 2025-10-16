import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  const defaultName = process.env.DEFAULT_COMPANY_NAME || 'Default Company';
  let company = await prisma.company.findFirst({ where: { name: defaultName } });
  if (!company) {
    company = await prisma.company.create({ data: { name: defaultName } });
    console.log('Empresa padrão criada:', company.id);
  }

  const modules = [
    { key: 'COMMERCIAL', name: 'Comercial' },
    { key: 'FINANCE', name: 'Financeiro' },
  ];

  for (const m of modules) {
    let mod = await prisma.module.findUnique({ where: { key: m.key } });
    if (!mod) {
      mod = await prisma.module.create({ data: m });
      console.log('Módulo criado:', mod.key);
    }

    const exists = await prisma.companyModule.findUnique({
      where: { companyId_moduleId: { companyId: company.id, moduleId: mod.id } },
    });
    if (!exists) {
      await prisma.companyModule.create({ data: { companyId: company.id, moduleId: mod.id, active: true } });
      console.log(`Vinculado módulo ${m.key} à empresa ${company.name}`);
    }
  }
}

run()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
