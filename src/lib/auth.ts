import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { Role } from '@prisma/client';

const JWT_SECRET_STRING = process.env.JWT_SECRET || 'uern_manutencao_segredo_jwt_proad_2026_super_seguro';
const SECRET = new TextEncoder().encode(JWT_SECRET_STRING);
export const COOKIE_NAME = 'manutencao_uern_token';
export const ADMIN_IMPERSONACAO_COOKIE_NAME = 'manutencao_admin_impersonacao';

export interface UserSession {
  id: string;
  nome: string;
  email: string;
  matricula?: string | null;
  role: Role;
  unidadeId?: string | null;
  unidadeNome?: string | null;
  empresaId?: string | null;
  empresaNome?: string | null;
  deveTrocarSenha: boolean;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(payload: UserSession): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(SECRET);
}

export async function verifySessionToken(token: string): Promise<UserSession | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as UserSession;
  } catch (error) {
    return null;
  }
}

/**
 * Retorna sempre a sesso real autenticada (PROAD/Admin).
 */
export async function obterSessaoReal(): Promise<UserSession | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/**
 * Retorna a sesso ativa.
 * Se o Administrador estiver atuando como outro perfil, retorna a sesso simulada.
 */
export async function getSession(): Promise<UserSession | null> {
  const cookieStore = cookies();
  const realSession = await obterSessaoReal();
  if (!realSession) return null;

  if (realSession.role === 'ADMIN') {
    const impToken = cookieStore.get(ADMIN_IMPERSONACAO_COOKIE_NAME)?.value;
    if (impToken) {
      const impSession = await verifySessionToken(impToken);
      if (impSession) {
        return impSession;
      }
    }
  }

  return realSession;
}

export async function setSessionCookie(token: string) {
  const cookieStore = cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24, // 24 hours
  });
}

export async function iniciarAtuarComo(payload: UserSession): Promise<void> {
  const realSession = await obterSessaoReal();
  if (!realSession || realSession.role !== 'ADMIN') {
    throw new Error('Apenas o Administrador PROAD pode utilizar a funcionalidade "Atuar Como".');
  }

  const token = await createSessionToken(payload);
  const cookieStore = cookies();
  cookieStore.set(ADMIN_IMPERSONACAO_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8, // 8 horas
  });
}

export async function encerrarAtuarComo(): Promise<void> {
  const cookieStore = cookies();
  cookieStore.delete(ADMIN_IMPERSONACAO_COOKIE_NAME);
}

export async function clearSessionCookie() {
  const cookieStore = cookies();
  cookieStore.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  cookieStore.delete(ADMIN_IMPERSONACAO_COOKIE_NAME);
}
