import { NextResponse } from 'next/server';
import { getSession, obterSessaoReal } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  const realSession = await obterSessaoReal();
  if (!session) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }
  return NextResponse.json({
    user: session,
    realUser: realSession,
    isImpersonando: Boolean(
      realSession?.role === 'ADMIN' &&
        (session.id !== realSession.id || session.role !== realSession.role)
    ),
  });
}
