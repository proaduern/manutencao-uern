import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- SINCRONIZANDO VÍNCULOS N:N DE UNIDADES E PRÉDIOS ---');

  // 1. Buscar todos os prédios
  const predios = await prisma.cidadePredio.findMany();
  const mapaPrediosPorNome = new Map<string, string>();
  for (const p of predios) {
    mapaPrediosPorNome.set(p.nome, p.id);
  }

  // 2. Buscar todas as unidades
  const unidades = await prisma.unidade.findMany();

  let totalMigrados = 0;
  for (const u of unidades) {
    if (u.predioId) {
      await prisma.unidadePredio.upsert({
        where: { unidadeId_predioId: { unidadeId: u.id, predioId: u.predioId } },
        update: { principal: true },
        create: { unidadeId: u.id, predioId: u.predioId, principal: true },
      });
      totalMigrados++;
    }
  }

  console.log(`✅ ${totalMigrados} vínculos existentes migrados para unidades_predios.`);

  // 3. Vincular expressamente os dois prédios ao CAMPUS ASSU: Sede I e Sede II
  const unidadeAssu = await prisma.unidade.findFirst({
    where: {
      OR: [
        { sigla: 'CAMPUS-ASSU' },
        { nome: { contains: 'ASSU', mode: 'insensitive' } },
      ],
    },
  });

  const predioAssuSede1 = await prisma.cidadePredio.findFirst({
    where: { nome: { contains: 'Sede I', mode: 'insensitive' }, campus: { contains: 'Assu', mode: 'insensitive' } },
  });

  const predioAssuSede2 = await prisma.cidadePredio.findFirst({
    where: { nome: { contains: 'Sede II', mode: 'insensitive' }, campus: { contains: 'Assu', mode: 'insensitive' } },
  });

  if (unidadeAssu && predioAssuSede1 && predioAssuSede2) {
    await prisma.unidadePredio.upsert({
      where: { unidadeId_predioId: { unidadeId: unidadeAssu.id, predioId: predioAssuSede1.id } },
      update: { principal: true },
      create: { unidadeId: unidadeAssu.id, predioId: predioAssuSede1.id, principal: true },
    });

    await prisma.unidadePredio.upsert({
      where: { unidadeId_predioId: { unidadeId: unidadeAssu.id, predioId: predioAssuSede2.id } },
      update: { principal: false },
      create: { unidadeId: unidadeAssu.id, predioId: predioAssuSede2.id, principal: false },
    });

    console.log(`✅ Unidade "${unidadeAssu.nome}" agora possui dois prédios vinculados:`);
    console.log(`   - ${predioAssuSede1.nome} (Principal)`);
    console.log(`   - ${predioAssuSede2.nome}`);
  } else {
    console.warn('⚠️ Não foi possível localizar unidade Assu ou prédios Sede I / Sede II:', {
      unidadeAssu: !!unidadeAssu,
      predioAssuSede1: !!predioAssuSede1,
      predioAssuSede2: !!predioAssuSede2,
    });
  }

  // 4. Conferir também se há Caicó Sede I e Caicó Clínicas para vincular a Campus Caicó se couber
  const unidadeCaico = await prisma.unidade.findFirst({
    where: { sigla: 'CAMPUS-CAICO' },
  });
  const predioCaicoSede1 = await prisma.cidadePredio.findFirst({
    where: { nome: { contains: 'Caicó - Sede I', mode: 'insensitive' } },
  });
  if (unidadeCaico && predioCaicoSede1) {
    await prisma.unidadePredio.upsert({
      where: { unidadeId_predioId: { unidadeId: unidadeCaico.id, predioId: predioCaicoSede1.id } },
      update: { principal: true },
      create: { unidadeId: unidadeCaico.id, predioId: predioCaicoSede1.id, principal: true },
    });
  }

  console.log('\n--- SINCRONIZAÇÃO CONCLUÍDA COM SUCESSO ---');
}

main()
  .catch((e) => {
    console.error('Erro na sincronização:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
