import prisma from '@/lib/prisma';

export const STATUS_PROVISIONADOS = ['AUTORIZADO', 'EM_EXECUCAO', 'ATENDIDO', 'DEVOLVIDO'] as const;
export const STATUS_LIQUIDADOS = ['EM_GARANTIA', 'CONCLUIDO'] as const;

export interface GrandezasFinanceirasContrato {
  valorContratado: number;
  valorProvisionado: number;
  valorLiquidado: number;
  saldoDisponivel: number;
  percentualConsumido: number;
}

export interface GrandezasFinanceirasCota {
  id: string;
  unidadeId: string;
  unidadeNome: string;
  campus?: string | null;
  sigla?: string | null;
  email?: string | null;
  telefone?: string | null;
  cotaMensal: number;
  cotaContratada: number; // Cota anual
  valorProvisionado: number;
  valorLiquidado: number;
  saldoDisponivel: number;
  percentualConsumido: number;
}

export interface ResultadoSaldo {
  temSaldo: boolean;
  motivo?: string;
  tipoBloqueio?: 'COTA_UNIDADE' | 'SALDO_GLOBAL';
  saldoDisponivelCota?: number;
  saldoDisponivelGlobal?: number;
  contratoId?: string;
}

export interface GrandezasRubrica {
  codigo: 'MAO_OBRA' | 'INSUMOS' | 'SERVICOS_EVENTUAIS' | 'DIARIAS';
  nome: string;
  tipo: 'FIXO' | 'SOB_DEMANDA';
  descricao: string;
  valorContratado: number;
  valorProvisionado: number;
  valorLiquidado: number;
  saldoDisponivel: number;
  percentualConsumido: number;
  contratado?: number;
  provisionado?: number;
  liquidado?: number;
  unidadeMedida?: string;
  quantidadeContratada?: number;
  quantidadeProvisionada?: number;
  quantidadeLiquidada?: number;
  quantidadeDisponivel?: number;
  diasContratados?: number;
  diasProvisionados?: number;
  diasLiquidados?: number;
  saldoDiasDisponivel?: number;
  valorDiariaUnitario?: number;
  custoMensal?: number;
  quantidadePostos?: number;
  isFixo?: boolean;
}

export interface ResultadoGrandezasContrato {
  contrato: any;
  grandezasContrato: GrandezasFinanceirasContrato;
  rubricas: {
    maoObra: GrandezasRubrica;
    insumos: GrandezasRubrica;
    servicosEventuais: GrandezasRubrica;
    diarias: GrandezasRubrica;
  };
  cotas: GrandezasFinanceirasCota[];
}

/**
 * Calcula com precisão centesimal as Grandezas Financeiras e o Controle de Saldo por Rubrica:
 * 1. Mão de Obra Residente (Fixa: Dedicada ao contrato, não sofre dedução por chamados)
 * 2. Insumos sob Demanda (Variável: Deduzido a partir dos insumos executados nos chamados rotineiros)
 * 3. Serviços Eventuais (Variável: Deduzido quando o chamado envolver serviço eventual = MO eventual + materiais)
 * 4. Diárias de Deslocamento (Variável: Deduzido quando o atendimento demandar deslocamento de MO residente para outra sede)
 */
export async function obterGrandezasContrato(contratoId: string): Promise<ResultadoGrandezasContrato | null> {
  const contrato = await prisma.contrato.findUnique({
    where: { id: contratoId },
    include: {
      empresa: true,
      aditivos: { where: { tipo: 'VALOR' } },
      itensMaoObra: {
        include: {
          funcionarios: { where: { ativo: true } },
        },
      },
      unidades: {
        include: {
          unidade: { select: { id: true, nome: true, campus: true, sigla: true, email: true, telefone: true } },
        },
        orderBy: { unidade: { nome: 'asc' } },
      },
    },
  });

  if (!contrato) return null;

  // Valor Contratado Base + Aditivos de Valor devidamente empenhados
  const valorBase = parseFloat(contrato.valorTotal.toString());

  // Valores das 4 Rubricas do Contrato
  const contratadoMaoObra = parseFloat((contrato.valorMaoObraResidente || 0).toString());
  const contratadoInsumos = parseFloat((contrato.valorInsumos || 0).toString());
  const contratadoEventuais = parseFloat((contrato.valorServicosEventuais || 0).toString());
  const contratadoDiarias = parseFloat((contrato.valorDiarias || 0).toString());
  const valorDiariaUnitario = parseFloat((contrato.valorDiariaUnitario || 150.0).toString());
  const custoMensalMaoObra = contrato.itensMaoObra?.reduce((acc: number, item: any) => {
    const q = item.quantidadePostos || 1;
    const v = parseFloat((item.valorMensalPosto || 0).toString());
    return acc + q * v;
  }, 0) || 0;
  
  // Buscar chamados da empresa deste contrato
  const chamados = await prisma.chamado.findMany({
    where: {
      OR: [
        { empresaId: contrato.empresaId },
        { empresaId: null }, // Chamados ainda sem empresa expressa consomem do contrato ativo
      ],
      status: {
        in: [
          'AUTORIZADO',
          'EM_EXECUCAO',
          'ATENDIDO',
          'DEVOLVIDO',
          'EM_GARANTIA',
          'CONCLUIDO',
        ],
      },
    },
    select: {
      id: true,
      unidadeId: true,
      valorOrcado: true,
      totalPrevisto: true,
      totalExecutado: true,
      status: true,
      maoObra: true,
      houveDeslocamento: true,
      diasDeslocamento: true,
      valorDiariaUnitario: true,
      valorTotalDiarias: true,
      insumos: {
        select: {
          tipoInsumo: true,
          valorTotal: true,
        },
      },
    },
  });

  let totalProvisionadoGlobal = 0;
  let totalLiquidadoGlobal = 0;
  const gastosPorUnidade: Record<string, { provisionado: number; liquidado: number }> = {};

  // Acumuladores específicos por rubrica
  let provisionadoInsumos = 0;
  let liquidadoInsumos = 0;

  let provisionadoEventuais = 0;
  let liquidadoEventuais = 0;

  let provisionadoDiarias = 0;
  let liquidadoDiarias = 0;
  let diasProvisionados = 0;
  let diasLiquidados = 0;

  for (const c of chamados) {
    const isLiquidado = STATUS_LIQUIDADOS.includes(c.status as any);
    const isProvisionado = STATUS_PROVISIONADOS.includes(c.status as any);

    // 1. Apuração de Diárias de Deslocamento de Sede (se houve)
    let valorChamadoDiarias = 0;
    if (c.houveDeslocamento && (c.diasDeslocamento || 0) > 0) {
      const vUnit = c.valorDiariaUnitario ? parseFloat(c.valorDiariaUnitario.toString()) : valorDiariaUnitario;
      const qtdDias = c.diasDeslocamento || 0;
      valorChamadoDiarias = c.valorTotalDiarias
        ? parseFloat(c.valorTotalDiarias.toString())
        : qtdDias * vUnit;

      if (isLiquidado) {
        liquidadoDiarias += valorChamadoDiarias;
        diasLiquidados += qtdDias;
      } else if (isProvisionado) {
        provisionadoDiarias += valorChamadoDiarias;
        diasProvisionados += qtdDias;
      }
    }

    // 2. Apuração de Serviços Eventuais vs Insumos Rotineiros
    let valorChamadoServico = 0;

    if (c.maoObra === 'EVENTUAL') {
      // Chamado atendido por serviço eventual (mão de obra eventual + insumos incorporados)
      const orcadoEventual = c.totalPrevisto
        ? parseFloat(c.totalPrevisto.toString())
        : c.valorOrcado
        ? parseFloat(c.valorOrcado.toString())
        : 0;
      const executadoEventual = c.totalExecutado
        ? parseFloat(c.totalExecutado.toString())
        : orcadoEventual;

      valorChamadoServico = isLiquidado ? executadoEventual : orcadoEventual;

      if (isLiquidado) {
        liquidadoEventuais += executadoEventual;
      } else if (isProvisionado) {
        provisionadoEventuais += orcadoEventual;
      }
    } else {
      // Chamado rotineiro atendido por mão de obra residente (MO residente é fixa, debita apenas insumos)
      const insumosPrevistos = c.insumos
        ? c.insumos.filter((i) => i.tipoInsumo === 'PREVISTO').reduce((acc, i) => acc + parseFloat(i.valorTotal.toString()), 0)
        : 0;
      const insumosExecutados = c.insumos
        ? c.insumos.filter((i) => i.tipoInsumo === 'EXECUTADO').reduce((acc, i) => acc + parseFloat(i.valorTotal.toString()), 0)
        : 0;

      const fallbackOrcado = c.totalPrevisto
        ? parseFloat(c.totalPrevisto.toString())
        : c.valorOrcado
        ? parseFloat(c.valorOrcado.toString())
        : 0;
      const fallbackExecutado = c.totalExecutado
        ? parseFloat(c.totalExecutado.toString())
        : fallbackOrcado;

      const custoInsumoPrev = insumosPrevistos > 0 ? insumosPrevistos : fallbackOrcado;
      const custoInsumoExec = insumosExecutados > 0 ? insumosExecutados : fallbackExecutado;

      valorChamadoServico = isLiquidado ? custoInsumoExec : custoInsumoPrev;

      if (isLiquidado) {
        liquidadoInsumos += custoInsumoExec;
      } else if (isProvisionado) {
        provisionadoInsumos += custoInsumoPrev;
      }
    }

    // Total debitado para cota da unidade e saldo global (Serviço/Insumo + Diárias se houver)
    const debitoTotalChamado = valorChamadoServico + valorChamadoDiarias;

    if (!gastosPorUnidade[c.unidadeId]) {
      gastosPorUnidade[c.unidadeId] = { provisionado: 0, liquidado: 0 };
    }

    if (isLiquidado) {
      totalLiquidadoGlobal += debitoTotalChamado;
      gastosPorUnidade[c.unidadeId].liquidado += debitoTotalChamado;
    } else if (isProvisionado) {
      totalProvisionadoGlobal += debitoTotalChamado;
      gastosPorUnidade[c.unidadeId].provisionado += debitoTotalChamado;
    }
  }

  // 3. Apuração das Demandas da Agenda de Serviços Programados (Serviços Eventuais)
  const STATUS_PROVISIONADOS_AGENDA = ['AUTORIZADA', 'EM_EXECUCAO', 'AGUARDANDO_ACEITE_UNIDADE', 'EM_CORRECAO_EMPRESA'];
  const STATUS_LIQUIDADOS_AGENDA = ['CONCLUIDA'];

  const demandasAgenda = await prisma.agendaDemanda.findMany({
    where: {
      status: {
        in: [
          'AUTORIZADA',
          'EM_EXECUCAO',
          'AGUARDANDO_ACEITE_UNIDADE',
          'EM_CORRECAO_EMPRESA',
          'CONCLUIDA',
        ],
      },
    },
    include: {
      proposta: true,
    },
  });

  for (const d of demandasAgenda) {
    const valHomologado = d.proposta?.valorFinalHomologado
      ? parseFloat(d.proposta.valorFinalHomologado.toString())
      : d.proposta?.valorTotalProposto
      ? parseFloat(d.proposta.valorTotalProposto.toString())
      : d.estimativaDemandante
      ? parseFloat(d.estimativaDemandante.toString())
      : 0;

    if (valHomologado <= 0) continue;

    const isLiquidado = STATUS_LIQUIDADOS_AGENDA.includes(d.status);
    const isProvisionado = STATUS_PROVISIONADOS_AGENDA.includes(d.status);

    if (isLiquidado) {
      liquidadoEventuais += valHomologado;
      totalLiquidadoGlobal += valHomologado;
      if (!gastosPorUnidade[d.unidadeId]) gastosPorUnidade[d.unidadeId] = { provisionado: 0, liquidado: 0 };
      gastosPorUnidade[d.unidadeId].liquidado += valHomologado;
    } else if (isProvisionado) {
      provisionadoEventuais += valHomologado;
      totalProvisionadoGlobal += valHomologado;
      if (!gastosPorUnidade[d.unidadeId]) gastosPorUnidade[d.unidadeId] = { provisionado: 0, liquidado: 0 };
      gastosPorUnidade[d.unidadeId].provisionado += valHomologado;
    }
  }

  const saldoDisponivelGlobal = Math.max(0, Number((valorBase - totalProvisionadoGlobal - totalLiquidadoGlobal).toFixed(2)));
  const percentualConsumidoGlobal = valorBase > 0
    ? Math.min(100, Math.round(((totalProvisionadoGlobal + totalLiquidadoGlobal) / valorBase) * 100))
    : 0;

  // Cálculos por Rubrica
  // 1. Mão de Obra Residente (Fixo)
  const totalPostosContratados = contrato.itensMaoObra?.reduce((acc: number, item: any) => acc + (item.quantidadePostos || 1), 0) || 0;
  const rubricaMaoObra: GrandezasRubrica = {
    codigo: 'MAO_OBRA',
    nome: 'Mão de Obra Residente',
    tipo: 'FIXO',
    descricao: 'Postos de trabalho fixos dedicados à UERN. Custo mensal contratado fixo (não sofre desconto por chamados).',
    valorContratado: Number(contratadoMaoObra.toFixed(2)),
    valorProvisionado: 0,
    valorLiquidado: Number(contratadoMaoObra.toFixed(2)),
    saldoDisponivel: 0,
    percentualConsumido: 100,
    contratado: Number(contratadoMaoObra.toFixed(2)),
    provisionado: 0,
    liquidado: Number(contratadoMaoObra.toFixed(2)),
    custoMensal: Number(custoMensalMaoObra.toFixed(2)),
    quantidadePostos: totalPostosContratados,
    isFixo: true,
    unidadeMedida: 'postos',
    quantidadeContratada: totalPostosContratados,
    quantidadeDisponivel: totalPostosContratados,
  };

  // 2. Insumos sob Demanda
  const saldoInsumos = Math.max(0, Number((contratadoInsumos - provisionadoInsumos - liquidadoInsumos).toFixed(2)));
  const percInsumos = contratadoInsumos > 0
    ? Math.min(100, Math.round(((provisionadoInsumos + liquidadoInsumos) / contratadoInsumos) * 100))
    : 0;
  const rubricaInsumos: GrandezasRubrica = {
    codigo: 'INSUMOS',
    nome: 'Insumos sob Demanda',
    tipo: 'SOB_DEMANDA',
    descricao: 'Materiais e peças aplicados nos chamados rotineiros atendidos pela mão de obra residente.',
    valorContratado: Number(contratadoInsumos.toFixed(2)),
    valorProvisionado: Number(provisionadoInsumos.toFixed(2)),
    valorLiquidado: Number(liquidadoInsumos.toFixed(2)),
    saldoDisponivel: saldoInsumos,
    percentualConsumido: percInsumos,
    contratado: Number(contratadoInsumos.toFixed(2)),
    provisionado: Number(provisionadoInsumos.toFixed(2)),
    liquidado: Number(liquidadoInsumos.toFixed(2)),
  };

  // 3. Serviços Eventuais
  const saldoEventuais = Math.max(0, Number((contratadoEventuais - provisionadoEventuais - liquidadoEventuais).toFixed(2)));
  const percEventuais = contratadoEventuais > 0
    ? Math.min(100, Math.round(((provisionadoEventuais + liquidadoEventuais) / contratadoEventuais) * 100))
    : 0;
  const rubricaServicosEventuais: GrandezasRubrica = {
    codigo: 'SERVICOS_EVENTUAIS',
    nome: 'Serviços Eventuais',
    tipo: 'SOB_DEMANDA',
    descricao: 'Serviços especializados sob demanda. Englobam mão de obra eventual e insumos incorporados ao serviço.',
    valorContratado: Number(contratadoEventuais.toFixed(2)),
    valorProvisionado: Number(provisionadoEventuais.toFixed(2)),
    valorLiquidado: Number(liquidadoEventuais.toFixed(2)),
    saldoDisponivel: saldoEventuais,
    percentualConsumido: percEventuais,
    contratado: Number(contratadoEventuais.toFixed(2)),
    provisionado: Number(provisionadoEventuais.toFixed(2)),
    liquidado: Number(liquidadoEventuais.toFixed(2)),
  };

  // 4. Diárias de Deslocamento
  const saldoDiarias = Math.max(0, Number((contratadoDiarias - provisionadoDiarias - liquidadoDiarias).toFixed(2)));
  const percDiarias = contratadoDiarias > 0
    ? Math.min(100, Math.round(((provisionadoDiarias + liquidadoDiarias) / contratadoDiarias) * 100))
    : 0;
  const qtdDiariasContratadas = valorDiariaUnitario > 0 ? Math.floor(contratadoDiarias / valorDiariaUnitario) : 0;
  const qtdDiariasDisponiveis = valorDiariaUnitario > 0 ? Math.floor(saldoDiarias / valorDiariaUnitario) : 0;

  const rubricaDiarias: GrandezasRubrica = {
    codigo: 'DIARIAS',
    nome: 'Diárias de Deslocamento',
    tipo: 'SOB_DEMANDA',
    descricao: 'Deslocamento de profissionais residentes entre sedes/campi da UERN para atendimento de chamados.',
    valorContratado: Number(contratadoDiarias.toFixed(2)),
    valorProvisionado: Number(provisionadoDiarias.toFixed(2)),
    valorLiquidado: Number(liquidadoDiarias.toFixed(2)),
    saldoDisponivel: saldoDiarias,
    percentualConsumido: percDiarias,
    contratado: Number(contratadoDiarias.toFixed(2)),
    provisionado: Number(provisionadoDiarias.toFixed(2)),
    liquidado: Number(liquidadoDiarias.toFixed(2)),
    valorDiariaUnitario,
    diasContratados: qtdDiariasContratadas,
    diasProvisionados: diasProvisionados,
    diasLiquidados: diasLiquidados,
    saldoDiasDisponivel: qtdDiariasDisponiveis,
    unidadeMedida: 'diárias',
    quantidadeContratada: qtdDiariasContratadas,
    quantidadeProvisionada: diasProvisionados,
    quantidadeLiquidada: diasLiquidados,
    quantidadeDisponivel: qtdDiariasDisponiveis,
  };

  // Montar grandezas por cota de unidade
  const cotasFormatadas: GrandezasFinanceirasCota[] = contrato.unidades.map((cu) => {
    const cotaContratada = parseFloat(cu.cotaAnual.toString());
    const cotaMensal = parseFloat(cu.cotaMensal.toString());
    const gastos = gastosPorUnidade[cu.unidadeId] || { provisionado: 0, liquidado: 0 };

    const provisionado = Number(gastos.provisionado.toFixed(2));
    const liquidado = Number(gastos.liquidado.toFixed(2));
    const saldoDisponivel = Math.max(0, Number((cotaContratada - provisionado - liquidado).toFixed(2)));
    const percentualConsumido = cotaContratada > 0
      ? Math.min(100, Math.round(((provisionado + liquidado) / cotaContratada) * 100))
      : 0;

    return {
      id: cu.id,
      unidadeId: cu.unidadeId,
      unidadeNome: cu.unidade.nome,
      campus: cu.unidade.campus,
      sigla: cu.unidade.sigla,
      email: cu.unidade.email,
      telefone: cu.unidade.telefone,
      cotaMensal,
      cotaContratada,
      valorProvisionado: provisionado,
      valorLiquidado: liquidado,
      saldoDisponivel,
      percentualConsumido,
    };
  });

  return {
    contrato,
    grandezasContrato: {
      valorContratado: valorBase,
      valorProvisionado: Number(totalProvisionadoGlobal.toFixed(2)),
      valorLiquidado: Number(totalLiquidadoGlobal.toFixed(2)),
      saldoDisponivel: saldoDisponivelGlobal,
      percentualConsumido: percentualConsumidoGlobal,
    } as GrandezasFinanceirasContrato,
    rubricas: {
      maoObra: rubricaMaoObra,
      insumos: rubricaInsumos,
      servicosEventuais: rubricaServicosEventuais,
      diarias: rubricaDiarias,
    },
    cotas: cotasFormatadas,
  };
}

/**
 * Validação rigorosa de saldo da Seção 8:
 * - Se a unidade tiver cota: valida saldo da cota (cota - provisionado - liquidado).
 * - Sem cota: a unidade consome o saldo global.
 * - O saldo global também é verificado para evitar estouro orçamentário.
 * - Retorna se há saldo suficiente para o orçamento proposto.
 */
export async function verificarSaldoParaOrcamento(
  unidadeId: string,
  valorOrcadoProposto: number,
  chamadoId?: string,
  empresaId?: string
): Promise<ResultadoSaldo> {
  // 1. Encontrar o contrato ativo correspondente
  let contrato = null;
  if (empresaId) {
    contrato = await prisma.contrato.findFirst({
      where: { empresaId, ativo: true },
      orderBy: { criadoEm: 'desc' },
    });
  }

  if (!contrato) {
    contrato = await prisma.contrato.findFirst({
      where: { ativo: true },
      orderBy: { criadoEm: 'desc' },
    });
  }

  // Se não existir nenhum contrato cadastrado, não é possível empenhar/provisionar
  if (!contrato) {
    return {
      temSaldo: false,
      motivo: 'Nenhum contrato ativo cadastrado para atendimento das demandas.',
      tipoBloqueio: 'SALDO_GLOBAL',
      saldoDisponivelGlobal: 0,
    };
  }

  const grandezas = await obterGrandezasContrato(contrato.id);
  if (!grandezas) {
    return {
      temSaldo: false,
      motivo: 'Erro ao calcular grandezas financeiras do contrato.',
      tipoBloqueio: 'SALDO_GLOBAL',
    };
  }

  // Se o chamado já possuía valor anteriormente (ex: reorçamento), deduz o valor anterior para não duplicar
  let saldoGlobalAjustado = grandezas.grandezasContrato.saldoDisponivel;
  if (chamadoId) {
    const chamadoAtual = await prisma.chamado.findUnique({
      where: { id: chamadoId },
      select: { valorOrcado: true, totalPrevisto: true, status: true },
    });
    if (chamadoAtual && STATUS_PROVISIONADOS.includes(chamadoAtual.status as any)) {
      const valorJaProvisionado = chamadoAtual.totalPrevisto
        ? parseFloat(chamadoAtual.totalPrevisto.toString())
        : chamadoAtual.valorOrcado
        ? parseFloat(chamadoAtual.valorOrcado.toString())
        : 0;
      saldoGlobalAjustado += valorJaProvisionado;
    }
  }

  // 2. Verificar se a unidade possui Cota configurada
  const cotaUnidade = grandezas.cotas.find((c) => c.unidadeId === unidadeId);

  if (cotaUnidade) {
    let saldoCotaAjustado = cotaUnidade.saldoDisponivel;
    if (chamadoId) {
      const chamadoAtual = await prisma.chamado.findUnique({
        where: { id: chamadoId },
        select: { valorOrcado: true, totalPrevisto: true, status: true },
      });
      if (chamadoAtual && STATUS_PROVISIONADOS.includes(chamadoAtual.status as any)) {
        const valorJaProvisionado = chamadoAtual.totalPrevisto
          ? parseFloat(chamadoAtual.totalPrevisto.toString())
          : chamadoAtual.valorOrcado
          ? parseFloat(chamadoAtual.valorOrcado.toString())
          : 0;
        saldoCotaAjustado += valorJaProvisionado;
      }
    }

    if (valorOrcadoProposto > saldoCotaAjustado) {
      return {
        temSaldo: false,
        motivo: `Cota da unidade demandante insuficiente. Saldo disponível na cota: R$ ${saldoCotaAjustado.toFixed(2)}, valor necessário para orçamento: R$ ${valorOrcadoProposto.toFixed(2)}.`,
        tipoBloqueio: 'COTA_UNIDADE',
        saldoDisponivelCota: saldoCotaAjustado,
        saldoDisponivelGlobal: saldoGlobalAjustado,
        contratoId: contrato.id,
      };
    }
  }

  // 3. Verificar Saldo Global do Contrato
  if (valorOrcadoProposto > saldoGlobalAjustado) {
    return {
      temSaldo: false,
      motivo: `Saldo global do contrato insuficiente. Saldo disponível do contrato: R$ ${saldoGlobalAjustado.toFixed(2)}, valor necessário para orçamento: R$ ${valorOrcadoProposto.toFixed(2)}.`,
      tipoBloqueio: 'SALDO_GLOBAL',
      saldoDisponivelCota: cotaUnidade?.saldoDisponivel,
      saldoDisponivelGlobal: saldoGlobalAjustado,
      contratoId: contrato.id,
    };
  }

  return {
    temSaldo: true,
    saldoDisponivelCota: cotaUnidade?.saldoDisponivel,
    saldoDisponivelGlobal: saldoGlobalAjustado,
    contratoId: contrato.id,
  };
}
