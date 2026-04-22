import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase'
import { verifyAdmin } from '@/lib/admin-auth'
import { z } from 'zod'
import { captureRouteError } from "@/lib/sentry-utils";

const uuidSchema = z.string().uuid()

const whatsappSchema = z.object({
  telefoon: z.string().min(10, 'Telefoonnummer te kort'),
  bericht: z.string().min(1, 'Bericht mag niet leeg zijn').max(1000),
  template_id: z.string().uuid().optional(),
})

// Status hierarchy — WhatsApp should never regress status (fix #15)
const STATUS_ORDER = ['nieuw', 'benaderd', 'in_gesprek', 'geplaatst', 'archief', 'niet_interested']

export async function POST(
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

    if (!uuidSchema.safeParse(id).success) {
      return NextResponse.json(
        { error: 'Ongeldig lead ID' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const validationResult = whatsappSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validatiefout' },
        { status: 400 }
      )
    }

    const { telefoon, bericht, template_id } = validationResult.data

    // Haal lead op met huidige status
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('naam, status, aantal_contactpogingen')
      .eq('id', id)
      .single()

    if (leadError || !lead) {
      return NextResponse.json(
        { error: 'Lead niet gevonden' },
        { status: 404 }
      )
    }

    // Template gebruik updaten via SQL increment (fix #16 race condition)
    let templateNaam: string | undefined
    if (template_id) {
      const { data: template } = await supabase
        .from('outreach_templates')
        .select('naam')
        .eq('id', template_id)
        .single()

      if (template) {
        templateNaam = template.naam
        // Atomic increment via RPC, fallback naar gewone update
        const rpcResult = await supabase.rpc('increment_template_usage', { template_id })
        if (rpcResult.error) {
          await supabase
            .from('outreach_templates')
            .update({ aantal_gebruikt: 1 })
            .eq('id', template_id)
        }
      }
    }

    // Format telefoonnummer (fix #18)
    let cleanPhone = telefoon.replace(/\D/g, '')
    // Nederlandse nummers: 06... → 316...
    if (cleanPhone.startsWith('06')) {
      cleanPhone = '31' + cleanPhone.substring(1)
    } else if (cleanPhone.startsWith('0')) {
      cleanPhone = '31' + cleanPhone.substring(1)
    }

    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(bericht)}`

    // Log outreach
    await supabase
      .from('lead_outreach')
      .insert({
        lead_id: id,
        kanaal: 'whatsapp',
        richting: 'uitgaand',
        bericht,
        template_naam: templateNaam,
        status: 'verstuurd',
      })

    // Update lead — alleen status updaten als het een progressie is (fix #15)
    const currentStatusIndex = STATUS_ORDER.indexOf(lead.status)
    const benaderdIndex = STATUS_ORDER.indexOf('benaderd')
    const newStatus = currentStatusIndex < benaderdIndex ? 'benaderd' : undefined

    const updateData: Record<string, unknown> = {
      laatste_contact: new Date().toISOString(),
      aantal_contactpogingen: (lead.aantal_contactpogingen || 0) + 1,
    }
    if (newStatus) {
      updateData.status = newStatus
    }

    await supabase
      .from('leads')
      .update(updateData)
      .eq('id', id)

    return NextResponse.json({
      success: true,
      whatsapp_url: whatsappUrl,
      message: 'WhatsApp wordt geopend...',
    })
  } catch (error) {
    captureRouteError(error, { route: "/api/leads/[id]/whatsapp", action: "POST" });
    // console.error('API error:', error)
    return NextResponse.json(
      { error: 'Er is een fout opgetreden' },
      { status: 500 }
    )
  }
}
