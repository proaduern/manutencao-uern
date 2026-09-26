const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=====================================================================');
  console.log('--- INICIANDO CARGA OFICIAL DOS CATÁLOGOS BASE (seed.sql - UERN) ---');
  console.log('=====================================================================\n');

  // 1. CIDADE / PRÉDIO (12 registros oficiais)
  console.log('1. Carregando Prédios / Campi (12 esperados)...');
  const prediosOficiais = [
    { idNum: 1, id: 'predio-mossoro-central', nome: 'Mossoró - Campus Central', municipio: 'Mossoró' },
    { idNum: 2, id: 'predio-mossoro-reitoria', nome: 'Mossoró - Reitoria/Epílogo', municipio: 'Mossoró' },
    { idNum: 3, id: 'predio-mossoro-faen', nome: 'Mossoró - FAEN', municipio: 'Mossoró' },
    { idNum: 4, id: 'predio-mossoro-npj', nome: 'Mossoró - NPJ', municipio: 'Mossoró' },
    { idNum: 5, id: 'predio-mossoro-facs', nome: 'Mossoró - FACS', municipio: 'Mossoró' },
    { idNum: 6, id: 'predio-pau-dos-ferros', nome: 'Pau dos Ferros', municipio: 'Pau dos Ferros' },
    { idNum: 7, id: 'predio-caico-sede-1', nome: 'Caicó - Sede I', municipio: 'Caicó' },
    { idNum: 8, id: 'predio-caico-clinicas', nome: 'Caicó - Clínicas', municipio: 'Caicó' },
    { idNum: 9, id: 'predio-assu-sede-1', nome: 'Assu - Sede I', municipio: 'Assu' },
    { idNum: 10, id: 'predio-assu-sede-2', nome: 'Assu - Sede II', municipio: 'Assu' },
    { idNum: 11, id: 'predio-natal', nome: 'Natal', municipio: 'Natal' },
    { idNum: 12, id: 'predio-patu', nome: 'Patu', municipio: 'Patu' },
  ];

  const mapaPrediosPorNum = {};

  for (const p of prediosOficiais) {
    let predio = await prisma.cidadePredio.findFirst({
      where: {
        OR: [{ nome: p.nome }, { id: p.id }],
      },
    });

    if (!predio) {
      predio = await prisma.cidadePredio.create({
        data: {
          id: p.id,
          nome: p.nome,
          campus: p.municipio,
          endereco: `${p.nome}, ${p.municipio} - RN`,
          ativo: true,
        },
      });
    } else {
      predio = await prisma.cidadePredio.update({
        where: { id: predio.id },
        data: {
          nome: p.nome,
          campus: p.municipio,
          ativo: true,
        },
      });
    }
    mapaPrediosPorNum[p.idNum] = predio.id;
  }
  console.log(`  ✓ 12 prédios carregados com sucesso!`);

  // 2. UNIDADES DEMANDANTES (44 registros oficiais)
  console.log('\n2. Carregando Unidades Demandantes (44 esperadas)...');
  const unidadesOficiais = [
    { idNum: 1, nome: 'FALA - DIREÇÃO', sigla: 'FALA', campus: 'Mossoró', predioNum: null },
    { idNum: 2, nome: 'FASSO - DIREÇÃO', sigla: 'FASSO', campus: 'Mossoró', predioNum: null },
    { idNum: 3, nome: 'FAEF - DIREÇÃO', sigla: 'FAEF', campus: 'Mossoró', predioNum: null },
    { idNum: 4, nome: 'FE - DIREÇÃO', sigla: 'FE', campus: 'Mossoró', predioNum: null },
    { idNum: 5, nome: 'FAD - DIREÇÃO', sigla: 'FAD', campus: 'Mossoró', predioNum: null },
    { idNum: 6, nome: 'FAD - NPJ', sigla: 'FAD-NPJ', campus: 'Mossoró', predioNum: 4 },
    { idNum: 7, nome: 'FAFIC - DIREÇÃO', sigla: 'FAFIC', campus: 'Mossoró', predioNum: null },
    { idNum: 8, nome: 'FANAT - DIREÇÃO', sigla: 'FANAT', campus: 'Mossoró', predioNum: null },
    { idNum: 9, nome: 'FACEM - DIREÇÃO', sigla: 'FACEM', campus: 'Mossoró', predioNum: null },
    { idNum: 10, nome: 'FAEN - DIREÇÃO', sigla: 'FAEN', campus: 'Mossoró', predioNum: 3 },
    { idNum: 11, nome: 'FACS - DIREÇÃO', sigla: 'FACS', campus: 'Mossoró', predioNum: 5 },
    { idNum: 12, nome: 'CAMPUS ASSU - DIREÇÃO', sigla: 'CAMPUS-ASSU', campus: 'Assu', predioNum: 9 },
    { idNum: 13, nome: 'CAMPUS PAU DOS FERROS - DIREÇÃO', sigla: 'CAMPUS-PAU-FERROS', campus: 'Pau dos Ferros', predioNum: 6 },
    { idNum: 14, nome: 'CAMPUS PATU - DIREÇÃO', sigla: 'CAMPUS-PATU', campus: 'Patu', predioNum: 12 },
    { idNum: 15, nome: 'CAMPUS NATAL - DIREÇÃO', sigla: 'CAMPUS-NATAL', campus: 'Natal', predioNum: 11 },
    { idNum: 16, nome: 'CAMPUS CAICÓ - DIREÇÃO', sigla: 'CAMPUS-CAICO', campus: 'Caicó', predioNum: 7 },
    { idNum: 17, nome: 'CAMPUS CAICÓ - CLINICAS E LAB', sigla: 'CAICO-CLIN', campus: 'Caicó', predioNum: 8 },
    { idNum: 18, nome: 'PROEG - Gabinete', sigla: 'PROEG', campus: 'Mossoró', predioNum: null },
    { idNum: 19, nome: 'PROPEG - Gabinete', sigla: 'PROPEG', campus: 'Mossoró', predioNum: null },
    { idNum: 20, nome: 'PROEX - Gabinete', sigla: 'PROEX', campus: 'Mossoró', predioNum: null },
    { idNum: 21, nome: 'PROEX - ACEU', sigla: 'PROEX-ACEU', campus: 'Mossoró', predioNum: null },
    { idNum: 22, nome: 'PRAE - Gabinete', sigla: 'PRAE', campus: 'Mossoró', predioNum: null },
    { idNum: 23, nome: 'PROAD - Gabinete', sigla: 'PROAD', campus: 'Mossoró', predioNum: 2 },
    { idNum: 24, nome: 'PROAD - DAS - EPÍLOGO DE CAMPOS', sigla: 'PROAD-DAS', campus: 'Mossoró', predioNum: 2 },
    { idNum: 25, nome: 'PROAD - DMP CAMPUS CENTRAL', sigla: 'PROAD-DMP', campus: 'Mossoró', predioNum: 1 },
    { idNum: 26, nome: 'PROAD - PATRIMONIO/ALMOXARIFADO', sigla: 'PROAD-ALMOX', campus: 'Mossoró', predioNum: null },
    { idNum: 27, nome: 'PROAD - ARQUIVO', sigla: 'PROAD-ARQ', campus: 'Mossoró', predioNum: null },
    { idNum: 28, nome: 'PROPLAN - Gabinete', sigla: 'PROPLAN', campus: 'Mossoró', predioNum: null },
    { idNum: 29, nome: 'PROGEP - Gabinete', sigla: 'PROGEP', campus: 'Mossoró', predioNum: null },
    { idNum: 30, nome: 'REITORIA', sigla: 'REITORIA', campus: 'Mossoró', predioNum: 2 },
    { idNum: 31, nome: 'STI', sigla: 'STI', campus: 'Mossoró', predioNum: 1 },
    { idNum: 32, nome: 'SOBE', sigla: 'SOBE', campus: 'Mossoró', predioNum: 1 },
    { idNum: 33, nome: 'UERNTV', sigla: 'UERNTV', campus: 'Mossoró', predioNum: 1 },
    { idNum: 34, nome: 'AGECOM', sigla: 'AGECOM', campus: 'Mossoró', predioNum: 1 },
    { idNum: 35, nome: 'DICE', sigla: 'DICE', campus: 'Mossoró', predioNum: 1 },
    { idNum: 36, nome: 'DIRI', sigla: 'DIRI', campus: 'Mossoró', predioNum: 1 },
    { idNum: 37, nome: 'DEAD', sigla: 'DEAD', campus: 'Mossoró', predioNum: 1 },
    { idNum: 38, nome: 'DIAAD', sigla: 'DIAAD', campus: 'Mossoró', predioNum: 1 },
    { idNum: 39, nome: 'DAIN', sigla: 'DAIN', campus: 'Mossoró', predioNum: 1 },
    { idNum: 40, nome: 'DSIB - BIBLIOTECA', sigla: 'DSIB', campus: 'Mossoró', predioNum: 1 },
    { idNum: 41, nome: 'EDUERN', sigla: 'EDUERN', campus: 'Mossoró', predioNum: 1 },
    { idNum: 42, nome: 'AAI', sigla: 'AAI', campus: 'Mossoró', predioNum: 1 },
    { idNum: 43, nome: 'AJUR', sigla: 'AJUR', campus: 'Mossoró', predioNum: 2 },
    { idNum: 44, nome: 'OUVIDORIA', sigla: 'OUVIDORIA', campus: 'Mossoró', predioNum: 2 },
  ];

  for (const u of unidadesOficiais) {
    const predioId = u.predioNum ? mapaPrediosPorNum[u.predioNum] : null;
    const codigoPadrao = `UERN-${String(u.idNum).padStart(3, '0')}`;
    const emailSugerido = `${u.sigla.toLowerCase().replace(/[^a-z0-9]/g, '')}@uern.br`;

    let unidadeExistente = await prisma.unidade.findFirst({
      where: {
        OR: [{ sigla: u.sigla }, { nome: u.nome }],
      },
    });

    if (!unidadeExistente) {
      await prisma.unidade.create({
        data: {
          nome: u.nome,
          sigla: u.sigla,
          campus: u.campus,
          codigo: codigoPadrao,
          email: emailSugerido,
          predioId,
          ativo: true,
        },
      });
    } else {
      await prisma.unidade.update({
        where: { id: unidadeExistente.id },
        data: {
          nome: u.nome,
          campus: u.campus,
          predioId: predioId || unidadeExistente.predioId,
          ativo: true,
        },
      });
    }
  }
  console.log(`  ✓ 44 unidades da UERN carregadas/atualizadas com sucesso!`);

  // 3. CATEGORIAS DE SERVIÇO (14 registros oficiais)
  console.log('\n3. Carregando Categorias de Serviço (14 esperadas)...');
  const categoriasOficiais = [
    { id: 1, nome: 'ALVENARIA' },
    { id: 2, nome: 'CALHAS / TELHADOS' },
    { id: 3, nome: "CAIXA D'ÁGUA E CISTERNAS" },
    { id: 4, nome: 'FORROS E DIVISÓRIAS' },
    { id: 5, nome: 'ELÉTRICA' },
    { id: 6, nome: 'FOSSA' },
    { id: 7, nome: 'HIDRÁULICA' },
    { id: 8, nome: 'MARCENARIA / CARPINTARIA' },
    { id: 9, nome: 'FIXAÇÃO DE OBJETOS' },
    { id: 10, nome: 'PORTAS E JANELAS' },
    { id: 11, nome: 'PORTÕES E GRADES' },
    { id: 12, nome: 'VIDROS E ESPELHOS' },
    { id: 13, nome: 'ENTULHOS' },
    { id: 14, nome: 'OUTRAS NÃO ESPECIFICADAS' },
  ];

  const mapaCategorias = {};

  for (const c of categoriasOficiais) {
    let cat = await prisma.categoriaServico.findUnique({
      where: { nome: c.nome },
    });

    if (!cat) {
      cat = await prisma.categoriaServico.create({
        data: {
          nome: c.nome,
          ativo: true,
        },
      });
    }
    mapaCategorias[c.id] = cat.id;
  }
  console.log(`  ✓ 14 categorias oficiais carregadas com sucesso!`);

  // 4. TIPOS DE SERVIÇO (83 registros oficiais)
  console.log('\n4. Carregando Tipos de Serviço (83 esperados)...');
  const tiposServicoOficiais = [
    // ALVENARIA (11)
    { catId: 1, nome: 'Coluna ou viga com ferro aparente', horas: 24 },
    { catId: 1, nome: 'Parede com infiltração aparente', horas: 48 },
    { catId: 1, nome: 'Caixas de esgoto ou de passagem sem tampa', horas: 24 },
    { catId: 1, nome: 'Reparo em tampa de caixas de esgoto ou de passagem', horas: 24 },
    { catId: 1, nome: 'Reparos em pisos de cerâmica', horas: 72 },
    { catId: 1, nome: 'Reparos em pisos de cimento e calçadas', horas: 72 },
    { catId: 1, nome: 'Reparos rápidos em pintura de parede', horas: 72 },
    { catId: 1, nome: 'Reparos rápidos em reboco com salitre', horas: 72 },
    { catId: 1, nome: 'Adaptação em bancada em alvenaria e pedras', horas: 96 },
    { catId: 1, nome: 'Reparo em bancada em alvenaria e pedras', horas: 48 },
    { catId: 1, nome: 'Outros serviços de alvenaria', horas: 72 },

    // CALHAS / TELHADOS (5)
    { catId: 2, nome: 'Forro/telhado com aparente risco de desabamento', horas: 3 },
    { catId: 2, nome: 'Goteiras, telhas quebradas ou deslocadas', horas: 24 },
    { catId: 2, nome: 'Infiltrações aparentes', horas: 48 },
    { catId: 2, nome: 'Limpeza de calhas e ralos de cobertura para evitar infiltrações', horas: 24 },
    { catId: 2, nome: 'Reparo em laje', horas: 72 },

    // CAIXA D'ÁGUA E CISTERNAS (2)
    { catId: 3, nome: "Limpeza de caixa d'água", horas: 48 },
    { catId: 3, nome: "Vazamento/infiltração em caixa d'água", horas: 24 },

    // FORROS E DIVISÓRIAS (9)
    { catId: 4, nome: 'Reparo em forro de gesso', horas: 48 },
    { catId: 4, nome: 'Reparo em forro de PVC', horas: 48 },
    { catId: 4, nome: 'Instalação de forro novo em gesso', horas: 96 },
    { catId: 4, nome: 'Instalação de forro novo em PVC', horas: 96 },
    { catId: 4, nome: 'Reparo em divisória em gesso', horas: 48 },
    { catId: 4, nome: 'Reparo em divisória em PVC', horas: 48 },
    { catId: 4, nome: 'Reparo em outro tipo de divisória', horas: 48 },
    { catId: 4, nome: 'Instalação de divisória nova em gesso', horas: 96 },
    { catId: 4, nome: 'Instalação de divisória nova em PVC', horas: 96 },

    // ELÉTRICA (16)
    { catId: 5, nome: 'Falta de energia em bloco ou sala específica', horas: 3 },
    { catId: 5, nome: 'Disjuntor desarmando', horas: 24 },
    { catId: 5, nome: 'Lâmpada queimada ou com defeito', horas: 48 },
    { catId: 5, nome: 'Instalação de ponto novo com lâmpada', horas: 72 },
    { catId: 5, nome: 'Tomada elétrica ou interruptor com defeito', horas: 24 },
    { catId: 5, nome: 'Instalação de ponto novo de tomada elétrica ou interruptor', horas: 72 },
    { catId: 5, nome: 'Ajuste elétrico para acionamento de lâmpadas', horas: 48 },
    { catId: 5, nome: 'Quadro de energia com problema', horas: 3 },
    { catId: 5, nome: 'Refletor queimado ou com defeito', horas: 48 },
    { catId: 5, nome: 'Instalação de ponto novo com refletor', horas: 72 },
    { catId: 5, nome: 'Instalação de refletor provisório para evento', horas: 24 },
    { catId: 5, nome: 'Eletrocalha com defeito/problema', horas: 48 },
    { catId: 5, nome: 'Canaleta com defeito/problema', horas: 48 },
    { catId: 5, nome: 'Caixa de tomada/quadro elétrico/eletrocalha sem tampa', horas: 24 },
    { catId: 5, nome: 'Fios, tomadas e cabos expostos', horas: 3 },
    { catId: 5, nome: 'Outros serviços elétricos', horas: 72 },

    // FOSSA (1)
    { catId: 6, nome: 'Esgotamento de fossa séptica', horas: 24 },

    // HIDRÁULICA (9)
    { catId: 7, nome: 'Falta de água em banheiro', horas: 3 },
    { catId: 7, nome: 'Caixas de descarga com defeito/vazamento', horas: 24 },
    { catId: 7, nome: 'Entupimentos de vasos, ralos ou encanações', horas: 3 },
    { catId: 7, nome: "Falha em boia de caixa d'água", horas: 24 },
    { catId: 7, nome: "Bomba d'água com defeito", horas: 3 },
    { catId: 7, nome: "Instalar nova bomba d'água", horas: 48 },
    { catId: 7, nome: 'Torneira, pia com defeito/vazamento', horas: 24 },
    { catId: 7, nome: 'Vaso sanitário ou mictório com defeito/vazamento', horas: 24 },
    { catId: 7, nome: 'Outros serviços hidráulicos', horas: 72 },

    // MARCENARIA / CARPINTARIA (5)
    { catId: 8, nome: 'Adaptação em bancadas em madeira', horas: 96 },
    { catId: 8, nome: 'Reparo em bancada em madeira', horas: 48 },
    { catId: 8, nome: 'Adaptação em estrutura de mobília', horas: 72 },
    { catId: 8, nome: 'Recuperação de pintura/estrutura em mobília', horas: 72 },
    { catId: 8, nome: 'Outros serviços de marcenaria/carpintaria', horas: 72 },

    // FIXAÇÃO DE OBJETOS (4)
    { catId: 9, nome: 'Fixação de ponto novo de dispenser/suportes diversos em parede', horas: 48 },
    { catId: 9, nome: 'Dispenser/suportes diversos com defeito em parede', horas: 48 },
    { catId: 9, nome: 'Fixação de móvel em parede', horas: 48 },
    { catId: 9, nome: 'Outros tipos de fixação', horas: 72 },

    // PORTAS E JANELAS (6)
    { catId: 10, nome: 'Dobradiças e corrediças de janelas/portas com defeito', horas: 48 },
    { catId: 10, nome: 'Fechadura com defeito ou chaves presas/quebradas', horas: 24 },
    { catId: 10, nome: 'Instalação nova de mola aérea em porta', horas: 48 },
    { catId: 10, nome: 'Mola aérea existente com defeito', horas: 48 },
    { catId: 10, nome: 'Porta não fecha ou com defeito', horas: 24 },
    { catId: 10, nome: 'Instalar cortina', horas: 72 },

    // PORTÕES E GRADES (4)
    { catId: 11, nome: 'Estrutura de portão com defeito', horas: 24 },
    { catId: 11, nome: 'Motor de portão com defeito', horas: 24 },
    { catId: 11, nome: 'Grade com defeito', horas: 48 },
    { catId: 11, nome: 'Instalação de grade nova', horas: 96 },

    // VIDROS E ESPELHOS (8)
    { catId: 12, nome: 'Instalar película', horas: 72 },
    { catId: 12, nome: 'Substituir película', horas: 72 },
    { catId: 12, nome: 'Adaptar porta existente e instalar vidro novo', horas: 96 },
    { catId: 12, nome: 'Espelho danificado', horas: 48 },
    { catId: 12, nome: 'Instalação de espelho em novo local', horas: 72 },
    { catId: 12, nome: 'Janela de vidro danificada', horas: 24 },
    { catId: 12, nome: 'Porta de vidro danificada', horas: 24 },
    { catId: 12, nome: 'Vidro em esquadria de porta/janela danificado', horas: 24 },

    // ENTULHOS (2)
    { catId: 13, nome: 'Recolhimento de entulhos diversos com máquina/caçamba', horas: 48 },
    { catId: 13, nome: 'Limpeza de matos com máquina', horas: 48 },

    // OUTRAS NÃO ESPECIFICADAS (1)
    { catId: 14, nome: 'Outros serviços não especificados', horas: 72 },
  ];

  let inseridosTipos = 0;
  for (const t of tiposServicoOficiais) {
    const categoriaRealId = mapaCategorias[t.catId];
    if (!categoriaRealId) continue;

    const tipoExistente = await prisma.tipoServico.findFirst({
      where: {
        categoriaId: categoriaRealId,
        nome: t.nome,
      },
    });

    if (!tipoExistente) {
      await prisma.tipoServico.create({
        data: {
          categoriaId: categoriaRealId,
          nome: t.nome,
          prazoEstimadoHoras: t.horas,
          ativo: true,
        },
      });
      inseridosTipos++;
    }
  }
  console.log(`  ✓ 83 tipos de serviço catalogados e associados às 14 categorias!`);

  // 5. TIPOS DE AMBIENTE (11 registros oficiais)
  console.log('\n5. Carregando Ambientes (11 esperados)...');
  const ambientesOficiais = [
    'Sala de aula',
    'Laboratório',
    'Auditório',
    'Ginásio',
    'Piscina',
    'Sala administrativa',
    'Banheiro',
    'Copa',
    'Corredor',
    'Biblioteca',
    'Pátios e outros ambientes abertos de uso coletivo',
  ];

  for (const amb of ambientesOficiais) {
    const existe = await prisma.tipoAmbiente.findUnique({
      where: { nome: amb },
    });
    if (!existe) {
      await prisma.tipoAmbiente.create({
        data: { nome: amb, ativo: true },
      });
    }
  }
  console.log(`  ✓ 11 tipos de ambiente normatizados com sucesso!`);

  // 6. NÍVEIS DE URGÊNCIA (6 registros oficiais normativos)
  console.log('\n6. Atualizando Níveis de Urgência & Prazos SLA (6 oficiais)...');
  const niveisOficiais = [
    { codigo: 'MAXIMA_GARANTIA', nome: 'Máxima - garantia', ordem: 1, horas: null, dias: null, data: false, frase: false },
    { codigo: 'MAXIMA', nome: 'Máxima - devolvido', ordem: 2, horas: null, dias: null, data: false, frase: false },
    { codigo: 'EMERGENCIA', nome: 'Emergência', ordem: 3, horas: 3, dias: null, data: false, frase: true },
    { codigo: 'URGENTE', nome: 'Urgente', ordem: 4, horas: 24, dias: null, data: false, frase: true },
    { codigo: 'NORMAL', nome: 'Normal/Corriqueiro', ordem: 5, horas: null, dias: 3, data: false, frase: true },
    { codigo: 'PROGRAMADO', nome: 'Programado', ordem: 6, horas: null, dias: null, data: true, frase: true },
  ];

  // Mapear chamados e frases de códigos antigos para os novos oficiais antes do upsert
  await prisma.chamado.updateMany({ where: { nivelCodigo: 'ALTA' }, data: { nivelCodigo: 'URGENTE' } });
  await prisma.chamado.updateMany({ where: { nivelCodigo: 'BAIXA' }, data: { nivelCodigo: 'NORMAL' } });
  await prisma.chamado.updateMany({ where: { nivelCodigo: 'PLANEJADA' }, data: { nivelCodigo: 'PROGRAMADO' } });

  await prisma.fraseUrgencia.updateMany({ where: { nivelCodigo: 'ALTA' }, data: { nivelCodigo: 'URGENTE' } });
  await prisma.fraseUrgencia.updateMany({ where: { nivelCodigo: 'BAIXA' }, data: { nivelCodigo: 'NORMAL' } });
  await prisma.fraseUrgencia.updateMany({ where: { nivelCodigo: 'PLANEJADA' }, data: { nivelCodigo: 'PROGRAMADO' } });

  for (const n of niveisOficiais) {
    await prisma.nivelUrgencia.upsert({
      where: { codigo: n.codigo },
      update: {
        nome: n.nome,
        ordem: n.ordem,
        prazoHorasCorridas: n.horas,
        prazoDiasUteis: n.dias,
        usaDataEsperada: n.data,
        selecionavelPorFrase: n.frase,
      },
      create: {
        codigo: n.codigo,
        nome: n.nome,
        ordem: n.ordem,
        prazoHorasCorridas: n.horas,
        prazoDiasUteis: n.dias,
        usaDataEsperada: n.data,
        selecionavelPorFrase: n.frase,
      },
    });
  }
  console.log(`  ✓ 6 níveis normativos carregados (EMERGENCIA: 3h, URGENTE: 24h, NORMAL: 3d úteis, PROGRAMADO: data marcada)!`);

  // 7. FRASES DE URGÊNCIA (8 frases oficiais do edital)
  console.log('\n7. Carregando Frases Oficiais de Impacto no Ambiente (8 oficiais)...');
  const frasesOficiais = [
    { frase: 'Risco aparente de incêndio', nivelCodigo: 'EMERGENCIA', ordem: 1, exigeData: false, nivelSugerido: 3 },
    { frase: 'Risco aparente à saúde e segurança das pessoas', nivelCodigo: 'EMERGENCIA', ordem: 2, exigeData: false, nivelSugerido: 3 },
    { frase: 'Impede acesso ao ambiente', nivelCodigo: 'EMERGENCIA', ordem: 3, exigeData: false, nivelSugerido: 3 },
    { frase: 'Impede funcionamento do ambiente', nivelCodigo: 'EMERGENCIA', ordem: 4, exigeData: false, nivelSugerido: 3 },
    { frase: 'Desperdício de água', nivelCodigo: 'URGENTE', ordem: 5, exigeData: false, nivelSugerido: 4 },
    { frase: 'Outras situações que podem aguardar até 3 dias', nivelCodigo: 'NORMAL', ordem: 6, exigeData: false, nivelSugerido: 5 },
    { frase: 'Melhorar a aparência ou usabilidade do ambiente, mas que não impede seu uso/funcionamento', nivelCodigo: 'PROGRAMADO', ordem: 7, exigeData: true, nivelSugerido: 6 },
    { frase: 'Outras situações que podem ser programadas', nivelCodigo: 'PROGRAMADO', ordem: 8, exigeData: true, nivelSugerido: 6 },
  ];

  for (const f of frasesOficiais) {
    const fraseExistente = await prisma.fraseUrgencia.findUnique({
      where: { frase: f.frase },
    });

    if (!fraseExistente) {
      await prisma.fraseUrgencia.create({
        data: {
          frase: f.frase,
          nivelCodigo: f.nivelCodigo,
          nivelSugerido: f.nivelSugerido,
          ordemExibicao: f.ordem,
          exigeData: f.exigeData,
          ativo: true,
        },
      });
    } else {
      await prisma.fraseUrgencia.update({
        where: { id: fraseExistente.id },
        data: {
          nivelCodigo: f.nivelCodigo,
          nivelSugerido: f.nivelSugerido,
          ordemExibicao: f.ordem,
          exigeData: f.exigeData,
          ativo: true,
        },
      });
    }
  }
  console.log(`  ✓ 8 frases oficiais de impacto carregadas com sucesso!`);

  // 8. PARÂMETROS DO SISTEMA (12 parâmetros regulamentares)
  console.log('\n8. Carregando Parâmetros do Sistema (12 oficiais)...');
  const paramsOficiais = [
    { chave: 'alcada_valor_limite', valor: '2000.00', desc: 'Valor a partir do qual o chamado exige autorização prévia', origem: 'ESPEC' },
    { chave: 'validacao_prazo_dias', valor: '5', desc: 'Dias corridos para o demandante validar antes do aceite tácito', origem: 'ESPEC' },
    { chave: 'aceite_tacito_nota', valor: '4', desc: 'Nota atribuída no aceite tácito', origem: 'ESPEC' },
    { chave: 'rating_limite_renovacao', valor: '4.00', desc: 'Média geral abaixo da qual o sistema sugere não renovação', origem: 'ESPEC' },
    { chave: 'foto_derivada_max_kb', valor: '50', desc: 'Tamanho máximo da imagem de listagem', origem: 'ESPEC' },
    { chave: 'timezone_operacao', valor: 'America/Fortaleza', desc: 'Fuso de referência para todo cálculo e exibição de prazo', origem: 'ESPEC' },
    { chave: 'antifracionamento_janela_dias', valor: '30', desc: 'Janela de agregação de chamados da mesma unidade e categoria para efeito de alçada', origem: 'REVISAO' },
    { chave: 'foto_original_max_mb', valor: '2', desc: 'Tamanho máximo da imagem original guardada como prova', origem: 'REVISAO' },
    { chave: 'rating_min_avaliacoes_exibir', valor: '5', desc: 'Abaixo disso o rating exibe "amostra insuficiente" em vez de número', origem: 'REVISAO' },
    { chave: 'rating_min_avaliacoes_parecer', valor: '30', desc: 'Mínimo de avaliações válidas para emitir parecer de não renovação', origem: 'REVISAO' },
    { chave: 'rating_excluir_nota_tacita', valor: 'true', desc: 'Exclui do rating as notas atribuídas por aceite tácito', origem: 'REVISAO' },
    { chave: 'divergencia_insumo_alerta_pct', valor: '20', desc: 'Divergência percentual entre insumo previsto e executado que entra na lista de exceção', origem: 'REVISAO' },
  ];

  for (const p of paramsOficiais) {
    await prisma.parametroSistema.upsert({
      where: { chave: p.chave },
      update: {
        valor: p.valor,
        descricao: p.desc,
        origem: p.origem,
      },
      create: {
        chave: p.chave,
        valor: p.valor,
        descricao: p.desc,
        origem: p.origem,
      },
    });
  }
  console.log(`  ✓ 12 parâmetros regulamentares do sistema carregados com sucesso!`);

  console.log('\n=====================================================================');
  console.log('--- ETAPA 1 CONCLUÍDA COM 100% DE SUCESSO! ---');
  console.log('=====================================================================');
}

main()
  .catch((err) => {
    console.error('ERRO AO APLICAR SEED OFICIAL:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
