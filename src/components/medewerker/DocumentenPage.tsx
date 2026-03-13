"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/Toast";

interface Document {
  id: string;
  document_type: string;
  file_name: string;
  file_url: string;
  file_size: number;
  uploaded_at: string;
  review_status?: string | null;
  review_opmerking?: string | null;
  reviewed_at?: string | null;
  expiry_date?: string | null;
}

const DOCUMENT_TYPES = [
  { value: "id_bewijs", label: "ID-bewijs / Paspoort" },
  { value: "contract", label: "Contract" },
  { value: "kvk", label: "KVK-uittreksel" },
  { value: "vog", label: "VOG" },
  { value: "overig", label: "Overig" },
];

export default function DocumentenPage() {
  const toast = useToast();
  const [documenten, setDocumenten] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedType, setSelectedType] = useState("id_bewijs");

  useEffect(() => {
    fetchDocumenten();
  }, []);

  const fetchDocumenten = async () => {
    try {
      const res = await fetch("/api/medewerker/documenten");
      const data = await res.json();
      if (!res.ok) throw new Error();
      setDocumenten(data.documenten || []);
    } catch {
      toast.error("Kon documenten niet laden");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Bestand mag maximaal 10MB zijn");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("document_type", selectedType);

      const res = await fetch("/api/medewerker/documenten", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload mislukt");
      toast.success("Document geüpload");
      fetchDocumenten();
    } catch {
      toast.error("Kon document niet uploaden");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Document verwijderen?")) return;
    try {
      const res = await fetch(`/api/medewerker/documenten?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Document verwijderd");
      fetchDocumenten();
    } catch {
      toast.error("Kon document niet verwijderen");
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });

  const getTypeLabel = (type: string) =>
    DOCUMENT_TYPES.find((t) => t.value === type)?.label || type;

  return (
    <div>
      <h2 className="text-2xl font-bold text-neutral-900 mb-6">Documenten</h2>

      {/* Upload sectie */}
      <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
        <h3 className="text-lg font-semibold text-neutral-900 mb-4">Document Uploaden</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-[#F27501] focus:border-transparent"
          >
            {DOCUMENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <label className={`inline-flex items-center gap-2 px-5 py-2 bg-[#F27501] text-white rounded-xl text-sm font-semibold hover:bg-[#d96800] transition-colors cursor-pointer ${isUploading ? "opacity-50 pointer-events-none" : ""}`}>
            {isUploading ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                Uploaden...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Bestand kiezen
              </>
            )}
            <input type="file" onChange={handleUpload} className="hidden" disabled={isUploading} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" />
          </label>
        </div>
        <p className="text-xs text-neutral-500 mt-2">Max 10MB. PDF, JPG, PNG, DOC toegestaan.</p>
      </div>

      {/* Documenten lijst */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-[#F27501] border-t-transparent rounded-full" />
        </div>
      ) : documenten.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
          <svg className="w-12 h-12 mx-auto text-neutral-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <p className="text-neutral-500">Nog geen documenten geüpload.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {documenten.map((doc) => (
            <div key={doc.id} className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 bg-[#F27501]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-[#F27501]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-neutral-900 truncate">{doc.file_name}</p>
                  {doc.review_status === "goedgekeurd" && (
                    <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-700 flex-shrink-0">Goedgekeurd</span>
                  )}
                  {doc.review_status === "afgekeurd" && (
                    <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-700 flex-shrink-0">Afgekeurd</span>
                  )}
                  {(!doc.review_status || doc.review_status === "pending") && (
                    <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-700 flex-shrink-0">In review</span>
                  )}
                </div>
                <p className="text-xs text-neutral-500">
                  {getTypeLabel(doc.document_type)} · {formatFileSize(doc.file_size)} · {formatDate(doc.uploaded_at)}
                </p>
                {doc.expiry_date && (() => {
                  const expiry = new Date(doc.expiry_date);
                  const today = new Date();
                  const daysLeft = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                  const isExpired = daysLeft < 0;
                  const isExpiringSoon = daysLeft >= 0 && daysLeft <= 30;
                  return (
                    <p className={`text-xs mt-0.5 flex items-center gap-1 ${isExpired ? "text-red-600 font-semibold" : isExpiringSoon ? "text-orange-600" : "text-neutral-400"}`}>
                      {isExpired ? "⚠️ Verlopen" : isExpiringSoon ? `⚠️ Verloopt over ${daysLeft} dagen` : `Geldig tot ${formatDate(doc.expiry_date)}`}
                    </p>
                  );
                })()}
                {doc.review_status === "afgekeurd" && doc.review_opmerking && (
                  <p className="text-xs text-red-600 mt-1">Opmerking: {doc.review_opmerking}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={doc.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-neutral-400 hover:text-[#F27501] transition-colors"
                  title="Bekijken"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
                <button
                  onClick={() => handleDelete(doc.id)}
                  className="p-2 text-neutral-400 hover:text-red-500 transition-colors"
                  title="Verwijderen"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
