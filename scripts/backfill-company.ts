import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  // Cria empresa padrão se não existir
  const defaultName = process.env.DEFAULT_COMPANY_NAME || 'Default Company';
  let company = await prisma.company.findFirst({ where: { name: defaultName } });
  if (!company) {
    company = await prisma.company.create({ data: { name: defaultName } });
    console.log('Empresa padrão criada:', company);
  } else {
    console.log('Empresa padrão existente:', company.id);
  }

  // Vincula usuários sem companyId e que não são superadmin
  const users = await prisma.user.findMany({ where: { companyId: null, isSuperAdmin: false } });
  for (const u of users) {
    await prisma.user.update({ where: { id: u.id }, data: { companyId: company.id } });
  }
  console.log(`Usuários vinculados: ${users.length}`);

  // Propaga companyId para entidades sem companyId
  const leads = await prisma.lead.updateMany({ where: { companyId: null }, data: { companyId: company.id } });
  console.log('Leads atualizados:', leads.count);
  const sellers = await prisma.seller.updateMany({ where: { companyId: null }, data: { companyId: company.id } });
  console.log('Sellers atualizados:', sellers.count);
  const routes = await prisma.routes.updateMany({ where: { companyId: null }, data: { companyId: company.id } });
  console.log('Routes atualizados:', routes.count);
  const visits = await prisma.routeVisit.updateMany({ where: { companyId: null }, data: { companyId: company.id } });
  console.log('RouteVisits atualizados:', visits.count);
}

run()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });


