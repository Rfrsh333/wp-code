"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

// Force dynamic rendering for this page
export const dynamic = 'force-dynamic';

type OnboardingStatus =
  | "nieuw"
  | "in_beoordeling"
  | "documenten_opvragen"
  | "wacht_op_kandidaat"
  | "goedgekeurd"
  | "inzetbaar"
  | "afgewezen";

interface KandidaatData {
  voornaam: string;
  achternaam: string;
  email: string;
  onboarding_status: OnboardingStatus;
  documenten_compleet: boolean;
  inzetbaar_op: string | null;
  goedgekeurd_op: string | null;
  created_at: string;
  onboarding_checklist: Record<string, boolean>;
}

interface Document {
  id: string;
  document_type: string;
  review_status: string;
  uploaded_at: string;
}

const statusInfo: Record<OnboardingStatus, { label: string; color: string; icon: string; description: string }> = {
  nieuw: {
    label: "Nieuw",
    color: "bg-sky-100 text-sky-700 border-sky-200",
    icon: "📝",
    description: "Je inschrijving is ontvangen! We bekijken je gegevens binnenkort.",
  },
  in_beoordeling: {
    label: "In beoordeling",
    color: "bg-amber-100 text-amber-700 border-amber-200",
    icon: "🔍",
    description: "We beoordelen momenteel je inschrijving en ervaring.",
  },
  documenten_opvragen: {
    label: "Documenten nodig",
    color: "bg-orange-100 text-orange-700 border-orange-200",
    icon: "📄",
    description: "We hebben nog enkele documenten van je nodig. We nemen contact met je op.",
  },
  wacht_op_kandidaat: {
    label: "Wacht op reactie",
    color: "bg-yellow-100 text-yellow-700 border-yellow-200",
    icon: "⏳",
    description: "We wachten op jouw reactie of documenten.",
  },
  goedgekeurd: {
    label: "Goedgekeurd",
    color: "bg-emerald-100 text-emerald-700 border-emerald-200",
    icon: "✅",
    description: "Gefeliciteerd! Je inschrijving is goedgekeurd.",
  },
  inzetbaar: {
    label: "Inzetbaar",
    color: "bg-green-100 text-green-700 border-green-200",
    icon: "🚀",
    description: "Je bent volledig inzetbaar! We kunnen je matchen met opdrachten.",
  },
  afgewezen: {
    label: "Afgewezen",
    color: "bg-red-100 text-red-700 border-red-200",
    icon: "❌",
    description: "Helaas kunnen we je op dit moment niet plaatsen.",
  },
};

function KandidaatStatusContent() {
  const searchParams = useSearchParams();
  const [kandidaat, setKandidaat] = useState<KandidaatData | null>(null);
  const [documenten, setDocumenten] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      setError("Geen toegangstoken gevonden. Check de link in je email.");
      setLoading(false);
      return;
    }

    const fetchKandidaatData = async () => {
      try {
        const response = await fetch(`/api/kandidaat/status?token=${token}`);

        if (!response.ok) {
          throw new Error("Ongeldige of verlopen link");
        }

        const data = await response.json();
        setKandidaat(data.kandidaat);
        setDocumenten(data.documenten || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Fout bij ophalen gegevens");
      } finally {
        setLoading(false);
      }
    };

    void fetchKandidaatData();
  }, [searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#F27501] mx-auto mb-4"></div>
          <p className="text-neutral-600">Laden...</p>
        </div>
      </div>
    );
  }

  if (error || !kandidaat) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-neutral-900 mb-2">Toegang geweigerd</h1>
          <p className="text-neutral-600 mb-6">{error}</p>
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-[#F27501] text-white rounded-xl font-medium hover:bg-[#d96800]"
          >
            Terug naar homepage
          </Link>
        </div>
      </div>
    );
  }

  const status = kandidaat.onboarding_status || "nieuw";
  const statusDetails = statusInfo[status];
  const daysSinceCreated = Math.floor(
    (Date.now() - new Date(kandidaat.created_at).getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-neutral-900 mb-2">
                Welkom, {kandidaat.voornaam}! 👋
              </h1>
              <p className="text-neutral-600">
                Hier kun je de status van je inschrijving bij TopTalent volgen.
              </p>
            </div>
            <Image src="/icon.png" alt="TopTalent" width={64} height={64} className="w-16 h-16" />
          </div>

          {/* Status Card */}
          <div className={`border-2 rounded-xl p-6 ${statusDetails.color}`}>
            <div className="flex items-center gap-4 mb-4">
              <div className="text-5xl">{statusDetails.icon}</div>
              <div>
                <h2 className="text-2xl font-bold">{statusDetails.label}</h2>
                <p className="text-sm opacity-80">Huidige status</p>
              </div>
            </div>
            <p className="text-lg">{statusDetails.description}</p>
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          <h3 className="text-xl font-bold text-neutral-900 mb-6">Jouw onboarding timeline</h3>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white font-bold">✓</div>
                <div className="w-0.5 h-full bg-neutral-200 mt-2"></div>
              </div>
              <div className="pb-8">
                <p className="font-semibold text-neutral-900">Inschrijving ontvangen</p>
                <p className="text-sm text-neutral-500">
                  {new Date(kandidaat.created_at).toLocaleDateString("nl-NL")} ({daysSinceCreated} dagen geleden)
                </p>
              </div>
            </div>

            {kandidaat.onboarding_status !== "nieuw" && (
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white font-bold">✓</div>
                  <div className="w-0.5 h-full bg-neutral-200 mt-2"></div>
                </div>
                <div className="pb-8">
                  <p className="font-semibold text-neutral-900">In beoordeling genomen</p>
                  <p className="text-sm text-neutral-500">Je profiel wordt beoordeeld</p>
                </div>
              </div>
            )}

            {kandidaat.goedgekeurd_op && (
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white font-bold">✓</div>
                  <div className="w-0.5 h-full bg-neutral-200 mt-2"></div>
                </div>
                <div className="pb-8">
                  <p className="font-semibold text-neutral-900">Goedgekeurd!</p>
                  <p className="text-sm text-neutral-500">
                    {new Date(kandidaat.goedgekeurd_op).toLocaleDateString("nl-NL")}
                  </p>
                </div>
              </div>
            )}

            {kandidaat.inzetbaar_op && (
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white font-bold">🚀</div>
                </div>
                <div>
                  <p className="font-semibold text-neutral-900">Inzetbaar!</p>
                  <p className="text-sm text-neutral-500">
                    Sinds {new Date(kandidaat.inzetbaar_op).toLocaleDateString("nl-NL")}
                  </p>
                </div>
              </div>
            )}

            {!kandidaat.inzetbaar_op && (
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-neutral-300 flex items-center justify-center text-neutral-600">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <div>
                  <p className="font-semibold text-neutral-500">Volledige onboarding</p>
                  <p className="text-sm text-neutral-400">Nog in behandeling</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Documents */}
        {documenten.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
            <h3 className="text-xl font-bold text-neutral-900 mb-6">Jouw documenten</h3>
            <div className="space-y-3">
              {documenten.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-4 bg-neutral-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">📄</div>
                    <div>
                      <p className="font-medium text-neutral-900">{doc.document_type}</p>
                      <p className="text-sm text-neutral-500">
                        Geüpload op {new Date(doc.uploaded_at).toLocaleDateString("nl-NL")}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      doc.review_status === "goedgekeurd"
                        ? "bg-green-100 text-green-700"
                        : doc.review_status === "afgekeurd"
                          ? "bg-red-100 text-red-700"
                          : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {doc.review_status === "goedgekeurd"
                      ? "✓ Goedgekeurd"
                      : doc.review_status === "afgekeurd"
                        ? "✗ Afgekeurd"
                        : "⏳ In review"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contact */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h3 className="text-xl font-bold text-neutral-900 mb-4">Vragen?</h3>
          <p className="text-neutral-600 mb-4">
            Heb je vragen over je inschrijving? Neem gerust contact met ons op!
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <a
              href="mailto:info@toptalentjobs.nl"
              className="flex items-center justify-center gap-2 px-6 py-3 bg-[#F27501] text-white rounded-xl font-medium hover:bg-[#d96800]"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Email ons
            </a>
            <a
              href="tel:+31649713766"
              className="flex items-center justify-center gap-2 px-6 py-3 border-2 border-[#F27501] text-[#F27501] rounded-xl font-medium hover:bg-orange-50"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              Bel ons
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function KandidaatStatusPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[#F27501] mx-auto mb-4"></div>
            <p className="text-neutral-600">Laden...</p>
          </div>
        </div>
      }
    >
      <KandidaatStatusContent />
    </Suspense>
  );
}
