import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { AUTH_COOKIE_NAME, getAuthCookieOptions } from '@/lib/auth'

export async function POST() {
  const cookieStore = await cookies()
  cookieStore.set(AUTH_COOKIE_NAME, '', {
    ...getAuthCookieOptions(),
    maxAge: 0,
  })

  return NextResponse.json({ success: true })
}













