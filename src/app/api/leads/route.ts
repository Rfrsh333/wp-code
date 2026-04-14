import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase'
import { verifyAdmin } from '@/lib/admin-auth'
import { checkRedisRateLimit, apiRateLimit, getClientIP } from '@/lib/rate-limit-redis'
import { z } from 'zod'

const VALID_PLATFORMS = ['facebook', 'linkedin', 'instagram', 'google', 'website', 'handmatig'] as const
const VALID_STATUSES = ['nieuw', 'benaderd', 'in_gesprek', 'geplaatst', 'archief', 'niet_interested'] as const

const leadSchema = z.object({
  naam: z.string().min(1).max(200),
  bedrijf: z.string().max(200).optional(),
  functie: z.string().max(200).optional(),
  telefoon: z.string().max(50).optional(),
  email: z.string().email().optional().or(z.literal('')),
  stad: z.string().max(100).optional(),
  platform: z.enum(VALID_PLATFORMS),
  bron_url: z.string().url().optional().or(z.literal('')),
  bron_naam: z.string().max(200).optional(),
  notities: z.string().max(2000).optional(),
  bookmarklet_token: z.string().optional(),
})

// CORS headers for bookmarklet cross-origin requests
const ALLOWED_ORIGINS = [
  'https://www.toptalentjobs.nl',
  'https://toptalentjobs.nl',
  ...(process.env.NODE_ENV === 'development' ? ['http://localhost:3000', 'http://localhost:3001'] : []),
]

function corsHeaders(origin?: string | null) {
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
}

// Handle preflight CORS requests
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin')
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) })
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin')
  try {
    // Rate limiting
    const clientIP = getClientIP(request)
    const rateLimit = await checkRedisRateLimit(`leads:post:${clientIP}`, apiRateLimit)
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Te veel verzoeken. Probeer het later opnieuw.' },
        { status: 429, headers: corsHeaders(origin) }
      )
    }

    const body = await request.json()
    const validationResult = leadSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validatiefout' },
        { status: 400, headers: corsHeaders(origin) }
      )
    }

    const data = validationResult.data
    const isBookmarklet = !!data.bookmarklet_token

    if (isBookmarklet) {
      // Bookmarklet auth: check secret token
      if (data.bookmarklet_token !== process.env.BOOKMARKLET_SECRET_TOKEN) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401, headers: corsHeaders(origin) }
        )
      }
    } else {
      // Admin auth: verify session
      const { isAdmin } = await verifyAdmin(request)
      if (!isAdmin) {
        return NextResponse.json(
          { error: 'Unauthorized - Admin access required' },
          { status: 403, headers: corsHeaders(origin) }
        )
      }
    }

    const { bookmarklet_token, ...leadData } = data

    const { data: lead, error } = await supabase
      .from('leads')
      .insert({
        ...leadData,
        email: leadData.email || null,
        bron_url: leadData.bron_url || null,
        status: 'nieuw',
      })
      .select('id, naam, platform, created_at')
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Opslaan mislukt' },
        { status: 500, headers: corsHeaders(origin) }
      )
    }

    return NextResponse.json(
      { success: true, lead },
      { status: 201, headers: corsHeaders(origin) }
    )
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Er is een fout opgetreden' },
      { status: 500, headers: corsHeaders(origin) }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Auth: admin only
    const { isAdmin } = await verifyAdmin(request)
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const platform = searchParams.get('platform')
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)

    // Select only needed columns for list view (performance fix #25)
    let query = supabase
      .from('leads')
      .select(
        'id, naam, bedrijf, functie, telefoon, email, stad, platform, bron_naam, bron_url, status, prioriteit, created_at, laatste_contact, volgende_actie, aantal_contactpogingen, notities, tags',
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    // Validate platform filter against whitelist (SQL injection prevention)
    if (platform && platform !== 'all') {
      if ((VALID_PLATFORMS as readonly string[]).includes(platform)) {
        query = query.eq('platform', platform)
      }
    }

    // Validate status filter against whitelist
    if (status && status !== 'all') {
      if ((VALID_STATUSES as readonly string[]).includes(status)) {
        query = query.eq('status', status)
      }
    }

    // Server-side search (fix #22)
    if (search && search.trim()) {
      query = query.or(
        `naam.ilike.%${search}%,bedrijf.ilike.%${search}%,functie.ilike.%${search}%,stad.ilike.%${search}%`
      )
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Ophalen mislukt' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      leads: data || [],
      total: count || 0,
      page,
      limit,
    })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Er is een fout opgetreden' },
      { status: 500 }
    )
  }
}
