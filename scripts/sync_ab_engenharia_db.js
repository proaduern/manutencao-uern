const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const WORKERS_26 = [
  { nomeCompleto: 'Ryan Miqueias Oliveira Mesquita', cpf: '701.180.294-14', funcao: 'SUPERVISOR PARA ACOMPANHAMENTO DE SERVIÇOS DE CAMPO', cidade: 'Mossoró' },
  { nomeCompleto: 'Kerginaldo Benjamin Mesquita Trajano', cpf: '852.182.864-00', funcao: 'SUPERVISOR PARA ACOMPANHAMENTO DE SERVIÇOS DE CAMPO', cidade: 'Mossoró' },
  { nomeCompleto: 'Ivanaldo Elizeu Lopes Gomes', cpf: '027.113.254-07', funcao: 'ELETRICISTA', cidade: 'Mossoró' },
  { nomeCompleto: 'Tiago Gomes Custódio', cpf: '017.358.984-73', funcao: 'ELETRICISTA', cidade: 'Mossoró' },
  { nomeCompleto: 'Clevanir Pereira Paiva', cpf: '035.535.454-37', funcao: 'AJUDANTE DE MANUTENÇÃO (Instalações elétricas prediais)', cidade: 'Mossoró' },
  { nomeCompleto: 'Francisco Antônio de Souza', cpf: '496.999.114-68', funcao: 'AJUDANTE DE MANUTENÇÃO (Instalações elétricas prediais)', cidade: 'Mossoró' },
  { nomeCompleto: 'Antônio Dário da Silva Filgueira', cpf: '124.133.064-63', funcao: 'BOMBEIRO HIDRÁULICO/ENCANADOR', cidade: 'Mossoró' },
  { nomeCompleto: 'João Batista Felipe Tomaz', cpf: '035.044.164-24', funcao: 'BOMBEIRO HIDRÁULICO/ENCANADOR', cidade: 'Mossoró' },
  { nomeCompleto: 'Carlos Rodrigo de Souza Pereira', cpf: '700.282.384-19', funcao: 'PEDREIRO / PINTOR', cidade: 'Mossoró' },
  { nomeCompleto: 'Francisco Alexandre de Oliveira', cpf: '112.204.194-27', funcao: 'PEDREIRO / PINTOR', cidade: 'Mossoró' },
  { nomeCompleto: 'José Belmiro da Silva', cpf: '050.082.134-82', funcao: 'PEDREIRO / PINTOR', cidade: 'Mossoró' },
  { nomeCompleto: 'Caio Jefferson de Oliveira Costa', cpf: '114.538.254-10', funcao: 'AJUDANTE DE MANUTENÇÃO GERAL / SERVENTE', cidade: 'Mossoró' },
  { nomeCompleto: 'Fabrício de Santana Saraiva', cpf: '123.801.534-42', funcao: 'AJUDANTE DE MANUTENÇÃO GERAL / SERVENTE', cidade: 'Mossoró' },
  { nomeCompleto: 'Francinaldo Francisco José da Silva', cpf: '010.688.734-27', funcao: 'AJUDANTE DE MANUTENÇÃO GERAL / SERVENTE', cidade: 'Mossoró' },
  { nomeCompleto: 'Elpídio Evaristo de Oliveira', cpf: '028.359.454-31', funcao: 'MARCENEIRO', cidade: 'Mossoró' },
  { nomeCompleto: 'Paulo José Pereira de Souza', cpf: '009.827.904-14', funcao: 'MARCENEIRO', cidade: 'Mossoró' },
  { nomeCompleto: 'Josivan Alves de Souza', cpf: '113.211.244-30', funcao: 'TRABALHADOR DE MANUTENÇÃO DE EDIFICAÇÕES — Mossoró', cargoBase: 'TRABALHADOR DE MANUTENÇÃO DE EDIFICAÇÕES', cidade: 'Mossoró' },
  { nomeCompleto: 'Domício de Paula Rodrigues Neto', cpf: '094.853.144-42', funcao: 'TRABALHADOR DE MANUTENÇÃO DE EDIFICAÇÕES — Mossoró', cargoBase: 'TRABALHADOR DE MANUTENÇÃO DE EDIFICAÇÕES', cidade: 'Mossoró' },
  { nomeCompleto: 'Antônio Hildomar Dias', cpf: '078.369.144-02', funcao: 'TRABALHADOR DE MANUTENÇÃO DE EDIFICAÇÕES — Pau dos Ferros', cargoBase: 'TRABALHADOR DE MANUTENÇÃO DE EDIFICAÇÕES', cidade: 'Pau dos Ferros' },
  { nomeCompleto: 'Erivan Carlos da Silva', cpf: '092.473.904-51', funcao: 'TRABALHADOR DE MANUTENÇÃO DE EDIFICAÇÕES — Pau dos Ferros', cargoBase: 'TRABALHADOR DE MANUTENÇÃO DE EDIFICAÇÕES', cidade: 'Pau dos Ferros' },
  { nomeCompleto: 'Francisco de Assis da Silva', cpf: '942.715.264-87', funcao: 'TRABALHADOR DE MANUTENÇÃO DE EDIFICAÇÕES — Assú', cargoBase: 'TRABALHADOR DE MANUTENÇÃO DE EDIFICAÇÕES', cidade: 'Assú' },
  { nomeCompleto: 'Anderson de Moura Melo', cpf: '117.020.574-70', funcao: 'TRABALHADOR DE MANUTENÇÃO DE EDIFICAÇÕES — Patu', cargoBase: 'TRABALHADOR DE MANUTENÇÃO DE EDIFICAÇÕES', cidade: 'Patu' },
  { nomeCompleto: 'Jackson Pereira Alves', cpf: '071.545.564-80', funcao: 'TRABALHADOR DE MANUTENÇÃO DE EDIFICAÇÕES — Caicó', cargoBase: 'TRABALHADOR DE MANUTENÇÃO DE EDIFICAÇÕES', cidade: 'Caicó' },
  { nomeCompleto: 'Marcos Zidane Diniz Faustino', cpf: '708.875.994-27', funcao: 'TRABALHADOR DE MANUTENÇÃO DE EDIFICAÇÕES — Caicó', cargoBase: 'TRABALHADOR DE MANUTENÇÃO DE EDIFICAÇÕES', cidade: 'Caicó' },
  { nomeCompleto: 'João Teixeira de Morais', cpf: '011.971.954-16', funcao: 'TRABALHADOR DE MANUTENÇÃO DE EDIFICAÇÕES — Natal', cargoBase: 'TRABALHADOR DE MANUTENÇÃO DE EDIFICAÇÕES', cidade: 'Natal' },
  { nomeCompleto: 'Paulo Manoel Ferreira', cpf: '069.984.224-74', funcao: 'TRABALHADOR DE MANUTENÇÃO DE EDIFICAÇÕES — Natal', cargoBase: 'TRABALHADOR DE MANUTENÇÃO DE EDIFICAÇÕES', cidade: 'Natal' }
];

const HISTORICO_SUBSTITUIDOS = [
  { nomeCompleto: 'Ícaro Patrick de Oliveira', cpf: '124.400.384-07', funcao: 'SUPERVISOR PARA ACOMPANHAMENTO DE SERVIÇOS DE CAMPO', cidade: 'Mossoró' },
  { nomeCompleto: 'Lucas Matheus Lucena Fernandes', cpf: '124.466.594-03', funcao: 'TRABALHADOR DE MANUTENÇÃO DE EDIFICAÇÕES — Mossoró', cargoBase: 'TRABALHADOR DE MANUTENÇÃO DE EDIFICAÇÕES', cidade: 'Mossoró' }
];

async function main() {
  console.log('=== ATUALIZANDO CONTRATO 01/2026 E FUNCIONÁRIOS NO MANUTENÇÃO PREDIAL ===');

  let contrato = await prisma.contrato.findFirst({
    where: {
      OR: [
        { numero: '01', ano: 2026 },
        { numero: '01', ano: 2016 }
      ]
    },
    include: { empresa: true, itensMaoObra: true }
  });

  if (!contrato) {
    throw new Error('Contrato 01/2016 ou 01/2026 não encontrado no banco da Manutenção Predial.');
  }

  // Update Empresa
  await prisma.empresa.update({
    where: { id: contrato.empresaId },
    data: {
      razaoSocial: 'A B ENGENHARIA, CONSULTORIA E SERVIÇOS LTDA - EPP',
      nomeFantasia: 'AB ENGENHARIA',
      cnpj: '38.027.455/0001-73',
      email: 'administrativo@engenhariaab.com.br',
      telefone: '(84) 99832-8614 / (84) 99877-0193'
    }
  });

  // Update Contrato to 01/2026 and saldoDisponivel = 7114810.70
  contrato = await prisma.contrato.update({
    where: { id: contrato.id },
    data: {
      numero: '01',
      ano: 2026,
      objeto: 'Contratação de serviços de manutenção das estruturas prediais em geral, pequenas reformas e adequações, com mão de obra em regime de dedicação exclusiva (26 postos ativos de 33 previstos), serviços eventuais sob demanda, insumos sob demanda e diárias para deslocamento de sede, incluindo ferramentas, máquinas, utensílios, EPIs e relatórios gerenciais periódicos, em atendimento às necessidades da UERN.',
      dataInicio: new Date('2026-02-12T00:00:00.000Z'),
      dataFim: new Date('2028-02-11T23:59:59.000Z'),
      mesesVigencia: 24,
      valorMaoObraResidente: 3848360.00,
      valorAnualServicosEventuais: 1500000.00,
      valorServicosEventuais: 3000000.00,
      valorAnualInsumos: 1000000.00,
      valorInsumos: 2000000.00,
      valorAnualDiarias: 50000.00,
      valorDiarias: 100000.00,
      valorTotal: 8948360.00,
      saldoDisponivel: 6934547.33,
      ativo: true
    },
    include: { itensMaoObra: true }
  });
  console.log(`✔ Contrato atualizado: ${contrato.numero}/${contrato.ano} (Saldo Disponível: R$ ${contrato.saldoDisponivel})`);

  // Persist SGC execution summary per rubrica in ContratoAditivo (EXECUCAO_SGC)
  const execucaoPorRubrica = {
    maoObra: 839577.43,
    servicosEventuais: 862158.41,
    insumos: 309463.47,
    diarias: 2613.36,
    totalExecutado: 2013812.67
  };
  await prisma.contratoAditivo.deleteMany({
    where: { contratoId: contrato.id, tipo: 'EXECUCAO_SGC' }
  });
  await prisma.contratoAditivo.create({
    data: {
      contratoId: contrato.id,
      numero: 'SGC-EXECUCAO-SINCRONIZADA',
      tipo: 'EXECUCAO_SGC',
      valorAjuste: 2013812.67,
      objeto: JSON.stringify(execucaoPorRubrica)
    }
  });
  console.log('✔ Saldos consumidos por rubrica (03/2026 a 09/2026 = R$ 2.013.812,67) sincronizados.');

  // Upsert 26 active workers into FuncionarioEmpresa
  for (const w of WORKERS_26) {
    await prisma.funcionarioEmpresa.upsert({
      where: { cpf: w.cpf },
      update: {
        empresaId: contrato.empresaId,
        nome: w.nomeCompleto,
        cargo: w.cargoBase || w.funcao,
        cidadeLotacao: w.cidade,
        ativo: true
      },
      create: {
        empresaId: contrato.empresaId,
        nome: w.nomeCompleto,
        cpf: w.cpf,
        cargo: w.cargoBase || w.funcao,
        cidadeLotacao: w.cidade,
        ativo: true
      }
    });
  }
  for (const w of HISTORICO_SUBSTITUIDOS) {
    await prisma.funcionarioEmpresa.upsert({
      where: { cpf: w.cpf },
      update: {
        empresaId: contrato.empresaId,
        nome: w.nomeCompleto,
        cargo: w.cargoBase || w.funcao,
        cidadeLotacao: w.cidade,
        ativo: false
      },
      create: {
        empresaId: contrato.empresaId,
        nome: w.nomeCompleto,
        cpf: w.cpf,
        cargo: w.cargoBase || w.funcao,
        cidadeLotacao: w.cidade,
        ativo: false
      }
    });
  }
  console.log(`✔ ${WORKERS_26.length} funcionários ativos e ${HISTORICO_SUBSTITUIDOS.length} substituídos registrados em FuncionarioEmpresa.`);

  // Link workers to ContratoItemMaoObra posts
  for (const item of contrato.itensMaoObra) {
    await prisma.contratoFuncionarioPosto.deleteMany({
      where: { itemMaoObraId: item.id }
    });
    const matched = WORKERS_26.filter(
      w => w.funcao.trim().toUpperCase() === item.funcao.trim().toUpperCase()
    );
    for (const w of matched) {
      await prisma.contratoFuncionarioPosto.create({
        data: {
          itemMaoObraId: item.id,
          nomeCompleto: w.nomeCompleto,
          cpf: w.cpf,
          ativo: true
        }
      });
    }
    const matchedSub = HISTORICO_SUBSTITUIDOS.filter(
      w => w.funcao.trim().toUpperCase() === item.funcao.trim().toUpperCase()
    );
    for (const w of matchedSub) {
      await prisma.contratoFuncionarioPosto.create({
        data: {
          itemMaoObraId: item.id,
          nomeCompleto: w.nomeCompleto,
          cpf: w.cpf,
          ativo: false
        }
      });
    }
    console.log(`  -> Posto [${item.funcao}]: ${matched.length} ativo(s), ${matchedSub.length} substituído(s)`);
  }

  console.log('=== SINCRONIZAÇÃO NO MANUTENÇÃO PREDIAL CONCLUÍDA COM SUCESSO! ===');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
