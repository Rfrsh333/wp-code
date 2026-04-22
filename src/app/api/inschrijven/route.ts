import { NextRequest, NextResponse, after } from "next/server";
import { Resend } from "resend";
import { supabaseAdmin as supabase } from "@/lib/supabase";
import { checkRedisRateLimit, formRateLimit, getClientIP } from "@/lib/rate-limit-redis";
import { verifyRecaptcha } from "@/lib/recaptcha";
import { escapeHtml } from "@/lib/sanitize";
import { inschrijvenSchema, formatZodErrors } from "@/lib/validations";

function formatBoolean(value: boolean) {
  return value ? "Ja" : "Nee";
}

export async function POST(request: NextRequest) {
  try {
    const clientIP = getClientIP(request);
    const rateLimit = await checkRedisRateLimit(`inschrijven:${clientIP}`, formRateLimit);

    if (!rateLimit.success) {
      return NextResponse.json(
        {
          error: `Te veel verzoeken. Probeer het zo opnieuw.`,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.max(1, Math.ceil((rateLimit.reset - Date.now()) / 1000))),
          },
        }
      );
    }

    const formData = await request.formData();

    const recaptchaToken = formData.get("recaptchaToken") as string;
    if (!recaptchaToken) {
      return NextResponse.json(
        { error: "reCAPTCHA verificatie vereist" },
        { status: 400 }
      );
    }

    const recaptchaResult = await verifyRecaptcha(recaptchaToken);
    if (!recaptchaResult.success) {
      return NextResponse.json(
        { error: recaptchaResult.error || "Spam detectie mislukt" },
        { status: 400 }
      );
    }

    // Zod validatie op kernvelden
    const zodParsed = inschrijvenSchema.safeParse({
      voornaam: formData.get("voornaam") || "",
      achternaam: formData.get("achternaam") || "",
      email: formData.get("email") || "",
      telefoon: formData.get("telefoon") || "",
      geboortedatum: formData.get("geboortedatum") || undefined,
      uitbetalingswijze: formData.get("uitbetalingswijze") || "",
    });
    if (!zodParsed.success) {
      return NextResponse.json({ error: formatZodErrors(zodParsed.error) }, { status: 400 });
    }

    const voornaam = (formData.get("voornaam") as string) || "";
    const tussenvoegsel = (formData.get("tussenvoegsel") as string) || "";
    const achternaam = (formData.get("achternaam") as string) || "";
    const email = (formData.get("email") as string) || "";
    const telefoon = (formData.get("telefoon") as string) || "";
    const stad = (formData.get("stad") as string) || "";
    const geboortedatum = (formData.get("geboortedatum") as string) || "";
    const geslacht = (formData.get("geslacht") as string) || "";
    const motivatie = (formData.get("motivatie") as string) || "";
    const hoeGekomen = (formData.get("hoeGekomen") as string) || "";
    const uitbetalingswijze = (formData.get("uitbetalingswijze") as string) || "";
    const kvkNummer = (formData.get("kvkNummer") as string) || "";
    const horecaErvaring = (formData.get("horecaErvaring") as string) || "";
    const beschikbaarheid = (formData.get("beschikbaarheid") as string) || "";
    const beschikbaarVanaf = (formData.get("beschikbaarVanaf") as string) || "";
    const maxUrenPerWeek = (formData.get("maxUrenPerWeek") as string) || "";
    const referralCode = (formData.get("referralCode") as string) || "";
    const leadSource = (formData.get("leadSource") as string) || "";
    const utmSource = (formData.get("utmSource") as string) || "";
    const utmMedium = (formData.get("utmMedium") as string) || "";
    const utmCampaign = (formData.get("utmCampaign") as string) || "";
    const eigenVervoer = formData.get("eigenVervoer") === "true";
    const functies = formData
      .getAll("functies")
      .map((value) => String(value).trim())
      .filter(Boolean);
    const talen = formData
      .getAll("talen")
      .map((value) => String(value).trim())
      .filter(Boolean);

    if (
      !voornaam ||
      !achternaam ||
      !email ||
      !telefoon ||
      !stad ||
      !geboortedatum ||
      !geslacht ||
      !horecaErvaring ||
      !beschikbaarheid ||
      !beschikbaarVanaf ||
      !motivatie ||
      !hoeGekomen ||
      !uitbetalingswijze ||
      functies.length === 0 ||
      talen.length === 0
    ) {
      return NextResponse.json(
        { error: "Vul alle verplichte velden in" },
        { status: 400 }
      );
    }

    if (uitbetalingswijze === "zzp" && !kvkNummer) {
      return NextResponse.json(
        { error: "KVK nummer is verplicht voor ZZP inschrijvingen" },
        { status: 400 }
      );
    }

    // H-2: Duplicate email check
    const { data: existingKandidaat } = await supabase
      .from("inschrijvingen")
      .select("id")
      .eq("email", email)
      .limit(1)
      .maybeSingle();

    if (existingKandidaat) {
      return NextResponse.json(
        { error: "Er bestaat al een inschrijving met dit e-mailadres" },
        { status: 409 }
      );
    }

    const volledigeNaam = tussenvoegsel
      ? `${voornaam} ${tussenvoegsel} ${achternaam}`
      : `${voornaam} ${achternaam}`;

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #F27501 0%, #d96800 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Nieuwe kandidaat intake</h1>
        </div>

        <div style="padding: 30px; background: #f9f9f9;">
          <div style="background: white; border-radius: 8px; padding: 25px; margin-bottom: 20px;">
            <h2 style="color: #F27501; margin-top: 0; font-size: 18px; border-bottom: 2px solid #F27501; padding-bottom: 10px;">
              Persoonlijke gegevens
            </h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0; color: #666; width: 40%;">Naam:</td><td style="padding: 8px 0; color: #333; font-weight: 500;">${escapeHtml(volledigeNaam)}</td></tr>
              <tr><td style="padding: 8px 0; color: #666;">E-mail:</td><td style="padding: 8px 0; color: #333; font-weight: 500;">${escapeHtml(email)}</td></tr>
              <tr><td style="padding: 8px 0; color: #666;">Telefoon:</td><td style="padding: 8px 0; color: #333; font-weight: 500;">${escapeHtml(telefoon)}</td></tr>
              <tr><td style="padding: 8px 0; color: #666;">Woonplaats:</td><td style="padding: 8px 0; color: #333; font-weight: 500;">${escapeHtml(stad)}</td></tr>
              <tr><td style="padding: 8px 0; color: #666;">Geboortedatum:</td><td style="padding: 8px 0; color: #333; font-weight: 500;">${escapeHtml(geboortedatum)}</td></tr>
              <tr><td style="padding: 8px 0; color: #666;">Geslacht:</td><td style="padding: 8px 0; color: #333; font-weight: 500;">${escapeHtml(geslacht)}</td></tr>
            </table>
          </div>

          <div style="background: white; border-radius: 8px; padding: 25px; margin-bottom: 20px;">
            <h2 style="color: #F27501; margin-top: 0; font-size: 18px; border-bottom: 2px solid #F27501; padding-bottom: 10px;">
              Werkprofiel
            </h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0; color: #666; width: 40%;">Ervaring:</td><td style="padding: 8px 0; color: #333; font-weight: 500;">${escapeHtml(horecaErvaring)}</td></tr>
              <tr><td style="padding: 8px 0; color: #666;">Functies:</td><td style="padding: 8px 0; color: #333; font-weight: 500;">${functies.map(f => escapeHtml(f)).join(", ") || "Niet opgegeven"}</td></tr>
              <tr><td style="padding: 8px 0; color: #666;">Talen:</td><td style="padding: 8px 0; color: #333; font-weight: 500;">${talen.map(t => escapeHtml(t)).join(", ") || "Niet opgegeven"}</td></tr>
              <tr><td style="padding: 8px 0; color: #666;">Eigen vervoer:</td><td style="padding: 8px 0; color: #333; font-weight: 500;">${formatBoolean(eigenVervoer)}</td></tr>
            </table>
          </div>

          <div style="background: white; border-radius: 8px; padding: 25px; margin-bottom: 20px;">
            <h2 style="color: #F27501; margin-top: 0; font-size: 18px; border-bottom: 2px solid #F27501; padding-bottom: 10px;">
              Beschikbaarheid
            </h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0; color: #666; width: 40%;">Beschikbaarheid:</td><td style="padding: 8px 0; color: #333; font-weight: 500;">${escapeHtml(beschikbaarheid)}</td></tr>
              <tr><td style="padding: 8px 0; color: #666;">Beschikbaar vanaf:</td><td style="padding: 8px 0; color: #333; font-weight: 500;">${escapeHtml(beschikbaarVanaf)}</td></tr>
              <tr><td style="padding: 8px 0; color: #666;">Max uren per week:</td><td style="padding: 8px 0; color: #333; font-weight: 500;">${escapeHtml(maxUrenPerWeek) || "Niet opgegeven"}</td></tr>
              <tr><td style="padding: 8px 0; color: #666;">Contractvorm:</td><td style="padding: 8px 0; color: #333; font-weight: 500;">${uitbetalingswijze === "zzp" ? "ZZP" : "Loondienst"}</td></tr>
              ${kvkNummer ? `<tr><td style="padding: 8px 0; color: #666;">KVK nummer:</td><td style="padding: 8px 0; color: #333; font-weight: 500;">${escapeHtml(kvkNummer)}</td></tr>` : ""}
            </table>
          </div>

          <div style="background: white; border-radius: 8px; padding: 25px;">
            <h2 style="color: #F27501; margin-top: 0; font-size: 18px; border-bottom: 2px solid #F27501; padding-bottom: 10px;">
              Extra context
            </h2>
            <p style="margin: 0 0 15px; color: #666;"><strong>Hoe bij ons gekomen:</strong> ${escapeHtml(hoeGekomen)}</p>
            <p style="margin: 0; color: #666;"><strong>Motivatie:</strong><br>${escapeHtml(motivatie)}</p>
            <p style="margin-top: 20px; font-size: 12px; color: #777;">
              Deze intake bevat bewust nog geen documenten. Die worden later in de onboarding apart opgevraagd.
            </p>
          </div>
        </div>
      </div>
    `;

    // 1. DB insert EERST — dit is de primaire operatie
    const parsedMaxUren = maxUrenPerWeek ? Number.parseInt(maxUrenPerWeek, 10) : null;

    const insertPayload: Record<string, unknown> = {
      voornaam,
      tussenvoegsel: tussenvoegsel || null,
      achternaam,
      email,
      telefoon,
      stad,
      geboortedatum,
      geslacht,
      motivatie,
      hoe_gekomen: hoeGekomen,
      uitbetalingswijze,
      kvk_nummer: kvkNummer || null,
      horeca_ervaring: horecaErvaring,
      gewenste_functies: functies,
      talen,
      eigen_vervoer: eigenVervoer,
      beschikbaarheid,
      beschikbaar_vanaf: beschikbaarVanaf,
      max_uren_per_week: Number.isNaN(parsedMaxUren) ? null : parsedMaxUren,
      onboarding_status: "nieuw",
      referral_code: referralCode || null,
    };

    // TODO M-12: UTM tracking kolommen (lead_source, utm_source, utm_medium, utm_campaign)
    // moeten eerst aan de inschrijvingen tabel worden toegevoegd via een migratie.
    // Zie personeel_aanvragen voor referentie-implementatie.

    const { data: insertedData, error: dbError } = await supabase
      .from("inschrijvingen")
      .insert(insertPayload)
      .select()
      .single();

    if (dbError) {
      console.error("Supabase error:", dbError);
      return NextResponse.json({ error: "Database fout" }, { status: 500 });
    }

    // 2. Admin email — non-blocking (falen blokkeert registratie niet)
    if (process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const { error } = await resend.emails.send({
          from: "TopTalent Jobs <info@toptalentjobs.nl>",
          to: ["info@toptalentjobs.nl"],
          replyTo: email,
          subject: `Nieuwe kandidaat intake - ${volledigeNaam}`,
          html: emailHtml,
        });
        if (error) {
          console.error("Resend admin email error:", error);
        }
      } catch (emailErr) {
        console.error("Admin email error:", emailErr);
      }
    } else if (process.env.NODE_ENV !== "development") {
      console.warn("RESEND_API_KEY niet geconfigureerd — admin email overgeslagen");
    }

    // 3. Achtergrondtaken: bevestigingsmail + referral tracking
    // Draaien NA de response zodat de kandidaat niet hoeft te wachten
    after(async () => {
      try {
        // Referral tracking
        if (insertedData && referralCode) {
          try {
            const { error: refDbError } = await supabase.from("referrals")
              .update({
                referred_id: insertedData.id,
                referred_naam: volledigeNaam,
                referred_email: email,
              })
              .eq("referral_code", referralCode)
              .eq("status", "pending")
              .is("referred_id", null);
            if (refDbError) {
              console.error("Referral tracking DB error:", refDbError);
            }
          } catch (refError) {
            console.error("Referral tracking error:", refError);
          }
        }

        // Bevestigingsmail naar kandidaat
        if (insertedData) {
          try {
            const { sendIntakeBevestiging, logEmail } = await import("@/lib/candidate-onboarding");

            const emailResult = await sendIntakeBevestiging({
              id: insertedData.id,
              voornaam,
              achternaam,
              email,
              uitbetalingswijze,
            });

            await logEmail(
              insertedData.id,
              "bevestiging",
              email,
              `Hey ${voornaam}! Je inschrijving is binnen`,
              emailResult.data?.id
            );
          } catch (emailError) {
            console.error("Bevestigingsmail error:", emailError);
          }
        }
      } catch (bgErr) {
        console.error("Background tasks error:", bgErr);
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Inschrijven error:", error);
    return NextResponse.json(
      { error: "Er is iets misgegaan bij het verwerken van de inschrijving" },
      { status: 500 }
    );
  }
}
