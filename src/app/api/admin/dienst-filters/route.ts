import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyAdmin } from '@/lib/admin-auth';
import { z } from 'zod';

// Validation schemas
const categorieSchema = z.object({
  naam: z.string().min(1, 'Naam is verplicht'),
  icon: z.string().nullable().optional(),
  actief: z.boolean().optional(),
  volgorde: z.number().int().optional(),
});

const functieSchema = z.object({
  categorie_id: z.string().uuid('Ongeldige categorie ID'),
  naam: z.string().min(1, 'Naam is verplicht'),
  actief: z.boolean().optional(),
  volgorde: z.number().int().optional(),
});

const tagSchema = z.object({
  naam: z.string().min(1, 'Naam is verplicht'),
  kleur: z.string().regex(/^#[0-9A-F]{6}$/i, 'Ongeldige hex kleur').optional(),
  actief: z.boolean().optional(),
  volgorde: z.number().int().optional(),
});

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function GET(request: NextRequest) {
  const { isAdmin, email } = await verifyAdmin(request);
  if (!isAdmin) {
    console.warn(`[SECURITY] Unauthorized dienst-filters access by: ${email || 'unknown'}`);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    // Haal ALLE categorieën, functies, en tags op (inclusief inactieve)
    const [categorieen, functies, tags] = await Promise.all([
      supabaseAdmin.from('dienst_categorieen').select('*').order('volgorde'),
      supabaseAdmin.from('dienst_functies').select('*').order('volgorde'),
      supabaseAdmin.from('dienst_tags').select('*').order('volgorde'),
    ]);

    return NextResponse.json({
      categorieen: categorieen.data || [],
      functies: functies.data || [],
      tags: tags.data || [],
    });
  } catch (error) {
    console.error('[ADMIN DIENST-FILTERS GET] Error:', error);
    return NextResponse.json({ error: 'Kon filters niet ophalen' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { isAdmin, email } = await verifyAdmin(request);
  if (!isAdmin) {
    console.warn(`[SECURITY] Unauthorized dienst-filters mutation by: ${email || 'unknown'}`);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { action, id, data } = body;

    // === CATEGORIEËN ===
    if (action === 'create_categorie') {
      const validated = categorieSchema.parse(data);
      const slug = slugify(validated.naam);

      const { data: created, error } = await supabaseAdmin
        .from('dienst_categorieen')
        .insert({
          naam: validated.naam,
          slug,
          icon: validated.icon || null,
          actief: validated.actief ?? true,
          volgorde: validated.volgorde ?? 0,
        })
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, data: created });
    }

    if (action === 'update_categorie') {
      if (!id) return NextResponse.json({ error: 'ID vereist' }, { status: 400 });

      const validated = categorieSchema.partial().parse(data);
      const updateData: Record<string, unknown> = {};

      if (validated.naam !== undefined) {
        updateData.naam = validated.naam;
        updateData.slug = slugify(validated.naam);
      }
      if (validated.icon !== undefined) updateData.icon = validated.icon;
      if (validated.actief !== undefined) updateData.actief = validated.actief;
      if (validated.volgorde !== undefined) updateData.volgorde = validated.volgorde;

      const { data: updated, error } = await supabaseAdmin
        .from('dienst_categorieen')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, data: updated });
    }

    if (action === 'delete_categorie') {
      if (!id) return NextResponse.json({ error: 'ID vereist' }, { status: 400 });

      const { error } = await supabaseAdmin
        .from('dienst_categorieen')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    // === FUNCTIES ===
    if (action === 'create_functie') {
      const validated = functieSchema.parse(data);
      const slug = slugify(validated.naam);

      const { data: created, error } = await supabaseAdmin
        .from('dienst_functies')
        .insert({
          categorie_id: validated.categorie_id,
          naam: validated.naam,
          slug,
          actief: validated.actief ?? true,
          volgorde: validated.volgorde ?? 0,
        })
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, data: created });
    }

    if (action === 'update_functie') {
      if (!id) return NextResponse.json({ error: 'ID vereist' }, { status: 400 });

      const validated = functieSchema.partial().parse(data);
      const updateData: Record<string, unknown> = {};

      if (validated.naam !== undefined) {
        updateData.naam = validated.naam;
        updateData.slug = slugify(validated.naam);
      }
      if (validated.categorie_id !== undefined) updateData.categorie_id = validated.categorie_id;
      if (validated.actief !== undefined) updateData.actief = validated.actief;
      if (validated.volgorde !== undefined) updateData.volgorde = validated.volgorde;

      const { data: updated, error } = await supabaseAdmin
        .from('dienst_functies')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, data: updated });
    }

    if (action === 'delete_functie') {
      if (!id) return NextResponse.json({ error: 'ID vereist' }, { status: 400 });

      const { error } = await supabaseAdmin
        .from('dienst_functies')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    // === TAGS ===
    if (action === 'create_tag') {
      const validated = tagSchema.parse(data);
      const slug = slugify(validated.naam);

      const { data: created, error } = await supabaseAdmin
        .from('dienst_tags')
        .insert({
          naam: validated.naam,
          slug,
          kleur: validated.kleur || '#6B7280',
          actief: validated.actief ?? true,
          volgorde: validated.volgorde ?? 0,
        })
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, data: created });
    }

    if (action === 'update_tag') {
      if (!id) return NextResponse.json({ error: 'ID vereist' }, { status: 400 });

      const validated = tagSchema.partial().parse(data);
      const updateData: Record<string, unknown> = {};

      if (validated.naam !== undefined) {
        updateData.naam = validated.naam;
        updateData.slug = slugify(validated.naam);
      }
      if (validated.kleur !== undefined) updateData.kleur = validated.kleur;
      if (validated.actief !== undefined) updateData.actief = validated.actief;
      if (validated.volgorde !== undefined) updateData.volgorde = validated.volgorde;

      const { data: updated, error } = await supabaseAdmin
        .from('dienst_tags')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, data: updated });
    }

    if (action === 'delete_tag') {
      if (!id) return NextResponse.json({ error: 'ID vereist' }, { status: 400 });

      const { error } = await supabaseAdmin
        .from('dienst_tags')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Onbekende actie' }, { status: 400 });
  } catch (error: unknown) {
    console.error('[ADMIN DIENST-FILTERS POST] Error:', error);

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({
        error: 'Validatie fout',
        details: (error as Error & { errors: unknown }).errors,
      }, { status: 400 });
    }

    return NextResponse.json({ error: error instanceof Error ? error.message : 'Actie mislukt' }, { status: 500 });
  }
}
