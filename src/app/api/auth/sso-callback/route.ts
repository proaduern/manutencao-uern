import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import prisma from '@/lib/prisma';
import { createSessionToken, setSessionCookie } from '@/lib/auth';
import { Role } from '@prisma/client';

export const dynamic = 'force-dynamic';

const PROAD_SSO_SECRET = new TextEncoder().encode(
  process.env.PROAD_SSO_SECRET || 'uern_portal_proad_sso_master_key_2026_super_seguro'
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.redirect(new URL('/login?error=token_ausente', request.url));
    }

    // 1. Valida token emitido pelo Portal Central PROAD
    const { payload } = await jwtVerify(token, PROAD_SSO_SECRET);
    const { email, nome, matricula, role, targetSystem, unidadeSigla } = payload as {
      userId?: string;
      email: string;
      nome: string;
      matricula?: string;
      role?: string;
      targetSystem: string;
      unidadeSigla?: string;
    };

    if (targetSystem !== 'MANUTENCAO' || !email) {
      return NextResponse.redirect(new URL('/login?error=token_invalido_destino', request.url));
    }

    // 2. Mapeamento de papéis para o enum Role de Manutenção
    let manutRole: Role = Role.DEMANDANTE;
    const roleUpper = (role || '').toUpperCase();

    if (roleUpper === 'ADMIN' || roleUpper === 'ADMIN_PROAD') {
      manutRole = Role.ADMIN;
    } else if (roleUpper === 'GESTOR_CONTRATO' || roleUpper === 'GESTOR') {
      manutRole = Role.GESTOR_CONTRATO;
    } else if (roleUpper === 'FISCAL_ADM' || roleUpper === 'FISCAL_ADMINISTRATIVO') {
      manutRole = Role.FISCAL_ADM;
    } else if (roleUpper === 'FISCAL_TECNICO') {
      manutRole = Role.FISCAL_TECNICO;
    } else if (roleUpper === 'FISCAL_SETORIAL') {
      manutRole = Role.FISCAL_SETORIAL;
    } else if (roleUpper === 'GESTOR_UNIDADE') {
      manutRole = Role.GESTOR_UNIDADE;
    } else if (roleUpper === 'TECNICO_SOBE') {
      manutRole = Role.TECNICO_SOBE;
    } else if (roleUpper === 'EMPRESA') {
      manutRole = Role.EMPRESA;
    } else {
      manutRole = Role.DEMANDANTE;
    }

    // 3. Localiza unidade pelo código/sigla se aplicável
    let unidadeId: string | null = null;
    let unidadeNome: string | null = null;
    if (unidadeSigla) {
      const unidadeDb = await prisma.unidade.findFirst({
        where: {
          OR: [
            { sigla: { equals: unidadeSigla, mode: 'insensitive' } },
            { codigo: { equals: unidadeSigla, mode: 'insensitive' } },
          ],
        },
      });
      if (unidadeDb) {
        unidadeId = unidadeDb.id;
        unidadeNome = unidadeDb.nome;
      }
    }

    // 4. Localiza ou cria o usuário na base de Manutenção
    let usuarioManut = await prisma.usuario.findUnique({
      where: { email: email.toLowerCase() },
      include: { unidade: true },
    });

    if (!usuarioManut) {
      usuarioManut = await prisma.usuario.create({
        data: {
          email: email.toLowerCase(),
          nome: nome || email.split('@')[0],
          matricula: matricula || null,
          role: manutRole,
          unidadeId: unidadeId,
          senhaHash: '$2a$10$SSO_MANAGED_AUTHENTICATION_BY_PORTAL_PROAD',
          ativo: true,
          deveTrocarSenha: false,
        },
        include: { unidade: true },
      });
    } else {
      // Atualiza dados e perfil caso tenham mudado no Portal
      usuarioManut = await prisma.usuario.update({
        where: { id: usuarioManut.id },
        data: {
          nome: nome || usuarioManut.nome,
          matricula: matricula || usuarioManut.matricula,
          role: manutRole,
          ativo: true,
          deveTrocarSenha: false,
          ...(unidadeId && !usuarioManut.unidadeId ? { unidadeId } : {}),
        },
        include: { unidade: true },
      });
    }

    // 5. Gera token de sessão no sistema de manutenção
    const sessionToken = await createSessionToken({
      id: usuarioManut.id,
      nome: usuarioManut.nome,
      email: usuarioManut.email,
      matricula: usuarioManut.matricula,
      role: usuarioManut.role,
      unidadeId: usuarioManut.unidadeId,
      unidadeNome: usuarioManut.unidade?.nome || unidadeNome,
      empresaId: usuarioManut.empresaId,
      deveTrocarSenha: false,
    });

    // 6. Define cookie seguro de sessão
    await setSessionCookie(sessionToken);

    // 7. Redireciona com sessão ativa para o painel principal
    return NextResponse.redirect(new URL('/', request.url));
  } catch (error: any) {
    console.error('Erro no callback de SSO do Manutenção:', error);
    return NextResponse.redirect(new URL('/login?error=falha_autenticacao_sso', request.url));
  }
}
