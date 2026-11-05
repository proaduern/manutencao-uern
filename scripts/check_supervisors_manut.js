const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const contrato = await prisma.contrato.findFirst({
    where: { numero: '01', ano: 2026 },
    include: {
      itensMaoObra: {
        include: { funcionarios: true }
      }
    }
  });

  console.log('Contrato ID:', contrato?.id, contrato?.numero, contrato?.ano);
  if (contrato?.itensMaoObra) {
    console.log(`Itens mão de obra: ${contrato.itensMaoObra.length}`);
    for (const item of contrato.itensMaoObra) {
      console.log(`- ${item.funcao} (Qtd: ${item.quantidadePostos}):`);
      for (const f of item.funcionarios) {
        console.log(`    * ${f.nomeCompleto} (${f.cpf}) - Ativo: ${f.ativo}`);
      }
    }
  }

  await prisma.$disconnect();
}

main().catch(console.error);
