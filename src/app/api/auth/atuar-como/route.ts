import { NextRequest, NextResponse } from 'next/server';
import { obterSessaoReal, iniciarAtuarComo, encerrarAtuarComo, UserSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { Role } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const sessaoReal = await obterSessaoReal();
    if (!sessaoReal || sessaoReal.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Apenas Administradores podem alternar perfis na Manutenção Predial.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { tipo, role, usuarioId, empresaNome } = body as {
      tipo?: 'ARQUETIPO' | 'USUARIO_REAL' | 'EMPRESA';
      role?: Role;
      usuarioId?: string;
      empresaNome?: string;
    };

    let payload: UserSession;

    if (tipo === 'USUARIO_REAL' && usuarioId) {
      const u = await prisma.usuario.findUnique({
        where: { id: usuarioId },
        include: { unidade: true, empresa: true },
      });
      if (!u) {
        return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
      }
      payload = {
        id: u.id,
        nome: u.nome,
        email: u.email,
        matricula: u.matricula,
        role: u.role,
        unidadeId: u.unidadeId,
        unidadeNome: u.unidade?.nome,
        empresaId: u.empresaId,
        empresaNome: u.empresa?.razaoSocial,
        deveTrocarSenha: false,
      };
    } else if (tipo === 'EMPRESA' || role === 'EMPRESA') {
      const empresa = await prisma.empresa.findFirst({ orderBy: { razaoSocial: 'asc' } });
      payload = {
        id: 'sim_empresa_manutencao',
        nome: `Preposto - ${empresaNome || empresa?.razaoSocial || 'Contratada de Manutenção Predial'}`,
        email: 'preposto.manutencao@empresa.com.br',
        matricula: 'EXT-MANUT',
        role: 'EMPRESA',
        empresaId: empresa?.id || 'sim_empresa_id',
        empresaNome: empresaNome || empresa?.razaoSocial || 'Contratada de Manutenção Predial',
        deveTrocarSenha: false,
      };
    } else {
      const roleAlvo: Role = role || 'DEMANDANTE';
      const primeiraUnidade = await prisma.unidade.findFirst({ orderBy: { nome: 'asc' } });

      const mapNomes: Record<string, { nome: string; matricula: string }> = {
        GESTOR_CONTRATO: { nome: 'Prof. Gestor de Contrato (Manutenção)', matricula: '010101-1' },
        FISCAL_ADM: { nome: 'Fiscal Administrativo (Manutenção)', matricula: '010202-2' },
        FISCAL_TECNICO: { nome: 'Engenheiro Fiscal Técnico (SOBE)', matricula: '010303-3' },
        FISCAL_SETORIAL: { nome: 'Fiscal Setorial da Manutenção (Campus)', matricula: '010404-4' },
        GESTOR_UNIDADE: { nome: 'Diretor / Gestor da Unidade Demandante', matricula: '010505-5' },
        DEMANDANTE: { nome: 'Servidor Demandante (Abertura de Chamados)', matricula: '010606-6' },
        TECNICO_SOBE: { nome: 'Técnico de Obras e Engenharia (SOBE)', matricula: '010707-7' },
      };

      const info = mapNomes[roleAlvo] || { nome: `Simulação - ${roleAlvo}`, matricula: '000000-0' };

      payload = {
        id: `sim_${roleAlvo.toLowerCase()}`,
        nome: info.nome,
        email: `sim.${roleAlvo.toLowerCase()}@uern.br`,
        matricula: info.matricula,
        role: roleAlvo,
        unidadeId: primeiraUnidade?.id || null,
        unidadeNome: primeiraUnidade?.nome || 'Campus Central Mossoró',
        deveTrocarSenha: false,
      };
    }

    await iniciarAtuarComo(payload);

    return NextResponse.json({
      success: true,
      user: payload,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao alternar perfil.' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await encerrarAtuarComo();
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao encerrar simulação.' }, { status: 500 });
  }
}
