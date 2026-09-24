import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession, hashPassword, createSessionToken, setSessionCookie } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const { novaSenha } = await req.json();

    if (!novaSenha || novaSenha.length < 8) {
      return NextResponse.json(
        { error: 'A nova senha deve ter no mínimo 8 caracteres.' },
        { status: 400 }
      );
    }

    const senhaHash = await hashPassword(novaSenha);

    await prisma.usuario.update({
      where: { id: session.id },
      data: {
        senhaHash,
        deveTrocarSenha: false,
      },
    });

    // Atualizar token da sessão
    const updatedToken = await createSessionToken({
      ...session,
      deveTrocarSenha: false,
    });
    await setSessionCookie(updatedToken);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao trocar senha:', error);
    return NextResponse.json(
      { error: 'Erro ao processar troca de senha.' },
      { status: 500 }
    );
  }
}
