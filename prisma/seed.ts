import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('=====================================================================');
  console.log('--- SEED OFICIAL UERN (CONFORME SEED.SQL E ESPECIFICAÇÃO) ---');
  console.log('=====================================================================\n');

  // 1. CIDADE / PRÉDIO (12 registros oficiais)
  console.log('1. Carregando Prédios / Campi (12 oficiais)...');
  const prediosOficiais = [
    { id: 'predio-mossoro-central', nome: 'Mossoró - Campus Central', municipio: 'Mossoró' },
    { id: 'predio-mossoro-reitoria', nome: 'Mossoró - Reitoria/Epílogo', municipio: 'Mossoró' },
    { id: 'predio-mossoro-faen', nome: 'Mossoró - FAEN', municipio: 'Mossoró' },
    { id: 'predio-mossoro-npj', nome: 'Mossoró - NPJ', municipio: 'Mossoró' },
    { id: 'predio-mossoro-facs', nome: 'Mossoró - FACS', municipio: 'Mossoró' },
    { id: 'predio-pau-dos-ferros', nome: 'Pau dos Ferros', municipio: 'Pau dos Ferros' },
    { id: 'predio-caico-sede-1', nome: 'Caicó - Sede I', municipio: 'Caicó' },
    { id: 'predio-caico-clinicas', nome: 'Caicó - Clínicas', municipio: 'Caicó' },
    { id: 'predio-assu-sede-1', nome: 'Assu - Sede I', municipio: 'Assu' },
    { id: 'predio-assu-sede-2', nome: 'Assu - Sede II', municipio: 'Assu' },
    { id: 'predio-natal', nome: 'Natal', municipio: 'Natal' },
    { id: 'predio-patu', nome: 'Patu', municipio: 'Patu' },
  ];

  const mapaPredios: Record<string, string> = {};
  for (const p of prediosOficiais) {
    const predio = await prisma.cidadePredio.upsert({
      where: { id: p.id },
      update: { nome: p.nome, campus: p.municipio, ativo: true },
      create: { id: p.id, nome: p.nome, campus: p.municipio, ativo: true },
    });
    mapaPredios[p.nome] = predio.id;
  }

  // 2. UNIDADES DEMANDANTES (44 registros oficiais)
  console.log('2. Carregando Unidades Demandantes (44 oficiais)...');
  const unidadesOficiais = [
    { idNum: 1, nome: 'FALA - DIREÇÃO', sigla: 'FALA', campus: 'Mossoró', predioNome: null },
    { idNum: 2, nome: 'FASSO - DIREÇÃO', sigla: 'FASSO', campus: 'Mossoró', predioNome: null },
    { idNum: 3, nome: 'FAEF - DIREÇÃO', sigla: 'FAEF', campus: 'Mossoró', predioNome: null },
    { idNum: 4, nome: 'FE - DIREÇÃO', sigla: 'FE', campus: 'Mossoró', predioNome: null },
    { idNum: 5, nome: 'FAD - DIREÇÃO', sigla: 'FAD', campus: 'Mossoró', predioNome: null },
    { idNum: 6, nome: 'FAD - NPJ', sigla: 'FAD-NPJ', campus: 'Mossoró', predioNome: 'Mossoró - NPJ' },
    { idNum: 7, nome: 'FAFIC - DIREÇÃO', sigla: 'FAFIC', campus: 'Mossoró', predioNome: null },
    { idNum: 8, nome: 'FANAT - DIREÇÃO', sigla: 'FANAT', campus: 'Mossoró', predioNome: null },
    { idNum: 9, nome: 'FACEM - DIREÇÃO', sigla: 'FACEM', campus: 'Mossoró', predioNome: null },
    { idNum: 10, nome: 'FAEN - DIREÇÃO', sigla: 'FAEN', campus: 'Mossoró', predioNome: 'Mossoró - FAEN' },
    { idNum: 11, nome: 'FACS - DIREÇÃO', sigla: 'FACS', campus: 'Mossoró', predioNome: 'Mossoró - FACS' },
    { idNum: 12, nome: 'CAMPUS ASSU - DIREÇÃO', sigla: 'CAMPUS-ASSU', campus: 'Assu', predioNome: 'Assu - Sede I' },
    { idNum: 13, nome: 'CAMPUS PAU DOS FERROS - DIREÇÃO', sigla: 'CAMPUS-PAU-FERROS', campus: 'Pau dos Ferros', predioNome: 'Pau dos Ferros' },
    { idNum: 14, nome: 'CAMPUS PATU - DIREÇÃO', sigla: 'CAMPUS-PATU', campus: 'Patu', predioNome: 'Patu' },
    { idNum: 15, nome: 'CAMPUS NATAL - DIREÇÃO', sigla: 'CAMPUS-NATAL', campus: 'Natal', predioNome: 'Natal' },
    { idNum: 16, nome: 'CAMPUS CAICÓ - DIREÇÃO', sigla: 'CAMPUS-CAICO', campus: 'Caicó', predioNome: 'Caicó - Sede I' },
    { idNum: 17, nome: 'CAMPUS CAICÓ - CLINICAS E LAB', sigla: 'CAICO-CLIN', campus: 'Caicó', predioNome: 'Caicó - Clínicas' },
    { idNum: 18, nome: 'PROEG - Gabinete', sigla: 'PROEG', campus: 'Mossoró', predioNome: null },
    { idNum: 19, nome: 'PROPEG - Gabinete', sigla: 'PROPEG', campus: 'Mossoró', predioNome: null },
    { idNum: 20, nome: 'PROEX - Gabinete', sigla: 'PROEX', campus: 'Mossoró', predioNome: null },
    { idNum: 21, nome: 'PROEX - ACEU', sigla: 'PROEX-ACEU', campus: 'Mossoró', predioNome: null },
    { idNum: 22, nome: 'PRAE - Gabinete', sigla: 'PRAE', campus: 'Mossoró', predioNome: null },
    { idNum: 23, nome: 'PROAD - Gabinete', sigla: 'PROAD', campus: 'Mossoró', predioNome: 'Mossoró - Reitoria/Epílogo' },
    { idNum: 24, nome: 'PROAD - DAS - EPÍLOGO DE CAMPOS', sigla: 'PROAD-DAS', campus: 'Mossoró', predioNome: 'Mossoró - Reitoria/Epílogo' },
    { idNum: 25, nome: 'PROAD - DMP CAMPUS CENTRAL', sigla: 'PROAD-DMP', campus: 'Mossoró', predioNome: 'Mossoró - Campus Central' },
    { idNum: 26, nome: 'PROAD - PATRIMONIO/ALMOXARIFADO', sigla: 'PROAD-ALMOX', campus: 'Mossoró', predioNome: null },
    { idNum: 27, nome: 'PROAD - ARQUIVO', sigla: 'PROAD-ARQ', campus: 'Mossoró', predioNome: null },
    { idNum: 28, nome: 'PROPLAN - Gabinete', sigla: 'PROPLAN', campus: 'Mossoró', predioNome: null },
    { idNum: 29, nome: 'PROGEP - Gabinete', sigla: 'PROGEP', campus: 'Mossoró', predioNome: null },
    { idNum: 30, nome: 'REITORIA', sigla: 'REITORIA', campus: 'Mossoró', predioNome: 'Mossoró - Reitoria/Epílogo' },
    { idNum: 31, nome: 'STI', sigla: 'STI', campus: 'Mossoró', predioNome: 'Mossoró - Campus Central' },
    { idNum: 32, nome: 'SOBE', sigla: 'SOBE', campus: 'Mossoró', predioNome: 'Mossoró - Campus Central' },
    { idNum: 33, nome: 'UERNTV', sigla: 'UERNTV', campus: 'Mossoró', predioNome: 'Mossoró - Campus Central' },
    { idNum: 34, nome: 'AGECOM', sigla: 'AGECOM', campus: 'Mossoró', predioNome: 'Mossoró - Campus Central' },
    { idNum: 35, nome: 'DICE', sigla: 'DICE', campus: 'Mossoró', predioNome: 'Mossoró - Campus Central' },
    { idNum: 36, nome: 'DIRI', sigla: 'DIRI', campus: 'Mossoró', predioNome: 'Mossoró - Campus Central' },
    { idNum: 37, nome: 'DEAD', sigla: 'DEAD', campus: 'Mossoró', predioNome: 'Mossoró - Campus Central' },
    { idNum: 38, nome: 'DIAAD', sigla: 'DIAAD', campus: 'Mossoró', predioNome: 'Mossoró - Campus Central' },
    { idNum: 39, nome: 'DAIN', sigla: 'DAIN', campus: 'Mossoró', predioNome: 'Mossoró - Campus Central' },
    { idNum: 40, nome: 'DSIB - BIBLIOTECA', sigla: 'DSIB', campus: 'Mossoró', predioNome: 'Mossoró - Campus Central' },
    { idNum: 41, nome: 'EDUERN', sigla: 'EDUERN', campus: 'Mossoró', predioNome: 'Mossoró - Campus Central' },
    { idNum: 42, nome: 'AAI', sigla: 'AAI', campus: 'Mossoró', predioNome: 'Mossoró - Campus Central' },
    { idNum: 43, nome: 'AJUR', sigla: 'AJUR', campus: 'Mossoró', predioNome: 'Mossoró - Reitoria/Epílogo' },
    { idNum: 44, nome: 'OUVIDORIA', sigla: 'OUVIDORIA', campus: 'Mossoró', predioNome: 'Mossoró - Reitoria/Epílogo' },
  ];

  let unidadeProadId = '';
  for (const u of unidadesOficiais) {
    const predioId = u.predioNome ? mapaPredios[u.predioNome] : null;
    const codigoPadrao = `UERN-${String(u.idNum).padStart(3, '0')}`;
    const emailSugerido = `${u.sigla.toLowerCase().replace(/[^a-z0-9]/g, '')}@uern.br`;

    const un = await prisma.unidade.upsert({
      where: { sigla: u.sigla },
      update: { nome: u.nome, campus: u.campus, predioId, ativo: true },
      create: {
        nome: u.nome,
        sigla: u.sigla,
        campus: u.campus,
        codigo: codigoPadrao,
        email: emailSugerido,
        predioId,
        ativo: true,
      },
    });

    if (u.sigla === 'PROAD') unidadeProadId = un.id;
  }

  // 3. CATEGORIAS DE SERVIÇO (14 oficiais)
  console.log('3. Carregando Categorias de Serviço (14 oficiais)...');
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

  const mapaCats: Record<number, number> = {};
  for (const c of categoriasOficiais) {
    const cat = await prisma.categoriaServico.upsert({
      where: { nome: c.nome },
      update: { ativo: true },
      create: { nome: c.nome, ativo: true },
    });
    mapaCats[c.id] = cat.id;
  }

  // 4. TIPOS DE AMBIENTE (11 oficiais)
  console.log('4. Carregando Ambientes (11 oficiais)...');
  const ambientesOficiais = [
    'Sala de aula', 'Laboratório', 'Auditório', 'Ginásio', 'Piscina',
    'Sala administrativa', 'Banheiro', 'Copa', 'Corredor', 'Biblioteca',
    'Pátios e outros ambientes abertos de uso coletivo',
  ];
  for (const amb of ambientesOficiais) {
    await prisma.tipoAmbiente.upsert({
      where: { nome: amb },
      update: { ativo: true },
      create: { nome: amb, ativo: true },
    });
  }

  // 5. NÍVEIS DE URGÊNCIA (6 oficiais)
  console.log('5. Carregando Níveis de Urgência (6 oficiais)...');
  const niveisOficiais = [
    { codigo: 'MAXIMA_GARANTIA', nome: 'Máxima - garantia', ordem: 1, horas: null, dias: null, data: false, frase: false },
    { codigo: 'MAXIMA', nome: 'Máxima - devolvido', ordem: 2, horas: null, dias: null, data: false, frase: false },
    { codigo: 'EMERGENCIA', nome: 'Emergência', ordem: 3, horas: 3, dias: null, data: false, frase: true },
    { codigo: 'URGENTE', nome: 'Urgente', ordem: 4, horas: 24, dias: null, data: false, frase: true },
    { codigo: 'NORMAL', nome: 'Normal/Corriqueiro', ordem: 5, horas: null, dias: 3, data: false, frase: true },
    { codigo: 'PROGRAMADO', nome: 'Programado', ordem: 6, horas: null, dias: null, data: true, frase: true },
  ];
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

  // 6. FRASES DE URGÊNCIA (8 oficiais)
  console.log('6. Carregando Frases de Urgência (8 oficiais)...');
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
    await prisma.fraseUrgencia.upsert({
      where: { frase: f.frase },
      update: {
        nivelCodigo: f.nivelCodigo,
        nivelSugerido: f.nivelSugerido,
        ordemExibicao: f.ordem,
        exigeData: f.exigeData,
        ativo: true,
      },
      create: {
        frase: f.frase,
        nivelCodigo: f.nivelCodigo,
        nivelSugerido: f.nivelSugerido,
        ordemExibicao: f.ordem,
        exigeData: f.exigeData,
        ativo: true,
      },
    });
  }

  // 7. PARÂMETROS DO SISTEMA (12 regulamentares)
  console.log('7. Carregando Parâmetros do Sistema (12 regulamentares)...');
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
      update: { valor: p.valor, descricao: p.desc, origem: p.origem },
      create: { chave: p.chave, valor: p.valor, descricao: p.desc, origem: p.origem },
    });
  }

  // 8. EMPRESA CONTRATADA & CONTRATO
  console.log('8. Carregando Empresa Contratada e Contrato...');
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

  await prisma.contrato.upsert({
    where: { numero_ano: { numero: 'CT 014/2025', ano: 2025 } },
    update: {},
    create: {
      numero: 'CT 014/2025',
      ano: 2025,
      empresaId: empresa.id,
      objeto: 'Prestação de serviços contínuos de manutenção predial preventiva e corretiva nos prédios da UERN.',
      dataInicio: new Date('2025-01-01T00:00:00Z'),
      dataFim: new Date('2026-12-31T23:59:59Z'),
      mesesVigencia: 24,
      prazoGarantiaDias: 90,
      valorTotal: 2400000.0,
      saldoDisponivel: 1580400.0,
    },
  });

  // 9. USUÁRIOS PADRÃO (7 papéis da especificação, senha: uern@2026)
  console.log('9. Carregando Usuários Padrão para os 7 perfis...');
  const senhaHash = await bcrypt.hash('uern@2026', 10);
  const usuarios = [
    { nome: 'Administrador PROAD', email: 'admin.manutencao@uern.br', role: Role.ADMIN, unidadeId: unidadeProadId },
    { nome: 'Gestor do Contrato de Manutenção', email: 'gestor.contrato@uern.br', role: Role.GESTOR_CONTRATO, unidadeId: unidadeProadId },
    { nome: 'Eng. Fiscal Técnico Predial', email: 'fiscal.tecnico@uern.br', role: Role.FISCAL_TECNICO, unidadeId: unidadeProadId },
    { nome: 'Fiscal Administrativo do Contrato', email: 'fiscal.adm@uern.br', role: Role.FISCAL_ADM, unidadeId: unidadeProadId },
    { nome: 'Fiscal Setorial de Mossoró', email: 'fiscal.setorial@uern.br', role: Role.FISCAL_SETORIAL, unidadeId: unidadeProadId },
    { nome: 'Prof. Carlos Eduardo (Demandante)', email: 'demandante@uern.br', role: Role.DEMANDANTE, unidadeId: unidadeProadId },
    { nome: 'Preposto da Empresa Contratada', email: 'empresa@manutencao.com.br', role: Role.EMPRESA, empresaId: empresa.id },
  ];

  for (const u of usuarios) {
    await prisma.usuario.upsert({
      where: { email: u.email },
      update: { role: u.role, unidadeId: u.unidadeId || null, empresaId: u.empresaId || null },
      create: {
        nome: u.nome,
        email: u.email,
        senhaHash,
        role: u.role,
        unidadeId: u.unidadeId || null,
        empresaId: u.empresaId || null,
        deveTrocarSenha: false,
      },
    });
  }

  console.log('\n=====================================================================');
  console.log('--- SEED CONCLUÍDO COM SUCESSO! ---');
  console.log('=====================================================================');
}

main()
  .catch((e) => {
    console.error('Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
