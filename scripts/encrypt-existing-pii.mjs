#!/usr/bin/env node
/**
 * Eenmalige migratie: versleutel bestaande plaintext PII (medewerkers.iban / .btw_nummer)
 * met app-level AES-256-GCM (zie src/lib/encryption.ts). Idempotent — reeds versleutelde
 * waarden (prefix "enc:v1:") worden overgeslagen.
 *
 * Draai NA het zetten van FIELD_ENCRYPTION_KEY en NA het deployen van de code die overal
 * ont-/versleutelt. Vereist env: SUPABASE_URL (of NEXT_PUBLIC_SUPABASE_URL),
 * SUPABASE_SERVICE_ROLE_KEY, FIELD_ENCRYPTION_KEY.
 *
 *   node scripts/encrypt-existing-pii.mjs            # dry-run (toont aantallen)
 *   node scripts/encrypt-existing-pii.mjs --apply    # voert de encryptie uit
 */
import crypto from "node:crypto";
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const PREFIX = "enc:v1:";
const ALGO = "aes-256-gcm";

// --- env laden (process.env, met fallback naar .env.local) ---
function loadEnv() {
  const env = { ...process.env };
  try {
    const raw = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && env[m[1]] === undefined) {
        env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    // .env.local optioneel
  }
  return env;
}

function getKey(raw) {
  if (!raw) throw new Error("FIELD_ENCRYPTION_KEY ontbreekt.");
  const key = /^[0-9a-fA-F]{64}$/.test(raw) ? Buffer.from(raw, "hex") : Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("FIELD_ENCRYPTION_KEY moet 32 bytes zijn.");
  return key;
}

function encryptField(plaintext, key) {
  if (plaintext == null || plaintext === "" || String(plaintext).startsWith(PREFIX)) return plaintext;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const ct = Buffer.concat([cipher.update(String(plaintext), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, ct]).toString("base64");
}

async function main() {
  const env = loadEnv();
  const apply = process.argv.includes("--apply");
  const url = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const key = getKey(env.FIELD_ENCRYPTION_KEY);

  if (!url || !serviceKey) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY ontbreken.");
  const supabase = createClient(url, serviceKey);

  const FIELDS = ["iban", "btw_nummer"];
  const { data, error } = await supabase
    .from("medewerkers")
    .select(`id, ${FIELDS.join(", ")}`);
  if (error) throw error;

  let teVerwerken = 0;
  let bijgewerkt = 0;

  for (const row of data || []) {
    const update = {};
    for (const f of FIELDS) {
      const val = row[f];
      if (val && !String(val).startsWith(PREFIX)) {
        update[f] = encryptField(val, key);
      }
    }
    if (Object.keys(update).length === 0) continue;
    teVerwerken += 1;
    if (apply) {
      const { error: upErr } = await supabase.from("medewerkers").update(update).eq("id", row.id);
      if (upErr) {
        console.error(`Fout bij ${row.id}:`, upErr.message);
      } else {
        bijgewerkt += 1;
      }
    }
  }

  console.log(apply
    ? `Klaar: ${bijgewerkt}/${teVerwerken} medewerker-rijen versleuteld.`
    : `DRY-RUN: ${teVerwerken} rijen zouden versleuteld worden. Draai met --apply om uit te voeren.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
