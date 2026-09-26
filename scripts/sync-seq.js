const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const max = await prisma.chamado.aggregate({ _max: { numero: true } });
  console.log('Max numero atual:', max._max.numero);
  const nextVal = (max._max.numero || 0);
  await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('chamados', 'numero'), ${nextVal});`);
  console.log('Sequence chamados_numero_seq sincronizada com sucesso para:', nextVal);
  await prisma.$disconnect();
}

main().catch(console.error);
