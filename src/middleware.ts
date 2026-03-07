import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Public paths that don't require authentication
const PUBLIC_PATHS = [
  '/login',
  '/api/auth/login',
  '/api/auth/check',
  '/api/auth/setup',
]

// Static files and Next.js internal paths
const STATIC_PATHS = [
  '/_next',
  '/favicon.ico',
  '/logo.svg',
  '/public/',
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow static files
  if (STATIC_PATHS.some(path => pathname.startsWith(path))) {
    return NextResponse.next()
  }

  // Check if this is a public path
  if (PUBLIC_PATHS.some(path => pathname === path || pathname.startsWith(path + '/'))) {
    return NextResponse.next()
  }

  // Get session token from cookie
  const token = request.cookies.get('session')?.value

  if (!token) {
    // No session, redirect to login
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Simple token format validation
  // The token should be in format: iv:encrypted_data
  const parts = token.split(':')
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    // Invalid token format, redirect to login
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.delete('session')
    return response
  }

  // Token exists and has valid format - allow access
  // Full validation happens in API routes
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}
