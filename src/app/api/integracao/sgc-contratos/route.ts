import { NextResponse } from 'next/server';
import { buscarContratosManutencaoSgc } from '@/lib/services/sgcIntegration';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const contratosSgc = await buscarContratosManutencaoSgc();

    return NextResponse.json({
      success: true,
      contratos: contratosSgc,
    });
  } catch (error: any) {
    console.error('Erro na rota proxy de contratos SGC:', error);
    return NextResponse.json({ error: error.message || 'Erro ao consultar SGC.' }, { status: 500 });
  }
}
