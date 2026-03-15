"use client";

import { useState, useEffect } from "react";
import { FileText, Download, Upload, Eye, Trash2, IdCard } from "lucide-react";
import MedewerkerResponsiveLayout from "@/components/medewerker/MedewerkerResponsiveLayout";
import { toast } from "sonner";

interface Document {
  id: string;
  naam: string;
  type: string;
  url: string;
  created_at: string;
  size?: number;
}

export default function DocumentenClient() {
  const [documenten, setDocumenten] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchDocumenten();
  }, []);

  const fetchDocumenten = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/medewerker/documenten");
      if (res.ok) {
        const data = await res.json();
        setDocumenten(data.documenten || []);
      }
    } catch (err) {
      console.error("Fetch documenten error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Bestand mag maximaal 10MB zijn");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/medewerker/documenten", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        toast.error("Upload mislukt");
        return;
      }

      toast.success("Document geüpload!");
      await fetchDocumenten();
    } catch (err) {
      console.error("Upload error:", err);
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
        toast.error("Verwijderen mislukt");
        return;
      }

      toast.success("Document verwijderd");
      await fetchDocumenten();
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("Er ging iets mis");
    }
  };

  const getFileIcon = (type: string) => {
    if (type.includes("pdf")) return <FileText className="w-8 h-8 text-red-500" />;
    if (type.includes("image")) return <Eye className="w-8 h-8 text-blue-500" />;
    return <FileText className="w-8 h-8 text-[var(--mp-text-tertiary)]" />;
  };

  const formatFileSize = (bytes?: number) => {
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
            <label className="block">
              <input
                type="file"
                onChange={handleUpload}
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
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
                      PDF, JPG, PNG of DOC (max 10MB)
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
                  onClick={() => toast.info("QR-code functie komt binnenkort...")}
                  className="px-4 py-2 rounded-xl bg-[var(--mp-accent)] text-white font-semibold text-sm transition-all active:scale-95"
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
                  <div className="flex-shrink-0">{getFileIcon(doc.type)}</div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-[var(--mp-text-primary)] truncate">
                      {doc.naam}
                    </h3>
                    <p className="text-xs text-[var(--mp-text-tertiary)] mt-0.5">
                      {new Date(doc.created_at).toLocaleDateString("nl-NL")}
                      {doc.size && ` · ${formatFileSize(doc.size)}`}
                    </p>
                  </div>
                  <div className="flex gap-2">
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
                      download
                      className="w-10 h-10 rounded-xl bg-[var(--mp-bg)] flex items-center justify-center text-[var(--mp-text-secondary)] hover:text-[var(--mp-accent)] transition-colors"
                      aria-label="Downloaden"
                    >
                      <Download className="w-5 h-5" />
                    </a>
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
    </MedewerkerResponsiveLayout>
  );
}
