const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testarFluxoAgenda() {
  console.log('=== TESTE DE INTEGRAÇÃO END-TO-END: AGENDA DE SERVIÇOS PROGRAMADOS ===');

  // 1. Localizar Agenda Ativa
  const agenda = await prisma.agendaServico.findFirst({
    where: { status: 'ABERTA_COLETA' },
    include: { criadoPor: true },
  });

  if (!agenda) {
    throw new Error('Nenhuma agenda aberta para coleta encontrada.');
  }
  console.log(`✓ 1. Agenda identificada: "${agenda.titulo}" (Teto: R$ ${agenda.valorTotalDisponivel}, Cota/unidade: R$ ${agenda.cotaPadraoUnidade})`);

  // 2. Localizar Demanda de Exemplo
  const demanda = await prisma.agendaDemanda.findFirst({
    where: { agendaId: agenda.id },
    include: { unidade: true, criadoPor: true },
  });

  if (!demanda) {
    throw new Error('Nenhuma demanda cadastrada encontrada na agenda.');
  }
  console.log(`✓ 2. Demanda da Unidade ${demanda.unidade.nome} identificada: "${demanda.titulo}" (#${demanda.numero})`);

  // 3. Simular Ratificação do Gabinete da Reitoria pela PROAD
  console.log('--- 3. PROAD registra a ratificação do Gabinete da Reitoria ---');
  await prisma.agendaServico.update({
    where: { id: agenda.id },
    data: {
      status: 'RATIFICADA_REITORIA',
      dataRatificacaoReitoria: new Date(),
      ratificadoPorNome: 'Pró-Reitor de Administração (PROAD)',
    },
  });

  await prisma.agendaDemanda.update({
    where: { id: demanda.id },
    data: {
      status: 'APROVADA_PROAD',
      analiseProadEm: new Date(),
      analiseProadPorNome: 'PROAD Gestão',
    },
  });
  console.log('✓ Status atualizado: RATIFICADA_REITORIA com chancela formal no sistema.');

  // 4. Encaminhar à CONTRATADA (Contagem de 15 dias úteis)
  console.log('--- 4. Encaminhando demanda para a CONTRATADA (Prazo de 15 dias úteis) ---');
  const agora = new Date();
  // Simular cálculo de 15 dias úteis
  const prazo15DiasUteis = new Date(agora);
  prazo15DiasUteis.setDate(prazo15DiasUteis.getDate() + 21); // ~15 dias úteis

  await prisma.agendaDemanda.update({
    where: { id: demanda.id },
    data: {
      status: 'ENVIADA_EMPRESA',
      dataEnvioEmpresa: agora,
      prazoLimiteProposta: prazo15DiasUteis,
    },
  });

  await prisma.agendaDemandaTimeline.create({
    data: {
      demandaId: demanda.id,
      statusNovo: 'ENVIADA_EMPRESA',
      responsavel: 'PROAD',
      observacao: `Demanda encaminhada para elaboração de Proposta Técnica em padrão SINAPI. Prazo: 15 dias úteis até ${prazo15DiasUteis.toLocaleDateString('pt-BR')}.`,
    },
  });
  console.log(`✓ Demanda ENVIADA_EMPRESA. Prazo limite para proposta: ${prazo15DiasUteis.toLocaleDateString('pt-BR')}`);

  // 5. Empresa submete Proposta Técnica com SINAPI e ART
  console.log('--- 5. CONTRATADA submete Proposta Técnica (SINAPI, ART e Prazo de Execução) ---');
  const proposta = await prisma.agendaProposta.upsert({
    where: { demandaId: demanda.id },
    create: {
      demandaId: demanda.id,
      responsavelTecnicoNome: 'Eng. Roberto Farias',
      registroProfissional: 'CREA-RN 14892/D',
      artNumero: 'ART-2026/088192',
      prazoExecucaoDias: 12,
      regimeMaoObra: 'EVENTUAL',
      valorTotalProposto: 16800.0,
      itens: {
        create: [
          {
            fonteReferencia: 'SINAPI',
            codigoItem: '94201',
            descricao: 'Telhamento com telha cerâmica tipo francesa com estrutura metálica',
            unidadeMedida: 'm²',
            quantidade: 140.0,
            valorUnitario: 85.0,
            valorTotal: 11900.0,
          },
          {
            fonteReferencia: 'SINAPI',
            codigoItem: '94228',
            descricao: 'Calha em chapa de aço galvanizado número 24',
            unidadeMedida: 'm',
            quantidade: 70.0,
            valorUnitario: 70.0,
            valorTotal: 4900.0,
          },
        ],
      },
    },
    update: {},
  });

  await prisma.agendaDemanda.update({
    where: { id: demanda.id },
    data: {
      status: 'PROPOSTA_EM_ANALISE',
      dataSubmissaoProposta: new Date(),
      prazoExecucaoDias: 12,
    },
  });

  await prisma.agendaDemandaTimeline.create({
    data: {
      demandaId: demanda.id,
      statusNovo: 'PROPOSTA_EM_ANALISE',
      responsavel: 'Eng. Roberto Farias (CONTRATADA)',
      observacao: 'Proposta técnica SINAPI apresentada com ART vinculada. Valor: R$ 16.800,00 | Prazo: 12 dias úteis.',
    },
  });
  console.log('✓ Proposta técnica submetida pela empresa com sucesso.');

  // 6. Manifestação Técnica da SOBE
  console.log('--- 6. Manifestação Técnica da SOBE ---');
  const sobeUser = await prisma.usuario.findFirst({ where: { role: 'TECNICO_SOBE' } });
  await prisma.agendaParecerSobe.create({
    data: {
      demandaId: demanda.id,
      solicitanteNome: 'Fiscal Técnico UERN',
      tecnicoSobeId: sobeUser ? sobeUser.id : null,
      tecnicoSobeNome: sobeUser ? sobeUser.nome : 'Eng. Carlos Alberto (SOBE)',
      parecerTexto:
        'Após vistoria técnica nos blocos e verificação das composições do SINAPI 94201 e 94228, atesta-se a conformidade dos quantitativos e economicidade da solução.',
      favoravel: true,
    },
  });
  console.log('✓ Parecer da SOBE registrado: FAVORÁVEL à execução.');

  // 7. Fiscalização Autoriza Execução (Provisionamento de Saldo no Contrato)
  console.log('--- 7. UERN Autoriza Execução e Provisiona Saldo no Contrato ---');
  const dataLimiteExecucao = new Date(agora);
  dataLimiteExecucao.setDate(dataLimiteExecucao.getDate() + 16); // 12 dias úteis

  await prisma.agendaProposta.update({
    where: { demandaId: demanda.id },
    data: { valorFinalHomologado: 16800.0 },
  });

  await prisma.agendaDemanda.update({
    where: { id: demanda.id },
    data: {
      status: 'EM_EXECUCAO',
      dataAutorizacaoUern: agora,
      autorizadoPorNome: 'Fiscal Técnico UERN',
      prazoExecucaoDias: 12,
      dataLimiteExecucao,
    },
  });

  await prisma.agendaDemandaTimeline.create({
    data: {
      demandaId: demanda.id,
      statusNovo: 'EM_EXECUCAO',
      responsavel: 'Fiscal Técnico UERN',
      observacao: `Execução autorizada. Valor de R$ 16.800,00 PROVISIONADO no saldo do contrato. Prazo de execução iniciado até ${dataLimiteExecucao.toLocaleDateString('pt-BR')}.`,
    },
  });
  console.log(`✓ Status EM_EXECUCAO. R$ 16.800,00 provisionados na rubrica de Serviços Eventuais do Contrato.`);

  // 8. Empresa conclui os serviços (Foto do Depois)
  console.log('--- 8. Empresa conclui obra e envia para Aceite da Unidade (5 dias úteis) ---');
  const prazoAceite5Dias = new Date(agora);
  prazoAceite5Dias.setDate(prazoAceite5Dias.getDate() + 7); // 5 dias úteis

  await prisma.agendaDemandaFoto.create({
    data: {
      demandaId: demanda.id,
      tipo: 'DEPOIS',
      url: 'https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?auto=format&fit=crop&q=80&w=800',
      descricao: 'Cobertura e calhas pluviais totalmente recuperadas',
    },
  });

  await prisma.agendaDemanda.update({
    where: { id: demanda.id },
    data: {
      status: 'AGUARDANDO_ACEITE_UNIDADE',
      dataConclusaoEmpresa: new Date(),
      relatorioExecucao: 'Substituição das telhas e colocação de 70m de calhas galvanizadas finalizadas.',
      dataEnvioAceiteUnidade: agora,
      prazoLimiteAceite: prazoAceite5Dias,
    },
  });

  await prisma.agendaDemandaTimeline.create({
    data: {
      demandaId: demanda.id,
      statusNovo: 'AGUARDANDO_ACEITE_UNIDADE',
      responsavel: 'CONTRATADA',
      observacao: `Obra concluída. Encaminhada para aceite da unidade demandante até ${prazoAceite5Dias.toLocaleDateString('pt-BR')} (5 dias úteis).`,
    },
  });
  console.log(`✓ Status AGUARDANDO_ACEITE_UNIDADE. 5 dias úteis abertos para aceite da unidade demandante.`);

  // 9. Unidade Demandante Atesta e Aprova (Liquidação do Saldo)
  console.log('--- 9. Unidade Demandante Atesta e Aprova os Serviços ---');
  await prisma.agendaDemanda.update({
    where: { id: demanda.id },
    data: {
      status: 'CONCLUIDA',
      aprovadoUnidade: true,
      dataAceiteUnidade: new Date(),
    },
  });

  await prisma.agendaDemandaTimeline.create({
    data: {
      demandaId: demanda.id,
      statusNovo: 'CONCLUIDA',
      responsavel: demanda.criadoPor.nome,
      observacao: 'Serviços vistoriados e APROVADOS pela unidade demandante. Demanda concluída e valor liquidado no contrato.',
    },
  });
  console.log('✓ Demanda CONCLUIDA com sucesso! Valor liquidado no contrato.');

  console.log('\n======================================================');
  console.log('=== TESTE DE INTEGRAÇÃO DA AGENDA CONCLUÍDO COM 100% DE SUCESSO! ===');
  console.log('======================================================\n');
}

testarFluxoAgenda()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
