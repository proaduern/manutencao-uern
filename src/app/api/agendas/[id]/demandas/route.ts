import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { validarSubmissaoDemanda } from '@/lib/services/agenda';

interface RouteContext {
  params: { id: string };
}

export const dynamic = 'force-dynamic';

/**
 * GET /api/agendas/[id]/demandas
 * Lista as demandas da agenda.
 */
export async function GET(req: Request, { params }: RouteContext) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const where: any = { agendaId: params.id };

    // Demandante só visualiza demandas da sua própria unidade
    if (session.role === 'DEMANDANTE' && session.unidadeId) {
      where.unidadeId = session.unidadeId;
    }

    const demandas = await prisma.agendaDemanda.findMany({
      where,
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
        timeline: { orderBy: { criadoEm: 'desc' } },
      },
      orderBy: { numero: 'asc' },
    });

    return NextResponse.json({ demandas });
  } catch (error: any) {
    console.error('Erro ao listar demandas da agenda:', error);
    return NextResponse.json({ error: 'Erro ao carregar demandas' }, { status: 500 });
  }
}

/**
 * POST /api/agendas/[id]/demandas
 * Submissão de nova demanda por unidade demandante na agenda aberta.
 */
export async function POST(req: Request, { params }: RouteContext) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const {
      unidadeId: bodyUnidadeId,
      predioId,
      sublocalId,
      ambienteId,
      localizacaoDetalhada,
      titulo,
      descricaoProblema,
      justificativa,
      estimativaDemandante,
      fotosUrls, // Array de strings base64 ou URLs
    } = body;

    // Se demandante, vincula estritamente à sua unidade
    let unidadeId = session.unidadeId;
    if (session.role === 'ADMIN' || session.role === 'GESTOR_CONTRATO') {
      unidadeId = bodyUnidadeId || session.unidadeId;
    }

    if (!unidadeId) {
      return NextResponse.json({ error: 'Usuário sem unidade demandante vinculada.' }, { status: 400 });
    }

    if (!descricaoProblema || !justificativa) {
      return NextResponse.json({ error: 'Descrição da necessidade e justificativa são obrigatórios.' }, { status: 400 });
    }

    const estimativaNum = estimativaDemandante ? parseFloat(estimativaDemandante) : 0;

    // Validar regras de submissão (período aberto, teto de solicitações e cota da unidade)
    const validacao = await validarSubmissaoDemanda(params.id, unidadeId, estimativaNum);
    if (!validacao.permitido) {
      return NextResponse.json({ error: validacao.motivo }, { status: 400 });
    }

    const novaDemanda = await prisma.$transaction(async (tx) => {
      const d = await tx.agendaDemanda.create({
        data: {
          agendaId: params.id,
          unidadeId,
          criadoPorId: session.id,
          predioId: predioId || null,
          sublocalId: sublocalId || null,
          ambienteId: ambienteId ? parseInt(ambienteId) : null,
          localizacaoDetalhada: localizacaoDetalhada?.trim() || null,
          titulo: titulo?.trim() || 'Demanda de Serviço Programado',
          descricaoProblema: descricaoProblema.trim(),
          justificativa: justificativa.trim(),
          estimativaDemandante: estimativaNum > 0 ? estimativaNum : null,
          status: 'SUBMETIDA',
        },
      });

      // Gravar fotos do problema se fornecidas
      if (Array.isArray(fotosUrls) && fotosUrls.length > 0) {
        for (const url of fotosUrls) {
          if (url && typeof url === 'string') {
            await tx.agendaDemandaFoto.create({
              data: {
                demandaId: d.id,
                tipo: 'ANTES',
                url,
                descricao: 'Registro fotográfico inicial da demanda',
              },
            });
          }
        }
      }

      const obsInicial = validacao.requerAutorizacaoProad
        ? `Demanda cadastrada com estimativa preliminar (R$ ${estimativaNum.toFixed(2)}) superior à cota exclusiva da unidade. Encaminhada para avaliação e autorização extraordinária da PROAD respaldada no Saldo Global do Contrato.`
        : `Demanda de serviço programado cadastrada pela unidade demandante. Aguardando consolidação da PROAD e ratificação do Gabinete da Reitoria.`;

      await tx.agendaDemandaTimeline.create({
        data: {
          demandaId: d.id,
          statusNovo: 'SUBMETIDA',
          responsavel: session.nome,
          observacao: obsInicial,
        },
      });

      return d;
    });

    return NextResponse.json({
      success: true,
      demanda: novaDemanda,
      mensagem: validacao.requerAutorizacaoProad
        ? 'Demanda submetida com sucesso! Por exceder a cota da unidade, foi encaminhada para avaliação e autorização extraordinária da PROAD via Saldo Global do Contrato.'
        : 'Demanda de serviço programado submetida com sucesso!',
    });
  } catch (error: any) {
    console.error('Erro ao submeter demanda na agenda:', error);
    return NextResponse.json({ error: 'Erro ao submeter demanda: ' + error.message }, { status: 500 });
  }
}
