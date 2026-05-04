"use client";

import { useState } from "react";
import { Upload, Download, FileText, AlertCircle, CheckCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/Toast";

type ImportType = "leads" | "instantly";

export default function ImportView() {
  const [importType, setImportType] = useState<ImportType>("leads");
  const [csvContent, setCsvContent] = useState("");
  const [preview, setPreview] = useState<Record<string, unknown> | null>(null);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  async function getToken() {
    const session = await supabase.auth.getSession();
    return session.data.session?.access_token || "";
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setCsvContent(event.target?.result as string);
      setPreview(null);
      setResult(null);
    };
    reader.readAsText(file);
  }

  async function handlePreview() {
    if (!csvContent) return;
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/admin/crm/import", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ csv_content: csvContent, preview_only: true, import_type: importType }),
      });
      if (!res.ok) throw new Error();
      setPreview(await res.json());
    } catch {
      toast.error("Preview mislukt");
    } finally {
      setLoading(false);
    }
  }

  async function handleImport() {
    if (!csvContent) return;
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/admin/crm/import", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ csv_content: csvContent, preview_only: false, import_type: importType }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setResult(data);
      toast.success(`Import voltooid: ${data.imported || data.updated || 0} verwerkt`);
    } catch {
      toast.error("Import mislukt");
    } finally {
      setLoading(false);
    }
  }

  async function handleExport(format: "instantly" | "full") {
    try {
      const token = await getToken();
      const res = await fetch(`/api/admin/crm/export?format=${format}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `crm_export_${format}_${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Export gedownload");
    } catch {
      toast.error("Export mislukt");
    }
  }

  return (
    <div className="space-y-6">
      {/* Import Section */}
      <div className="bg-white rounded-xl border border-neutral-100 p-6">
        <h3 className="text-lg font-semibold text-neutral-900 mb-4">Importeren</h3>

        {/* Import type selector */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => { setImportType("leads"); setPreview(null); setResult(null); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${importType === "leads" ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"}`}
          >
            Restaurant leads
          </button>
          <button
            onClick={() => { setImportType("instantly"); setPreview(null); setResult(null); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${importType === "instantly" ? "bg-cyan-600 text-white" : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"}`}
          >
            Instantly resultaten
          </button>
        </div>

        {importType === "instantly" && (
          <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-3 mb-4 text-sm text-cyan-800">
            <p className="font-medium">Instantly CSV import</p>
            <p>Verwachte kolommen: email, campaign_id, campaign_name, status, last_event_at</p>
            <p>Matching gebeurt op email adres.</p>
          </div>
        )}

        {/* File upload */}
        <div className="border-2 border-dashed border-neutral-200 rounded-xl p-8 text-center">
          <Upload className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
          <p className="text-sm text-neutral-600 mb-2">Sleep een CSV-bestand hierheen of klik om te uploaden</p>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="text-sm"
          />
        </div>

        {csvContent && (
          <div className="mt-4 flex gap-2">
            <button
              onClick={handlePreview}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-neutral-100 text-neutral-700 rounded-lg text-sm font-medium hover:bg-neutral-200 disabled:opacity-50"
            >
              <FileText className="w-4 h-4" />
              Preview
            </button>
            <button
              onClick={handleImport}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              {loading ? "Importeren..." : "Importeren"}
            </button>
          </div>
        )}

        {/* Preview */}
        {preview && (
          <div className="mt-4 bg-neutral-50 rounded-lg p-4">
            <h4 className="text-sm font-semibold mb-2">Preview: {(preview.total_rows as number) || 0} rijen</h4>
            {(preview.unmapped_columns as string[])?.length > 0 && (
              <div className="flex items-center gap-2 text-amber-700 text-xs mb-2">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Niet-gemapte kolommen: {(preview.unmapped_columns as string[]).join(", ")}</span>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="text-xs w-full">
                <thead>
                  <tr className="border-b">
                    {(preview.mapped_headers as (string | null)[])?.filter(Boolean).slice(0, 6).map((h, i) => (
                      <th key={i} className="text-left px-2 py-1 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(preview.preview as Record<string, unknown>[])?.slice(0, 5).map((row, i) => (
                    <tr key={i} className="border-b border-neutral-100">
                      {(preview.mapped_headers as (string | null)[])?.filter(Boolean).slice(0, 6).map((h, j) => (
                        <td key={j} className="px-2 py-1 truncate max-w-32">{String(row[h!] || "")}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-green-700 mb-2">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Import voltooid</span>
            </div>
            <div className="text-sm text-green-800 space-y-1">
              {result.imported !== undefined && <p>Geïmporteerd: {result.imported as number}</p>}
              {result.updated !== undefined && <p>Bijgewerkt: {result.updated as number}</p>}
              {(result.duplicates_skipped as number) > 0 && <p>Duplicaten overgeslagen: {result.duplicates_skipped as number}</p>}
              {(result.not_found as number) > 0 && <p>Niet gevonden (email): {result.not_found as number}</p>}
            </div>
          </div>
        )}
      </div>

      {/* Export Section */}
      <div className="bg-white rounded-xl border border-neutral-100 p-6">
        <h3 className="text-lg font-semibold text-neutral-900 mb-4">Exporteren</h3>
        <div className="flex gap-3">
          <button
            onClick={() => handleExport("instantly")}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-50 text-cyan-700 rounded-lg text-sm font-medium hover:bg-cyan-100"
          >
            <Download className="w-4 h-4" />
            Export voor Instantly (email leads)
          </button>
          <button
            onClick={() => handleExport("full")}
            className="flex items-center gap-2 px-4 py-2 bg-neutral-100 text-neutral-700 rounded-lg text-sm font-medium hover:bg-neutral-200"
          >
            <Download className="w-4 h-4" />
            Volledige export
          </button>
        </div>
        <p className="text-xs text-neutral-500 mt-2">
          Instantly export bevat: company_name, email, phone, city, website, instagram_url, facebook_url
        </p>
      </div>
    </div>
  );
}
