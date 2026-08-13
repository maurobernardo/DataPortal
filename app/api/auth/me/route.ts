export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getCurrentUserProfile, getUserInitials } from '@/lib/auth'

export async function GET() {
  const user = await getCurrentUserProfile()

  if (!user) {
    return NextResponse.json({ user: null })
  }

  return NextResponse.json({
    user: {
      ...user,
      initials: getUserInitials(user.name, user.email),
    },
  })
}