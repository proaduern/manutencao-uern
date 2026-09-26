import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    let unidadeId = searchParams.get('unidadeId');

    // Se for GESTOR_UNIDADE ou DEMANDANTE, restringe à sua própria unidade
    if (session.role === 'GESTOR_UNIDADE' || session.role === 'DEMANDANTE') {
      unidadeId = session.unidadeId || null;
      if (!unidadeId) {
        return NextResponse.json({ error: 'Usuário não vinculado a nenhuma unidade demandante.' }, { status: 400 });
      }
    }

    const where: any = { ativo: true };
    if (unidadeId) {
      where.unidadeId = unidadeId;
    }

    // Se admin pedir incluindo inativos
    if (searchParams.get('incluirInativos') === 'true' && (session.role === 'ADMIN' || session.role === 'GESTOR_UNIDADE')) {
      delete where.ativo;
    }

    const sublocais = await prisma.sublocal.findMany({
      where,
      include: {
        unidade: { select: { id: true, nome: true, sigla: true, campus: true } },
        predio: { select: { id: true, nome: true, campus: true } },
        tipoAmbiente: { select: { id: true, nome: true } },
        _count: { select: { chamados: true } },
      },
      orderBy: [{ predio: { nome: 'asc' } }, { nome: 'asc' }],
    });

    return NextResponse.json({ sublocais });
  } catch (error: any) {
    console.error('Erro ao buscar sublocais:', error);
    return NextResponse.json({ error: 'Erro ao buscar sublocais: ' + error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'GESTOR_UNIDADE')) {
      return NextResponse.json({ error: 'Apenas Administrador do Sistema ou Administrador da Unidade Demandante podem cadastrar sublocais.' }, { status: 403 });
    }

    const body = await req.json();
    const { nome, descricao, unidadeId, predioId, tipoAmbienteId } = body;

    if (!nome || nome.trim().length < 2) {
      return NextResponse.json({ error: 'Nome do sublocal/ambiente é obrigatório (mínimo 2 caracteres).' }, { status: 400 });
    }

    if (!tipoAmbienteId) {
      return NextResponse.json({ error: 'Vincule este sublocal a um tipo de ambiente homologado.' }, { status: 400 });
    }

    // Unidade de destino
    let finalUnidadeId = unidadeId;
    if (session.role === 'GESTOR_UNIDADE') {
      finalUnidadeId = session.unidadeId;
    }

    if (!finalUnidadeId) {
      return NextResponse.json({ error: 'Unidade demandante não informada.' }, { status: 400 });
    }

    const sublocal = await prisma.sublocal.create({
      data: {
        nome: nome.trim(),
        descricao: descricao ? descricao.trim() : null,
        unidadeId: finalUnidadeId,
        predioId: predioId || null,
        tipoAmbienteId: parseInt(tipoAmbienteId),
        ativo: true,
      },
      include: {
        unidade: { select: { id: true, nome: true, sigla: true, campus: true } },
        predio: { select: { id: true, nome: true, campus: true } },
        tipoAmbiente: { select: { id: true, nome: true } },
      },
    });

    return NextResponse.json({ success: true, sublocal }, { status: 201 });
  } catch (error: any) {
    console.error('Erro ao criar sublocal:', error);
    return NextResponse.json({ error: 'Erro ao cadastrar sublocal: ' + error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'GESTOR_UNIDADE')) {
      return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
    }

    const body = await req.json();
    const { id, nome, descricao, predioId, tipoAmbienteId, ativo } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID do sublocal é obrigatório.' }, { status: 400 });
    }

    // Se for GESTOR_UNIDADE, verifica se o sublocal pertence à sua unidade
    if (session.role === 'GESTOR_UNIDADE') {
      const existente = await prisma.sublocal.findUnique({ where: { id } });
      if (!existente || existente.unidadeId !== session.unidadeId) {
        return NextResponse.json({ error: 'Você só pode editar sublocais da sua própria unidade demandante.' }, { status: 403 });
      }
    }

    const sublocal = await prisma.sublocal.update({
      where: { id },
      data: {
        nome: nome ? nome.trim() : undefined,
        descricao: descricao !== undefined ? (descricao ? descricao.trim() : null) : undefined,
        predioId: predioId !== undefined ? (predioId || null) : undefined,
        tipoAmbienteId: tipoAmbienteId ? parseInt(tipoAmbienteId) : undefined,
        ativo: ativo !== undefined ? Boolean(ativo) : undefined,
      },
      include: {
        unidade: { select: { id: true, nome: true, sigla: true, campus: true } },
        predio: { select: { id: true, nome: true, campus: true } },
        tipoAmbiente: { select: { id: true, nome: true } },
      },
    });

    return NextResponse.json({ success: true, sublocal });
  } catch (error: any) {
    console.error('Erro ao atualizar sublocal:', error);
    return NextResponse.json({ error: 'Erro ao atualizar sublocal: ' + error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'GESTOR_UNIDADE')) {
      return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID obrigatório.' }, { status: 400 });

    const sublocal = await prisma.sublocal.findUnique({
      where: { id },
      include: { _count: { select: { chamados: true } } },
    });

    if (!sublocal) {
      return NextResponse.json({ error: 'Sublocal não encontrado.' }, { status: 404 });
    }

    if (session.role === 'GESTOR_UNIDADE' && sublocal.unidadeId !== session.unidadeId) {
      return NextResponse.json({ error: 'Você só pode excluir sublocais da sua própria unidade demandante.' }, { status: 403 });
    }

    // Se tiver chamados vinculados, inativa com segurança para preservar histórico
    if (sublocal._count.chamados > 0) {
      await prisma.sublocal.update({
        where: { id },
        data: { ativo: false },
      });
      return NextResponse.json({ success: true, inativado: true });
    }

    await prisma.sublocal.delete({ where: { id } });
    return NextResponse.json({ success: true, excluido: true });
  } catch (error: any) {
    console.error('Erro ao excluir sublocal:', error);
    return NextResponse.json({ error: 'Erro ao excluir sublocal: ' + error.message }, { status: 500 });
  }
}
