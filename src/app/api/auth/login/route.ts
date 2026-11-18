import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyPassword, createSessionToken, setSessionCookie } from '@/lib/auth';

const loginAttemptsMap = new Map<string, { attempts: number; lockedUntil: number | null; lastAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

function getClientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip') || '127.0.0.1';
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = body.email;
    const password = body.password || body.senha;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'E-mail e senha são obrigatórios.' },
        { status: 400 }
      );
    }

    const emailClean = email.toLowerCase().trim();
    const key = `${emailClean}::${getClientIp(req)}`;
    const now = Date.now();
    const rec = loginAttemptsMap.get(key);
    if (rec?.lockedUntil && rec.lockedUntil > now) {
      const mins = Math.max(1, Math.ceil((rec.lockedUntil - now) / 60000));
      return NextResponse.json(
        { error: `Muitas tentativas falhas. Aguarde ${mins} minuto(s) antes de tentar novamente.` },
        { status: 429 }
      );
    }

    const registrarFalha = () => {
      const prev = loginAttemptsMap.get(key);
      const attempts = prev && now - prev.lastAt <= WINDOW_MS ? prev.attempts + 1 : 1;
      const lockedUntil = attempts >= MAX_ATTEMPTS ? now + WINDOW_MS : null;
      loginAttemptsMap.set(key, { attempts, lockedUntil, lastAt: now });
      return { attempts, lockedUntil };
    };

    const usuario = await prisma.usuario.findUnique({
      where: { email: emailClean },
      include: {
        unidade: true,
        empresa: true,
      },
    });

    if (!usuario || !usuario.ativo) {
      const { lockedUntil, attempts } = registrarFalha();
      return NextResponse.json(
        {
          error: lockedUntil
            ? 'Acesso bloqueado por 15 minutos após 5 tentativas inválidas.'
            : `Credenciais inválidas ou usuário inativo. (${MAX_ATTEMPTS - attempts} tentativa(s) restante(s)).`,
        },
        { status: lockedUntil ? 429 : 401 }
      );
    }

    const senhaCorreta = await verifyPassword(password, usuario.senhaHash);
    if (!senhaCorreta) {
      const { lockedUntil, attempts } = registrarFalha();
      return NextResponse.json(
        {
          error: lockedUntil
            ? 'Acesso bloqueado por 15 minutos após 5 tentativas inválidas.'
            : `Credenciais inválidas. (${MAX_ATTEMPTS - attempts} tentativa(s) restante(s)).`,
        },
        { status: lockedUntil ? 429 : 401 }
      );
    }

    loginAttemptsMap.delete(key);

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
