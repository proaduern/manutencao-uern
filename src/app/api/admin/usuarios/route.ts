import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession, hashPassword } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Apenas Administrador' }, { status: 403 });
    }

    const [usuarios, unidades, fiscaisSetoriais] = await Promise.all([
      prisma.usuario.findMany({
        select: {
          id: true,
          nome: true,
          email: true,
          telefone: true,
          role: true,
          matricula: true,
          ativo: true,
          unidadeId: true,
          unidade: { select: { id: true, nome: true, campus: true } },
          empresa: { select: { id: true, razaoSocial: true } },
          criadoEm: true,
        },
        orderBy: { nome: 'asc' },
      }),
      prisma.unidade.findMany({
        where: { ativo: true },
        select: { id: true, nome: true, campus: true },
        orderBy: { nome: 'asc' },
      }),
      prisma.fiscalSetorialUnidade.findMany({
        include: {
          unidade: { select: { id: true, nome: true } },
        },
      }),
    ]);

    return NextResponse.json({ usuarios, unidades, fiscaisSetoriais });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao carregar usuários: ' + error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Apenas Administrador' }, { status: 403 });
    }

    const body = await req.json();
    const { acao } = body;

    // Criar novo usuário vinculado a unidade demandante ou geral
    if (acao === 'CRIAR' || !acao) {
      const { nome, email, telefone, role, unidadeId, matricula, senha } = body;
      if (!nome || !email) {
        return NextResponse.json({ error: 'Nome e e-mail são obrigatórios.' }, { status: 400 });
      }

      const emailFormatado = email.toLowerCase().trim();
      const jaExiste = await prisma.usuario.findUnique({ where: { email: emailFormatado } });
      if (jaExiste) {
        return NextResponse.json({ error: 'Já existe um usuário com este e-mail.' }, { status: 400 });
      }

      const senhaHash = await hashPassword(senha || 'uern@2026');
      const novo = await prisma.usuario.create({
        data: {
          nome: nome.trim(),
          email: emailFormatado,
          telefone: telefone ? telefone.trim() : null,
          senhaHash,
          role: role || 'DEMANDANTE',
          unidadeId: unidadeId || null,
          matricula: matricula ? matricula.trim() : null,
          deveTrocarSenha: true,
          ativo: true,
        },
      });

      return NextResponse.json({ success: true, usuario: novo }, { status: 201 });
    }

    // Alocar unidade para Fiscal Setorial
    if (acao === 'VINCULAR_SETORIAL') {
      const { usuarioId, unidadeId } = body;
      await prisma.fiscalSetorialUnidade.upsert({
        where: { usuarioId_unidadeId: { usuarioId, unidadeId } },
        update: {},
        create: { usuarioId, unidadeId },
      });
      return NextResponse.json({ success: true });
    }

    // Desvincular unidade de Fiscal Setorial
    if (acao === 'DESVINCULAR_SETORIAL') {
      const { usuarioId, unidadeId } = body;
      await prisma.fiscalSetorialUnidade.delete({
        where: { usuarioId_unidadeId: { usuarioId, unidadeId } },
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao processar usuário: ' + error.message }, { status: 500 });
  }
}

// Editar dados de usuário ou redefinir senha
export async function PUT(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Apenas Administrador' }, { status: 403 });
    }

    const body = await req.json();
    const { id, nome, email, telefone, role, unidadeId, matricula, ativo, novaSenha } = body;

    if (!id) return NextResponse.json({ error: 'ID do usuário obrigatório' }, { status: 400 });

    const data: any = {};
    if (nome) data.nome = nome.trim();
    if (email) data.email = email.toLowerCase().trim();
    if (telefone !== undefined) data.telefone = telefone ? telefone.trim() : null;
    if (role) data.role = role;
    if (unidadeId !== undefined) data.unidadeId = unidadeId || null;
    if (matricula !== undefined) data.matricula = matricula ? matricula.trim() : null;
    if (typeof ativo === 'boolean') data.ativo = ativo;

    if (novaSenha && novaSenha.trim().length >= 6) {
      data.senhaHash = await hashPassword(novaSenha.trim());
      data.deveTrocarSenha = true;
    }

    const atualizado = await prisma.usuario.update({
      where: { id },
      data,
    });

    return NextResponse.json({ success: true, usuario: atualizado });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao atualizar usuário: ' + error.message }, { status: 500 });
  }
}

// Excluir usuário
export async function DELETE(req: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Apenas Administrador' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 });

    if (id === session.id) {
      return NextResponse.json({ error: 'Você não pode excluir o seu próprio usuário.' }, { status: 400 });
    }

    // Verificar se possui chamados abertos
    const chamados = await prisma.chamado.count({ where: { abertoPorId: id } });
    if (chamados > 0) {
      // Inativação por segurança do histórico
      await prisma.usuario.update({ where: { id }, data: { ativo: false } });
      return NextResponse.json({ success: true, inativado: true, mensagem: 'Usuário inativado devido a chamados registrados em seu nome.' });
    }

    await prisma.usuario.delete({ where: { id } });
    return NextResponse.json({ success: true, excluido: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao excluir usuário: ' + error.message }, { status: 500 });
  }
}
