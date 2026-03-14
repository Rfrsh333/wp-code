import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase'
import { verifyAdmin } from '@/lib/admin-auth'
import { z } from 'zod'

const templateSchema = z.object({
  naam: z.string().min(1).max(100),
  kanaal: z.enum(['whatsapp', 'email']),
  onderwerp: z.string().max(200).optional(),
  bericht: z.string().min(1).max(1000),
  is_actief: z.boolean().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const { isAdmin } = await verifyAdmin(request)
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const kanaal = searchParams.get('kanaal')

    let query = supabase
      .from('outreach_templates')
      .select('*')
      .eq('is_actief', true)
      .order('created_at', { ascending: false })

    if (kanaal && ['whatsapp', 'email'].includes(kanaal)) {
      query = query.eq('kanaal', kanaal)
    }

    const { data, error } = await query

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: 'Ophalen mislukt' }, { status: 500 })
    }

    return NextResponse.json({ templates: data || [] })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Er is een fout opgetreden' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { isAdmin } = await verifyAdmin(request)
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validationResult = templateSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validatiefout' },
        { status: 400 }
      )
    }

    const data = validationResult.data

    const { data: template, error } = await supabase
      .from('outreach_templates')
      .insert({
        naam: data.naam,
        kanaal: data.kanaal,
        onderwerp: data.onderwerp || null,
        bericht: data.bericht,
        is_actief: data.is_actief !== false,
        aantal_gebruikt: 0,
      })
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: 'Aanmaken mislukt' }, { status: 500 })
    }

    return NextResponse.json({ success: true, template }, { status: 201 })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Er is een fout opgetreden' }, { status: 500 })
  }
}
