import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyPassword, createSessionToken, setSessionCookie } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'E-mail e senha são obrigatórios.' },
        { status: 400 }
      );
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: {
        unidade: true,
        empresa: true,
      },
    });

    if (!usuario || !usuario.ativo) {
      return NextResponse.json(
        { error: 'Credenciais inválidas ou usuário inativo.' },
        { status: 401 }
      );
    }

    const senhaCorreta = await verifyPassword(password, usuario.senhaHash);
    if (!senhaCorreta) {
      return NextResponse.json(
        { error: 'Credenciais inválidas.' },
        { status: 401 }
      );
    }

    const token = await createSessionToken({
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      matricula: usuario.matricula,
      role: usuario.role,
      unidadeId: usuario.unidadeId,
      unidadeNome: usuario.unidade?.nome,
      empresaId: usuario.empresaId,
      deveTrocarSenha: usuario.deveTrocarSenha,
    });

    await setSessionCookie(token);

    return NextResponse.json({
      success: true,
      deveTrocarSenha: usuario.deveTrocarSenha,
      user: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        role: usuario.role,
        unidadeNome: usuario.unidade?.nome,
      },
    });
  } catch (error: any) {
    console.error('Erro no login:', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar autenticação.' },
      { status: 500 }
    );
  }
}
