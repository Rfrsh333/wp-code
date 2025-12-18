import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Debug logging voor development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  console.log('Supabase Config:', {
    hasUrl: !!supabaseUrl,
    hasAnonKey: !!supabaseAnonKey,
    urlLength: supabaseUrl?.length,
    keyLength: supabaseAnonKey?.length,
  });
}

if (!supabaseUrl || supabaseUrl.trim() === '') {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL is missing or empty");
}

if (!supabaseAnonKey || supabaseAnonKey.trim() === '') {
  throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is missing or empty");
}

// Public client (beperkte toegang)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client (volledige toegang - alleen server-side)
export const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : supabase;
