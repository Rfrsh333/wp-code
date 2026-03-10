"use client";

import { useCallback, useEffect, useState } from "react";

type DocumentStatus = "ontvangen" | "goedgekeurd" | "afgekeurd";

interface CandidateDocument {
  id: string;
  type: string;
  bestandsnaam: string;
  status: DocumentStatus;
  uploaded_at: string;
}

interface CandidateData {
  voornaam: string;
  achternaam: string;
  email: string;
}

const documentTypes = [
  { value: "id", label: "ID" },
  { value: "cv", label: "CV" },
  { value: "kvk", label: "KvK" },
  { value: "btw", label: "BTW" },
  { value: "certificaat", label: "Certificaat" },
  { value: "contract", label: "Contract" },
  { value: "bankbewijs", label: "Bankbewijs" },
];

const statusLabels: Record<DocumentStatus, string> = {
  ontvangen: "Ontvangen",
  goedgekeurd: "Goedgekeurd",
  afgekeurd: "Afgekeurd",
};

export default function KandidaatDocumentenClient({ token }: { token: string }) {
  const [candidate, setCandidate] = useState<CandidateData | null>(null);
  const [documents, setDocuments] = useState<CandidateDocument[]>([]);
  const [selectedType, setSelectedType] = useState("id");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    const response = await fetch(`/api/kandidaat/documenten?token=${token}`);
    const result = await response.json();

    if (!response.ok) {
      setError(result.error || "Deze uploadlink is niet geldig.");
      setLoading(false);
      return;
    }

    setCandidate(result.kandidaat);
    setDocuments(result.documenten || []);
    setLoading(false);
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleUpload = async () => {
    if (!selectedFile) {
      setError("Kies eerst een bestand.");
      return;
    }

    setUploading(true);
    setError("");
    setSuccess("");

    try {
      const formData = new FormData();
      formData.append("token", token);
      formData.append("type", selectedType);
      formData.append("file", selectedFile);

      const response = await fetch("/api/kandidaat/documenten", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      if (!response.ok) {
        setError(result.error || "Upload mislukt.");
        return;
      }

      setSelectedFile(null);
      setSuccess("Document succesvol geupload.");
      await load();
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-20 text-neutral-500">Documentenpagina laden...</div>;
  }

  if (error && !candidate) {
    return <div className="text-center py-20 text-red-600">{error}</div>;
  }

  return (
    <section className="min-h-screen bg-gradient-to-b from-white via-[#fff7f1] to-white py-16">
      <div className="max-w-3xl mx-auto px-6 space-y-6">
        <div className="text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-3">Documenten uploaden</h1>
          <p className="text-neutral-600">
            Hi {candidate?.voornaam}, upload hier veilig de documenten voor je onboarding bij TopTalent Jobs.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-6 space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-4 py-3 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#F27501]/20 focus:border-[#F27501]"
            >
              {documentTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            <input
              type="file"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="md:col-span-2 px-4 py-3 rounded-xl border border-neutral-200"
            />
          </div>

          <button
            type="button"
            onClick={handleUpload}
            disabled={uploading}
            className="w-full bg-[#F27501] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#d96800] disabled:opacity-60 transition-colors"
          >
            {uploading ? "Uploaden..." : "Document uploaden"}
          </button>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {success ? <p className="text-sm text-green-600">{success}</p> : null}
        </div>

        <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-neutral-900 mb-4">Al geupload</h2>
          {documents.length === 0 ? (
            <p className="text-neutral-500">Er zijn nog geen documenten ontvangen.</p>
          ) : (
            <div className="space-y-3">
              {documents.map((document) => (
                <div key={document.id} className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 px-4 py-3">
                  <div>
                    <p className="font-medium text-neutral-900">{document.bestandsnaam}</p>
                    <p className="text-sm text-neutral-500">
                      {document.type} · {new Date(document.uploaded_at).toLocaleDateString("nl-NL")}
                    </p>
                  </div>
                  <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700">
                    {statusLabels[document.status]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
