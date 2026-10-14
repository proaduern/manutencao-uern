import { NextResponse } from 'next/server';
import { buscarContratosManutencaoSgc, sincronizarContratosManutencaoComSgc } from '@/lib/services/sgcIntegration';
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

export async function POST() {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'ADMIN' && session.role !== 'GESTOR_CONTRATO')) {
      return NextResponse.json({ error: 'Apenas administradores podem sincronizar contratos do SGC.' }, { status: 403 });
    }

    const resultado = await sincronizarContratosManutencaoComSgc();

    return NextResponse.json({
      success: true,
      mensagem: `${resultado.importados} contrato(s) importado(s) e ${resultado.atualizados} atualizado(s) com sucesso a partir do SGC!`,
      resultado,
    });
  } catch (error: any) {
    console.error('Erro ao sincronizar contratos com SGC:', error);
    return NextResponse.json({ error: error.message || 'Erro ao sincronizar contratos.' }, { status: 500 });
  }
}

