import prisma from '../src/lib/prisma';
import bcrypt from 'bcryptjs';

async function main() {
  console.log('--- Populando Agenda de Demonstração e Usuário SOBE ---');

  // 1. Criar ou verificar usuário da SOBE
  const senhaHash = await bcrypt.hash('uern1234', 10);
  let sobeUser = await prisma.usuario.findUnique({
    where: { email: 'sobe@uern.br' },
  });

  if (!sobeUser) {
    sobeUser = await prisma.usuario.create({
      data: {
        nome: 'Eng. Carlos Alberto (SOBE)',
        email: 'sobe@uern.br',
        senhaHash,
        role: 'TECNICO_SOBE',
        matricula: 'SOBE-2026-01',
        ativo: true,
        deveTrocarSenha: false,
      },
    });
    console.log('✓ Usuário SOBE criado: sobe@uern.br / uern1234');
  } else {
    console.log('✓ Usuário SOBE já existente:', sobeUser.email);
  }

  // 2. Localizar usuário PROAD / Admin
  const adminUser = await prisma.usuario.findFirst({
    where: { role: { in: ['ADMIN', 'GESTOR_CONTRATO'] } },
  });

  if (!adminUser) {
    console.log('Nenhum admin encontrado.');
    return;
  }

  // 3. Criar ou localizar a Agenda Ativa Setembro-Outubro 2026
  let agenda = await prisma.agendaServico.findFirst({
    where: { titulo: { contains: 'Setembro/Outubro 2026' } },
  });

  if (!agenda) {
    const hoje = new Date();
    const inicio = new Date(hoje.getFullYear(), 8, 1); // 01/Setembro
    const fim = new Date(hoje.getFullYear(), 9, 31); // 31/Outubro

    agenda = await prisma.agendaServico.create({
      data: {
        titulo: 'Agenda de Serviços Programados - Setembro/Outubro 2026',
        descricao:
          'Ciclo oficial aberto pela PROAD para coleta e execução programada de serviços eventuais de maior vulto nos campi e unidades acadêmicas da UERN.',
        anoReferencia: hoje.getFullYear(),
        periodoInicioColeta: inicio,
        periodoFimColeta: fim,
        valorTotalDisponivel: 150000.0,
        cotaPadraoUnidade: 25000.0,
        maxDemandasPadrao: 2,
        status: 'ABERTA_COLETA',
        criadoPorId: adminUser.id,
      },
    });
    console.log('✓ Agenda criada com sucesso:', agenda.titulo);
  } else {
    console.log('✓ Agenda já existente:', agenda.titulo);
  }

  // 4. Cadastrar uma demanda de exemplo para CAMPUS ASSU
  const unidadeAssu = await prisma.unidade.findFirst({
    where: { sigla: { contains: 'ASSU' } },
  });

  const demandanteAssu = await prisma.usuario.findFirst({
    where: {
      unidadeId: unidadeAssu?.id,
      role: { in: ['DEMANDANTE', 'GESTOR_UNIDADE'] },
    },
  });

  if (unidadeAssu && demandanteAssu) {
    const demandaExistente = await prisma.agendaDemanda.findFirst({
      where: {
        agendaId: agenda.id,
        unidadeId: unidadeAssu.id,
      },
    });

    if (!demandaExistente) {
      const predioAssu = await prisma.cidadePredio.findFirst({
        where: { nome: { contains: 'Assu' } },
      });
      const sublocalAssu = await prisma.sublocal.findFirst({
        where: { unidadeId: unidadeAssu.id },
      });

      const dem = await prisma.agendaDemanda.create({
        data: {
          agendaId: agenda.id,
          unidadeId: unidadeAssu.id,
          criadoPorId: demandanteAssu.id,
          predioId: predioAssu?.id || null,
          sublocalId: sublocalAssu?.id || null,
          titulo: 'Revisão da Coberta e Impermeabilização de Calhas',
          descricaoProblema:
            'A cobertura do bloco de salas de aula e laboratórios apresenta telhas quebradas e oxidação severa nas calhas pluviais, ocasionando goteiras.',
          justificativa:
            'Evitar infiltrações que danificam computadores e forros de gesso das salas de aula antes do período de chuvas intensas.',
          estimativaDemandante: 18500.0,
          status: 'SUBMETIDA',
        },
      });

      await prisma.agendaDemandaTimeline.create({
        data: {
          demandaId: dem.id,
          statusNovo: 'SUBMETIDA',
          responsavel: demandanteAssu.nome,
          observacao: 'Demanda de serviço programado submetida para avaliação da PROAD e Gabinete da Reitoria.',
        },
      });

      console.log('✓ Demanda de exemplo criada para Campus Assu:', dem.titulo);
    }
  }

  console.log('--- Concluído com Sucesso! ---');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
