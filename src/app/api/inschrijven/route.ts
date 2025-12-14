import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { supabase } from "@/lib/supabase";
import { checkRateLimit, getClientIP } from "@/lib/rate-limit";
import { verifyRecaptcha } from "@/lib/recaptcha";

export async function POST(request: NextRequest) {
  try {
    // Rate limiting: max 3 requests per minute per IP (stricter for file uploads)
    const clientIP = getClientIP(request);
    const rateLimit = checkRateLimit(`inschrijven:${clientIP}`, {
      windowMs: 60 * 1000,
      maxRequests: 3,
    });

    if (!rateLimit.success) {
      return NextResponse.json(
        { error: `Te veel verzoeken. Probeer opnieuw over ${rateLimit.resetIn} seconden.` },
        { status: 429 }
      );
    }

    const formData = await request.formData();

    // Verify reCAPTCHA
    const recaptchaToken = formData.get("recaptchaToken") as string;
    if (recaptchaToken) {
      const recaptchaResult = await verifyRecaptcha(recaptchaToken);
      if (!recaptchaResult.success) {
        return NextResponse.json(
          { error: recaptchaResult.error || "Spam detectie mislukt" },
          { status: 400 }
        );
      }
    }

    // Extract form fields
    const voornaam = formData.get("voornaam") as string;
    const tussenvoegsel = formData.get("tussenvoegsel") as string;
    const achternaam = formData.get("achternaam") as string;
    const email = formData.get("email") as string;
    const telefoon = formData.get("telefoon") as string;
    const stad = formData.get("stad") as string;
    const geboortedatum = formData.get("geboortedatum") as string;
    const geslacht = formData.get("geslacht") as string;
    const motivatie = formData.get("motivatie") as string;
    const hoeGekomen = formData.get("hoeGekomen") as string;
    const uitbetalingswijze = formData.get("uitbetalingswijze") as string;
    const kvkNummer = formData.get("kvkNummer") as string;

    // Validate required fields
    if (!voornaam || !achternaam || !email || !telefoon) {
      return NextResponse.json(
        { error: "Vul alle verplichte velden in" },
        { status: 400 }
      );
    }

    // Get files
    const cvFile = formData.get("cv") as File | null;
    const profielfoto = formData.get("profielfoto") as File | null;

    // Get extra documents
    const extraDocs: File[] = [];
    for (const [key, value] of formData.entries()) {
      if (key.startsWith("document_") && value instanceof File) {
        extraDocs.push(value);
      }
    }

    // Build full name
    const volledigeNaam = tussenvoegsel
      ? `${voornaam} ${tussenvoegsel} ${achternaam}`
      : `${voornaam} ${achternaam}`;

    // Format the email content
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #F27501 0%, #d96800 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Nieuwe Inschrijving</h1>
        </div>

        <div style="padding: 30px; background: #f9f9f9;">
          <div style="background: white; border-radius: 8px; padding: 25px; margin-bottom: 20px;">
            <h2 style="color: #F27501; margin-top: 0; font-size: 18px; border-bottom: 2px solid #F27501; padding-bottom: 10px;">
              Persoonlijke Gegevens
            </h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #666; width: 40%;">Naam:</td>
                <td style="padding: 8px 0; color: #333; font-weight: 500;">${volledigeNaam}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">E-mail:</td>
                <td style="padding: 8px 0; color: #333; font-weight: 500;">
                  <a href="mailto:${email}" style="color: #F27501;">${email}</a>
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">Telefoon:</td>
                <td style="padding: 8px 0; color: #333; font-weight: 500;">
                  <a href="tel:${telefoon}" style="color: #F27501;">${telefoon}</a>
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">Stad:</td>
                <td style="padding: 8px 0; color: #333; font-weight: 500;">${stad}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">Geboortedatum:</td>
                <td style="padding: 8px 0; color: #333; font-weight: 500;">${geboortedatum}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">Geslacht:</td>
                <td style="padding: 8px 0; color: #333; font-weight: 500;">${geslacht}</td>
              </tr>
            </table>
          </div>

          <div style="background: white; border-radius: 8px; padding: 25px; margin-bottom: 20px;">
            <h2 style="color: #F27501; margin-top: 0; font-size: 18px; border-bottom: 2px solid #F27501; padding-bottom: 10px;">
              Motivatie & Achtergrond
            </h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #666; vertical-align: top; width: 40%;">Motivatie:</td>
                <td style="padding: 8px 0; color: #333; font-weight: 500;">${motivatie}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">Hoe bij ons gekomen:</td>
                <td style="padding: 8px 0; color: #333; font-weight: 500;">${hoeGekomen}</td>
              </tr>
            </table>
          </div>

          <div style="background: white; border-radius: 8px; padding: 25px; margin-bottom: 20px;">
            <h2 style="color: #F27501; margin-top: 0; font-size: 18px; border-bottom: 2px solid #F27501; padding-bottom: 10px;">
              Werkvoorkeuren
            </h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #666; width: 40%;">Uitbetalingswijze:</td>
                <td style="padding: 8px 0; color: #333; font-weight: 500;">
                  ${uitbetalingswijze === "zzp" ? "ZZP'er" : "Loondienst"}
                </td>
              </tr>
              ${kvkNummer ? `
              <tr>
                <td style="padding: 8px 0; color: #666;">KVK Nummer:</td>
                <td style="padding: 8px 0; color: #333; font-weight: 500;">${kvkNummer}</td>
              </tr>
              ` : ""}
            </table>
          </div>

          <div style="background: white; border-radius: 8px; padding: 25px;">
            <h2 style="color: #F27501; margin-top: 0; font-size: 18px; border-bottom: 2px solid #F27501; padding-bottom: 10px;">
              Bijlagen
            </h2>
            <ul style="color: #333; padding-left: 20px;">
              <li>CV: ${cvFile ? "✓ Geüpload" : "✗ Niet geüpload"}</li>
              <li>Profielfoto: ${profielfoto ? "✓ Geüpload" : "✗ Niet geüpload"}</li>
              <li>Extra documenten: ${extraDocs.length > 0 ? `✓ ${extraDocs.length} bestand(en)` : "✗ Geen"}</li>
            </ul>
            <p style="color: #666; font-size: 12px; margin-top: 15px;">
              <em>Let op: Bestanden zijn als bijlage toegevoegd aan deze e-mail.</em>
            </p>
          </div>
        </div>

        <div style="background: #333; padding: 20px; text-align: center;">
          <p style="color: #999; margin: 0; font-size: 12px;">
            Dit bericht is automatisch verzonden via het inschrijfformulier op toptalentjobs.nl
          </p>
        </div>
      </div>
    `;

    // Prepare attachments
    const attachments: { filename: string; content: Buffer }[] = [];

    if (cvFile) {
      const cvBuffer = Buffer.from(await cvFile.arrayBuffer());
      attachments.push({
        filename: `CV_${volledigeNaam.replace(/\s+/g, "_")}.pdf`,
        content: cvBuffer,
      });
    }

    if (profielfoto) {
      const fotoBuffer = Buffer.from(await profielfoto.arrayBuffer());
      const extension = profielfoto.name.split(".").pop() || "jpg";
      attachments.push({
        filename: `Foto_${volledigeNaam.replace(/\s+/g, "_")}.${extension}`,
        content: fotoBuffer,
      });
    }

    for (let i = 0; i < extraDocs.length; i++) {
      const doc = extraDocs[i];
      const docBuffer = Buffer.from(await doc.arrayBuffer());
      attachments.push({
        filename: `Document_${i + 1}_${doc.name}`,
        content: docBuffer,
      });
    }

    // Send email via Resend
    if (!process.env.RESEND_API_KEY) {
      console.log("RESEND_API_KEY not set - email would be sent:", volledigeNaam);
      return NextResponse.json({ success: true });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: "TopTalent Jobs <info@toptalentjobs.nl>",
      to: ["info@toptalentjobs.nl"],
      replyTo: email,
      subject: `Nieuwe inschrijving - ${volledigeNaam}`,
      html: emailHtml,
      attachments,
    });

    if (error) {
      console.error("Resend error:", error);
      return NextResponse.json(
        { error: "Fout bij verzenden e-mail" },
        { status: 500 }
      );
    }

    // Opslaan in Supabase
    const { error: dbError } = await supabase.from("inschrijvingen").insert({
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
    });

    if (dbError) {
      console.error("Supabase error:", dbError);
      // We laten de request toch slagen want de email is al verstuurd
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Er is een fout opgetreden" },
      { status: 500 }
    );
  }
}
