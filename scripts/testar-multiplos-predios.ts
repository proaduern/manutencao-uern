import prisma from '../src/lib/prisma';

async function main() {
  console.log('--- TESTE: MÚLTIPLOS PRÉDIOS POR UNIDADE DEMANDANTE ---');

  // 1. Verificar CAMPUS ASSU
  const assu = await prisma.unidade.findFirst({
    where: {
      OR: [{ sigla: 'CAMPUS-ASSU' }, { nome: 'CAMPUS ASSU' }],
    },
    include: {
      predio: true,
      prediosVinculados: {
        include: { predio: true },
        orderBy: { principal: 'desc' },
      },
    },
  });

  if (!assu) {
    throw new Error('Unidade CAMPUS ASSU não encontrada!');
  }

  console.log(`\n1. Unidade: ${assu.nome} (${assu.sigla}) - Campus ${assu.campus}`);
  console.log(`   Prédio Principal: ${assu.predio?.nome || 'Nenhum'}`);
  console.log(`   Total de prédios vinculados: ${assu.prediosVinculados.length}`);
  assu.prediosVinculados.forEach((vp, i) => {
    console.log(`   [${i + 1}] ${vp.predio.nome} (ID: ${vp.predioId}) - Principal: ${vp.principal}`);
  });

  if (assu.prediosVinculados.length < 2) {
    throw new Error('CAMPUS ASSU deveria ter pelo menos 2 prédios vinculados (Sede I e Sede II)!');
  }

  // 2. Simular chamado direcionado para Sede I e Sede II
  const usuario = await prisma.usuario.findFirst();
  if (!usuario) throw new Error('Nenhum usuário encontrado no sistema');

  const tipoServico = await prisma.tipoServico.findFirst({ where: { ativo: true } });
  const tipoAmbiente = await prisma.tipoAmbiente.findFirst({ where: { ativo: true } });
  const frase = await prisma.fraseUrgencia.findFirst({ where: { ativo: true } });

  const predioSede1 = assu.prediosVinculados[0].predioId;
  const predioSede2 = assu.prediosVinculados[1].predioId;

  const chamado1 = await prisma.chamado.create({
    data: {
      unidadeId: assu.id,
      predioId: predioSede1,
      tipoServicoId: tipoServico!.id,
      tipoAmbienteId: tipoAmbiente!.id,
      fraseUrgenciaId: frase!.id,
      setorEspecifico: 'Bloco A, Sala dos Professores',
      descricao: 'Teste automatizado de vinculação Sede I Assu',
      nivelCodigo: frase!.nivelCodigo,
      nivelOrdem: frase!.nivelSugerido,
      status: 'ABERTO',
      abertoPorId: usuario.id,
      abertoEm: new Date(),
    },
    include: {
      predio: true,
      unidade: true,
    },
  });

  const chamado2 = await prisma.chamado.create({
    data: {
      unidadeId: assu.id,
      predioId: predioSede2,
      tipoServicoId: tipoServico!.id,
      tipoAmbienteId: tipoAmbiente!.id,
      fraseUrgenciaId: frase!.id,
      setorEspecifico: 'Laboratório de Informática',
      descricao: 'Teste automatizado de vinculação Sede II Assu',
      nivelCodigo: frase!.nivelCodigo,
      nivelOrdem: frase!.nivelSugerido,
      status: 'ABERTO',
      abertoPorId: usuario.id,
      abertoEm: new Date(),
    },
    include: {
      predio: true,
      unidade: true,
    },
  });

  console.log(`\n2. Chamados criados com sucesso:`);
  console.log(`   Chamado #${chamado1.numero}: Unidade ${chamado1.unidade.sigla} -> Prédio ${chamado1.predio?.nome}`);
  console.log(`   Chamado #${chamado2.numero}: Unidade ${chamado2.unidade.sigla} -> Prédio ${chamado2.predio?.nome}`);

  // Limpeza dos chamados de teste
  await prisma.chamado.deleteMany({
    where: { id: { in: [chamado1.id, chamado2.id] } },
  });
  console.log(`   (Chamados de teste limpos após validação)`);

  console.log('\n--- TESTE CONCLUÍDO COM SUCESSO 100% ---');
}

main()
  .catch((e) => {
    console.error('Falha no teste:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
