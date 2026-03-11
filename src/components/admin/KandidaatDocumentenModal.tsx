"use client";

import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toast";

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
  document_expires_at: string | null;
  expiry_reminder_sent_at: string | null;
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
  const [previewDoc, setPreviewDoc] = useState<KandidaatDocument | null>(null);
  const toast = useToast();

  const loadDocuments = useCallback(async () => {
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
      toast.error("Documenten laden mislukt");
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders, inschrijvingId]);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

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

      toast.success(reviewStatus === "approved" ? "Document goedgekeurd!" : "Document afgekeurd");
    } catch (error) {
      console.error("Review error:", error);
      toast.error(`Fout: ${error instanceof Error ? error.message : "Onbekend"}`);
    } finally {
      setReviewing(null);
    }
  };

  const handlePreview = async (doc: KandidaatDocument) => {
    try {
      // If download_url already exists, use it
      if (doc.download_url) {
        setPreviewDoc({ ...doc });
        return;
      }

      // Otherwise fetch signed URL
      const headers = await getAuthHeaders();
      const response = await fetch(
        `/api/admin/kandidaat-documenten/download?document_id=${doc.id}`,
        { headers }
      );

      if (!response.ok) throw new Error("Preview URL genereren mislukt");

      const result = await response.json();
      setPreviewDoc({ ...doc, download_url: result.signed_url });
    } catch (error) {
      console.error("Preview error:", error);
      toast.error("Preview mislukt");
    }
  };

  const handleDownload = async (doc: KandidaatDocument) => {
    try {
      const url = doc.download_url || (await (async () => {
        const headers = await getAuthHeaders();
        const response = await fetch(
          `/api/admin/kandidaat-documenten/download?document_id=${doc.id}`,
          { headers }
        );
        if (!response.ok) throw new Error("Download URL genereren mislukt");
        const result = await response.json();
        return result.signed_url;
      })());

      // Create download link
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.file_name;
      a.click();
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Download mislukt");
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

  const getExpiryWarning = (expiresAt: string | null) => {
    if (!expiresAt) return null;

    const expiry = new Date(expiresAt);
    const now = new Date();
    const daysUntilExpiry = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) {
      return { level: "expired", message: "⚠️ Document verlopen!", days: daysUntilExpiry };
    } else if (daysUntilExpiry <= 30) {
      return { level: "critical", message: `⚠️ Verloopt binnen ${daysUntilExpiry} dagen`, days: daysUntilExpiry };
    } else if (daysUntilExpiry <= 60) {
      return { level: "warning", message: `⚡ Verloopt over ${daysUntilExpiry} dagen`, days: daysUntilExpiry };
    }

    return null;
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

                        <div className="flex items-center gap-3 mb-3 flex-wrap">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(doc.review_status)}`}>
                            {getStatusLabel(doc.review_status)}
                          </span>
                          <span className="text-xs text-neutral-500">
                            Geüpload: {new Date(doc.uploaded_at).toLocaleDateString("nl-NL")}
                          </span>
                          {doc.document_expires_at && (
                            <span className="text-xs text-neutral-500">
                              Verloopt: {new Date(doc.document_expires_at).toLocaleDateString("nl-NL")}
                            </span>
                          )}
                        </div>

                        {/* Expiry Warning */}
                        {(() => {
                          const warning = getExpiryWarning(doc.document_expires_at);
                          if (!warning) return null;

                          return (
                            <div className={`border-2 rounded-lg p-3 mb-3 ${
                              warning.level === "expired"
                                ? "bg-red-50 border-red-300"
                                : warning.level === "critical"
                                ? "bg-orange-50 border-orange-300"
                                : "bg-yellow-50 border-yellow-300"
                            }`}>
                              <p className={`text-sm font-semibold ${
                                warning.level === "expired"
                                  ? "text-red-700"
                                  : warning.level === "critical"
                                  ? "text-orange-700"
                                  : "text-yellow-700"
                              }`}>
                                {warning.message}
                              </p>
                              <p className="text-xs text-neutral-600 mt-1">
                                Vraag kandidaat om nieuw document te uploaden
                              </p>
                            </div>
                          );
                        })()}

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
                          onClick={() => handlePreview(doc)}
                          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium text-sm transition-colors"
                        >
                          👁️ Preview
                        </button>

                        <button
                          onClick={() => handleDownload(doc)}
                          className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg font-medium text-sm transition-colors"
                        >
                          ⬇️ Download
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

      {/* Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[95vh] overflow-hidden flex flex-col">
            {/* Preview Header */}
            <div className="flex items-center justify-between p-4 border-b border-neutral-200">
              <div>
                <h3 className="font-bold text-lg text-neutral-900">{previewDoc.file_name}</h3>
                <p className="text-sm text-neutral-600">
                  {previewDoc.document_type.toUpperCase()} • {(previewDoc.file_size / 1024).toFixed(0)} KB
                </p>
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                className="text-neutral-600 hover:text-neutral-900 p-2 rounded-lg hover:bg-neutral-100 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Preview Content */}
            <div className="flex-1 overflow-auto p-4 bg-neutral-50">
              {previewDoc.mime_type === "application/pdf" ? (
                <iframe
                  src={previewDoc.download_url}
                  className="w-full h-full min-h-[600px] border-0 rounded-lg bg-white"
                  title={previewDoc.file_name}
                />
              ) : previewDoc.mime_type?.startsWith("image/") ? (
                <div className="flex items-center justify-center h-full">
                  <img
                    src={previewDoc.download_url}
                    alt={previewDoc.file_name}
                    className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-neutral-600">
                  <div className="text-center">
                    <div className="text-6xl mb-4">📄</div>
                    <p className="text-lg font-medium mb-2">Preview niet beschikbaar</p>
                    <p className="text-sm mb-4">Dit bestandstype kan niet inline worden weergegeven</p>
                    <button
                      onClick={() => handleDownload(previewDoc)}
                      className="px-6 py-3 bg-[#F27501] hover:bg-[#d96800] text-white rounded-lg font-medium transition-colors"
                    >
                      Download Bestand
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Preview Actions */}
            <div className="border-t border-neutral-200 p-4 bg-white flex items-center justify-between">
              <div className="flex gap-2">
                <button
                  onClick={() => handleDownload(previewDoc)}
                  className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg font-medium transition-colors"
                >
                  ⬇️ Download
                </button>
              </div>

              <div className="flex gap-2">
                {previewDoc.review_status !== "approved" && (
                  <button
                    onClick={async () => {
                      await handleReview(previewDoc.id, "approved");
                      setPreviewDoc(null);
                    }}
                    disabled={reviewing === previewDoc.id}
                    className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    {reviewing === previewDoc.id ? "..." : "✓ Goedkeuren"}
                  </button>
                )}

                {previewDoc.review_status !== "rejected" && (
                  <button
                    onClick={async () => {
                      await handleReview(previewDoc.id, "rejected");
                      setPreviewDoc(null);
                    }}
                    disabled={reviewing === previewDoc.id}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    {reviewing === previewDoc.id ? "..." : "✗ Afkeuren"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
