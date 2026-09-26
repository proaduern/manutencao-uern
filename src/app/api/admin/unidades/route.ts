import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'GESTOR_CONTRATO')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const [unidades, predios] = await Promise.all([
      prisma.unidade.findMany({
        include: {
          predio: true,
          prediosVinculados: {
            include: {
              predio: { select: { id: true, nome: true, campus: true, endereco: true } },
            },
            orderBy: [{ principal: 'desc' }, { predio: { nome: 'asc' } }],
          },
          _count: { select: { chamados: true, usuarios: true } },
        },
        orderBy: { nome: 'asc' },
      }),
      prisma.cidadePredio.findMany({
        include: {
          _count: { select: { unidadesPrincipais: true, unidadesVinculadas: true, chamados: true } },
        },
        orderBy: { nome: 'asc' },
      }),
    ]);

    const formatadas = unidades.map((u) => ({
      ...u,
      predios: u.prediosVinculados.map((vp) => vp.predio),
      predioIds: u.prediosVinculados.map((vp) => vp.predioId),
    }));

    return NextResponse.json({ unidades: formatadas, predios });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao carregar unidades: ' + error.message }, { status: 500 });
  }
}

// Criar nova Unidade Demandante ou novo Prédio
export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Apenas Administrador' }, { status: 403 });
    }

    const body = await req.json();
    const { tipo, nome, sigla, campus, email, telefone, predioId, predioIds, cotaMensal, endereco } = body;

    if (tipo === 'PREDIO') {
      if (!nome || nome.trim().length < 2) {
        return NextResponse.json({ error: 'Nome do prédio é obrigatório.' }, { status: 400 });
      }

      const predio = await prisma.cidadePredio.create({
        data: {
          nome: nome.trim(),
          campus: campus ? campus.trim() : null,
          endereco: endereco ? endereco.trim() : null,
          ativo: true,
        },
      });

      return NextResponse.json({ success: true, predio }, { status: 201 });
    }

    // Cadastro de Unidade Demandante
    if (!nome || nome.trim().length < 2) {
      return NextResponse.json({ error: 'Nome da unidade demandante é obrigatório.' }, { status: 400 });
    }

    const siglaFinal = sigla?.trim() || nome.trim().slice(0, 10).toUpperCase().replace(/\s+/g, '');
    const campusFinal = campus?.trim() || 'MOSSORÓ';

    const predioIdsArray: string[] = Array.isArray(predioIds)
      ? predioIds.filter(Boolean)
      : predioId
      ? [predioId]
      : [];

    const unidade = await prisma.$transaction(async (tx) => {
      const u = await tx.unidade.create({
        data: {
          nome: nome.trim(),
          sigla: siglaFinal,
          campus: campusFinal,
          email: email ? email.trim() : null,
          telefone: telefone ? telefone.trim() : null,
          predioId: predioIdsArray[0] || null,
          cotaMensal: cotaMensal ? parseFloat(cotaMensal) : null,
          ativo: true,
        },
      });

      for (let i = 0; i < predioIdsArray.length; i++) {
        await tx.unidadePredio.create({
          data: {
            unidadeId: u.id,
            predioId: predioIdsArray[i],
            principal: i === 0,
          },
        });
      }

      return tx.unidade.findUnique({
        where: { id: u.id },
        include: {
          prediosVinculados: { include: { predio: true } },
        },
      });
    });

    return NextResponse.json({ success: true, unidade }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao criar: ' + error.message }, { status: 500 });
  }
}

// Editar Unidade Demandante ou Prédio
export async function PUT(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Apenas Administrador' }, { status: 403 });
    }

    const body = await req.json();
    const { id, tipo, nome, sigla, campus, email, telefone, predioId, predioIds, cotaMensal, endereco, ativo } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID é obrigatório.' }, { status: 400 });
    }

    if (tipo === 'PREDIO') {
      const predio = await prisma.cidadePredio.update({
        where: { id },
        data: {
          nome: nome ? nome.trim() : undefined,
          campus: campus ? campus.trim() : undefined,
          endereco: endereco !== undefined ? endereco?.trim() : undefined,
          ativo: ativo !== undefined ? Boolean(ativo) : undefined,
        },
      });
      return NextResponse.json({ success: true, predio });
    }

    const predioIdsArray: string[] | undefined = Array.isArray(predioIds)
      ? predioIds.filter(Boolean)
      : predioId !== undefined
      ? (predioId ? [predioId] : [])
      : undefined;

    const unidade = await prisma.$transaction(async (tx) => {
      const u = await tx.unidade.update({
        where: { id },
        data: {
          nome: nome ? nome.trim() : undefined,
          sigla: sigla ? sigla.trim() : undefined,
          campus: campus ? campus.trim() : undefined,
          email: email !== undefined ? (email ? email.trim() : null) : undefined,
          telefone: telefone !== undefined ? (telefone ? telefone.trim() : null) : undefined,
          predioId: predioIdsArray !== undefined ? (predioIdsArray[0] || null) : undefined,
          cotaMensal: cotaMensal !== undefined ? (cotaMensal !== '' && cotaMensal !== null ? parseFloat(cotaMensal) : null) : undefined,
          ativo: ativo !== undefined ? Boolean(ativo) : undefined,
        },
      });

      if (predioIdsArray !== undefined) {
        // Remover vínculos anteriores
        await tx.unidadePredio.deleteMany({
          where: { unidadeId: id },
        });

        // Inserir os novos vínculos selecionados pelo administrador
        for (let i = 0; i < predioIdsArray.length; i++) {
          await tx.unidadePredio.create({
            data: {
              unidadeId: id,
              predioId: predioIdsArray[i],
              principal: i === 0,
            },
          });
        }
      }

      return tx.unidade.findUnique({
        where: { id: u.id },
        include: {
          prediosVinculados: { include: { predio: true } },
        },
      });
    });

    return NextResponse.json({ success: true, unidade });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao atualizar: ' + error.message }, { status: 500 });
  }
}

// Excluir Unidade Demandante ou Prédio
export async function DELETE(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Apenas Administrador' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const tipo = searchParams.get('tipo');

    if (!id) {
      return NextResponse.json({ error: 'ID é obrigatório.' }, { status: 400 });
    }

    if (tipo === 'PREDIO') {
      const chamadosNoPredio = await prisma.chamado.count({ where: { predioId: id } });
      const unidadesNoPredio = await prisma.unidadePredio.count({ where: { predioId: id } });

      if (chamadosNoPredio > 0 || unidadesNoPredio > 0) {
        // Se houver vínculo histórico, inativa com segurança
        await prisma.cidadePredio.update({ where: { id }, data: { ativo: false } });
        return NextResponse.json({ success: true, inativado: true, mensagem: 'Prédio inativado devido a vínculos históricos.' });
      }

      await prisma.cidadePredio.delete({ where: { id } });
      return NextResponse.json({ success: true, excluido: true });
    }

    const chamadosNaUnidade = await prisma.chamado.count({ where: { unidadeId: id } });
    const usuariosNaUnidade = await prisma.usuario.count({ where: { unidadeId: id } });

    if (chamadosNaUnidade > 0 || usuariosNaUnidade > 0) {
      await prisma.unidade.update({ where: { id }, data: { ativo: false } });
      return NextResponse.json({ success: true, inativado: true, mensagem: 'Unidade inativada devido a chamados ou usuários vinculados.' });
    }

    // Deletar vínculos de prédios e a unidade
    await prisma.unidadePredio.deleteMany({ where: { unidadeId: id } });
    await prisma.unidade.delete({ where: { id } });
    return NextResponse.json({ success: true, excluido: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao excluir: ' + error.message }, { status: 500 });
  }
}
