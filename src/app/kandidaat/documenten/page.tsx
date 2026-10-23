"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { compressImage } from "@/lib/image-compress";
import { DOCUMENT_ACCEPT, MAX_DOCUMENT_BYTES } from "@/lib/medewerker/documenten";
import {
  kandidaatDocumentLabel,
  kandidaatUploadPlan,
  uploadFoutmelding,
  type KandidaatUploadType,
} from "@/lib/kandidaat-documenten";

export const dynamic = 'force-dynamic';

interface UploadedDocument {
  document_type: string;
  file_name: string;
  file_size: number;
}

function DocumentenUploadContent() {
  const searchParams = useSearchParams();
  const [token, setToken] = useState<string | null>(null);
  const [kandidaat, setKandidaat] = useState<{ voornaam: string; achternaam: string; uitbetalingswijze: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDocument[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [gekozenType, setGekozenType] = useState<KandidaatUploadType | "">("");
  const toast = useToast();

  useEffect(() => {
    const tokenParam = searchParams.get("token");
    if (!tokenParam) {
      setError("Geen geldige upload link. Check de link in je email.");
      setLoading(false);
      return;
    }

    setToken(tokenParam);

    // Validate token and fetch kandidaat info
    const validateToken = async () => {
      try {
        const response = await fetch(`/api/kandidaat/documenten/validate?token=${tokenParam}`);
        if (!response.ok) {
          throw new Error("Ongeldige of verlopen link");
        }
        const data = await response.json();
        setKandidaat(data.kandidaat);
        setUploadedDocs(data.uploaded_documents || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Fout bij valideren link");
      } finally {
        setLoading(false);
      }
    };

    void validateToken();
  }, [searchParams]);

  // B7: verklein foto's (en zet HEIC om naar JPEG) vóór het versturen. Vercel weigert bodies
  // boven ~4,5 MB met een 413 voordat de route draait.
  const bereidVoor = async (file: File): Promise<File> => {
    const plan = kandidaatUploadPlan(file);
    if (plan.soort === "fout") throw new Error(plan.melding);
    if (plan.soort === "direct") return file;
    try {
      const blob = await compressImage(file, {
        maxWidth: 2400,
        maxHeight: 2400,
        quality: 0.85,
        maxSizeBytes: 3 * 1024 * 1024,
      });
      if (blob.size > MAX_DOCUMENT_BYTES) throw new Error("te groot");
      const naam = file.name.replace(/\.[^.]+$/, "") || "foto";
      return new File([blob], `${naam}.jpg`, { type: "image/jpeg" });
    } catch {
      // Niet te verkleinen (bv. HEIC in een browser die het niet kan lezen): klein genoeg mag
      // ongewijzigd mee, anders een nette melding.
      if (!plan.verplicht) return file;
      throw new Error(
        "Deze foto is te groot (maximaal 4 MB) en kon niet worden verkleind. Maak een foto met een lagere resolutie of upload een PDF.",
      );
    }
  };

  const handleFileUpload = async (files: FileList | File[]) => {
    if (!token) return;
    // B6: de kandidaat kiest zelf het type; niet meer raden uit de bestandsnaam.
    if (!gekozenType) {
      toast.warning("Kies eerst wat je uploadt (bijvoorbeeld ID-bewijs of CV).");
      return;
    }

    const fileArray = Array.from(files);
    setUploading(true);
    let gelukt = 0;

    try {
      for (const origineel of fileArray) {
        let file: File;
        try {
          file = await bereidVoor(origineel);
        } catch (err) {
          toast.warning(`${origineel.name}: ${err instanceof Error ? err.message : "Bestand niet toegestaan"}`);
          continue;
        }

        const formData = new FormData();
        formData.append("file", file);
        formData.append("token", token);
        formData.append("document_type", gekozenType);

        let response: Response;
        try {
          response = await fetch("/api/kandidaat/documenten", { method: "POST", body: formData });
        } catch {
          toast.error(`${origineel.name}: geen verbinding. Controleer je internet en probeer het opnieuw.`);
          continue;
        }
        // Een 413 of 502 van Vercel is geen JSON; dan niet "Unexpected token" tonen.
        const result = await response.json().catch(() => null);
        if (!response.ok || !result) {
          toast.error(`${origineel.name}: ${uploadFoutmelding(response.status, result)}`);
          continue;
        }

        gelukt += 1;
        setUploadedDocs(prev => [...prev, {
          document_type: result.document_type,
          file_name: origineel.name,
          file_size: file.size,
        }]);
      }

      if (gelukt > 0) {
        toast.success(`${gelukt} bestand(en) geüpload als ${kandidaatDocumentLabel(gekozenType)}.`);
      }
    } finally {
      setUploading(false);
    }
  };

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
          <h1 className="text-2xl font-bold text-neutral-900 mb-2">Link niet geldig</h1>
          <p className="text-neutral-600 mb-6">{error}</p>
          <p className="text-sm text-neutral-500">Check je email voor de juiste link of neem contact met ons op.</p>
        </div>
      </div>
    );
  }

  const requiredDocs = [
    { type: "id", label: "Geldig identiteitsbewijs", icon: "📸" },
    { type: "cv", label: "CV", icon: "📝" },
  ];

  if (kandidaat.uitbetalingswijze === "zzp") {
    requiredDocs.push({ type: "kvk", label: "KVK uittreksel", icon: "🏢" });
  }

  // C-20: Uitgebreide documenten per type
  if (kandidaat.uitbetalingswijze === "loondienst") {
    requiredDocs.push({ type: "loonheffingsverklaring", label: "Loonheffingsverklaring", icon: "📋" });
  }

  const isDocUploaded = (type: string) => uploadedDocs.some(doc => doc.document_type === type);

  const uploadOpties: { type: KandidaatUploadType; label: string }[] = [
    { type: "id", label: kandidaatDocumentLabel("id") },
    { type: "cv", label: kandidaatDocumentLabel("cv") },
    ...(kandidaat.uitbetalingswijze === "zzp" ? [{ type: "kvk" as const, label: kandidaatDocumentLabel("kvk") }] : []),
    { type: "overig", label: "Iets anders" },
  ];
  const allDocsUploaded = requiredDocs.every(doc => isDocUploaded(doc.type));

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          <div className="text-center mb-6">
            <div className="text-5xl mb-4">📄</div>
            <h1 className="text-3xl font-bold text-neutral-900 mb-2">
              Hey {kandidaat.voornaam}! 👋
            </h1>
            <p className="text-lg text-neutral-600">
              Upload hier je documenten om je inschrijving af te ronden
            </p>
          </div>

          {/* Required Documents Checklist */}
          <div className="bg-neutral-50 rounded-xl p-6 mb-6">
            <h2 className="font-semibold text-neutral-900 mb-4">Dit hebben we nodig:</h2>
            <div className="space-y-3">
              {requiredDocs.map((doc) => (
                <div key={doc.type} className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    isDocUploaded(doc.type) ? "bg-green-500" : "bg-neutral-300"
                  }`}>
                    {isDocUploaded(doc.type) && (
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <span className="text-2xl">{doc.icon}</span>
                  <span className="font-medium text-neutral-900">{doc.label}</span>
                  {isDocUploaded(doc.type) && (
                    <span className="ml-auto text-sm text-green-600 font-medium">✓ Geüpload</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* B6: typekeuze; elk bestand krijgt het gekozen type mee */}
          <div className="mb-4">
            <p className="font-semibold text-neutral-900 mb-2">Wat upload je?</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {uploadOpties.map((optie) => (
                <label
                  key={optie.type}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${
                    gekozenType === optie.type ? "border-[#F27501] bg-orange-50" : "border-neutral-200 hover:border-[#F27501]/50"
                  }`}
                >
                  <input
                    type="radio"
                    name="document_type"
                    value={optie.type}
                    checked={gekozenType === optie.type}
                    onChange={() => setGekozenType(optie.type)}
                    className="accent-[#F27501]"
                  />
                  <span className="font-medium text-neutral-900">{optie.label}</span>
                  {isDocUploaded(optie.type) && <span className="ml-auto text-xs text-green-600">✓ al geüpload</span>}
                </label>
              ))}
            </div>
            <p className="text-sm text-neutral-500 mt-2">
              Voor- en achterkant van je ID? Kies &quot;ID-bewijs&quot; en upload beide foto&apos;s.
            </p>
          </div>

          {/* Upload Zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              if (e.dataTransfer.files.length > 0) {
                void handleFileUpload(e.dataTransfer.files);
              }
            }}
            className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all ${
              isDragging
                ? 'border-[#F27501] bg-orange-50 scale-105'
                : 'border-neutral-300 hover:border-[#F27501] hover:bg-orange-50'
            }`}
          >
            <div className="text-6xl mb-4">📤</div>
            <p className="text-xl font-semibold text-neutral-900 mb-2">
              Sleep bestanden hierheen
            </p>
            <p className="text-neutral-600 mb-4">of</p>
            <label className="inline-block">
              <input
                type="file"
                multiple
                accept={DOCUMENT_ACCEPT}
                onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                className="hidden"
                disabled={uploading}
              />
              <span className={`inline-block px-8 py-3 bg-gradient-to-r from-[#F27501] to-[#d96800] text-white rounded-xl font-semibold cursor-pointer hover:shadow-lg transition-all ${
                uploading ? 'opacity-50 cursor-not-allowed' : ''
              }`}>
                {uploading ? "Uploaden..." : "Kies bestanden"}
              </span>
            </label>
            <p className="text-sm text-neutral-500 mt-4">
              PDF, JPG, PNG of HEIC • maximaal 4 MB per bestand (foto&apos;s verkleinen we automatisch)
            </p>
          </div>

          {/* Uploaded Files */}
          {uploadedDocs.length > 0 && (
            <div className="mt-6">
              <h3 className="font-semibold text-neutral-900 mb-3">Geüploade bestanden:</h3>
              <div className="space-y-2">
                {uploadedDocs.map((doc, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
                    <div className="text-2xl">✅</div>
                    <div className="flex-1">
                      <p className="font-medium text-neutral-900">{doc.file_name}</p>
                      <p className="text-sm text-neutral-500">
                        {kandidaatDocumentLabel(doc.document_type)} • {(doc.file_size / 1024).toFixed(0)} KB
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Success Message */}
          {allDocsUploaded && (
            <div className="mt-6 p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl text-center">
              <div className="text-5xl mb-3">🎉</div>
              <h3 className="text-xl font-bold text-green-900 mb-2">
                Yes! Alles binnen!
              </h3>
              <p className="text-green-700">
                We gaan je documenten nu reviewen. Je hoort snel van ons! 🚀
              </p>
            </div>
          )}
        </div>

        {/* Help Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <h3 className="text-lg font-bold text-neutral-900 mb-2">Vragen?</h3>
          <p className="text-neutral-600 mb-4">We helpen je graag!</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="mailto:info@toptalentjobs.nl"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#F27501] text-white rounded-xl font-medium hover:bg-[#d96800]"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Email ons
            </a>
            <a
              href="tel:+31617889189"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 border-2 border-[#F27501] text-[#F27501] rounded-xl font-medium hover:bg-orange-50"
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

export default function DocumentenUploadPage() {
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
      <DocumentenUploadContent />
    </Suspense>
  );
}
