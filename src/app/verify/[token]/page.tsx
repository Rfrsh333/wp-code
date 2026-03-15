import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Medewerker Verificatie | TopTalent",
  robots: "noindex, nofollow",
};

interface DienstInfo {
  start_tijd: string;
  eind_tijd: string;
  locatie: string;
  functie: string;
}

interface VerifyData {
  medewerker: {
    naam: string;
    functie: string | string[];
    profile_photo_url: string | null;
    bsn_verified: boolean;
    documenten_compleet: boolean;
  };
  dienst_vandaag: DienstInfo[];
  error?: string;
}

async function fetchVerification(token: string): Promise<VerifyData | null> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

  try {
    const res = await fetch(`${baseUrl}/api/verify/${token}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export default async function VerifyPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const data = await fetchVerification(token);

  if (!data || !data.medewerker) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-lg p-8 max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-neutral-900 mb-2">Verificatie mislukt</h1>
          <p className="text-sm text-neutral-500">
            Deze verificatielink is ongeldig of verlopen. Neem contact op met TopTalent voor hulp.
          </p>
        </div>
      </div>
    );
  }

  const { medewerker, dienst_vandaag } = data;
  const initials = medewerker.naam
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const functies = Array.isArray(medewerker.functie)
    ? medewerker.functie
    : [medewerker.functie].filter(Boolean);

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-lg max-w-sm w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-[#F27501] to-[#d96800] p-6 text-center text-white">
          <div className="flex justify-center mb-3">
            <span className="text-sm font-bold tracking-wider opacity-80">TOPTALENT</span>
          </div>
          {medewerker.profile_photo_url ? (
            <img
              src={medewerker.profile_photo_url}
              alt={medewerker.naam}
              className="w-24 h-24 rounded-full object-cover mx-auto border-4 border-white/30"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center mx-auto border-4 border-white/30">
              <span className="text-3xl font-bold">{initials}</span>
            </div>
          )}
          <h1 className="text-2xl font-bold mt-3">{medewerker.naam}</h1>
          <div className="flex flex-wrap justify-center gap-2 mt-2">
            {functies.map((f) => (
              <span key={f} className="px-3 py-1 bg-white/20 rounded-full text-sm">
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* Status checks */}
        <div className="p-6 space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${medewerker.bsn_verified ? "bg-green-100" : "bg-amber-100"}`}>
                {medewerker.bsn_verified ? (
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 100 18 9 9 0 000-18z" />
                  </svg>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-900">BSN Geverifieerd</p>
                <p className="text-xs text-neutral-500">{medewerker.bsn_verified ? "Ja, geverifieerd" : "Nog niet geverifieerd"}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${medewerker.documenten_compleet ? "bg-green-100" : "bg-amber-100"}`}>
                {medewerker.documenten_compleet ? (
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 100 18 9 9 0 000-18z" />
                  </svg>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-900">Documenten</p>
                <p className="text-xs text-neutral-500">{medewerker.documenten_compleet ? "Volledig compleet" : "Nog niet compleet"}</p>
              </div>
            </div>
          </div>

          {/* Dienst vandaag */}
          <div className="border-t pt-4">
            <h2 className="text-sm font-semibold text-neutral-700 mb-3">Dienst vandaag</h2>
            {dienst_vandaag.length === 0 ? (
              <div className="bg-neutral-50 rounded-xl p-4 text-center">
                <p className="text-sm text-neutral-500">Geen dienst ingepland voor vandaag</p>
              </div>
            ) : (
              <div className="space-y-2">
                {dienst_vandaag.map((d, i) => (
                  <div key={i} className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      <p className="text-sm font-semibold text-green-800">Ingepland</p>
                    </div>
                    <p className="text-sm text-neutral-700">{d.locatie}</p>
                    <p className="text-sm text-neutral-500">
                      {d.start_tijd?.slice(0, 5)} - {d.eind_tijd?.slice(0, 5)} &middot; {d.functie}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <p className="text-xs text-center text-neutral-400 pt-2">
            Geverifieerd via TopTalent Jobs &middot; {new Date().toLocaleDateString("nl-NL")}
          </p>
        </div>
      </div>
    </div>
  );
}
