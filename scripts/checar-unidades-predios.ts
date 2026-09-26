import prisma from '../src/lib/prisma';

async function main() {
  const countVinculos = await prisma.unidadePredio.count();
  const countUnidades = await prisma.unidade.count();
  const countPredios = await prisma.cidadePredio.count();

  console.log(`Total de Unidades: ${countUnidades}`);
  console.log(`Total de Prédios: ${countPredios}`);
  const admins = await prisma.usuario.findMany({ where: { role: 'ADMIN' } });
  console.log('Admins no banco:', admins.map(a => ({ email: a.email, role: a.role, deveTrocarSenha: a.deveTrocarSenha, ativo: a.ativo })));

  const assu = await prisma.unidade.findFirst({
    where: { sigla: 'CAMPUS-ASSU' },
    include: {
      predio: true,
      prediosVinculados: { include: { predio: true } },
    },
  });

  console.log('\n--- DADOS DA UNIDADE CAMPUS ASSU ---');
  console.log(`Nome: ${assu?.nome} | Sigla: ${assu?.sigla}`);
  console.log(`Prédio direto (predioId): ${assu?.predio?.nome || 'Nenhum'}`);
  console.log(`Prédios Vinculados (unidade_predios):`);
  assu?.prediosVinculados.forEach((pv) => {
    console.log(` - ID: ${pv.predioId} | Nome: ${pv.predio.nome} | Principal: ${pv.principal}`);
  });

  console.log('\n--- AMOSTRA DE OUTRAS UNIDADES E SEUS VÍNCULOS ---');
  const outras = await prisma.unidade.findMany({
    take: 5,
    include: {
      predio: true,
      prediosVinculados: { include: { predio: true } },
    },
  });
  outras.forEach((u) => {
    console.log(`\nUnidade: ${u.nome} (${u.campus})`);
    console.log(`  predioId: ${u.predio?.nome || 'Nenhum'}`);
    console.log(`  prediosVinculados (${u.prediosVinculados.length}): ${u.prediosVinculados.map((p) => `${p.predio.nome} (Principal: ${p.principal})`).join(', ') || 'Nenhum'}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
