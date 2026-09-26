const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('--- Iniciando seed completo do sistema Manutenção Predial UERN ---');

  // 1. Prédios / Campi
  const predioCentral = await prisma.cidadePredio.upsert({
    where: { id: 'predio-mossoro-central' },
    update: {},
    create: {
      id: 'predio-mossoro-central',
      nome: 'Campus Central - Reitoria e Blocos Didáticos',
      campus: 'Mossoró',
      endereco: 'Rua Almino Afonso, 478, Centro, Mossoró - RN',
    },
  });

  const predioFafic = await prisma.cidadePredio.upsert({
    where: { id: 'predio-mossoro-fafic' },
    update: {},
    create: {
      id: 'predio-mossoro-fafic',
      nome: 'Campus Central - Complexo FAFIC / FANAT',
      campus: 'Mossoró',
      endereco: 'BR 110, Km 48, Costa e Silva, Mossoró - RN',
    },
  });

  const predioNatal = await prisma.cidadePredio.upsert({
    where: { id: 'predio-natal' },
    update: {},
    create: {
      id: 'predio-natal',
      nome: 'Complexo Cultural / Campus de Natal',
      campus: 'Natal',
      endereco: 'Av. Dr. João Medeiros Filho, 3419, Potengi, Natal - RN',
    },
  });

  const predioPatu = await prisma.cidadePredio.upsert({
    where: { id: 'predio-patu' },
    update: {},
    create: {
      id: 'predio-patu',
      nome: 'Campus Avançado de Patu',
      campus: 'Patu',
      endereco: 'Rua Lauro Maia, s/n, Estação, Patu - RN',
    },
  });

  const predioPauFerros = await prisma.cidadePredio.upsert({
    where: { id: 'predio-pau-dos-ferros' },
    update: {},
    create: {
      id: 'predio-pau-dos-ferros',
      nome: 'Campus Avançado de Pau dos Ferros',
      campus: 'Pau dos Ferros',
      endereco: 'BR 405, Km 03, Bairro Arizona, Pau dos Ferros - RN',
    },
  });

  // 2. Unidades Demandantes
  const proad = await prisma.unidade.upsert({
    where: { sigla: 'PROAD' },
    update: { predioId: predioCentral.id },
    create: {
      nome: 'Pró-Reitoria de Administração - PROAD',
      sigla: 'PROAD',
      campus: 'Mossoró',
      codigo: '010',
      email: 'proad@uern.br',
      predioId: predioCentral.id,
      cotaMensal: 80000.0,
    },
  });

  const campusCentral = await prisma.unidade.upsert({
    where: { sigla: 'CAMPUS-MOSSORO' },
    update: { predioId: predioFafic.id },
    create: {
      nome: 'Campus Central - Mossoró',
      sigla: 'CAMPUS-MOSSORO',
      campus: 'Mossoró',
      codigo: '001',
      email: 'campus.central@uern.br',
      predioId: predioFafic.id,
      cotaMensal: 100000.0,
    },
  });

  const campusNatal = await prisma.unidade.upsert({
    where: { sigla: 'CAMPUS-NATAL' },
    update: { predioId: predioNatal.id },
    create: {
      nome: 'Campus de Natal',
      sigla: 'CAMPUS-NATAL',
      campus: 'Natal',
      codigo: '002',
      email: 'campus.natal@uern.br',
      predioId: predioNatal.id,
      cotaMensal: 45000.0,
    },
  });

  const campusPatu = await prisma.unidade.upsert({
    where: { sigla: 'CAMPUS-PATU' },
    update: { predioId: predioPatu.id },
    create: {
      nome: 'Campus de Patu',
      sigla: 'CAMPUS-PATU',
      campus: 'Patu',
      codigo: '003',
      email: 'campus.patu@uern.br',
      predioId: predioPatu.id,
      cotaMensal: 25000.0,
    },
  });

  const campusPauFerros = await prisma.unidade.upsert({
    where: { sigla: 'CAMPUS-PAU-FERROS' },
    update: { predioId: predioPauFerros.id },
    create: {
      nome: 'Campus de Pau dos Ferros',
      sigla: 'CAMPUS-PAU-FERROS',
      campus: 'Pau dos Ferros',
      codigo: '004',
      email: 'campus.pauferros@uern.br',
      predioId: predioPauFerros.id,
      cotaMensal: 35000.0,
    },
  });

  // 3. Empresa Contratada
  const empresa = await prisma.empresa.upsert({
    where: { cnpj: '12345678000190' },
    update: {},
    create: {
      razaoSocial: 'Potiguar Serviços e Manutenção Predial Eireli',
      nomeFantasia: 'Potiguar Manutenção',
      cnpj: '12345678000190',
      email: 'operacional@potiguarmanutencao.com.br',
      telefone: '(84) 3312-9900',
    },
  });

  // 4. Funcionários da Empresa
  const funcionarios = [
    { nome: 'José Ribamar dos Santos', cpf: '11122233344', cargo: 'Bombeiro Hidráulico / Encanador', cidade: 'Mossoró' },
    { nome: 'Francisco das Chagas Silva', cpf: '22233344455', cargo: 'Eletricista Predial', cidade: 'Mossoró' },
    { nome: 'Antônio Marcos Medeiros', cpf: '33344455566', cargo: 'Técnico em Climatização / Refrigeração', cidade: 'Mossoró' },
    { nome: 'Carlos Alberto Ferreira', cpf: '44455566677', cargo: 'Pedreiro de Manutenção', cidade: 'Mossoró' },
    { nome: 'Valdir Soares de Lima', cpf: '55566677788', cargo: 'Eletricista / Manutenção Geral', cidade: 'Natal' },
  ];

  for (const f of funcionarios) {
    await prisma.funcionarioEmpresa.upsert({
      where: { cpf: f.cpf },
      update: {},
      create: {
        empresaId: empresa.id,
        nome: f.nome,
        cpf: f.cpf,
        cargo: f.cargo,
        cidadeLotacao: f.cidade,
      },
    });
  }

  // 5. Contrato Ativo & Cotas
  const contrato = await prisma.contrato.upsert({
    where: { numero_ano: { numero: 'CT 014/2025', ano: 2025 } },
    update: {},
    create: {
      numero: 'CT 014/2025',
      ano: 2025,
      empresaId: empresa.id,
      objeto: 'Prestação de serviços contínuos de manutenção predial preventiva e corretiva nos prédios da UERN.',
      dataInicio: new Date('2025-01-01T00:00:00Z'),
      dataFim: new Date('2026-12-31T23:59:59Z'),
      prazoGarantiaDias: 90,
      valorTotal: 2400000.0,
      saldoDisponivel: 1580400.0,
    },
  });

  const cotas = [
    { unidadeId: campusCentral.id, cotaMensal: 100000.0, cotaAnual: 1200000.0, saldo: 620000.0 },
    { unidadeId: campusNatal.id, cotaMensal: 45000.0, cotaAnual: 540000.0, saldo: 240000.0 },
    { unidadeId: campusPatu.id, cotaMensal: 25000.0, cotaAnual: 300000.0, saldo: 145000.0 },
    { unidadeId: campusPauFerros.id, cotaMensal: 35000.0, cotaAnual: 420000.0, saldo: 210000.0 },
    { unidadeId: proad.id, cotaMensal: 80000.0, cotaAnual: 960000.0, saldo: 365400.0 },
  ];

  for (const c of cotas) {
    await prisma.contratoUnidade.upsert({
      where: { contratoId_unidadeId: { contratoId: contrato.id, unidadeId: c.unidadeId } },
      update: {},
      create: {
        contratoId: contrato.id,
        unidadeId: c.unidadeId,
        cotaMensal: c.cotaMensal,
        cotaAnual: c.cotaAnual,
        saldoDisponivel: c.saldo,
      },
    });
  }

  // 6. Níveis de Urgência
  const niveis = [
    { codigo: 'EMERGENCIA', nome: 'Emergência (Risco Iminente)', ordem: 1, prazoHorasCorridas: 24, prazoDiasUteis: null, usaDataEsperada: false, selecionavelPorFrase: false },
    { codigo: 'ALTA', nome: 'Urgência Alta', ordem: 2, prazoHorasCorridas: 48, prazoDiasUteis: null, usaDataEsperada: false, selecionavelPorFrase: true },
    { codigo: 'NORMAL', nome: 'Urgência Normal', ordem: 3, prazoHorasCorridas: null, prazoDiasUteis: 5, usaDataEsperada: false, selecionavelPorFrase: true },
    { codigo: 'BAIXA', nome: 'Urgência Baixa', ordem: 4, prazoHorasCorridas: null, prazoDiasUteis: 10, usaDataEsperada: false, selecionavelPorFrase: true },
    { codigo: 'PLANEJADA', nome: 'Serviço Planejado / Data Marcada', ordem: 5, prazoHorasCorridas: null, prazoDiasUteis: null, usaDataEsperada: true, selecionavelPorFrase: true },
  ];

  for (const n of niveis) {
    await prisma.nivelUrgencia.upsert({
      where: { codigo: n.codigo },
      update: {},
      create: n,
    });
  }

  // 7. Frases de Urgência
  const frases = [
    { frase: 'Impede completamente o uso do ambiente ou traz risco iminente de dano/acidente', nivelCodigo: 'ALTA', nivelSugerido: 2, ordem: 1, exigeData: false },
    { frase: 'Prejudica gravemente as atividades, com risco de agravamento a curto prazo', nivelCodigo: 'ALTA', nivelSugerido: 2, ordem: 2, exigeData: false },
    { frase: 'Causa transtorno significativo, mas as atividades essenciais continuam funcionando', nivelCodigo: 'NORMAL', nivelSugerido: 3, ordem: 3, exigeData: false },
    { frase: 'Problema pontual de pequena monta ou estético, sem risco funcional', nivelCodigo: 'BAIXA', nivelSugerido: 4, ordem: 4, exigeData: false },
    { frase: 'Serviço que deve ser executado até uma data específica (evento institucional, etc.)', nivelCodigo: 'PLANEJADA', nivelSugerido: 5, ordem: 5, exigeData: true },
  ];

  for (const f of frases) {
    await prisma.fraseUrgencia.upsert({
      where: { frase: f.frase },
      update: {},
      create: {
        frase: f.frase,
        nivelCodigo: f.nivelCodigo,
        nivelSugerido: f.nivelSugerido,
        ordemExibicao: f.ordem,
        exigeData: f.exigeData,
      },
    });
  }

  // 8. Categorias e Tipos de Serviço
  const categorias = [
    {
      nome: 'Instalações Hidráulicas e Sanitárias',
      tipos: [
        { nome: 'Vazamento em tubulação', horas: 24 },
        { nome: 'Reparo em caixa d’água', horas: 48 },
        { nome: 'Desentupimento de esgoto', horas: 24 },
        { nome: 'Troca de torneiras, sifões e válvulas', horas: 72 },
      ],
    },
    {
      nome: 'Instalações Elétricas e Iluminação',
      tipos: [
        { nome: 'Substituição de disjuntor / reparo em quadro', horas: 24 },
        { nome: 'Troca de lâmpadas / reatores / refletores', horas: 72 },
        { nome: 'Tomadas e interruptores sem energia', horas: 48 },
        { nome: 'Curto-circuito ou faíscamento', horas: 12 },
      ],
    },
    {
      nome: 'Climatização e Ar Condicionado',
      tipos: [
        { nome: 'Manutenção preventiva de ar split', horas: 120 },
        { nome: 'Vazamento de água em ar condicionado', horas: 48 },
        { nome: 'Recarga de gás refrigerante', horas: 72 },
        { nome: 'Reparo elétrico de compressor / motor ventilador', horas: 72 },
      ],
    },
    {
      nome: 'Alvenaria, Cobertura e Esquadrias',
      tipos: [
        { nome: 'Reparo em infiltrações de teto / calha pluvial', horas: 72 },
        { nome: 'Pintura pontual de salas / paredes', horas: 120 },
        { nome: 'Reparo em pisos e cerâmicas quebradas', horas: 96 },
        { nome: 'Conserto de fechaduras, portas e janelas', horas: 48 },
      ],
    },
  ];

  for (const cat of categorias) {
    const c = await prisma.categoriaServico.upsert({
      where: { nome: cat.nome },
      update: {},
      create: { nome: cat.nome },
    });

    for (const t of cat.tipos) {
      const existe = await prisma.tipoServico.findFirst({
        where: { nome: t.nome, categoriaId: c.id },
      });
      if (!existe) {
        await prisma.tipoServico.create({
          data: {
            nome: t.nome,
            categoriaId: c.id,
            prazoEstimadoHoras: t.horas,
          },
        });
      }
    }
  }

  // 9. Tipos de Ambiente
  const ambientes = [
    'Sala de Aula',
    'Laboratório Didático / Pesquisa',
    'Gabinete de Docente / Chefia de Departamento',
    'Sanitário Masculino / Feminino / Acessível',
    'Auditório / Anfiteatro',
    'Biblioteca / Sala de Estudos',
    'Setor Administrativo / Secretaria',
    'Área Externa / Pátio / Estacionamento',
  ];

  for (const amb of ambientes) {
    await prisma.tipoAmbiente.upsert({
      where: { nome: amb },
      update: {},
      create: { nome: amb },
    });
  }

  // 10. Tabela de Referência (SINAPI-RN) e Itens
  const tabelaSinapi = await prisma.tabelaReferencia.upsert({
    where: { id: 'tabela-sinapi-rn-2026-01' },
    update: {},
    create: {
      id: 'tabela-sinapi-rn-2026-01',
      nome: 'SINAPI - RN (Referência Oficial)',
      versao: '2026/01',
      competencia: new Date('2026-01-01'),
      uf: 'RN',
      desonerado: false,
      bdiPercentual: 25.0,
      ativa: true,
    },
  });

  const itensSinapi = [
    { codigo: 'SINAPI-91188', descricao: 'Tubo de PVC rígido soldável, esgoto predial, DN 50 mm', un: 'm', valor: 32.5 },
    { codigo: 'SINAPI-91194', descricao: 'Joelho 90 graus, PVC rígido esgoto predial, DN 50 mm', un: 'un', valor: 14.8 },
    { codigo: 'SINAPI-88316', descricao: 'Encanador ou bombeiro hidráulico com encargos complementares', un: 'h', valor: 45.0 },
    { codigo: 'SINAPI-88317', descricao: 'Auxiliar de encanador com encargos complementares', un: 'h', valor: 31.0 },
    { codigo: 'SINAPI-101878', descricao: 'Quadro de distribuição de energia para 12 disjuntores termomagnéticos', un: 'un', valor: 185.0 },
    { codigo: 'SINAPI-88264', descricao: 'Eletricista com encargos complementares', un: 'h', valor: 48.0 },
    { codigo: 'SINAPI-88247', descricao: 'Auxiliar de eletricista com encargos complementares', un: 'h', valor: 32.5 },
    { codigo: 'SINAPI-97593', descricao: 'Lâmpada tubular LED 18W, bivolt, base G13', un: 'un', valor: 28.9 },
    { codigo: 'SINAPI-88309', descricao: 'Pedreiro com encargos complementares', un: 'h', valor: 44.0 },
    { codigo: 'SINAPI-88310', descricao: 'Pintor com encargos complementares', un: 'h', valor: 42.0 },
    { codigo: 'SINAPI-94570', descricao: 'Recarga de gás refrigerante R-410A para ar condicionado split', un: 'kg', valor: 95.0 },
  ];

  for (const item of itensSinapi) {
    await prisma.itemReferencia.upsert({
      where: { tabelaId_codigo: { tabelaId: tabelaSinapi.id, codigo: item.codigo } },
      update: {},
      create: {
        tabelaId: tabelaSinapi.id,
        codigo: item.codigo,
        descricao: item.descricao,
        unidadeMedida: item.un,
        precoUnitario: item.valor,
        status: 'HOMOLOGADO',
      },
    });
  }

  // 11. Usuários para cada um dos 6 papéis (senha padrão: uern@2026)
  const senhaHash = await bcrypt.hash('uern@2026', 10);

  const usuarios = [
    {
      nome: 'Administrador Geral PROAD',
      email: 'admin.manutencao@uern.br',
      role: 'ADMIN',
      unidadeId: proad.id,
      matricula: '0001-PROAD',
    },
    {
      nome: 'Gestor do Contrato de Manutenção',
      email: 'gestor.contrato@uern.br',
      role: 'GESTOR_CONTRATO',
      unidadeId: proad.id,
      matricula: '0002-GESTAO',
    },
    {
      nome: 'Eng. Fiscal Técnico Predial',
      email: 'fiscal.tecnico@uern.br',
      role: 'FISCAL_TECNICO',
      unidadeId: proad.id,
      matricula: '0003-FISC-TEC',
    },
    {
      nome: 'Fiscal Administrativo do Contrato',
      email: 'fiscal.adm@uern.br',
      role: 'FISCAL_ADM',
      unidadeId: proad.id,
      matricula: '0004-FISC-ADM',
    },
    {
      nome: 'Fiscal Setorial de Mossoró',
      email: 'fiscal.setorial@uern.br',
      role: 'FISCAL_SETORIAL',
      unidadeId: campusCentral.id,
      matricula: '0005-FISC-SET',
    },
    {
      nome: 'Prof. Carlos Eduardo (Demandante)',
      email: 'demandante@uern.br',
      role: 'DEMANDANTE',
      unidadeId: campusCentral.id,
      matricula: '0006-DEMAND',
    },
    {
      nome: 'Preposto da Empresa Contratada',
      email: 'empresa@manutencao.com.br',
      role: 'EMPRESA',
      empresaId: empresa.id,
      matricula: '0007-CONTRATADA',
    },
  ];

  for (const u of usuarios) {
    await prisma.usuario.upsert({
      where: { email: u.email },
      update: {},
      create: {
        nome: u.nome,
        email: u.email,
        senhaHash: senhaHash,
        role: u.role,
        unidadeId: u.unidadeId || null,
        empresaId: u.empresaId || null,
        matricula: u.matricula,
        deveTrocarSenha: false,
      },
    });
  }

  // 12. Parâmetros do Sistema
  const params = [
    { chave: 'ALCADA_VALOR_MAX_ISOLADO', valor: '1000.00', desc: 'Teto de aprovação direta da fiscalização sem autorização de instância superior' },
    { chave: 'ALCADA_VALOR_MAX_AGREGADO_30D', valor: '3000.00', desc: 'Teto agregado dos últimos 30 dias para a mesma unidade e categoria' },
    { chave: 'PRAZO_VALIDACAO_DIAS', valor: '5', desc: 'Prazo em dias corridos para validação pelo demandante antes do aceite tácito' },
    { chave: 'NOTA_VALIDACAO_TACITA', valor: '4', desc: 'Nota padrão atribuída em caso de homologação tácita por decurso de prazo' },
    { chave: 'PRAZO_GARANTIA_PADRAO_DIAS', valor: '90', desc: 'Prazo legal/contratual de garantia dos serviços executados' },
  ];

  for (const p of params) {
    await prisma.parametroSistema.upsert({
      where: { chave: p.chave },
      update: {},
      create: {
        chave: p.chave,
        valor: p.valor,
        descricao: p.desc,
      },
    });
  }

  // 13. Criar alguns chamados reais de demonstração no banco
  const tipoHidraulica = await prisma.tipoServico.findFirst({ where: { nome: 'Vazamento em tubulação' } });
  const tipoEletrica = await prisma.tipoServico.findFirst({ where: { nome: 'Substituição de disjuntor / reparo em quadro' } });
  const tipoClima = await prisma.tipoServico.findFirst({ where: { nome: 'Manutenção preventiva de ar split' } });
  const ambSala = await prisma.tipoAmbiente.findFirst({ where: { nome: 'Sala de Aula' } });
  const ambLab = await prisma.tipoAmbiente.findFirst({ where: { nome: 'Laboratório Didático / Pesquisa' } });
  const userDemandante = await prisma.usuario.findUnique({ where: { email: 'demandante@uern.br' } });

  if (tipoHidraulica && ambLab && userDemandante) {
    const chamado1 = await prisma.chamado.upsert({
      where: { numero: 1 },
      update: {},
      create: {
        numero: 1,
        titulo: 'Vazamento contínuo sob a bancada de química',
        setorEspecifico: 'Bloco IV - Laboratório 02 (Subsolo)',
        descricao: 'Vazamento constante na tubulação de esgoto sob a pia de descarte, com risco de infiltração na laje e sala inferior.',
        nivelCodigo: 'ALTA',
        nivelOrdem: 2,
        status: 'EM_ORCAMENTO',
        unidadeId: campusCentral.id,
        predioId: predioFafic.id,
        tipoAmbienteId: ambLab.id,
        tipoServicoId: tipoHidraulica.id,
        abertoPorId: userDemandante.id,
        empresaId: empresa.id,
        prazoLimite: new Date(Date.now() + 48 * 3600 * 1000),
        valorOrcado: 840.0,
        totalPrevisto: 840.0,
      },
    });

    // Insumos previstos para o chamado 1
    const item1 = await prisma.itemReferencia.findFirst({ where: { codigo: 'SINAPI-91188' } });
    const item2 = await prisma.itemReferencia.findFirst({ where: { codigo: 'SINAPI-88316' } });
    if (item1 && item2) {
      await prisma.chamadoInsumo.createMany({
        data: [
          {
            chamadoId: chamado1.id,
            tipoInsumo: 'PREVISTO',
            itemReferenciaId: item1.id,
            codigo: item1.codigo,
            descricao: item1.descricao,
            unidadeMedida: item1.unidadeMedida,
            quantidade: 4,
            valorUnitario: item1.precoUnitario,
            valorTotal: 130.0,
          },
          {
            chamadoId: chamado1.id,
            tipoInsumo: 'PREVISTO',
            itemReferenciaId: item2.id,
            codigo: item2.codigo,
            descricao: item2.descricao,
            unidadeMedida: item2.unidadeMedida,
            quantidade: 6,
            valorUnitario: item2.precoUnitario,
            valorTotal: 270.0,
          },
        ],
        skipDuplicates: true,
      });
    }

    // Timeline para chamado 1
    await prisma.chamadoTimeline.createMany({
      data: [
        {
          chamadoId: chamado1.id,
          statusNovo: 'ABERTO',
          responsavel: userDemandante.nome,
          observacao: 'Abertura do chamado com registro fotográfico do vazamento.',
        },
        {
          chamadoId: chamado1.id,
          statusNovo: 'RECEBIDO',
          responsavel: 'Empresa Contratada',
          observacao: 'Chamado visualizado e recebido na fila do Campus Central.',
        },
        {
          chamadoId: chamado1.id,
          statusNovo: 'EM_ORCAMENTO',
          responsavel: 'Empresa Contratada',
          observacao: 'Insumos SINAPI cotados. Aguardando validação de alçada orçamentária.',
        },
      ],
      skipDuplicates: true,
    });
  }

  if (tipoEletrica && ambSala && userDemandante) {
    const chamado2 = await prisma.chamado.upsert({
      where: { numero: 2 },
      update: {},
      create: {
        numero: 2,
        titulo: 'Disjuntor desarmando durante as aulas matutinas',
        setorEspecifico: 'Bloco III - Sala 14',
        descricao: 'Quadro elétrico secundário desarma ao ligar os aparelhos de ar condicionado simultaneamente com a iluminação.',
        nivelCodigo: 'NORMAL',
        nivelOrdem: 3,
        status: 'EM_EXECUCAO',
        unidadeId: campusCentral.id,
        predioId: predioCentral.id,
        tipoAmbienteId: ambSala.id,
        tipoServicoId: tipoEletrica.id,
        abertoPorId: userDemandante.id,
        empresaId: empresa.id,
        maoObra: 'FIXA',
        prazoLimite: new Date(Date.now() + 5 * 24 * 3600 * 1000),
        valorOrcado: 450.0,
        totalPrevisto: 450.0,
      },
    });

    await prisma.chamadoTimeline.createMany({
      data: [
        {
          chamadoId: chamado2.id,
          statusNovo: 'ABERTO',
          responsavel: userDemandante.nome,
          observacao: 'Chamado registrado com prioridade normal.',
        },
        {
          chamadoId: chamado2.id,
          statusNovo: 'AUTORIZADO',
          responsavel: 'Fiscal Técnico',
          observacao: 'Orçamento de R$ 450,00 aprovado dentro da alçada direta.',
        },
        {
          chamadoId: chamado2.id,
          statusNovo: 'EM_EXECUCAO',
          responsavel: 'Empresa Contratada',
          observacao: 'Eletricista alocado para substituição do disjuntor geral.',
        },
      ],
      skipDuplicates: true,
    });
  }

  console.log('--- Seed completo concluído com sucesso no Neon PostgreSQL! ---');
}

main()
  .catch((e) => {
    console.error('Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
