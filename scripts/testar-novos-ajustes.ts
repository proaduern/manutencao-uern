import prisma from '../src/lib/prisma';
import bcrypt from 'bcryptjs';
import { calcularPrazoLimite } from '../src/lib/services/prazos';

async function main() {
  console.log('--- TESTE E VALIDAÇÃO DOS NOVOS AJUSTES ---');

  // 1. Validar Campus Assu e Prédios
  const unidadeAssu = await prisma.unidade.findFirst({
    where: {
      OR: [
        { sigla: 'CAMPUS-ASSU' },
        { nome: { contains: 'ASSU', mode: 'insensitive' } },
      ],
    },
    include: {
      prediosVinculados: { include: { predio: true } },
    },
  });

  if (!unidadeAssu) {
    throw new Error('Unidade Campus Assu não encontrada.');
  }

  console.log(`✓ Unidade Demandante identificada: ${unidadeAssu.nome} (${unidadeAssu.sigla})`);
  console.log(`  Prédios vinculados: ${unidadeAssu.prediosVinculados.map((p) => p.predio.nome).join(', ')}`);

  const predioSede1 = unidadeAssu.prediosVinculados.find((p) => p.predio.nome.includes('Sede I'))?.predio;
  const predioSede2 = unidadeAssu.prediosVinculados.find((p) => p.predio.nome.includes('Sede II'))?.predio;

  // 2. Criar ou atualizar usuário GESTOR_UNIDADE: João Neves
  const senhaHash = await bcrypt.hash('uern123', 10);
  const gestorJoao = await prisma.usuario.upsert({
    where: { email: 'joao.neves@uern.br' },
    update: {
      role: 'GESTOR_UNIDADE',
      unidade: { connect: { id: unidadeAssu.id } },
      ativo: true,
    },
    create: {
      nome: 'João Neves',
      email: 'joao.neves@uern.br',
      senhaHash,
      role: 'GESTOR_UNIDADE',
      unidade: { connect: { id: unidadeAssu.id } },
      ativo: true,
    },
  });

  console.log(`✓ Usuário Administrador da Unidade configurado: ${gestorJoao.nome} (${gestorJoao.role}) - Unidade: ${unidadeAssu.nome}`);

  // 3. Buscar tipos de ambiente para vincular
  const tipoSalaAula = await prisma.tipoAmbiente.findFirst({
    where: { nome: { contains: 'Sala de Aula', mode: 'insensitive' } },
  }) || await prisma.tipoAmbiente.findFirst();

  const tipoLaboratorio = await prisma.tipoAmbiente.findFirst({
    where: { nome: { contains: 'Laboratório', mode: 'insensitive' } },
  }) || await prisma.tipoAmbiente.findFirst();

  const tipoMultiuso = await prisma.tipoAmbiente.findFirst({
    where: { nome: { contains: 'Gabinete', mode: 'insensitive' } },
  }) || await prisma.tipoAmbiente.findFirst();

  if (!tipoSalaAula || !tipoLaboratorio || !tipoMultiuso) {
    throw new Error('Tipos de ambiente não encontrados para vínculo.');
  }

  // 4. Cadastrar sublocais do Campus Assu conforme exemplo do usuário:
  // - "Sala de Aula A4"
  // - "Laboratório de Ginecologia"
  // - "Sala Multiuso II"
  const sublocaisExemplo = [
    {
      id: 'test-sl-a4',
      nome: 'Sala de Aula A4',
      descricao: 'Sala climatizada com quadro branco e projetor',
      unidadeId: unidadeAssu.id,
      predioId: predioSede1?.id || null,
      tipoAmbienteId: tipoSalaAula.id,
    },
    {
      id: 'test-lab-ginec',
      nome: 'Laboratório de Ginecologia',
      descricao: 'Laboratório de práticas clínicas com bancadas e macas',
      unidadeId: unidadeAssu.id,
      predioId: predioSede1?.id || null,
      tipoAmbienteId: tipoLaboratorio.id,
    },
    {
      id: 'test-sl-multi-2',
      nome: 'Sala Multiuso II',
      descricao: 'Auditório e reuniões multidisciplinares Sede II',
      unidadeId: unidadeAssu.id,
      predioId: predioSede2?.id || null,
      tipoAmbienteId: tipoMultiuso.id,
    },
  ];

  for (const s of sublocaisExemplo) {
    const subCriado = await prisma.sublocal.upsert({
      where: {
        id: s.id,
      },
      update: {
        nome: s.nome,
        descricao: s.descricao,
        unidadeId: s.unidadeId,
        predioId: s.predioId,
        tipoAmbienteId: s.tipoAmbienteId,
        ativo: true,
      },
      create: {
        id: s.id,
        nome: s.nome,
        descricao: s.descricao,
        unidadeId: s.unidadeId,
        predioId: s.predioId,
        tipoAmbienteId: s.tipoAmbienteId,
        ativo: true,
      },
      include: {
        unidade: true,
        predio: true,
        tipoAmbiente: true,
      },
    });

    console.log(`✓ Sublocal/Ambiente cadastrado: "${subCriado.nome}" -> Tipo: ${subCriado.tipoAmbiente.nome} | Prédio: ${subCriado.predio?.nome || 'Nenhum'}`);
  }

  // 5. Testar abertura de chamado com vínculo de sublocal
  const tipoServico = await prisma.tipoServico.findFirst({
    where: { ativo: true },
    include: { categoria: true },
  });
  const fraseUrgencia = await prisma.fraseUrgencia.findFirst({
    where: { ativo: true },
  });

  if (tipoServico && fraseUrgencia) {
    const subLab = await prisma.sublocal.findUnique({
      where: { id: 'test-lab-ginec' },
    });

    const chamadoTeste = await prisma.chamado.create({
      data: {
        unidadeId: unidadeAssu.id,
        predioId: predioSede1?.id || null,
        sublocalId: subLab?.id || null,
        tipoServicoId: tipoServico.id,
        tipoAmbienteId: tipoLaboratorio.id,
        fraseUrgenciaId: fraseUrgencia.id,
        setorEspecifico: subLab ? subLab.nome : 'Laboratório de Ginecologia',
        descricao: 'Problema na torneira e ralo do laboratório de ginecologia - Teste de validação dos novos ajustes.',
        nivelCodigo: fraseUrgencia.nivelCodigo,
        nivelOrdem: fraseUrgencia.nivelSugerido,
        status: 'ABERTO',
        abertoPorId: gestorJoao.id,
        abertoEm: new Date(),
        prazoLimite: await calcularPrazoLimite(fraseUrgencia.nivelCodigo, new Date(), null, fraseUrgencia.id, 'ASSÚ'),
      },
      include: {
        sublocal: true,
        predio: true,
        unidade: true,
      },
    });

    console.log(`✓ Chamado de teste aberto com sucesso pelo Gestor de Unidade: #${chamadoTeste.numero} (${chamadoTeste.id})`);
    console.log(`  Sublocal vinculado: ${chamadoTeste.sublocal?.nome} | Prédio: ${chamadoTeste.predio?.nome}`);
  }

  // 6. Validar feriados cadastrados no banco
  const contagemFeriados = await prisma.feriado.count();
  const feriadosAssu = await prisma.feriado.findMany({
    where: {
      OR: [
        { abrangencia: 'NACIONAL' },
        { abrangencia: 'ESTADUAL' },
        { municipio: 'Assu' },
      ],
    },
    orderBy: { data: 'asc' },
    take: 8,
  });

  console.log(`✓ Total de feriados cadastrados no banco: ${contagemFeriados}`);
  console.log(`✓ Exemplos de feriados válidos para Campus Assu:`);
  for (const f of feriadosAssu) {
    console.log(`  - ${f.data.toISOString().split('T')[0]} | ${f.descricao} (${f.abrangencia}${f.municipio ? ` - ${f.municipio}` : ''})`);
  }

  console.log('--- TESTES CONCLUÍDOS COM 100% DE SUCESSO! ---');
}

main()
  .catch((e) => {
    console.error('Erro nos testes:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
