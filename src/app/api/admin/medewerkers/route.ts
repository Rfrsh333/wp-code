import { after, NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { hasRequiredAdminRole, verifyAdmin } from "@/lib/admin-auth";
import { logAuditEvent } from "@/lib/audit-log";
import bcrypt from "bcryptjs";
import { medewerkersPostSchema, validateAdminBody } from "@/lib/validations-admin";
import { validatePasswordSecurity } from "@/lib/password-security";
import { captureRouteError } from "@/lib/sentry-utils";
import { normaliseerEmail } from "@/lib/email-normalisatie";
import { werkMedewerkerLocatieBij, wisOntdekGegevensMedewerker } from "@/lib/locatie/locatie-opslag";
import { nlVandaag } from "@/lib/nl-tijd";
import {
  haalIdCheck,
  IdCheckMigratieOntbreekt,
  keurGoed,
  keurGoedViaVideocall,
  verwijderSessieNaBeslissing,
  wijsAf,
} from "@/lib/id-check/db";
import { controleerVervaldatum, isDefinitief } from "@/lib/id-check/regels";

function generateTemporaryPassword(length = 12) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

export async function GET(request: NextRequest) {
  // KRITIEK: Verify admin before allowing access
  const { isAdmin, email, role } = await verifyAdmin(request);
  if (!isAdmin) {
    console.warn(`[SECURITY] Unauthorized medewerkers access attempt by: ${email || 'unknown'}`);
    return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from("medewerkers")
    // Alleen bestaande kolommen: voornaam/achternaam/telefoonnummer/woonplaats/profiel_foto bestaan
    // niet (42703) → deze route gaf altijd 500 en Medewerkers/Planning/Contracten/Berichten/
    // Shift-aanbiedingen in de admin bleven leeg.
    .select("id, naam, email, telefoon, status, functie, uurtarief, geboortedatum, stad, wachtwoord, profile_photo_url, admin_score_aanwezigheid, admin_score_vaardigheden, no_show_count, notificatie_voorkeuren, created_at")
    .order("naam")
    .limit(500);

  if (error) {
    return NextResponse.json({ error: "Er is een fout opgetreden" }, { status: 500 });
  }

  const sanitized = (data || []).map((medewerker) => ({
    ...medewerker,
    heeft_wachtwoord: Boolean(medewerker.wachtwoord),
    wachtwoord: undefined,
  }));

  await logAuditEvent({
    actorEmail: email,
    actorRole: role,
    action: "admin_medewerkers_list",
    targetTable: "medewerkers",
    summary: "Medewerkerslijst bekeken",
    metadata: { count: sanitized.length },
  });

  return NextResponse.json({ data: sanitized });
}

export async function POST(request: NextRequest) {
  // KRITIEK: Verify admin before allowing any mutations
  const { isAdmin, email, role } = await verifyAdmin(request);
  if (!isAdmin) {
    console.warn(`[SECURITY] Unauthorized medewerkers mutation attempt by: ${email || 'unknown'}`);
    return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 });
  }

  const rawBody = await request.json();
  const validation = validateAdminBody(medewerkersPostSchema, rawBody);
  if (!validation.success) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }
  const { action, id, data } = rawBody;

  if (action === "reset_password") {
    if (!hasRequiredAdminRole(role, ["owner", "operations"])) {
      return NextResponse.json({ error: "Onvoldoende rechten voor wachtwoord reset" }, { status: 403 });
    }
    if (!id) {
      return NextResponse.json({ error: "Medewerker id ontbreekt" }, { status: 400 });
    }

    const temporaryPassword = generateTemporaryPassword();
    const hashedPassword = await bcrypt.hash(temporaryPassword, 12);

    const { error } = await supabaseAdmin
      .from("medewerkers")
      .update({ wachtwoord: hashedPassword })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: "Er is een fout opgetreden" }, { status: 500 });
    }

    await logAuditEvent({
      actorEmail: email,
      actorRole: role,
      action: "admin_medewerker_reset_password",
      targetTable: "medewerkers",
      targetId: id,
      summary: "Tijdelijk medewerker wachtwoord gegenereerd",
    });

    return NextResponse.json({ success: true, temporaryPassword });
  }

  if (action === "create" || action === "update") {
    const payload: Record<string, unknown> = { ...data };
    // Klein opslaan: login zoekt op het genormaliseerde adres (B4).
    if (typeof data.email === "string") payload.email = normaliseerEmail(data.email);
    if (data.wachtwoord) {
      // Validate password security (length, weakness, leaked passwords)
      const passwordValidation = await validatePasswordSecurity(data.wachtwoord);
      if (!passwordValidation.valid) {
        return NextResponse.json({ error: passwordValidation.error }, { status: 400 });
      }
      payload.wachtwoord = await bcrypt.hash(data.wachtwoord, 12);
    } else {
      delete payload.wachtwoord;
    }

    let medewerkerId: string | null = action === "update" ? id : null;
    if (action === "create") {
      const { data: nieuw, error } = await supabaseAdmin.from("medewerkers").insert(payload).select("id").maybeSingle();
      if (error) {
        captureRouteError(error, { route: "/api/admin/medewerkers", action: "POST" });
        // console.error("[MEDEWERKERS] Insert error:", error);
        return NextResponse.json({ error: error.message || "Er is een fout opgetreden" }, { status: 500 });
      }
      medewerkerId = (nieuw?.id as string | undefined) ?? null;
    } else {
      const { error } = await supabaseAdmin.from("medewerkers").update(payload).eq("id", id);
      if (error) {
        captureRouteError(error, { route: "/api/admin/medewerkers", action: "POST" });
        // console.error("[MEDEWERKERS] Update error:", error);
        return NextResponse.json({ error: error.message || "Er is een fout opgetreden" }, { status: 500 });
      }
    }

    // Stap 3: postcode → globale locatie (PDOK, alleen de postcode), na het antwoord.
    if (medewerkerId && "postcode" in payload) {
      const doelId = medewerkerId;
      const postcode = payload.postcode;
      after(() =>
        werkMedewerkerLocatieBij(doelId, postcode, { alleenBijWijziging: true }).catch((e) =>
          captureRouteError(e, { route: "/api/admin/medewerkers", action: "LOCATIE" }),
        ),
      );
    }

    await logAuditEvent({
      actorEmail: email,
      actorRole: role,
      action: action === "create" ? "admin_medewerker_create" : "admin_medewerker_update",
      targetTable: "medewerkers",
      targetId: id || null,
      summary: action === "create" ? "Medewerker aangemaakt" : "Medewerker bijgewerkt",
      metadata: {
        email: data?.email || null,
        status: data?.status || null,
        functieCount: Array.isArray(data?.functie) ? data.functie.length : 0,
      },
    });
  }

  if (action === "update_scores") {
    if (!id) {
      return NextResponse.json({ error: "Medewerker id ontbreekt" }, { status: 400 });
    }

    const { admin_score_aanwezigheid, admin_score_vaardigheden } = data || {};

    const isValidScore = (s: unknown) => typeof s === "number" && s >= 1 && s <= 5;
    if (!isValidScore(admin_score_aanwezigheid) || !isValidScore(admin_score_vaardigheden)) {
      return NextResponse.json({ error: "Scores moeten tussen 1 en 5 liggen" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("medewerkers")
      .update({
        admin_score_aanwezigheid,
        admin_score_vaardigheden,
        admin_score_updated_at: new Date().toISOString(),
        admin_score_updated_by: email,
      })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: "Er is een fout opgetreden" }, { status: 500 });
    }

    await logAuditEvent({
      actorEmail: email,
      actorRole: role,
      action: "admin_medewerker_update_scores",
      targetTable: "medewerkers",
      targetId: id,
      summary: "Admin scores bijgewerkt",
      metadata: { admin_score_aanwezigheid, admin_score_vaardigheden },
    });

    return NextResponse.json({ success: true });
  }

  if (action === "review_document") {
    const { document_id, review_status, review_opmerking } = data || {};

    if (!document_id || !["goedgekeurd", "afgekeurd"].includes(review_status)) {
      return NextResponse.json({ error: "Document ID en geldige review_status zijn verplicht" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("medewerker_documenten")
      .update({
        review_status,
        review_opmerking: review_opmerking || null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", document_id);

    if (error) {
      return NextResponse.json({ error: "Er is een fout opgetreden" }, { status: 500 });
    }

    await logAuditEvent({
      actorEmail: email,
      actorRole: role,
      action: "admin_document_review",
      targetTable: "medewerker_documenten",
      targetId: document_id,
      summary: `Document ${review_status}`,
      metadata: { review_status, review_opmerking },
    });

    return NextResponse.json({ success: true });
  }

  // ID-controle via Didit: een mens beslist (nooit automatisch afwijzen, art. 22 AVG).
  if (action === "beoordeel_id_check") {
    const { verificatie_id, besluit, vervaldatum } = data as {
      verificatie_id: string;
      besluit: "goedgekeurd" | "afgewezen";
      vervaldatum?: string;
    };
    const reden = typeof data?.reden === "string" ? data.reden.trim() : "";
    try {
      const rij = await haalIdCheck(verificatie_id);
      if (!rij) return NextResponse.json({ error: "ID-check niet gevonden" }, { status: 404 });
      if (isDefinitief(rij.status)) {
        return NextResponse.json({ error: "Deze ID-check is al beoordeeld" }, { status: 409 });
      }

      if (besluit === "afgewezen") {
        if (reden.length < 3) {
          return NextResponse.json({ error: "Geef een reden voor het afwijzen" }, { status: 400 });
        }
        if ((await wijsAf({ id: rij.id, reden, door: email ?? "admin" })) === "al_beslist") {
          return NextResponse.json({ error: "Deze ID-check is al beoordeeld" }, { status: 409 });
        }
      } else {
        const datum = vervaldatum || rij.vervaldatum;
        const fout = controleerVervaldatum(datum, nlVandaag());
        if (fout) return NextResponse.json({ error: fout }, { status: 400 });
        const resultaat = await keurGoed({
          rij,
          update: { reden: reden || null },
          vervaldatum: datum!,
          beoordeeldDoor: email ?? "admin",
          opmerking: reden || null,
        });
        if (!resultaat.ok) return NextResponse.json({ error: "Deze ID-check is al beoordeeld" }, { status: 409 });
      }

      await logAuditEvent({
        actorEmail: email,
        actorRole: role,
        action: "admin_id_check_beoordeeld",
        targetTable: "id_verificaties",
        targetId: rij.id,
        summary: `ID-check ${besluit}`,
        metadata: {
          besluit,
          reden: reden || null,
          medewerker_id: rij.medewerker_id,
          methode: rij.methode,
          didit_status: rij.didit_status,
          handmatig_redenen: rij.handmatig_redenen ?? [],
        },
      });

      // Definitief: de sessie bij Didit opruimen (beelden weg), na het antwoord.
      if (rij.didit_session_id) {
        const sessionId = rij.didit_session_id;
        after(() => verwijderSessieNaBeslissing(rij.id, sessionId));
      }
      return NextResponse.json({ success: true });
    } catch (fout) {
      if (fout instanceof IdCheckMigratieOntbreekt) {
        return NextResponse.json({ error: "Migratie 20261024_id_verificaties_didit.sql ontbreekt" }, { status: 503 });
      }
      captureRouteError(fout, { route: "/api/admin/medewerkers", action: "ID_CHECK" });
      return NextResponse.json({ error: "Er is een fout opgetreden" }, { status: 500 });
    }
  }

  // "ID gecontroleerd via videocall": goedgekeurd id_bewijs zonder bestand, met de vervaldatum.
  if (action === "id_videocall") {
    const { vervaldatum } = data as { vervaldatum: string };
    const opmerking = typeof data?.opmerking === "string" ? data.opmerking.trim() : "";
    const fout = controleerVervaldatum(vervaldatum, nlVandaag());
    if (fout) return NextResponse.json({ error: fout }, { status: 400 });
    try {
      const { data: medewerker } = await supabaseAdmin.from("medewerkers").select("id").eq("id", id).maybeSingle();
      if (!medewerker) return NextResponse.json({ error: "Medewerker niet gevonden" }, { status: 404 });

      const resultaat = await keurGoedViaVideocall({
        medewerkerId: id,
        vervaldatum,
        door: email ?? "admin",
        opmerking: opmerking || null,
      });
      if (!resultaat.ok) return NextResponse.json({ error: "Probeer het opnieuw" }, { status: 409 });

      await logAuditEvent({
        actorEmail: email,
        actorRole: role,
        action: "admin_id_videocall_goedgekeurd",
        targetTable: "medewerker_documenten",
        targetId: resultaat.documentId,
        summary: "ID gecontroleerd via videocall",
        metadata: { medewerker_id: id, vervaldatum, opmerking: opmerking || null },
      });
      return NextResponse.json({ success: true });
    } catch (fout) {
      if (fout instanceof IdCheckMigratieOntbreekt) {
        return NextResponse.json({ error: "Migratie 20261024_id_verificaties_didit.sql ontbreekt" }, { status: 503 });
      }
      captureRouteError(fout, { route: "/api/admin/medewerkers", action: "ID_VIDEOCALL" });
      return NextResponse.json({ error: "Er is een fout opgetreden" }, { status: 500 });
    }
  }

  if (action === "delete") {
    if (!hasRequiredAdminRole(role, ["owner"])) {
      return NextResponse.json({ error: "Alleen de eigenaar kan medewerkers verwijderen" }, { status: 403 });
    }
    // Ontdekken-gegevens expliciet eerst (de rij en de cascade ruimen ze ook op, maar zo staat het
    // vast, ook als de medewerker straks geanonimiseerd in plaats van verwijderd wordt).
    await wisOntdekGegevensMedewerker(id).catch((e) => captureRouteError(e, { route: "/api/admin/medewerkers", action: "ONTDEKKEN_WISSEN" }));
    const { error } = await supabaseAdmin.from("medewerkers").delete().eq("id", id);
    if (error) {
      return NextResponse.json({ error: "Er is een fout opgetreden" }, { status: 500 });
    }

    await logAuditEvent({
      actorEmail: email,
      actorRole: role,
      action: "admin_medewerker_delete",
      targetTable: "medewerkers",
      targetId: id,
      summary: "Medewerker verwijderd",
    });
  }

  return NextResponse.json({ success: true });
}
