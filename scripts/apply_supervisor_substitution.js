const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== APLICANDO SUBSTITUIÇÃO DO SUPERVISOR NA MANUTENÇÃO PREDIAL ===');

  const contrato = await prisma.contrato.findFirst({
    where: { numero: '01', ano: 2026 },
    include: {
      empresa: true,
      itensMaoObra: {
        include: { funcionarios: true }
      }
    }
  });

  if (!contrato) {
    throw new Error('Contrato 01/2026 não encontrado na Manutenção Predial.');
  }

  // 1. Atualizar ou inserir Ryan Miqueias na tabela FuncionarioEmpresa
  const ryanEmpresa = await prisma.funcionarioEmpresa.upsert({
    where: { cpf: '701.180.294-14' },
    update: {
      empresaId: contrato.empresaId,
      nome: 'Ryan Miqueias Oliveira Mesquita',
      cargo: 'SUPERVISOR PARA ACOMPANHAMENTO DE SERVIÇOS DE CAMPO',
      cidadeLotacao: 'Mossoró',
      ativo: true
    },
    create: {
      empresaId: contrato.empresaId,
      nome: 'Ryan Miqueias Oliveira Mesquita',
      cpf: '701.180.294-14',
      cargo: 'SUPERVISOR PARA ACOMPANHAMENTO DE SERVIÇOS DE CAMPO',
      cidadeLotacao: 'Mossoró',
      ativo: true
    }
  });
  console.log('✔ Ryan Miqueias cadastrado na FuncionarioEmpresa:', ryanEmpresa.nome);

  // 2. Atualizar Ícaro Patrick na FuncionarioEmpresa para inativo
  const icaroEmpresa = await prisma.funcionarioEmpresa.findUnique({
    where: { cpf: '124.400.384-07' }
  });
  if (icaroEmpresa) {
    await prisma.funcionarioEmpresa.update({
      where: { cpf: '124.400.384-07' },
      data: { ativo: false }
    });
    console.log('✔ Ícaro Patrick atualizado para ativo: false na FuncionarioEmpresa.');
  }

  // 3. Atualizar no posto de trabalho do Contrato (ContratoItemMaoObra)
  const postoSupervisor = contrato.itensMaoObra.find(i =>
    i.funcao.toUpperCase().includes('SUPERVISOR')
  );

  if (!postoSupervisor) {
    throw new Error('Posto de Supervisor não encontrado no Contrato 01/2026.');
  }

  console.log(`Posto de Supervisor encontrado (ID: ${postoSupervisor.id}, Qtd: ${postoSupervisor.quantidadePostos})`);

  // Desativar Ícaro Patrick no posto
  const icaroPosto = await prisma.contratoFuncionarioPosto.findFirst({
    where: {
      itemMaoObraId: postoSupervisor.id,
      cpf: '124.400.384-07'
    }
  });

  if (icaroPosto) {
    await prisma.contratoFuncionarioPosto.update({
      where: { id: icaroPosto.id },
      data: { ativo: false }
    });
    console.log('✔ Ícaro Patrick marcado como ativo: false (Substituído) no posto de supervisor.');
  }

  // Inserir ou ativar Ryan Miqueias no posto
  const ryanPosto = await prisma.contratoFuncionarioPosto.findFirst({
    where: {
      itemMaoObraId: postoSupervisor.id,
      cpf: '701.180.294-14'
    }
  });

  if (!ryanPosto) {
    await prisma.contratoFuncionarioPosto.create({
      data: {
        itemMaoObraId: postoSupervisor.id,
        nomeCompleto: 'Ryan Miqueias Oliveira Mesquita',
        cpf: '701.180.294-14',
        ativo: true
      }
    });
    console.log('✔ Ryan Miqueias vinculado como supervisor ativo no posto de trabalho.');
  } else {
    await prisma.contratoFuncionarioPosto.update({
      where: { id: ryanPosto.id },
      data: { ativo: true }
    });
    console.log('✔ Ryan Miqueias atualizado como supervisor ativo no posto de trabalho.');
  }

  // 4. Exibir o status atual dos funcionários no posto de Supervisor
  const funcionariosAtualizados = await prisma.contratoFuncionarioPosto.findMany({
    where: { itemMaoObraId: postoSupervisor.id },
    orderBy: [{ ativo: 'desc' }, { nomeCompleto: 'asc' }]
  });

  console.log('=== QUADRO ATUALIZADO DO POSTO DE SUPERVISOR ===');
  for (const f of funcionariosAtualizados) {
    console.log(`- ${f.nomeCompleto} (${f.cpf}) -> Ativo: ${f.ativo} (${f.ativo ? 'ATIVO NO POSTO' : 'SUBSTITUÍDO'})`);
  }

  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
