import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { captureRouteError } from "@/lib/sentry-utils";

export async function GET() {
  try {
    // Haal categorieën op met hun functies
    const { data: categorieen, error: catError } = await supabaseAdmin
      .from('dienst_categorieen')
      .select('id, naam, slug, icon, volgorde')
      .eq('actief', true)
      .order('volgorde');

    if (catError) throw catError;

    const { data: functies, error: funcError } = await supabaseAdmin
      .from('dienst_functies')
      .select('id, categorie_id, naam, slug, volgorde')
      .eq('actief', true)
      .order('volgorde');

    if (funcError) throw funcError;

    const { data: tags, error: tagError } = await supabaseAdmin
      .from('dienst_tags')
      .select('id, naam, slug, kleur, volgorde')
      .eq('actief', true)
      .order('volgorde');

    if (tagError) throw tagError;

    // Groepeer functies per categorie
    const categorieenMetFuncties = categorieen?.map(cat => ({
      ...cat,
      functies: functies?.filter(f => f.categorie_id === cat.id) || [],
    })) || [];

    return NextResponse.json({
      categorieen: categorieenMetFuncties,
      tags: tags || [],
    });
  } catch (error) {
    captureRouteError(error, { route: "/api/dienst-filters", action: "GET" });
    // console.error('[DIENST-FILTERS] Error:', error);
    return NextResponse.json({ error: 'Kon filters niet ophalen' }, { status: 500 });
  }
}
