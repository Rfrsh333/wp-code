import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase'
import { verifyAdmin } from '@/lib/admin-auth'
import { z } from 'zod'
import { captureRouteError } from "@/lib/sentry-utils";

const uuidSchema = z.string().uuid()

const updateLeadSchema = z.object({
  naam: z.string().min(1).max(200).optional(),
  bedrijf: z.string().max(200).optional().nullable(),
  functie: z.string().max(200).optional().nullable(),
  telefoon: z.string().max(50).optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  stad: z.string().max(100).optional().nullable(),
  status: z.enum(['nieuw', 'benaderd', 'in_gesprek', 'geplaatst', 'archief', 'niet_interested']).optional(),
  prioriteit: z.enum(['laag', 'normaal', 'hoog']).optional(),
  notities: z.string().max(2000).optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  volgende_actie: z.string().optional().nullable(),
  toegewezen_aan: z.string().uuid().optional().nullable(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Auth check
    const { isAdmin } = await verifyAdmin(request)
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    const { id } = await params

    // UUID validation (fix #14)
    if (!uuidSchema.safeParse(id).success) {
      return NextResponse.json(
        { error: 'Ongeldig lead ID' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: 'Lead niet gevonden' },
        { status: 404 }
      )
    }

    const { data: outreach } = await supabase
      .from('lead_outreach')
      .select('*')
      .eq('lead_id', id)
      .order('created_at', { ascending: false })

    return NextResponse.json({
      lead: data,
      outreach: outreach || [],
    })
  } catch (error) {
    captureRouteError(error, { route: "/api/leads/[id]", action: "GET" });
    // console.error('API error:', error)
    return NextResponse.json(
      { error: 'Er is een fout opgetreden' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { isAdmin } = await verifyAdmin(request)
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    const { id } = await params

    if (!uuidSchema.safeParse(id).success) {
      return NextResponse.json(
        { error: 'Ongeldig lead ID' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const validationResult = updateLeadSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validatiefout' },
        { status: 400 }
      )
    }

    const { data: lead, error } = await supabase
      .from('leads')
      .update(validationResult.data)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      captureRouteError(error, { route: "/api/leads/[id]", action: "PATCH" });
      // console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Update mislukt' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, lead })
  } catch (error) {
    captureRouteError(error, { route: "/api/leads/[id]", action: "PATCH" });
    // console.error('API error:', error)
    return NextResponse.json(
      { error: 'Er is een fout opgetreden' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { isAdmin } = await verifyAdmin(request)
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }

    const { id } = await params

    if (!uuidSchema.safeParse(id).success) {
      return NextResponse.json(
        { error: 'Ongeldig lead ID' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('leads')
      .delete()
      .eq('id', id)

    if (error) {
      captureRouteError(error, { route: "/api/leads/[id]", action: "DELETE" });
      // console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Verwijderen mislukt' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    captureRouteError(error, { route: "/api/leads/[id]", action: "DELETE" });
    // console.error('API error:', error)
    return NextResponse.json(
      { error: 'Er is een fout opgetreden' },
      { status: 500 }
    )
  }
}
