import prisma from '@/lib/prisma';
import { isFeriado } from './prazos';
import { obterGrandezasContrato } from './contrato';

/**
 * Adiciona uma quantidade de dias úteis a uma data-base,
 * pulando sábados, domingos e feriados cadastrados (Nacionais, Estaduais RN e UERN/Municipais).
 */
export async function adicionarDiasUteis(
  dataBase: Date = new Date(),
  diasUteis: number,
  municipio?: string | null
): Promise<Date> {
  let diasRestantes = diasUteis;
  let atual = new Date(dataBase);

  while (diasRestantes > 0) {
    atual.setDate(atual.getDate() + 1);
    const diaSemana = atual.getDay();
    // Pula sábado (6) e domingo (0)
    if (diaSemana !== 0 && diaSemana !== 6) {
      const feriado = await isFeriado(atual, municipio);
      if (!feriado) {
        diasRestantes--;
      }
    }
  }

  return atual;
}

export interface CotaInfoUnidade {
  unidadeId: string;
  unidadeNome: string;
  cotaValor: number;
  maxDemandas: number;
  demandasCadastradas: number;
  demandasRestantes: number;
  valorTotalEstimado: number;
  saldoDisponivelCota: number;
  usaSaldoGeral: boolean; // TRUE se valor e quantidade forem 0 (respaldada no saldo global do contrato)
  saldoContratoServicosEventuais?: number;
}

/**
 * Recupera ou calcula a cota específica de uma unidade para uma determinada Agenda de Serviços.
 * - Caso valor e quantidade sejam 0 (ou sem cota exclusiva), opera pelo SALDO GERAL DO CONTRATO (Serviços Eventuais).
 * - Caso possua cota exclusiva > 0, opera pelo teto da unidade, com autorização de excedente pela PROAD.
 */
export async function obterCotaUnidadeAgenda(agendaId: string, unidadeId: string): Promise<CotaInfoUnidade | null> {
  const [agenda, cotaCustom, unidade, demandasExistentes] = await Promise.all([
    prisma.agendaServico.findUnique({
      where: { id: agendaId },
    }),
    prisma.agendaUnidadeCota.findUnique({
      where: {
        agendaId_unidadeId: {
          agendaId,
          unidadeId,
        },
      },
    }),
    prisma.unidade.findUnique({
      where: { id: unidadeId },
      select: { id: true, nome: true, campus: true },
    }),
    prisma.agendaDemanda.findMany({
      where: {
        agendaId,
        unidadeId,
        status: { not: 'CANCELADA' },
      },
      include: {
        proposta: true,
      },
    }),
  ]);

  if (!agenda || !unidade) return null;

  // Obter saldo contratual de Serviços Eventuais
  let saldoContratoEventuais = 0;
  const contratoAtivo = await prisma.contrato.findFirst({
    where: { ativo: true },
    select: { id: true },
  });
  if (contratoAtivo) {
    const grandezas = await obterGrandezasContrato(contratoAtivo.id);
    if (grandezas && grandezas.rubricas?.servicosEventuais) {
      saldoContratoEventuais = grandezas.rubricas.servicosEventuais.saldoDisponivel;
    }
  }

  const cotaTeto = cotaCustom
    ? parseFloat(cotaCustom.cotaValor.toString())
    : parseFloat(agenda.cotaPadraoUnidade.toString());

  const maxDemandas = cotaCustom ? cotaCustom.maxDemandas : agenda.maxDemandasPadrao;
  const qtdCadastradas = demandasExistentes.length;

  const valorTotalConsumido = demandasExistentes.reduce((acc, d) => {
    const val = d.proposta?.valorFinalHomologado
      ? parseFloat(d.proposta.valorFinalHomologado.toString())
      : d.proposta?.valorTotalProposto
      ? parseFloat(d.proposta.valorTotalProposto.toString())
      : d.estimativaDemandante
      ? parseFloat(d.estimativaDemandante.toString())
      : 0;
    return acc + val;
  }, 0);

  // Unidade com valor e quantidade em 0 opera pelo Saldo Geral do Contrato
  const usaSaldoGeral = (cotaTeto === 0 && maxDemandas === 0) || cotaTeto === 0;

  if (usaSaldoGeral) {
    return {
      unidadeId: unidade.id,
      unidadeNome: unidade.nome,
      cotaValor: 0,
      maxDemandas: 0,
      demandasCadastradas: qtdCadastradas,
      demandasRestantes: 999, // Sem bloqueio por cota exclusiva
      valorTotalEstimado: Number(valorTotalConsumido.toFixed(2)),
      saldoDisponivelCota: Math.max(0, Number(saldoContratoEventuais.toFixed(2))),
      usaSaldoGeral: true,
      saldoContratoServicosEventuais: saldoContratoEventuais,
    };
  }

  const saldoDisponivel = Math.max(0, Number((cotaTeto - valorTotalConsumido).toFixed(2)));

  return {
    unidadeId: unidade.id,
    unidadeNome: unidade.nome,
    cotaValor: cotaTeto,
    maxDemandas,
    demandasCadastradas: qtdCadastradas,
    demandasRestantes: Math.max(0, maxDemandas - qtdCadastradas),
    valorTotalEstimado: Number(valorTotalConsumido.toFixed(2)),
    saldoDisponivelCota: saldoDisponivel,
    usaSaldoGeral: false,
    saldoContratoServicosEventuais: saldoContratoEventuais,
  };
}

/**
 * Valida se uma unidade pode cadastrar uma nova demanda na agenda:
 * - A agenda deve estar com status ABERTA_COLETA e dentro do período de datas;
 * - Se a unidade tiver cota e demandas em zero, opera pelo Saldo Geral do Contrato de Serviços Eventuais;
 * - Se for unidade eleita com cota/limite, segue seus limites, mas caso exceda a cota,
 *   permite submissão se houver saldo geral no contrato para autorização da PROAD.
 */
export async function validarSubmissaoDemanda(
  agendaId: string,
  unidadeId: string,
  estimativaDemandante?: number
): Promise<{ permitido: boolean; motivo?: string; requerAutorizacaoProad?: boolean }> {
  const agenda = await prisma.agendaServico.findUnique({
    where: { id: agendaId },
  });

  if (!agenda) {
    return { permitido: false, motivo: 'Agenda de serviços não encontrada.' };
  }

  const agora = new Date();
  if (agenda.status !== 'ABERTA_COLETA') {
    return {
      permitido: false,
      motivo: `A agenda não está aberta para coleta de demandas (Status atual: ${agenda.status}).`,
    };
  }

  if (agora < new Date(agenda.periodoInicioColeta) || agora > new Date(agenda.periodoFimColeta)) {
    return {
      permitido: false,
      motivo: 'O período estabelecido para envio de demandas nesta agenda já encerrou ou ainda não iniciou.',
    };
  }

  const cotaInfo = await obterCotaUnidadeAgenda(agendaId, unidadeId);
  if (!cotaInfo) {
    return { permitido: false, motivo: 'Não foi possível verificar a cota da unidade.' };
  }

  const estimativa = estimativaDemandante || 0;

  // 1. Unidade sob o SALDO GERAL DO CONTRATO (cota e demandas em 0)
  if (cotaInfo.usaSaldoGeral) {
    const saldoContrato = cotaInfo.saldoContratoServicosEventuais || 0;
    if (estimativa > 0 && estimativa > saldoContrato) {
      return {
        permitido: false,
        motivo: `O valor estimado de R$ ${estimativa.toFixed(2)} excede o saldo geral disponível no contrato para Serviços Eventuais (R$ ${saldoContrato.toFixed(2)} restantes).`,
      };
    }
    return { permitido: true };
  }

  // 2. Unidade ELEITA com cota e limite de demandas
  if (cotaInfo.demandasRestantes <= 0) {
    return {
      permitido: false,
      motivo: `A unidade já atingiu o limite de ${cotaInfo.maxDemandas} demanda(s) estipulado para esta agenda. Ajustes de limite podem ser solicitados à PROAD.`,
    };
  }

  // Caso o valor passe da cota exclusiva da unidade:
  // "Mas caso o valor passe, a Proad poderá autorizar, desde que haja saldo geral do contrato para tal."
  if (estimativa > 0 && estimativa > cotaInfo.saldoDisponivelCota) {
    const saldoContrato = cotaInfo.saldoContratoServicosEventuais || 0;
    if (estimativa > saldoContrato) {
      return {
        permitido: false,
        motivo: `O valor estimado de R$ ${estimativa.toFixed(2)} excede a cota da unidade (R$ ${cotaInfo.saldoDisponivelCota.toFixed(2)} disponíveis) e também supera o saldo geral disponível no contrato para Serviços Eventuais (R$ ${saldoContrato.toFixed(2)}).`,
      };
    }

    // Há saldo no contrato geral: permite submissão sinalizando que dependerá de autorização extraordinária da PROAD
    return {
      permitido: true,
      requerAutorizacaoProad: true,
      motivo: `Estimativa excede a cota exclusiva da unidade (R$ ${cotaInfo.saldoDisponivelCota.toFixed(2)} disponíveis), mas está respaldada no Saldo Global do Contrato para avaliação da PROAD.`,
    };
  }

  return { permitido: true };
}

export interface AlertaSLAAgenda {
  tipo: 'PROPOSTA' | 'EXECUCAO' | 'ACEITE_UNIDADE' | 'CORRECAO_EMPRESA';
  atrasado: boolean;
  diasAtraso: number;
  diasRestantes: number;
  mensagem: string;
  dataLimite: Date | null;
  nivelGravidade: 'NORMAL' | 'ALERTA' | 'CRITICO';
}

/**
 * Avalia em tempo real a situação de prazos e cumprimento de SLA da demanda da agenda.
 */
export function avaliarSLAAgenda(demanda: any): AlertaSLAAgenda | null {
  const agora = new Date();

  // 1. Fase de Elaboração da Proposta pela Empresa (15 dias úteis)
  if (demanda.status === 'ENVIADA_EMPRESA' && demanda.prazoLimiteProposta) {
    const limite = new Date(demanda.prazoLimiteProposta);
    const diffMs = limite.getTime() - agora.getTime();
    const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDias < 0) {
      const diasAtraso = Math.abs(diffDias);
      return {
        tipo: 'PROPOSTA',
        atrasado: true,
        diasAtraso,
        diasRestantes: 0,
        mensagem: `A empresa está em ATRASO de ${diasAtraso} dia(s) na apresentação da proposta técnica. Sujeito a notificação e penalidade.`,
        dataLimite: limite,
        nivelGravidade: 'CRITICO',
      };
    }

    return {
      tipo: 'PROPOSTA',
      atrasado: false,
      diasAtraso: 0,
      diasRestantes: diffDias,
      mensagem: `Prazo da contratada para elaboração de proposta: ${diffDias} dia(s) restantes (limite: ${limite.toLocaleDateString('pt-BR')}).`,
      dataLimite: limite,
      nivelGravidade: diffDias <= 3 ? 'ALERTA' : 'NORMAL',
    };
  }

  // 2. Fase de Execução da Obra / Serviço (conforme prazo acordado)
  if (demanda.status === 'EM_EXECUCAO' && demanda.dataLimiteExecucao) {
    const limite = new Date(demanda.dataLimiteExecucao);
    const diffMs = limite.getTime() - agora.getTime();
    const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDias < 0) {
      const diasAtraso = Math.abs(diffDias);
      return {
        tipo: 'EXECUCAO',
        atrasado: true,
        diasAtraso,
        diasRestantes: 0,
        mensagem: `Serviço em ATRASO de ${diasAtraso} dia(s) em relação ao prazo pactuado. Aplicável desconto no IMR e processo administrativo de penalidade.`,
        dataLimite: limite,
        nivelGravidade: 'CRITICO',
      };
    }

    return {
      tipo: 'EXECUCAO',
      atrasado: false,
      diasAtraso: 0,
      diasRestantes: diffDias,
      mensagem: `Execução em andamento: ${diffDias} dia(s) restantes para conclusão (limite: ${limite.toLocaleDateString('pt-BR')}).`,
      dataLimite: limite,
      nivelGravidade: diffDias <= 5 ? 'ALERTA' : 'NORMAL',
    };
  }

  // 3. Fase de Aceite pela Unidade Demandante (5 dias úteis)
  if (demanda.status === 'AGUARDANDO_ACEITE_UNIDADE' && demanda.prazoLimiteAceite) {
    const limite = new Date(demanda.prazoLimiteAceite);
    const diffMs = limite.getTime() - agora.getTime();
    const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    return {
      tipo: 'ACEITE_UNIDADE',
      atrasado: diffDias < 0,
      diasAtraso: diffDias < 0 ? Math.abs(diffDias) : 0,
      diasRestantes: Math.max(0, diffDias),
      mensagem: diffDias < 0
        ? `Prazo de aceite pela unidade demandante expirado há ${Math.abs(diffDias)} dia(s).`
        : `A unidade demandante possui ${diffDias} dia(s) úteis para atestar ou reprovar a entrega.`,
      dataLimite: limite,
      nivelGravidade: diffDias <= 2 ? 'ALERTA' : 'NORMAL',
    };
  }

  // 4. Fase de Correção de Não Conformidades pela Empresa (5 dias úteis)
  if (demanda.status === 'EM_CORRECAO_EMPRESA' && demanda.dataLimiteCorrecao) {
    const limite = new Date(demanda.dataLimiteCorrecao);
    const diffMs = limite.getTime() - agora.getTime();
    const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    return {
      tipo: 'CORRECAO_EMPRESA',
      atrasado: diffDias < 0,
      diasAtraso: diffDias < 0 ? Math.abs(diffDias) : 0,
      diasRestantes: Math.max(0, diffDias),
      mensagem: diffDias < 0
        ? `A contratada está em ATRASO de ${Math.abs(diffDias)} dia(s) na correção dos apontamentos da unidade.`
        : `Prazo da contratada para sanar inconformidades: ${diffDias} dia(s) úteis restantes.`,
      dataLimite: limite,
      nivelGravidade: diffDias < 0 ? 'CRITICO' : 'ALERTA',
    };
  }

  return null;
}
