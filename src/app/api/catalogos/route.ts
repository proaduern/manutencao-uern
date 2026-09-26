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

    const [categorias, ambientes, frases, predios, tabelas, funcionarios, unidades, niveis] = await Promise.all([
      prisma.categoriaServico.findMany({
        where: { ativo: true },
        include: {
          tipos: {
            where: { ativo: true },
            orderBy: { nome: 'asc' },
          },
        },
        orderBy: { nome: 'asc' },
      }),
      prisma.tipoAmbiente.findMany({
        where: { ativo: true },
        orderBy: { id: 'asc' },
      }),
      prisma.fraseUrgencia.findMany({
        where: { ativo: true },
        orderBy: { ordemExibicao: 'asc' },
      }),
      prisma.cidadePredio.findMany({
        where: { ativo: true },
        orderBy: { nome: 'asc' },
      }),
      prisma.tabelaReferencia.findMany({
        where: { ativa: true },
        include: {
          itens: {
            take: 200,
            orderBy: { codigo: 'asc' },
          },
        },
        orderBy: { nome: 'asc' },
      }),
      prisma.funcionarioEmpresa.findMany({
        where: { ativo: true },
        orderBy: { nome: 'asc' },
      }),
      prisma.unidade.findMany({
        where: { ativo: true },
        include: {
          predio: true,
          prediosVinculados: {
            include: {
              predio: { select: { id: true, nome: true, campus: true, endereco: true } },
            },
            orderBy: [{ principal: 'desc' }, { predio: { nome: 'asc' } }],
          },
        },
        orderBy: { nome: 'asc' },
      }),
      prisma.nivelUrgencia.findMany({
        orderBy: { ordem: 'asc' },
      }),
    ]);

    const unidadesFormatadas = unidades.map((u) => ({
      ...u,
      predios: u.prediosVinculados.map((vp) => vp.predio),
    }));

    return NextResponse.json({
      categorias,
      ambientes,
      frases,
      predios,
      tabelas,
      funcionarios,
      unidades: unidadesFormatadas,
      niveis,
    });
  } catch (error: any) {
    console.error('Erro ao buscar catálogos:', error);
    return NextResponse.json({ error: 'Erro ao carregar dados' }, { status: 500 });
  }
}
