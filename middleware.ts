import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname
  const t0 = Date.now()

  const res = NextResponse.next()

  const key = process.env.ADMIN_KEY
  if (key) {
    fetch('https://admin-robin.vercel.app/api/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key,
        app: 'ludoryn',
        method: 'PAGE',
        path,
        status: 200,
        durationMs: Date.now() - t0,
      }),
    }).catch(() => {})
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon|.*\\.(?:svg|png|jpg|ico|webp|json|txt|xml)$).*)'],
}
