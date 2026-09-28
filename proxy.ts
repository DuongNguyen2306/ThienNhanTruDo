import { NextRequest, NextResponse } from 'next/server'
import { parseSession, ROLE_HOME, roleForPath } from '@/lib/auth'

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const required = roleForPath(pathname)
  if (!required) return NextResponse.next()

  const raw = request.cookies.get('verirent_session')?.value
  const session = parseSession(raw)

  if (!session) {
    const url = request.nextUrl.clone()
    url.pathname = '/dang-nhap'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  if (session.role !== required) {
    const url = request.nextUrl.clone()
    url.pathname = '/khong-co-quyen'
    url.searchParams.set('need', required)
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
  ],
}
