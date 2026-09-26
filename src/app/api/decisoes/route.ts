import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const trintaDiasAtras = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // 1. Fila de Autorização de Alçada (AGUARDANDO_AUTORIZACAO)
    const chamadosAguardando = await prisma.chamado.findMany({
      where: { status: 'AGUARDANDO_AUTORIZACAO' },
      include: {
        unidade: true,
        tipoServico: { include: { categoria: true } },
        empresa: true,
      },
      orderBy: { nivelOrdem: 'asc' },
    });

    // Calcular agregado de 30 dias para cada chamado da fila
    const filaAutorizacao = await Promise.all(
      chamadosAguardando.map(async (c) => {
        const anteriores = await prisma.chamado.findMany({
          where: {
            unidadeId: c.unidadeId,
            tipoServico: { categoriaId: c.tipoServico.categoriaId },
            abertoEm: { gte: trintaDiasAtras },
            id: { not: c.id },
            valorOrcado: { not: null },
          },
          select: { valorOrcado: true, totalPrevisto: true },
        });

        const soma30d = anteriores.reduce(
          (acc, ant) => acc + (ant.totalPrevisto ? parseFloat(ant.totalPrevisto.toString()) : ant.valorOrcado ? parseFloat(ant.valorOrcado.toString()) : 0),
          0
        );

        const valAtual = c.totalPrevisto ? parseFloat(c.totalPrevisto.toString()) : c.valorOrcado ? parseFloat(c.valorOrcado.toString()) : 0;

        return {
          ...c,
          valorChamado: valAtual,
          valorAgregado30d: soma30d + valAtual,
        };
      })
    );

    // 2. Ratificação de Execução Emergencial
    const ratificacoes = await prisma.chamado.findMany({
      where: {
        execucaoEmergencial: true,
        status: { in: ['EM_EXECUCAO', 'ATENDIDO'] },
        valorOrcado: { gte: 2000.0 },
      },
      include: {
        unidade: true,
        tipoServico: true,
      },
      orderBy: { abertoEm: 'desc' },
    });

    // 3. Preços aguardando homologação
    const itensPendentes = await prisma.itemReferencia.findMany({
      where: { status: 'PENDENTE_HOMOLOGACAO' },
      include: {
        tabela: { select: { nome: true, versao: true } },
      },
      orderBy: { id: 'asc' },
    });

    return NextResponse.json({
      filaAutorizacao,
      ratificacoes,
      itensPendentes,
    });
  } catch (error: any) {
    console.error('Erro ao buscar fila de decisões:', error);
    return NextResponse.json({ error: 'Erro ao carregar decisões' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { acao, itemId, aprovado } = await req.json();

    if (acao === 'HOMOLOGAR_ITEM') {
      const item = await prisma.itemReferencia.update({
        where: { id: itemId },
        data: {
          status: aprovado ? 'HOMOLOGADO' : 'REJEITADO',
        },
      });

      return NextResponse.json({
        success: true,
        item,
        mensagem: aprovado
          ? 'Preço homologado com sucesso! Passa a valer como item de referência oficial.'
          : 'Preço rejeitado para referencial oficial.',
      });
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
  } catch (error: any) {
    console.error('Erro ao processar decisão:', error);
    return NextResponse.json({ error: 'Erro ao processar: ' + error.message }, { status: 500 });
  }
}
