import { SignJWT, jwtVerify } from "jose";

// KRITIEK: Secret voor JWT signing - VERPLICHT in productie
if (!process.env.JWT_SECRET) {
  throw new Error(
    "[SECURITY] JWT_SECRET environment variable is required. Generate one with: openssl rand -hex 32"
  );
}

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

export interface KlantSession {
  id: string;
  bedrijfsnaam: string;
  contactpersoon: string;
  email: string;
}

export interface MedewerkerSession {
  id: string;
  naam: string;
  email: string;
  functie: string | string[];
}

/**
 * Maakt een signed JWT token voor klant sessie
 */
export async function signKlantSession(data: KlantSession): Promise<string> {
  return await new SignJWT({ ...data, type: "klant" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

/**
 * Maakt een signed JWT token voor medewerker sessie
 */
export async function signMedewerkerSession(data: MedewerkerSession): Promise<string> {
  return await new SignJWT({ ...data, type: "medewerker" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

/**
 * Verifieert en decodeert een klant sessie token
 */
export async function verifyKlantSession(token: string): Promise<KlantSession | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);

    if (payload.type !== "klant") {
      console.warn("[SECURITY] Invalid session type - expected klant");
      return null;
    }

    return {
      id: payload.id as string,
      bedrijfsnaam: payload.bedrijfsnaam as string,
      contactpersoon: payload.contactpersoon as string,
      email: payload.email as string,
    };
  } catch (error) {
    console.warn("[SECURITY] Invalid or expired klant session token");
    return null;
  }
}

/**
 * Verifieert en decodeert een medewerker sessie token
 */
export async function verifyMedewerkerSession(token: string): Promise<MedewerkerSession | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);

    if (payload.type !== "medewerker") {
      console.warn("[SECURITY] Invalid session type - expected medewerker");
      return null;
    }

    return {
      id: payload.id as string,
      naam: payload.naam as string,
      email: payload.email as string,
      functie: payload.functie as string | string[],
    };
  } catch (error) {
    console.warn("[SECURITY] Invalid or expired medewerker session token");
    return null;
  }
}

/**
 * Genereert een signed token voor factuur PDF toegang
 * Token is geldig voor 30 dagen en gebonden aan specifieke factuur + klant
 */
export async function signFactuurToken(factuurId: string, klantId: string): Promise<string> {
  return await new SignJWT({ factuurId, klantId, type: "factuur" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(JWT_SECRET);
}

/**
 * Verifieert een factuur PDF token
 */
export async function verifyFactuurToken(token: string): Promise<{ factuurId: string; klantId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);

    if (payload.type !== "factuur") {
      console.warn("[SECURITY] Invalid token type - expected factuur");
      return null;
    }

    return {
      factuurId: payload.factuurId as string,
      klantId: payload.klantId as string,
    };
  } catch (error) {
    console.warn("[SECURITY] Invalid or expired factuur token");
    return null;
  }
}
