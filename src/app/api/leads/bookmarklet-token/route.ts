import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  const { isAdmin } = await verifyAdmin(request)
  if (!isAdmin) {
    return NextResponse.json(
      { error: 'Unauthorized - Admin access required' },
      { status: 403 }
    )
  }

  const token = process.env.BOOKMARKLET_SECRET_TOKEN
  if (!token) {
    return NextResponse.json(
      { error: 'Bookmarklet token niet geconfigureerd' },
      { status: 500 }
    )
  }

  return NextResponse.json({ token })
}
