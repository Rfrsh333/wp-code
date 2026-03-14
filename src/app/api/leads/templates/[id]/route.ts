import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase'
import { verifyAdmin } from '@/lib/admin-auth'
import { z } from 'zod'

const uuidSchema = z.string().uuid()

const updateSchema = z.object({
  naam: z.string().min(1).max(100).optional(),
  onderwerp: z.string().max(200).optional().nullable(),
  bericht: z.string().min(1).max(1000).optional(),
  is_actief: z.boolean().optional(),
})

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
        { error: 'Ongeldig template ID' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const validationResult = updateSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validatiefout' },
        { status: 400 }
      )
    }

    const { data: template, error } = await supabase
      .from('outreach_templates')
      .update(validationResult.data)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: 'Update mislukt' }, { status: 500 })
    }

    return NextResponse.json({ success: true, template })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Er is een fout opgetreden' }, { status: 500 })
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
        { error: 'Ongeldig template ID' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('outreach_templates')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: 'Verwijderen mislukt' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Er is een fout opgetreden' }, { status: 500 })
  }
}
