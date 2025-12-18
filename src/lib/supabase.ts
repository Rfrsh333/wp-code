import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Lazy initialization om build-time errors te voorkomen
let _supabase: SupabaseClient | null = null;
let _supabaseAdmin: SupabaseClient | null = null;

function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url || url.trim() === '') {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is missing or empty");
  }
  return url;
}

function getSupabaseAnonKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key || key.trim() === '') {
    throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is missing or empty");
  }
  return key;
}

// Public client (beperkte toegang)
export const supabase = new Proxy({} as SupabaseClient, {
  get(target, prop) {
    if (!_supabase) {
      _supabase = createClient(getSupabaseUrl(), getSupabaseAnonKey());
    }
    return _supabase[prop as keyof SupabaseClient];
  }
});

// Admin client (volledige toegang - alleen server-side)
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(target, prop) {
    if (!_supabaseAdmin) {
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      _supabaseAdmin = serviceKey
        ? createClient(getSupabaseUrl(), serviceKey, {
            auth: {
              persistSession: false,
              autoRefreshToken: false,
            },
          })
        : createClient(getSupabaseUrl(), getSupabaseAnonKey());
    }
    return _supabaseAdmin[prop as keyof SupabaseClient];
  }
});
