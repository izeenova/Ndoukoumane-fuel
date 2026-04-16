import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const { token } = req.nextauth
    const { pathname } = req.nextUrl

    if (!token) {
      return NextResponse.redirect(new URL('/login', req.url))
    }

    const role = token.role as string

    // Routes ADMIN uniquement
    if (
      pathname.startsWith('/vehicules') ||
      pathname.startsWith('/personnel') ||
      pathname.startsWith('/alertes')
    ) {
      if (role !== 'ADMIN') {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
    }

    // Routes ADMIN + CARBURANT
    if (pathname.startsWith('/carburant')) {
      if (!['ADMIN', 'CARBURANT'].includes(role)) {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
    }

    // Routes ADMIN + REPARATION
    if (pathname.startsWith('/reparations')) {
      if (!['ADMIN', 'REPARATION'].includes(role)) {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
    }
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
)

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/vehicules/:path*',
    '/personnel/:path*',
    '/carburant/:path*',
    '/reparations/:path*',
    '/alertes/:path*',
  ],
}
