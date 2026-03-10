"use client";

import { useState, useEffect } from "react";

interface KandidaatDocument {
  id: string;
  document_type: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  review_status: "in_review" | "approved" | "rejected";
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  uploaded_at: string;
  download_url?: string;
}

interface Props {
  inschrijvingId: string;
  voornaam: string;
  achternaam: string;
  uitbetalingswijze: string;
  onClose: () => void;
  onReviewComplete?: () => void;
  getAuthHeaders: () => Promise<HeadersInit>;
}

export default function KandidaatDocumentenModal({
  inschrijvingId,
  voornaam,
  achternaam,
  uitbetalingswijze,
  onClose,
  onReviewComplete,
  getAuthHeaders,
}: Props) {
  const [documents, setDocuments] = useState<KandidaatDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState<string | null>(null);

  useEffect(() => {
    loadDocuments();
  }, [inschrijvingId]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const headers = await getAuthHeaders();

      const response = await fetch(
        `/api/admin/kandidaat-documenten?inschrijvingId=${inschrijvingId}`,
        { headers }
      );

      if (!response.ok) throw new Error("Laden mislukt");

      const result = await response.json();
      setDocuments(result.data || []);
    } catch (error) {
      console.error("Load documents error:", error);
      alert("Documenten laden mislukt");
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (documentId: string, reviewStatus: "approved" | "rejected") => {
    const notes = reviewStatus === "rejected"
      ? prompt("Reden voor afwijzing (optioneel):")
      : null;

    // User cancelled
    if (reviewStatus === "rejected" && notes === null) return;

    try {
      setReviewing(documentId);
      const headers = await getAuthHeaders();

      const response = await fetch("/api/admin/kandidaat-documenten/review", {
        method: "POST",
        headers,
        body: JSON.stringify({
          document_id: documentId,
          review_status: reviewStatus,
          review_notes: notes,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Review mislukt");
      }

      // Reload documents to show updated status
      await loadDocuments();

      if (onReviewComplete) {
        onReviewComplete();
      }

      alert(reviewStatus === "approved" ? "✅ Document goedgekeurd!" : "❌ Document afgekeurd");
    } catch (error) {
      console.error("Review error:", error);
      alert(`Fout: ${error instanceof Error ? error.message : "Onbekend"}`);
    } finally {
      setReviewing(null);
    }
  };

  const handleDownload = async (doc: KandidaatDocument) => {
    try {
      if (doc.download_url) {
        window.open(doc.download_url, "_blank");
      } else {
        const headers = await getAuthHeaders();
        const response = await fetch(
          `/api/admin/kandidaat-documenten/download?document_id=${doc.id}`,
          { headers }
        );

        if (!response.ok) throw new Error("Download URL genereren mislukt");

        const result = await response.json();
        window.open(result.signed_url, "_blank");
      }
    } catch (error) {
      console.error("Download error:", error);
      alert("Download mislukt");
    }
  };

  const requiredDocs = [
    { type: "id", label: "Identiteitsbewijs", icon: "📸" },
    { type: "cv", label: "CV", icon: "📝" },
    ...(uitbetalingswijze === "zzp" ? [{ type: "kvk", label: "KVK Uittreksel", icon: "🏢" }] : []),
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved": return "bg-green-100 text-green-700";
      case "rejected": return "bg-red-100 text-red-700";
      default: return "bg-yellow-100 text-yellow-700";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "approved": return "Goedgekeurd";
      case "rejected": return "Afgekeurd";
      default: return "Te beoordelen";
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#F27501] to-[#d96800] p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-1">
                Documenten Review: {voornaam} {achternaam}
              </h2>
              <p className="text-orange-100">
                {uitbetalingswijze === "zzp" ? "ZZP" : "Payroll"} • {documents.length} document(en) geüpload
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-[#F27501] mx-auto mb-4"></div>
              <p className="text-neutral-600">Documenten laden...</p>
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📄</div>
              <p className="text-neutral-600 text-lg">Nog geen documenten geüpload</p>
            </div>
          ) : (
            <>
              {/* Required Documents Checklist */}
              <div className="bg-neutral-50 rounded-xl p-6 mb-6">
                <h3 className="font-semibold text-neutral-900 mb-4">Vereiste Documenten:</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {requiredDocs.map((req) => {
                    const doc = documents.find(d => d.document_type === req.type);
                    const isApproved = doc?.review_status === "approved";

                    return (
                      <div
                        key={req.type}
                        className={`p-4 rounded-lg border-2 ${
                          isApproved
                            ? "border-green-300 bg-green-50"
                            : doc
                            ? "border-yellow-300 bg-yellow-50"
                            : "border-neutral-200 bg-white"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{req.icon}</span>
                          <div className="flex-1">
                            <p className="font-medium text-neutral-900">{req.label}</p>
                            <p className="text-xs text-neutral-600">
                              {isApproved ? "✓ Goedgekeurd" : doc ? "⏳ Wacht op review" : "Niet geüpload"}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Documents List */}
              <div className="space-y-4">
                <h3 className="font-semibold text-neutral-900">Alle Documenten:</h3>
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="border-2 border-neutral-200 rounded-xl p-4 hover:border-[#F27501]/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-2xl">
                            {doc.mime_type?.includes("pdf") ? "📄" :
                              doc.mime_type?.includes("image") ? "🖼️" : "📎"}
                          </span>
                          <div>
                            <h4 className="font-semibold text-neutral-900">{doc.file_name}</h4>
                            <p className="text-sm text-neutral-600">
                              {doc.document_type.toUpperCase()} • {(doc.file_size / 1024).toFixed(0)} KB
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 mb-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(doc.review_status)}`}>
                            {getStatusLabel(doc.review_status)}
                          </span>
                          <span className="text-xs text-neutral-500">
                            Geüpload: {new Date(doc.uploaded_at).toLocaleDateString("nl-NL")}
                          </span>
                        </div>

                        {doc.review_notes && (
                          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-2">
                            <p className="text-sm text-red-700">
                              <strong>Reden afwijzing:</strong> {doc.review_notes}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => handleDownload(doc)}
                          className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg font-medium text-sm transition-colors"
                        >
                          👁️ Bekijk
                        </button>

                        {doc.review_status !== "approved" && (
                          <button
                            onClick={() => handleReview(doc.id, "approved")}
                            disabled={reviewing === doc.id}
                            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
                          >
                            {reviewing === doc.id ? "..." : "✓ Goedkeuren"}
                          </button>
                        )}

                        {doc.review_status !== "rejected" && (
                          <button
                            onClick={() => handleReview(doc.id, "rejected")}
                            disabled={reviewing === doc.id}
                            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
                          >
                            {reviewing === doc.id ? "..." : "✗ Afkeuren"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-neutral-200 p-6 bg-neutral-50">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-neutral-200 hover:bg-neutral-300 text-neutral-700 rounded-xl font-semibold transition-colors"
          >
            Sluiten
          </button>
        </div>
      </div>
    </div>
  );
}
