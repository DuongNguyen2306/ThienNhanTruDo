import { NextRequest, NextResponse } from 'next/server'
import { isAuthOnlyPath, parseSession, ROLE_HOME, roleForPath } from '@/lib/auth'

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const authOnly = isAuthOnlyPath(pathname)
  const required = authOnly ? null : roleForPath(pathname)
  if (!authOnly && !required) return NextResponse.next()

  const raw = request.cookies.get('verirent_session')?.value
  const session = parseSession(raw)

  if (!session) {
    const url = request.nextUrl.clone()
    url.pathname = '/dang-nhap'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  // Any signed-in role may open auth-only pages (e.g. /da-luu).
  if (authOnly) return NextResponse.next()

  if (session.role !== required) {
    const url = request.nextUrl.clone()
    url.pathname = '/khong-co-quyen'
    url.searchParams.set('need', required!)
    url.searchParams.set('home', ROLE_HOME[session.role])
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/tai-khoan/:path*', '/tai-khoan',
    '/seller/:path*', '/seller',
    '/manager/:path*', '/manager',
    '/admin/:path*', '/admin',
    '/da-luu/:path*', '/da-luu',
  ],
}
