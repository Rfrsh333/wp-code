import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Lazy initialization om build-time errors te voorkomen
let _supabase: SupabaseClient | null = null;
let _supabaseAdmin: SupabaseClient | null = null;

function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url || url.trim() === '') {
    console.error('Supabase URL missing. Env vars:', {
      NODE_ENV: process.env.NODE_ENV,
      hasUrl: !!url,
      url: url?.substring(0, 20) + '...',
    });
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is missing or empty. Check Vercel environment variables.");
  }
  return url;
}

function getSupabaseAnonKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key || key.trim() === '') {
    console.error('Supabase Anon Key missing. Env vars:', {
      NODE_ENV: process.env.NODE_ENV,
      hasKey: !!key,
      keyPrefix: key?.substring(0, 20) + '...',
    });
    throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is missing or empty. Check Vercel environment variables.");
  }
  return key;
}

function getSupabaseClient(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(getSupabaseUrl(), getSupabaseAnonKey());
  }
  return _supabase;
}

function getSupabaseAdminClient(): SupabaseClient {
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
  return _supabaseAdmin;
}

// Public client (beperkte toegang)
export const supabase = new Proxy({} as SupabaseClient, {
  get(target, prop) {
    const client = getSupabaseClient();
    const value = client[prop as keyof SupabaseClient];
    return typeof value === 'function' ? value.bind(client) : value;
  }
});

// Admin client (volledige toegang - alleen server-side)
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(target, prop) {
    const client = getSupabaseAdminClient();
    const value = client[prop as keyof SupabaseClient];
    return typeof value === 'function' ? value.bind(client) : value;
  }
});
