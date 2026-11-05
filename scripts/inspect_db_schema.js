const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const cols = await prisma.$queryRaw`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'funcionarios_empresas';
  `;
  console.log('Columns in funcionarios_empresas:', cols);

  await prisma.$disconnect();
}

main().catch(console.error);
