import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { gerarFeriadosAno } from '@/lib/services/feriados';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'GESTOR_CONTRATO')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const ano = searchParams.get('ano') ? parseInt(searchParams.get('ano')!) : undefined;
    const abrangencia = searchParams.get('abrangencia');
    const municipio = searchParams.get('municipio');

    const where: any = {};
    if (ano) where.ano = ano;
    if (abrangencia && abrangencia !== 'TODOS') where.abrangencia = abrangencia;
    if (municipio && municipio !== 'TODOS') {
      where.municipio = { equals: municipio, mode: 'insensitive' };
    }

    const feriados = await prisma.feriado.findMany({
      where,
      orderBy: { data: 'asc' },
    });

    return NextResponse.json({ feriados });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao buscar feriados: ' + error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Apenas Administrador' }, { status: 403 });
    }

    const body = await req.json();
    const { acao, ano, data, descricao, abrangencia, municipio } = body;

    // Gerar feriados algorítmicos para o ano
    if (acao === 'GERAR_ANO') {
      const anoNum = parseInt(ano) || new Date().getFullYear();
      const inseridos = await gerarFeriadosAno(anoNum);
      return NextResponse.json({
        success: true,
        mensagem: `${inseridos} feriados processados/gerados para o ano ${anoNum}.`,
      });
    }

    // Inserção avulsa
    if (!data || !descricao) {
      return NextResponse.json({ error: 'Data e descrição são obrigatórias.' }, { status: 400 });
    }

    const dataObj = new Date(data + 'T12:00:00Z');
    const feriado = await prisma.feriado.create({
      data: {
        data: dataObj,
        descricao: descricao.trim(),
        abrangencia: abrangencia || 'NACIONAL',
        municipio: municipio ? municipio.trim() : null,
        ano: dataObj.getFullYear(),
      },
    });

    return NextResponse.json({ success: true, feriado });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao salvar feriado: ' + error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Apenas Administrador' }, { status: 403 });
    }

    const body = await req.json();
    const { id, data, descricao, abrangencia, municipio } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID do feriado é obrigatório.' }, { status: 400 });
    }

    const dataObj = data ? new Date(data + 'T12:00:00Z') : undefined;

    const feriado = await prisma.feriado.update({
      where: { id },
      data: {
        data: dataObj,
        descricao: descricao ? descricao.trim() : undefined,
        abrangencia: abrangencia || undefined,
        municipio: municipio !== undefined ? (municipio ? municipio.trim() : null) : undefined,
        ano: dataObj ? dataObj.getFullYear() : undefined,
      },
    });

    return NextResponse.json({ success: true, feriado });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao atualizar feriado: ' + error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Apenas Administrador' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });

    await prisma.feriado.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao remover feriado' }, { status: 500 });
  }
}
