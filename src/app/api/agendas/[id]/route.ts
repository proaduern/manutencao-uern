import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { adicionarDiasUteis } from '@/lib/services/agenda';
import { obterGrandezasContrato } from '@/lib/services/contrato';

interface RouteContext {
  params: { id: string };
}

export const dynamic = 'force-dynamic';

/**
 * GET /api/agendas/[id]
 * Detalhes da agenda, demandas cadastradas, cotas das unidades e consolidados.
 */
export async function GET(req: Request, { params }: RouteContext) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const agenda = await prisma.agendaServico.findUnique({
      where: { id: params.id },
      include: {
        criadoPor: { select: { id: true, nome: true, email: true, role: true } },
        cotasUnidades: {
          include: {
            unidade: { select: { id: true, nome: true, sigla: true, campus: true } },
          },
          orderBy: { unidade: { nome: 'asc' } },
        },
        demandas: {
          include: {
            unidade: { select: { id: true, nome: true, sigla: true, campus: true } },
            predio: { select: { id: true, nome: true } },
            sublocal: { select: { id: true, nome: true } },
            ambiente: { select: { id: true, nome: true } },
            criadoPor: { select: { id: true, nome: true, email: true } },
            proposta: {
              include: {
                itens: true,
              },
            },
            fotos: true,
            timeline: { orderBy: { criadoEm: 'desc' }, take: 1 },
          },
          orderBy: { criadoEm: 'asc' },
        },
      },
    });

    if (!agenda) {
      return NextResponse.json({ error: 'Agenda de serviços não encontrada' }, { status: 404 });
    }

    // Filtrar visualização se for Demandante (vê apenas as demandas da sua unidade)
    let demandasFiltradas = agenda.demandas;
    if (session.role === 'DEMANDANTE' && session.unidadeId) {
      demandasFiltradas = agenda.demandas.filter((d) => d.unidadeId === session.unidadeId);
    }

    // Unidades do sistema para a PROAD poder gerenciar cotas
    // Obter saldo da rubrica de Serviços Eventuais do Contrato Ativo
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

    const todasUnidades = await prisma.unidade.findMany({
      where: { ativo: true },
      select: { id: true, nome: true, sigla: true, campus: true },
      orderBy: { nome: 'asc' },
    });

    // Mapeamento de cotas por unidade para fácil consulta
    const cotasConsolidadas = todasUnidades.map((u) => {
      const custom = agenda.cotasUnidades.find((c) => c.unidadeId === u.id);
      const temCotaExclusiva = !!custom && parseFloat(custom.cotaValor.toString()) > 0;
      const cotaValor = temCotaExclusiva ? parseFloat(custom.cotaValor.toString()) : 0;
      const maxDemandas = temCotaExclusiva ? custom.maxDemandas : 0;
      const usaSaldoGeral = !temCotaExclusiva;

      const demandasDaUnidade = agenda.demandas.filter((d) => d.unidadeId === u.id && d.status !== 'CANCELADA');
      const totalEstimado = demandasDaUnidade.reduce((acc, d) => {
        const val = d.proposta?.valorFinalHomologado
          ? parseFloat(d.proposta.valorFinalHomologado.toString())
          : d.proposta?.valorTotalProposto
          ? parseFloat(d.proposta.valorTotalProposto.toString())
          : d.estimativaDemandante
          ? parseFloat(d.estimativaDemandante.toString())
          : 0;
        return acc + val;
      }, 0);

      return {
        unidadeId: u.id,
        unidadeNome: u.nome,
        sigla: u.sigla,
        campus: u.campus,
        cotaValor,
        maxDemandas,
        demandasCadastradas: demandasDaUnidade.length,
        demandasRestantes: usaSaldoGeral ? 999 : Math.max(0, maxDemandas - demandasDaUnidade.length),
        totalGasto: totalEstimado,
        saldoDisponivel: usaSaldoGeral ? saldoContratoEventuais : Math.max(0, cotaValor - totalEstimado),
        isPersonalizada: !!custom,
        usaSaldoGeral,
      };
    });

    return NextResponse.json({
      agenda: {
        ...agenda,
        demandas: demandasFiltradas,
      },
      cotasConsolidadas,
      todasUnidades,
      saldoContratoEventuais,
    });
  } catch (error: any) {
    console.error('Erro ao buscar agenda:', error);
    return NextResponse.json({ error: 'Erro ao carregar detalhes da agenda' }, { status: 500 });
  }
}

/**
 * PATCH /api/agendas/[id]
 * Ações de governança da agenda (PROAD/Reitoria/Fiscais).
 */
export async function PATCH(req: Request, { params }: RouteContext) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const agenda = await prisma.agendaServico.findUnique({
      where: { id: params.id },
      include: {
        demandas: true,
      },
    });

    if (!agenda) {
      return NextResponse.json({ error: 'Agenda não encontrada' }, { status: 404 });
    }

    const body = await req.json();
    const { acao } = body;

    // 1. REGISTRAR RATIFICAÇÃO DO GABINETE DA REITORIA
    if (acao === 'REGISTRAR_RATIFICACAO_REITORIA') {
      if (session.role !== 'ADMIN' && session.role !== 'GESTOR_CONTRATO') {
        return NextResponse.json({ error: 'Apenas a PROAD pode registrar a ratificação do Gabinete da Reitoria.' }, { status: 403 });
      }

      const atualizada = await prisma.$transaction(async (tx) => {
        const ag = await tx.agendaServico.update({
          where: { id: agenda.id },
          data: {
            status: 'RATIFICADA_REITORIA',
            dataRatificacaoReitoria: new Date(),
            ratificadoPorNome: session.nome,
          },
        });

        // Marcar demandas que foram triadas como aprovadas para APROVADA_PROAD
        await tx.agendaDemanda.updateMany({
          where: {
            agendaId: agenda.id,
            status: 'SUBMETIDA',
          },
          data: {
            status: 'APROVADA_PROAD',
            analiseProadEm: new Date(),
            analiseProadPorNome: session.nome,
          },
        });

        return ag;
      });

      return NextResponse.json({
        success: true,
        agenda: atualizada,
        mensagem: 'Ratificação do Gabinete da Reitoria registrada com sucesso! As demandas estão homologadas para remessa à empresa contratada.',
      });
    }

    // 2. ENCAMINHAR DEMANDAS APROVADAS EM LOTE PARA A EMPRESA
    if (acao === 'ENCAMINHAR_EMPRESA_LOTE') {
      if (session.role !== 'ADMIN' && session.role !== 'GESTOR_CONTRATO') {
        return NextResponse.json({ error: 'Apenas a PROAD pode encaminhar demandas para a contratada.' }, { status: 403 });
      }

      const demandasAprovadas = await prisma.agendaDemanda.findMany({
        where: {
          agendaId: agenda.id,
          status: { in: ['SUBMETIDA', 'APROVADA_PROAD'] },
        },
      });

      if (demandasAprovadas.length === 0) {
        return NextResponse.json({ error: 'Não há demandas aprovadas pendentes de envio nesta agenda.' }, { status: 400 });
      }

      const agora = new Date();
      // Prazo de 15 dias úteis a contar do envio
      const prazo15DiasUteis = await adicionarDiasUteis(agora, 15);

      await prisma.$transaction(async (tx) => {
        for (const dem of demandasAprovadas) {
          await tx.agendaDemanda.update({
            where: { id: dem.id },
            data: {
              status: 'ENVIADA_EMPRESA',
              dataEnvioEmpresa: agora,
              prazoLimiteProposta: prazo15DiasUteis,
            },
          });

          await tx.agendaDemandaTimeline.create({
            data: {
              demandaId: dem.id,
              statusNovo: 'ENVIADA_EMPRESA',
              responsavel: session.nome,
              observacao: `Demanda homologada pela Reitoria e encaminhada à CONTRATADA. Prazo de 15 dias úteis para apresentação de proposta técnica até ${prazo15DiasUteis.toLocaleDateString('pt-BR')}.`,
            },
          });
        }

        await tx.agendaServico.update({
          where: { id: agenda.id },
          data: { status: 'EM_EXECUCAO' },
        });
      });

      return NextResponse.json({
        success: true,
        quantidade: demandasAprovadas.length,
        prazoLimiteProposta: prazo15DiasUteis,
        mensagem: `${demandasAprovadas.length} demanda(s) remetida(s) à CONTRATADA com sucesso! Prazo de 15 dias úteis aberto para elaboração de propostas orçamentárias (até ${prazo15DiasUteis.toLocaleDateString('pt-BR')}).`,
      });
    }

    // 3. ATUALIZAR COTA DE UMA UNIDADE ESPECÍFICA
    if (acao === 'ATUALIZAR_COTA_UNIDADE') {
      if (session.role !== 'ADMIN' && session.role !== 'GESTOR_CONTRATO') {
        return NextResponse.json({ error: 'Apenas a PROAD pode editar cotas das unidades.' }, { status: 403 });
      }

      const { unidadeId, cotaValor, maxDemandas } = body;
      if (!unidadeId || cotaValor === undefined) {
        return NextResponse.json({ error: 'Unidade e valor da cota são obrigatórios.' }, { status: 400 });
      }

      const valorNum = parseFloat(cotaValor);
      const maxNum = maxDemandas !== undefined ? parseInt(maxDemandas) : 0;

      // Se valor for 0 e maxDemandas for 0, exclui da cota exclusiva (passa para saldo geral)
      if (valorNum === 0 && maxNum === 0) {
        await prisma.agendaUnidadeCota.deleteMany({
          where: { agendaId: agenda.id, unidadeId },
        });
        return NextResponse.json({
          success: true,
          mensagem: 'Unidade retirada da cota específica e enquadrada no Saldo Geral do Contrato.',
        });
      }

      const cotaSalva = await prisma.agendaUnidadeCota.upsert({
        where: {
          agendaId_unidadeId: {
            agendaId: agenda.id,
            unidadeId,
          },
        },
        create: {
          agendaId: agenda.id,
          unidadeId,
          cotaValor: valorNum,
          maxDemandas: maxNum,
        },
        update: {
          cotaValor: valorNum,
          maxDemandas: maxNum,
        },
      });

      return NextResponse.json({
        success: true,
        cota: cotaSalva,
        mensagem: 'Cota da unidade atualizada com sucesso para este ciclo da agenda.',
      });
    }

    // 3.1. EXCLUIR COTA DE UMA UNIDADE INDIVIDUAL (Retornar ao Saldo Geral)
    if (acao === 'EXCLUIR_COTA_UNIDADE') {
      if (session.role !== 'ADMIN' && session.role !== 'GESTOR_CONTRATO') {
        return NextResponse.json({ error: 'Apenas a PROAD pode excluir cotas das unidades.' }, { status: 403 });
      }

      const { unidadeId } = body;
      if (!unidadeId) {
        return NextResponse.json({ error: 'Unidade é obrigatória.' }, { status: 400 });
      }

      await prisma.agendaUnidadeCota.deleteMany({
        where: { agendaId: agenda.id, unidadeId },
      });

      return NextResponse.json({
        success: true,
        mensagem: 'Cota específica removida. A unidade agora opera sob o Saldo Geral do Contrato.',
      });
    }

    // 3.2. INCLUIR / ATRIBUIR COTAS EM LOTE
    if (acao === 'INCLUIR_COTAS_LOTE' || acao === 'ATRIBUIR_COTAS_LOTE') {
      if (session.role !== 'ADMIN' && session.role !== 'GESTOR_CONTRATO') {
        return NextResponse.json({ error: 'Apenas a PROAD pode editar cotas das unidades.' }, { status: 403 });
      }

      const { unidadesIds, cotaValor, maxDemandas } = body;
      if (!Array.isArray(unidadesIds) || unidadesIds.length === 0) {
        return NextResponse.json({ error: 'Selecione ao menos uma unidade.' }, { status: 400 });
      }

      const valorNum = parseFloat(cotaValor || 0);
      const maxNum = parseInt(maxDemandas || 0);

      await prisma.$transaction(async (tx) => {
        for (const uId of unidadesIds) {
          if (valorNum === 0 && maxNum === 0) {
            await tx.agendaUnidadeCota.deleteMany({
              where: { agendaId: agenda.id, unidadeId: uId },
            });
          } else {
            await tx.agendaUnidadeCota.upsert({
              where: {
                agendaId_unidadeId: {
                  agendaId: agenda.id,
                  unidadeId: uId,
                },
              },
              create: {
                agendaId: agenda.id,
                unidadeId: uId,
                cotaValor: valorNum,
                maxDemandas: maxNum,
              },
              update: {
                cotaValor: valorNum,
                maxDemandas: maxNum,
              },
            });
          }
        }
      });

      return NextResponse.json({
        success: true,
        mensagem: `Cotas atribuídas com sucesso para ${unidadesIds.length} unidade(s) selecionada(s)!`,
      });
    }

    // 3.3. EXCLUIR COTAS EM LOTE (Mudar todas selecionadas para Saldo Geral)
    if (acao === 'EXCLUIR_COTAS_LOTE') {
      if (session.role !== 'ADMIN' && session.role !== 'GESTOR_CONTRATO') {
        return NextResponse.json({ error: 'Apenas a PROAD pode excluir cotas das unidades.' }, { status: 403 });
      }

      const { unidadesIds } = body;
      if (!Array.isArray(unidadesIds) || unidadesIds.length === 0) {
        return NextResponse.json({ error: 'Selecione ao menos uma unidade.' }, { status: 400 });
      }

      await prisma.agendaUnidadeCota.deleteMany({
        where: {
          agendaId: agenda.id,
          unidadeId: { in: unidadesIds },
        },
      });

      return NextResponse.json({
        success: true,
        mensagem: `${unidadesIds.length} unidade(s) excluída(s) do limite específico de cota e enquadrada(s) no Saldo Geral do Contrato!`,
      });
    }

    // 3.4. ATUALIZAR TODAS AS COTAS EM LOTE
    if (acao === 'ATUALIZAR_TODAS_COTAS') {
      if (session.role !== 'ADMIN' && session.role !== 'GESTOR_CONTRATO') {
        return NextResponse.json({ error: 'Apenas a PROAD pode editar cotas das unidades.' }, { status: 403 });
      }

      const { cotas } = body; // Array de { unidadeId, cotaValor, maxDemandas }
      if (Array.isArray(cotas)) {
        await prisma.$transaction(async (tx) => {
          for (const item of cotas) {
            if (item.unidadeId && item.cotaValor !== undefined) {
              const v = parseFloat(item.cotaValor || 0);
              const m = parseInt(item.maxDemandas || 0);
              if (v === 0 && m === 0) {
                await tx.agendaUnidadeCota.deleteMany({
                  where: { agendaId: agenda.id, unidadeId: item.unidadeId },
                });
              } else {
                await tx.agendaUnidadeCota.upsert({
                  where: {
                    agendaId_unidadeId: {
                      agendaId: agenda.id,
                      unidadeId: item.unidadeId,
                    },
                  },
                  create: {
                    agendaId: agenda.id,
                    unidadeId: item.unidadeId,
                    cotaValor: v,
                    maxDemandas: m,
                  },
                  update: {
                    cotaValor: v,
                    maxDemandas: m,
                  },
                });
              }
            }
          }
        });
      }

      return NextResponse.json({
        success: true,
        mensagem: 'Cotas das unidades atualizadas em lote com sucesso!',
      });
    }

    // 4. ALTERAR STATUS MANUAL DA AGENDA
    if (acao === 'ALTERAR_STATUS_AGENDA') {
      if (session.role !== 'ADMIN' && session.role !== 'GESTOR_CONTRATO') {
        return NextResponse.json({ error: 'Apenas a PROAD pode alterar o status da agenda.' }, { status: 403 });
      }

      const { novoStatus } = body;
      const atualizada = await prisma.agendaServico.update({
        where: { id: agenda.id },
        data: { status: novoStatus },
      });

      return NextResponse.json({
        success: true,
        agenda: atualizada,
        mensagem: `Status da agenda atualizado para ${novoStatus}.`,
      });
    }

    // 5. EDITAR DADOS COMPLETOS DA AGENDA
    if (acao === 'EDITAR_AGENDA') {
      if (session.role !== 'ADMIN' && session.role !== 'GESTOR_CONTRATO') {
        return NextResponse.json({ error: 'Apenas a PROAD ou Administradores podem editar agendas.' }, { status: 403 });
      }

      const {
        titulo,
        descricao,
        anoReferencia,
        periodoInicioColeta,
        periodoFimColeta,
        valorTotalDisponivel,
        cotaPadraoUnidade,
        maxDemandasPadrao,
        status,
      } = body;

      const dataUpdate: any = {};
      if (titulo) dataUpdate.titulo = titulo.trim();
      if (descricao !== undefined) dataUpdate.descricao = descricao ? descricao.trim() : null;
      if (anoReferencia) dataUpdate.anoReferencia = parseInt(anoReferencia);
      if (periodoInicioColeta) dataUpdate.periodoInicioColeta = new Date(periodoInicioColeta);
      if (periodoFimColeta) dataUpdate.periodoFimColeta = new Date(periodoFimColeta);
      if (valorTotalDisponivel !== undefined) dataUpdate.valorTotalDisponivel = parseFloat(valorTotalDisponivel);
      if (cotaPadraoUnidade !== undefined) dataUpdate.cotaPadraoUnidade = parseFloat(cotaPadraoUnidade);
      if (maxDemandasPadrao !== undefined) dataUpdate.maxDemandasPadrao = parseInt(maxDemandasPadrao);
      if (status) dataUpdate.status = status;

      const atualizada = await prisma.agendaServico.update({
        where: { id: agenda.id },
        data: dataUpdate,
      });

      return NextResponse.json({
        success: true,
        agenda: atualizada,
        mensagem: 'Dados da agenda de serviços programados atualizados com sucesso!',
      });
    }

    return NextResponse.json({ error: 'Ação não reconhecida' }, { status: 400 });
  } catch (error: any) {
    console.error('Erro na ação da agenda:', error);
    return NextResponse.json({ error: 'Erro ao processar ação: ' + error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/agendas/[id]
 * Exclusão definitiva da agenda e de todas as suas demandas associadas (PROAD/Admin).
 */
export async function DELETE(req: Request, { params }: RouteContext) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'GESTOR_CONTRATO')) {
      return NextResponse.json({ error: 'Apenas a PROAD ou Administradores podem excluir agendas.' }, { status: 403 });
    }

    const agenda = await prisma.agendaServico.findUnique({
      where: { id: params.id },
      select: { id: true, titulo: true },
    });

    if (!agenda) {
      return NextResponse.json({ error: 'Agenda de serviços não encontrada.' }, { status: 404 });
    }

    // A deleção em cascata (onDelete: Cascade) configurada no Prisma removerá cotas, demandas, propostas e histórico
    await prisma.agendaServico.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      success: true,
      mensagem: `A agenda "${agenda.titulo}" e todas as suas demandas cadastradas foram excluídas com sucesso. O sistema foi limpo.`,
    });
  } catch (error: any) {
    console.error('Erro ao excluir agenda:', error);
    return NextResponse.json({ error: 'Erro ao excluir agenda: ' + error.message }, { status: 500 });
  }
}

