import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Only protect /admin routes (both page and api)
  if (request.nextUrl.pathname.startsWith('/admin') || request.nextUrl.pathname.startsWith('/api/admin')) {
    const authHeader = request.headers.get('authorization')
    
    // Default credentials (CHANGE THESE IN PRODUCTION)
    // You should set these in your hosting environment variables (e.g. Vercel)
    const adminUser = process.env.ADMIN_USER || 'admin'
    const adminPass = process.env.ADMIN_PASSWORD || 'admin123'

    if (authHeader) {
      // Basic Auth Header is "Basic base64(user:pass)"
      const authValue = authHeader.split(' ')[1]
      if (authValue) {
          const [user, pwd] = atob(authValue).split(':')

          if (user === adminUser && pwd === adminPass) {
            return NextResponse.next()
          }
      }
    }

    // Return 401 to trigger browser's native login prompt
    return new NextResponse('Authentication required', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Admin Area"',
      },
    })
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/admin/:path*'
  ],
}
