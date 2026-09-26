import { gerarFeriadosAno } from '../src/lib/services/feriados';
import prisma from '../src/lib/prisma';

async function main() {
  console.log('--- POPULANDO FERIADOS PADRÃO UERN ---');

  const anoAtual = 2026;
  const proximoAno = 2027;

  const total2026 = await gerarFeriadosAno(anoAtual);
  console.log(`Feriados de ${anoAtual} inseridos/processados: ${total2026}`);

  const total2027 = await gerarFeriadosAno(proximoAno);
  console.log(`Feriados de ${proximoAno} inseridos/processados: ${total2027}`);

  const todos = await prisma.feriado.findMany({
    orderBy: { data: 'asc' },
  });

  console.log(`\nTotal de feriados cadastrados no banco: ${todos.length}`);
  todos.forEach((f) => {
    const dataStr = f.data.toISOString().split('T')[0];
    const mun = f.municipio ? ` [${f.municipio}]` : '';
    console.log(`- ${dataStr} (${f.abrangencia}${mun}): ${f.descricao}`);
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
