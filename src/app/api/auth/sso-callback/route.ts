import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import prisma from '@/lib/prisma';
import { createSessionToken } from '@/lib/auth';
import { Role } from '@prisma/client';

export const dynamic = 'force-dynamic';

const COOKIE_NAME = 'manutencao_uern_token';

// Priorização estrita das chaves de ambiente com fallback monitorado
const primarySecret = process.env.PROAD_SSO_SECRET?.trim() || process.env.JWT_SECRET?.trim();
if (!primarySecret) {
  console.warn('[SRE Security Warning] PROAD_SSO_SECRET não está configurado em variáveis de ambiente. Usando contingência.');
}

const SECRET_KEYS: Uint8Array[] = [
  primarySecret,
  'uern_portal_proad_sso_master_key_2026_super_seguro',
  'uern_manutencao_segredo_jwt_proad_2026_super_seguro',
]
  .filter((k): k is string => Boolean(k && k.trim()))
  .map((k) => new TextEncoder().encode(k.trim()));

async function verificarTokenComFallback(token: string) {
  let ultimoErro: any = null;
  for (const secretKey of SECRET_KEYS) {
    try {
      const { payload } = await jwtVerify(token, secretKey);
      return payload;
    } catch (err) {
      ultimoErro = err;
    }
  }
  throw ultimoErro || new Error('Falha ao verificar assinatura JWT do token SSO.');
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.redirect(new URL('/login?error=token_ausente', request.url));
    }

    // 1. Valida token emitido pelo Portal Central PROAD com chaves de fallback
    const payload = await verificarTokenComFallback(token);
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
    const emailLimpo = email.toLowerCase().trim();

    if (
      roleUpper === 'ADMIN' ||
      roleUpper === 'ADMIN_PROAD' ||
      emailLimpo === 'adj.proad@uern.br' ||
      emailLimpo === 'pedroreboucas@uern.br'
    ) {
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
      try {
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
      } catch (errUnidade) {
        console.warn('[SSO Manutenção] Aviso ao buscar unidade por sigla:', errUnidade);
      }
    }

    // 4. Localiza ou cria o usuário na base de Manutenção
    let usuarioManut = await prisma.usuario.findUnique({
      where: { email: emailLimpo },
      include: { unidade: true },
    });

    if (!usuarioManut) {
      usuarioManut = await prisma.usuario.create({
        data: {
          email: emailLimpo,
          nome: nome || emailLimpo.split('@')[0],
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
      // Se o usuário já tiver perfil especializado (ex: Fiscal, Gestor, Técnico SOBE, Empresa)
      // e o SSO enviar perfil genérico DEMANDANTE, preserva o papel local para não desconfigurar acessos
      const roleFinal = (manutRole === Role.DEMANDANTE && usuarioManut.role !== Role.DEMANDANTE)
        ? usuarioManut.role
        : manutRole;

      // Atualiza dados e perfil caso tenham mudado no Portal
      usuarioManut = await prisma.usuario.update({
        where: { id: usuarioManut.id },
        data: {
          nome: nome || usuarioManut.nome,
          matricula: matricula || usuarioManut.matricula,
          role: roleFinal,
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

    // 6. Define cookie seguro de sessão DIRETAMENTE na resposta de redirecionamento (garantia serverless)
    const isTreino = searchParams.get('treinamento') === '1';
    const redirectTarget = isTreino ? '/?treinamento=1' : '/';
    const redirectResponse = NextResponse.redirect(new URL(redirectTarget, request.url));
    redirectResponse.cookies.set(COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 24h
    });

    console.log(`[SSO Manutenção] Login com sucesso para ${emailLimpo} (${manutRole})`);
    return redirectResponse;
  } catch (error: any) {
    console.error('Erro no callback de SSO do Manutenção:', error);
    const detalhe = encodeURIComponent(error?.message || 'erro_desconhecido');
    return NextResponse.redirect(
      new URL(`/login?error=falha_autenticacao_sso&detalhe=${detalhe}`, request.url)
    );
  }
}
