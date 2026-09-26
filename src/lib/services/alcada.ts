import prisma from '@/lib/prisma';

export interface ResultadoAlcada {
  precisaAutorizacao: boolean;
  valorChamado: number;
  valorAgregado30d: number;
  motivo?: string;
}

/**
 * Regra de alçada pública UERN:
 * Avalia se o orçamento de um chamado exige autorização da fiscalização técnica / gestão do contrato.
 * Considera tanto o valor isolado do chamado quanto o valor agregado acumulado pela mesma unidade
 * na mesma categoria nos últimos 30 dias.
 */
export async function verificarAlcadaOrcamentaria(
  unidadeId: string,
  tipoServicoId: number,
  valorChamado: number
): Promise<ResultadoAlcada> {
  // Buscar os limites nos parâmetros do sistema (chave oficial: alcada_valor_limite = 2000.00)
  const [paramIsolado, paramAgregado] = await Promise.all([
    prisma.parametroSistema.findFirst({
      where: {
        chave: { in: ['alcada_valor_limite', 'ALCADA_VALOR_MAX_ISOLADO'] },
      },
    }),
    prisma.parametroSistema.findFirst({
      where: {
        chave: { in: ['alcada_agregado_limite', 'ALCADA_VALOR_MAX_AGREGADO_30D'] },
      },
    }),
  ]);

  const tetoIsolado = paramIsolado ? parseFloat(paramIsolado.valor) : 2000.0;
  const tetoAgregado = paramAgregado ? parseFloat(paramAgregado.valor) : 5000.0;

  // Descobrir a categoria do serviço
  const tipoServico = await prisma.tipoServico.findUnique({
    where: { id: tipoServicoId },
    select: { categoriaId: true },
  });

  const categoriaId = tipoServico?.categoriaId;

  // Data de 30 dias atrás
  const trintaDiasAtras = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Somar todos os chamados daquela unidade na mesma categoria orçados/autorizados/executados nos últimos 30 dias
  const chamadosAnteriores = await prisma.chamado.findMany({
    where: {
      unidadeId,
      tipoServico: {
        categoriaId: categoriaId || undefined,
      },
      abertoEm: {
        gte: trintaDiasAtras,
      },
      status: {
        in: ['EM_ORCAMENTO', 'AGUARDANDO_AUTORIZACAO', 'AUTORIZADO', 'EM_EXECUCAO', 'ATENDIDO', 'CONCLUIDO'],
      },
      valorOrcado: {
        not: null,
      },
    },
    select: {
      valorOrcado: true,
      totalPrevisto: true,
    },
  });

  const totalAcumulado30d = chamadosAnteriores.reduce((acc, c) => {
    const val = c.totalPrevisto ? parseFloat(c.totalPrevisto.toString()) : c.valorOrcado ? parseFloat(c.valorOrcado.toString()) : 0;
    return acc + val;
  }, 0);

  const valorAgregadoTotal = totalAcumulado30d + valorChamado;

  const passouIsolado = valorChamado > tetoIsolado;
  const passouAgregado = valorAgregadoTotal > tetoAgregado;

  if (passouIsolado || passouAgregado) {
    let motivo = '';
    if (passouIsolado && passouAgregado) {
      motivo = `Valor do chamado (R$ ${valorChamado.toFixed(2)}) e valor agregado em 30 dias (R$ ${valorAgregadoTotal.toFixed(2)}) excedem os tetos de alçada.`;
    } else if (passouIsolado) {
      motivo = `Valor do chamado (R$ ${valorChamado.toFixed(2)}) excede a alçada direta de R$ ${tetoIsolado.toFixed(2)}.`;
    } else {
      motivo = `Valor acumulado da unidade nesta categoria nos últimos 30 dias (R$ ${valorAgregadoTotal.toFixed(2)}) excede o limite de R$ ${tetoAgregado.toFixed(2)}.`;
    }

    return {
      precisaAutorizacao: true,
      valorChamado,
      valorAgregado30d: valorAgregadoTotal,
      motivo,
    };
  }

  return {
    precisaAutorizacao: false,
    valorChamado,
    valorAgregado30d: valorAgregadoTotal,
  };
}
