"use client";

import { useState, useEffect } from "react";
import { FileText, Download, Upload, Eye, Trash2, IdCard, X } from "lucide-react";
import MedewerkerResponsiveLayout from "@/components/medewerker/MedewerkerResponsiveLayout";
import { toast } from "sonner";
import * as Sentry from "@sentry/nextjs";
import QRCode from "react-qr-code";
import { buildCheckinQr } from "@/lib/checkin-qr";
import {
  DOCUMENT_ACCEPT,
  DOCUMENT_HINT,
  DOCUMENT_TYPES,
  documentTypeLabel,
  valideerDocument,
  type MedewerkerDocument,
} from "@/lib/medewerker/documenten";

const REVIEW_LABELS: Record<string, { tekst: string; kleur: string }> = {
  goedgekeurd: { tekst: "Goedgekeurd", kleur: "text-[var(--mp-success)]" },
  afgekeurd: { tekst: "Afgekeurd", kleur: "text-[var(--mp-danger)]" },
};

interface MedewerkerInfo {
  id: string;
  naam: string;
  email: string;
}

export default function DocumentenClient() {
  const [documenten, setDocumenten] = useState<MedewerkerDocument[]>([]);
  const [documentType, setDocumentType] = useState<string>(DOCUMENT_TYPES[0].value);
  const [vervaldatum, setVervaldatum] = useState("");
  const vraagtVervaldatum = DOCUMENT_TYPES.find((t) => t.value === documentType)?.vervaldatum ?? false;
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [medewerkerInfo, setMedewerkerInfo] = useState<MedewerkerInfo | null>(null);

  useEffect(() => {
    fetchDocumenten();
    fetchMedewerkerInfo();
  }, []);

  const fetchMedewerkerInfo = async () => {
    try {
      const res = await fetch("/api/medewerker/profile");
      if (res.ok) {
        const data = await res.json();
        setMedewerkerInfo({
          id: data.id,
          naam: data.naam,
          email: data.email,
        });
      }
    } catch (err) {
      Sentry.captureException(err);
    }
  };

  const fetchDocumenten = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/medewerker/documenten");
      if (res.ok) {
        const data = await res.json();
        setDocumenten(data.documenten || []);
      }
    } catch (err) {
      Sentry.captureException(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fout = valideerDocument(file);
    if (fout) {
      toast.error(fout);
      e.target.value = "";
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("document_type", documentType);
      if (vraagtVervaldatum && vervaldatum) formData.append("expiry_date", vervaldatum);

      const res = await fetch("/api/medewerker/documenten", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || (res.status === 413 ? "Bestand is te groot (maximaal 4 MB)" : "Upload mislukt"));
        return;
      }

      setVervaldatum("");
      toast.success("Document geüpload!");
      await fetchDocumenten();
    } catch (err) {
      Sentry.captureException(err);
      toast.error("Er ging iets mis");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDelete = async (docId: string) => {
    if (!confirm("Weet je zeker dat je dit document wilt verwijderen?")) return;

    try {
      const res = await fetch(`/api/medewerker/documenten?id=${docId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Verwijderen mislukt");
        return;
      }

      toast.success("Document verwijderd");
      await fetchDocumenten();
    } catch (err) {
      Sentry.captureException(err);
      toast.error("Er ging iets mis");
    }
  };

  const getFileIcon = (bestandsnaam: string | null | undefined) => {
    const ext = (bestandsnaam ?? "").split(".").pop()?.toLowerCase() ?? "";
    if (ext === "pdf") return <FileText className="w-8 h-8 text-red-500" />;
    if (["jpg", "jpeg", "png", "heic", "heif"].includes(ext)) return <Eye className="w-8 h-8 text-blue-500" />;
    return <FileText className="w-8 h-8 text-[var(--mp-text-tertiary)]" />;
  };

  const formatFileSize = (bytes?: number | null) => {
    if (!bytes) return "";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <MedewerkerResponsiveLayout>
      <div className="min-h-screen bg-[var(--mp-bg)]">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-[var(--mp-card)] border-b border-[var(--mp-separator)]">
          <div className="px-4 py-3">
            <h1 className="text-2xl font-bold text-[var(--mp-text-primary)]">
              Documenten
            </h1>
            <p className="text-sm text-[var(--mp-text-secondary)] mt-1">
              Je contracten en persoonlijke documenten
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 max-w-4xl mx-auto">
          {/* Upload section */}
          <div className="bg-[var(--mp-card)] rounded-[var(--mp-radius)] p-6 shadow-[var(--mp-shadow)] mb-6">
            <h2 className="text-lg font-semibold text-[var(--mp-text-primary)] mb-4">
              Document uploaden
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 mb-4">
              <label className="block">
                <span className="block text-xs font-semibold text-[var(--mp-text-tertiary)] uppercase mb-1">
                  Soort document
                </span>
                <select
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  disabled={uploading}
                  className="w-full px-3 py-2.5 rounded-xl bg-[var(--mp-bg)] border border-[var(--mp-separator)] text-[var(--mp-text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--mp-accent)]"
                >
                  {DOCUMENT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
              {vraagtVervaldatum && (
                <label className="block">
                  <span className="block text-xs font-semibold text-[var(--mp-text-tertiary)] uppercase mb-1">
                    Geldig tot
                  </span>
                  <input
                    type="date"
                    value={vervaldatum}
                    onChange={(e) => setVervaldatum(e.target.value)}
                    disabled={uploading}
                    className="w-full px-3 py-2.5 rounded-xl bg-[var(--mp-bg)] border border-[var(--mp-separator)] text-[var(--mp-text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--mp-accent)]"
                  />
                </label>
              )}
            </div>
            <label className="block">
              <input
                type="file"
                onChange={handleUpload}
                accept={DOCUMENT_ACCEPT}
                className="hidden"
                disabled={uploading}
              />
              <div className="border-2 border-dashed border-[var(--mp-separator)] rounded-xl p-8 text-center cursor-pointer hover:border-[var(--mp-accent)] transition-colors">
                {uploading ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-3 border-[var(--mp-accent)] border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-[var(--mp-text-secondary)]">
                      Uploaden...
                    </p>
                  </div>
                ) : (
                  <>
                    <Upload className="w-12 h-12 text-[var(--mp-text-tertiary)] mx-auto mb-3" />
                    <p className="text-sm font-medium text-[var(--mp-text-primary)] mb-1">
                      Klik om een document te uploaden
                    </p>
                    <p className="text-xs text-[var(--mp-text-tertiary)]">
                      {DOCUMENT_HINT}
                    </p>
                  </>
                )}
              </div>
            </label>
          </div>

          {/* ID Kaart sectie */}
          <div className="bg-gradient-to-br from-[var(--mp-accent)]/10 to-[var(--mp-accent)]/5 border border-[var(--mp-accent)]/20 rounded-[var(--mp-radius)] p-6 mb-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-[var(--mp-accent)]/20 flex items-center justify-center">
                <IdCard className="w-6 h-6 text-[var(--mp-accent)]" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-[var(--mp-text-primary)] mb-1">
                  Digitale ID Kaart
                </h3>
                <p className="text-sm text-[var(--mp-text-secondary)] mb-4">
                  Gebruik je QR-code om in te checken bij diensten
                </p>
                <button
                  onClick={() => setShowQRModal(true)}
                  disabled={!medewerkerInfo}
                  className="px-4 py-2 rounded-xl bg-[var(--mp-accent)] text-white font-semibold text-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Toon QR-code
                </button>
              </div>
            </div>
          </div>

          {/* Documenten lijst */}
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-[var(--mp-text-primary)]">
              Mijn documenten
            </h2>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-3 border-[var(--mp-accent)] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : documenten.length === 0 ? (
              <div className="bg-[var(--mp-card)] rounded-[var(--mp-radius)] p-8 text-center shadow-[var(--mp-shadow)]">
                <FileText className="w-12 h-12 text-[var(--mp-text-tertiary)] mx-auto mb-3" />
                <p className="text-[var(--mp-text-secondary)] text-sm">
                  Nog geen documenten geüpload
                </p>
              </div>
            ) : (
              documenten.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-[var(--mp-card)] rounded-[var(--mp-radius)] p-4 shadow-[var(--mp-shadow)] flex items-center gap-4"
                >
                  <div className="flex-shrink-0">{getFileIcon(doc.file_name)}</div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-[var(--mp-text-primary)] truncate">
                      {documentTypeLabel(doc.document_type)}
                    </h3>
                    <p className="text-xs text-[var(--mp-text-tertiary)] mt-0.5 truncate">
                      {doc.file_name}
                    </p>
                    <p className="text-xs text-[var(--mp-text-tertiary)] mt-0.5">
                      {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString("nl-NL") : ""}
                      {doc.file_size ? ` · ${formatFileSize(doc.file_size)}` : ""}
                      {doc.expiry_date ? ` · geldig tot ${new Date(doc.expiry_date + "T12:00:00").toLocaleDateString("nl-NL")}` : ""}
                    </p>
                    {doc.review_status && REVIEW_LABELS[doc.review_status] && (
                      <p className={`text-xs font-medium mt-0.5 ${REVIEW_LABELS[doc.review_status].kleur}`}>
                        {REVIEW_LABELS[doc.review_status].tekst}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {doc.url && (
                      <>
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-10 h-10 rounded-xl bg-[var(--mp-bg)] flex items-center justify-center text-[var(--mp-text-secondary)] hover:text-[var(--mp-accent)] transition-colors"
                          aria-label="Bekijken"
                        >
                          <Eye className="w-5 h-5" />
                        </a>
                        <a
                          href={doc.url}
                          download={doc.file_name}
                          className="w-10 h-10 rounded-xl bg-[var(--mp-bg)] flex items-center justify-center text-[var(--mp-text-secondary)] hover:text-[var(--mp-accent)] transition-colors"
                          aria-label="Downloaden"
                        >
                          <Download className="w-5 h-5" />
                        </a>
                      </>
                    )}
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="w-10 h-10 rounded-xl bg-[var(--mp-bg)] flex items-center justify-center text-[var(--mp-text-secondary)] hover:text-[var(--mp-danger)] transition-colors"
                      aria-label="Verwijderen"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* QR Code Modal */}
      {showQRModal && medewerkerInfo && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--mp-card)] rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            {/* Close button */}
            <button
              onClick={() => setShowQRModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[var(--mp-bg)] flex items-center justify-center text-[var(--mp-text-secondary)] hover:text-[var(--mp-text-primary)] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--mp-accent)]/20 to-[var(--mp-accent)]/10 flex items-center justify-center mx-auto mb-4">
                <IdCard className="w-8 h-8 text-[var(--mp-accent)]" />
              </div>
              <h2 className="text-2xl font-bold text-[var(--mp-text-primary)] mb-1">
                Digitale ID Kaart
              </h2>
              <p className="text-sm text-[var(--mp-text-secondary)]">
                {medewerkerInfo.naam}
              </p>
            </div>

            {/* QR Code */}
            <div id="qr-modal" className="bg-white p-6 rounded-xl flex items-center justify-center mb-6">
              <QRCode
                value={buildCheckinQr(medewerkerInfo)}
                size={256}
                level="H"
              />
            </div>

            {/* Info */}
            <div className="bg-[var(--mp-bg)] rounded-xl p-4 mb-4">
              <p className="text-xs text-[var(--mp-text-tertiary)] text-center leading-relaxed">
                Laat deze QR-code scannen door je werkgever om in te checken bij een dienst. De code is uniek gekoppeld aan jouw account.
              </p>
            </div>

            {/* Download button */}
            <button
              onClick={() => {
                // Create a canvas with the QR code and download it
                const svg = document.querySelector('#qr-modal svg');
                if (!svg) return;

                const svgData = new XMLSerializer().serializeToString(svg);
                const canvas = document.createElement("canvas");
                const ctx = canvas.getContext("2d");
                const img = new Image();

                canvas.width = 512;
                canvas.height = 512;

                img.onload = () => {
                  if (ctx) {
                    ctx.fillStyle = "white";
                    ctx.fillRect(0, 0, 512, 512);
                    ctx.drawImage(img, 0, 0, 512, 512);

                    canvas.toBlob((blob) => {
                      if (blob) {
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `TopTalent-ID-${medewerkerInfo.naam.replace(/\s+/g, '-')}.png`;
                        a.click();
                        URL.revokeObjectURL(url);
                        toast.success("QR-code gedownload!");
                      }
                    });
                  }
                };

                img.src = "data:image/svg+xml;base64," + btoa(svgData);
              }}
              className="w-full px-4 py-3 rounded-xl bg-[var(--mp-accent)] text-white font-semibold text-sm transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download QR-code
            </button>
          </div>
        </div>
      )}
    </MedewerkerResponsiveLayout>
  );
}
