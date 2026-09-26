import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { obterGrandezasContrato } from '@/lib/services/contrato';

export const dynamic = 'force-dynamic';

/**
 * GET /api/agendas
 * Lista todos os ciclos de Agenda de Serviços Programados com métricas e cotas.
 */
export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get('status');

    const where: any = {};
    if (statusParam) {
      where.status = statusParam;
    }

    const agendas = await prisma.agendaServico.findMany({
      where,
      include: {
        criadoPor: {
          select: { id: true, nome: true, email: true },
        },
        cotasUnidades: {
          include: {
            unidade: { select: { id: true, nome: true, sigla: true, campus: true } },
          },
        },
        demandas: {
          select: {
            id: true,
            numero: true,
            status: true,
            unidadeId: true,
            estimativaDemandante: true,
            proposta: {
              select: {
                valorTotalProposto: true,
                valorFinalHomologado: true,
              },
            },
          },
        },
      },
      orderBy: { criadoEm: 'desc' },
    });

    const formatadas = agendas.map((a) => {
      const totalDemandas = a.demandas.length;
      const demandasAprovadas = a.demandas.filter((d) =>
        ['APROVADA_PROAD', 'ENVIADA_EMPRESA', 'PROPOSTA_EM_ANALISE', 'AUTORIZADA', 'EM_EXECUCAO', 'CONCLUIDA'].includes(d.status)
      ).length;

      const valorTotalDemandado = a.demandas.reduce((acc, d) => {
        const val = d.proposta?.valorFinalHomologado
          ? parseFloat(d.proposta.valorFinalHomologado.toString())
          : d.proposta?.valorTotalProposto
          ? parseFloat(d.proposta.valorTotalProposto.toString())
          : d.estimativaDemandante
          ? parseFloat(d.estimativaDemandante.toString())
          : 0;
        return acc + val;
      }, 0);

      // Se o usuário for demandante, calcula o resumo específico para a sua unidade
      let cotaUsuarioUnidade: any = null;
      if (session.role === 'DEMANDANTE' && session.unidadeId) {
        const custom = a.cotasUnidades.find((c) => c.unidadeId === session.unidadeId);
        const cotaTeto = custom ? parseFloat(custom.cotaValor.toString()) : parseFloat(a.cotaPadraoUnidade.toString());
        const maxDem = custom ? custom.maxDemandas : a.maxDemandasPadrao;

        const usaSaldoGeral = (cotaTeto === 0 && maxDem === 0) || cotaTeto === 0;

        const demandasMinhas = a.demandas.filter((d) => d.unidadeId === session.unidadeId);
        const valorGastoMinhaUnidade = demandasMinhas.reduce((acc, d) => {
          const val = d.proposta?.valorFinalHomologado
            ? parseFloat(d.proposta.valorFinalHomologado.toString())
            : d.proposta?.valorTotalProposto
            ? parseFloat(d.proposta.valorTotalProposto.toString())
            : d.estimativaDemandante
            ? parseFloat(d.estimativaDemandante.toString())
            : 0;
          return acc + val;
        }, 0);

        cotaUsuarioUnidade = {
          cotaTeto,
          maxDemandas: maxDem,
          demandasCadastradas: demandasMinhas.length,
          demandasRestantes: usaSaldoGeral ? 999 : Math.max(0, maxDem - demandasMinhas.length),
          valorGasto: valorGastoMinhaUnidade,
          saldoDisponivel: usaSaldoGeral ? null : Math.max(0, cotaTeto - valorGastoMinhaUnidade),
          usaSaldoGeral,
        };
      }

      return {
        ...a,
        totalDemandas,
        demandasAprovadas,
        valorTotalDemandado,
        cotaUsuarioUnidade,
      };
    });

    return NextResponse.json({ agendas: formatadas });
  } catch (error: any) {
    console.error('Erro ao listar agendas:', error);
    return NextResponse.json({ error: 'Erro ao carregar agendas de serviços' }, { status: 500 });
  }
}

/**
 * POST /api/agendas
 * Abertura de novo ciclo de Agenda de Serviços Programados pela PROAD.
 */
export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'GESTOR_CONTRATO')) {
      return NextResponse.json({ error: 'Apenas a PROAD (Gestão do Contrato / Administrador) pode abrir novas agendas de serviços.' }, { status: 403 });
    }

    const body = await req.json();
    const {
      titulo,
      descricao,
      periodoInicioColeta,
      periodoFimColeta,
      anoReferencia,
      valorTotalDisponivel,
      cotaPadraoUnidade,
      maxDemandasPadrao,
      cotasPersonalizadas, // Array: [{ unidadeId, cotaValor, maxDemandas }]
    } = body;

    if (!titulo || !periodoInicioColeta || !periodoFimColeta || !valorTotalDisponivel) {
      return NextResponse.json({ error: 'Título, período de coleta e valor total disponível são obrigatórios.' }, { status: 400 });
    }

    const valorTotalNum = parseFloat(valorTotalDisponivel);
    const cotaPadraoNum = cotaPadraoUnidade !== undefined ? parseFloat(cotaPadraoUnidade) : 0;
    const maxDemandasNum = maxDemandasPadrao !== undefined ? parseInt(maxDemandasPadrao) : 0;
    const ano = anoReferencia ? parseInt(anoReferencia) : new Date().getFullYear();

    // Validar se o valor total pretendido para a agenda não excede o saldo disponível na rubrica de Serviços Eventuais do Contrato Ativo
    const contratoAtivo = await prisma.contrato.findFirst({
      where: { ativo: true },
      select: { id: true },
    });

    if (contratoAtivo) {
      const grandezas = await obterGrandezasContrato(contratoAtivo.id);
      if (grandezas && grandezas.rubricas.servicosEventuais) {
        const saldoEventuais = grandezas.rubricas.servicosEventuais.saldoDisponivel;
        if (valorTotalNum > saldoEventuais) {
          return NextResponse.json({
            error: `O valor disponível informado (R$ ${valorTotalNum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}) excede o saldo contratual restante para Serviços Eventuais (R$ ${saldoEventuais.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}). Ajuste o valor ou promova aditamento.`,
          }, { status: 400 });
        }
      }
    }

    const novaAgenda = await prisma.$transaction(async (tx) => {
      const agenda = await tx.agendaServico.create({
        data: {
          titulo: titulo.trim(),
          descricao: descricao?.trim() || null,
          anoReferencia: ano,
          periodoInicioColeta: new Date(periodoInicioColeta),
          periodoFimColeta: new Date(periodoFimColeta),
          valorTotalDisponivel: valorTotalNum,
          cotaPadraoUnidade: cotaPadraoNum,
          maxDemandasPadrao: maxDemandasNum,
          status: 'ABERTA_COLETA',
          criadoPorId: session.id,
        },
      });

      // Cadastrar cotas especificadas unidade por unidade
      if (Array.isArray(cotasPersonalizadas) && cotasPersonalizadas.length > 0) {
        for (const item of cotasPersonalizadas) {
          if (item.unidadeId && item.cotaValor !== undefined && item.cotaValor !== null) {
            await tx.agendaUnidadeCota.create({
              data: {
                agendaId: agenda.id,
                unidadeId: item.unidadeId,
                cotaValor: parseFloat(item.cotaValor.toString()),
                maxDemandas: item.maxDemandas !== undefined ? parseInt(item.maxDemandas.toString()) : 0,
              },
            });
          }
        }
      }

      return agenda;
    });

    return NextResponse.json({
      success: true,
      agenda: novaAgenda,
      mensagem: `Agenda de Serviços Programados "${novaAgenda.titulo}" aberta com sucesso! Período de coleta iniciado.`,
    });
  } catch (error: any) {
    console.error('Erro ao criar agenda:', error);
    return NextResponse.json({ error: 'Erro ao abrir agenda: ' + error.message }, { status: 500 });
  }
}
