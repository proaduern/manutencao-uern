const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== ATUALIZANDO CONTRATO 01/2026 COM FATURAMENTOS DE SETEMBRO/2026 ===');

  const contrato = await prisma.contrato.findFirst({
    where: { numero: '01', ano: 2026 }
  });

  if (!contrato) {
    throw new Error('Contrato 01/2026 não encontrado.');
  }

  // Execução consolidada até Setembro/2026 apurada no SGC:
  const execucaoPorRubrica = {
    maoObra: 839577.43,
    servicosEventuais: 862158.41,
    insumos: 309463.47,
    diarias: 2613.36,
    totalExecutado: 2013812.67
  };

  const valorTotal = 8948360.00;
  const saldoDisponivel = Number((valorTotal - execucaoPorRubrica.totalExecutado).toFixed(2)); // 6934547.33

  await prisma.contrato.update({
    where: { id: contrato.id },
    data: {
      saldoDisponivel: saldoDisponivel
    }
  });

  await prisma.contratoAditivo.deleteMany({
    where: { contratoId: contrato.id, tipo: 'EXECUCAO_SGC' }
  });

  await prisma.contratoAditivo.create({
    data: {
      contratoId: contrato.id,
      numero: 'SGC-EXECUCAO-SINCRONIZADA',
      tipo: 'EXECUCAO_SGC',
      valorAjuste: execucaoPorRubrica.totalExecutado,
      objeto: JSON.stringify(execucaoPorRubrica)
    }
  });

  console.log(`✔ Contrato 01/2026 atualizado com sucesso!`);
  console.log(`  Total Executado (03/2026 a 09/2026): R$ ${execucaoPorRubrica.totalExecutado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  console.log(`  Saldo Disponível: R$ ${saldoDisponivel.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  console.log(`  Detalhamento por rubrica:`);
  console.log(`    - Mão de Obra Fixa: R$ ${execucaoPorRubrica.maoObra.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  console.log(`    - Serviços Eventuais: R$ ${execucaoPorRubrica.servicosEventuais.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  console.log(`    - Insumos sob Demanda: R$ ${execucaoPorRubrica.insumos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  console.log(`    - Diárias de Deslocamento: R$ ${execucaoPorRubrica.diarias.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
