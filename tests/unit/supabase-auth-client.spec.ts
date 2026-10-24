import { test, expect } from "@playwright/test";
import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";
import { maakAuthClient } from "../../src/lib/supabase";

/**
 * Een login op de gedeelde supabaseAdmin zet het token van die gebruiker op de client; daarna draait
 * elke query op dezelfde serverinstantie als `authenticated` in plaats van service role (24-10-2026:
 * admin zag 0 medewerkers en "permission denied for table id_verificaties").
 */

function bronbestanden(map: string): string[] {
  return readdirSync(map).flatMap((naam) => {
    const pad = join(map, naam);
    if (statSync(pad).isDirectory()) return bronbestanden(pad);
    return /\.(ts|tsx)$/.test(naam) ? [pad] : [];
  });
}

test.describe("auth-client los van supabaseAdmin", () => {
  test("maakAuthClient geeft elke keer een nieuwe client", () => {
    const bewaard = { url: process.env.NEXT_PUBLIC_SUPABASE_URL, sleutel: process.env.SUPABASE_SERVICE_ROLE_KEY };
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://voorbeeld.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-sleutel";
    try {
      expect(maakAuthClient()).not.toBe(maakAuthClient());
    } finally {
      if (bewaard.url === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      else process.env.NEXT_PUBLIC_SUPABASE_URL = bewaard.url;
      if (bewaard.sleutel === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      else process.env.SUPABASE_SERVICE_ROLE_KEY = bewaard.sleutel;
    }
  });

  test("nergens een sessie zetten op supabaseAdmin of supabase", () => {
    const fout = /\bsupabase(Admin)?\.auth\.(signInWithPassword|signInWithOtp|signInWithIdToken|verifyOtp|setSession|exchangeCodeForSession)\b/;
    const overtreders = bronbestanden(join(__dirname, "../../src/app/api"))
      .concat(bronbestanden(join(__dirname, "../../src/lib")))
      .filter((pad) => fout.test(readFileSync(pad, "utf8")));
    expect(overtreders).toEqual([]);
  });
});
