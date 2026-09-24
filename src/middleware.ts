import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET_STRING = process.env.JWT_SECRET || 'uern_manutencao_segredo_jwt_proad_2026_super_seguro';
const SECRET = new TextEncoder().encode(JWT_SECRET_STRING);
const COOKIE_NAME = 'manutencao_uern_token';

// Rotas públicas que não exigem login
const PUBLIC_ROUTES = ['/login', '/primeiro-acesso'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Permitir arquivos estáticos, rotas internas do Next.js e favicon
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth/login') ||
    pathname.includes('/favicon.ico') ||
    pathname.startsWith('/public')
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get(COOKIE_NAME)?.value;
  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));

  if (!token) {
    if (isPublicRoute) {
      return NextResponse.next();
    }
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const { payload } = await jwtVerify(token, SECRET);
    const userRole = (payload as any).role;
    const deveTrocarSenha = (payload as any).deveTrocarSenha;

    // Se deve trocar a senha e não está na tela de primeiro acesso
    if (deveTrocarSenha && pathname !== '/primeiro-acesso') {
      return NextResponse.redirect(new URL('/primeiro-acesso', req.url));
    }

    // Se já está logado e tenta acessar /login
    if (isPublicRoute) {
      return NextResponse.redirect(new URL('/', req.url));
    }

    return NextResponse.next();
  } catch (err) {
    // Token inválido ou expirado
    const response = NextResponse.redirect(new URL('/login', req.url));
    response.cookies.delete(COOKIE_NAME);
    return response;
  }
}

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico).*)'],
};
