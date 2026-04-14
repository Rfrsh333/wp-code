"use client";

import { useCallback, useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface Props {
  onRefresh: () => void;
}

interface CsvFile {
  path: string;
  name: string;
  size: string;
  rows: number;
}

export default function DiscoveryView({ onRefresh }: Props) {
  const [activeMode, setActiveMode] = useState<"bestanden" | "csv" | "handmatig">("bestanden");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Bestaande bestanden state
  const [availableFiles, setAvailableFiles] = useState<CsvFile[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [importingFile, setImportingFile] = useState<string | null>(null);

  // CSV import state
  const [csvData, setCsvData] = useState<Record<string, string>[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handmatig state
  const [manualData, setManualData] = useState({
    bedrijfsnaam: "",
    contactpersoon: "",
    email: "",
    telefoon: "",
    website: "",
    adres: "",
    stad: "",
    branche: "restaurant",
  });

  const getToken = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || "";
  }, []);

  const DB_COLUMNS = [
    { value: "", label: "-- Overslaan --" },
    { value: "bedrijfsnaam", label: "Bedrijfsnaam" },
    { value: "contactpersoon", label: "Contactpersoon" },
    { value: "email", label: "Email" },
    { value: "telefoon", label: "Telefoon" },
    { value: "website", label: "Website" },
    { value: "adres", label: "Adres" },
    { value: "stad", label: "Stad" },
    { value: "branche", label: "Branche" },
  ];

  // Laad beschikbare CSV bestanden
  const loadAvailableFiles = useCallback(async () => {
    setIsLoadingFiles(true);
    const token = await getToken();
    const res = await fetch("/api/admin/acquisitie/discover", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: "list_files" }),
    });
    if (res.ok) {
      const json = await res.json();
      setAvailableFiles(json.files || []);
    }
    setIsLoadingFiles(false);
  }, [getToken]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (activeMode === "bestanden") {
      void loadAvailableFiles();
    }
  }, [activeMode, loadAvailableFiles]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Importeer bestaand CSV bestand
  const importExistingFile = async (filePath: string) => {
    setImportingFile(filePath);
    setMessage({ type: "success", text: "Importeren gestart..." });

    const token = await getToken();
    const res = await fetch("/api/admin/acquisitie/discover", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: "import_existing", file_path: filePath }),
    });

    if (res.ok) {
      const result = await res.json();
      setMessage({
        type: "success",
        text: `${result.imported} geimporteerd, ${result.skipped} overgeslagen (duplicaten/fouten). Totaal: ${result.total} rijen.`,
      });
      onRefresh();
    } else {
      const err = await res.json();
      setMessage({ type: "error", text: err.error || "Import mislukt" });
    }
    setImportingFile(null);
  };

  // CSV file upload handling
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split("\n").filter(Boolean);
      if (lines.length < 2) {
        setMessage({ type: "error", text: "CSV bestand is leeg" });
        return;
      }

      const headers = parseCsvLine(lines[0]);
      setCsvHeaders(headers);

      // Auto-map columns
      const autoMapping: Record<string, string> = {};
      const mappings: Record<string, string> = {
        bedrijfsnaam: "bedrijfsnaam",
        name: "bedrijfsnaam",
        naam: "bedrijfsnaam",
        email: "email",
        telefoon: "telefoon",
        phone: "telefoon",
        website: "website",
        adres: "adres",
        address: "adres",
        locatie: "adres",
        stad: "stad",
        city: "stad",
        branche: "branche",
        contactpersoon: "contactpersoon",
        voornaam: "contactpersoon",
      };

      headers.forEach((h) => {
        const lower = h.toLowerCase().trim();
        if (mappings[lower]) {
          autoMapping[h] = mappings[lower];
        }
      });
      setColumnMapping(autoMapping);

      // Parse rows
      const rows: Record<string, string>[] = [];
      for (let i = 1; i < lines.length; i++) {
        const values = parseCsvLine(lines[i]);
        const row: Record<string, string> = {};
        headers.forEach((h, idx) => {
          row[h] = values[idx] || "";
        });
        rows.push(row);
      }
      setCsvData(rows);
      setMessage({ type: "success", text: `${rows.length} rijen geladen` });
    };
    reader.readAsText(file);
  };

  const handleCsvImport = async () => {
    if (csvData.length === 0) return;
    setIsImporting(true);

    const token = await getToken();
    const res = await fetch("/api/admin/acquisitie/import", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        rows: csvData,
        column_mapping: columnMapping,
        bron: "csv_import",
      }),
    });

    if (res.ok) {
      const result = await res.json();
      setMessage({
        type: "success",
        text: `${result.imported} geimporteerd, ${result.skipped} overgeslagen, ${result.errors} fouten`,
      });
      setCsvData([]);
      setCsvHeaders([]);
      onRefresh();
    } else {
      setMessage({ type: "error", text: "Import mislukt" });
    }
    setIsImporting(false);
  };

  // Handmatig toevoegen
  const handleManualAdd = async () => {
    if (!manualData.bedrijfsnaam.trim()) {
      setMessage({ type: "error", text: "Bedrijfsnaam is vereist" });
      return;
    }

    const token = await getToken();
    const res = await fetch("/api/admin/acquisitie/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...manualData, bron: "handmatig" }),
    });

    if (res.ok) {
      setMessage({ type: "success", text: "Lead toegevoegd!" });
      setManualData({
        bedrijfsnaam: "", contactpersoon: "", email: "", telefoon: "",
        website: "", adres: "", stad: "", branche: "restaurant",
      });
      onRefresh();
    } else {
      const err = await res.json();
      setMessage({ type: "error", text: err.error || "Toevoegen mislukt" });
    }
  };

  return (
    <div>
      {/* Mode selector */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {([
          { id: "bestanden" as const, label: "Bestaande Data", icon: "M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" },
          { id: "csv" as const, label: "CSV Upload", icon: "M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" },
          { id: "handmatig" as const, label: "Handmatig", icon: "M12 4v16m8-8H4" },
        ]).map((mode) => (
          <button
            key={mode.id}
            onClick={() => setActiveMode(mode.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              activeMode === mode.id
                ? "bg-neutral-900 text-white"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mode.icon} />
            </svg>
            {mode.label}
          </button>
        ))}
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded-xl text-sm ${
          message.type === "success"
            ? "bg-green-50 text-green-700 border border-green-200"
            : "bg-red-50 text-red-700 border border-red-200"
        }`}>
          {message.text}
        </div>
      )}

      {/* Bestaande Data Import */}
      {activeMode === "bestanden" && (
        <div className="bg-white p-6 rounded-xl border border-neutral-200">
          <h3 className="font-semibold text-neutral-800 mb-2">Bestaande Scrape Data Importeren</h3>
          <p className="text-sm text-neutral-500 mb-4">
            CSV bestanden gevonden in ~/Desktop/scrappe/ en DGS 2026/. Klik op &quot;Importeer&quot; om de leads in de database te laden.
          </p>

          {isLoadingFiles ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-3 border-[#F27501] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-2">
              {availableFiles.map((file) => (
                <div
                  key={file.path}
                  className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg border border-neutral-200"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-neutral-800 truncate">{file.name}</p>
                    <p className="text-xs text-neutral-500 truncate">{file.path}</p>
                    <div className="flex gap-3 mt-1 text-xs text-neutral-400">
                      <span>{file.rows} rijen</span>
                      <span>{file.size}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => importExistingFile(file.path)}
                    disabled={importingFile === file.path}
                    className="ml-3 px-4 py-1.5 bg-[#F27501] text-white rounded-lg text-xs font-medium hover:bg-[#d96800] disabled:opacity-50 flex-shrink-0"
                  >
                    {importingFile === file.path ? "Importeren..." : "Importeer"}
                  </button>
                </div>
              ))}

              {availableFiles.length === 0 && (
                <p className="text-center text-neutral-400 py-8">Geen CSV bestanden gevonden</p>
              )}

              <button
                onClick={loadAvailableFiles}
                className="mt-3 text-xs text-neutral-500 hover:text-neutral-700"
              >
                Opnieuw zoeken
              </button>
            </div>
          )}
        </div>
      )}

      {/* CSV Upload */}
      {activeMode === "csv" && (
        <div className="bg-white p-6 rounded-xl border border-neutral-200">
          <h3 className="font-semibold text-neutral-800 mb-4">CSV Upload</h3>

          {csvData.length === 0 ? (
            <div>
              <p className="text-sm text-neutral-500 mb-4">
                Upload een CSV bestand met leads. Koppel daarna de kolommen aan de juiste velden.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-3 border-2 border-dashed border-neutral-300 rounded-xl text-sm text-neutral-600 hover:border-[#F27501] hover:text-[#F27501] transition-colors w-full"
              >
                Klik om CSV te uploaden
              </button>
            </div>
          ) : (
            <div>
              {/* Column mapping */}
              <h4 className="text-sm font-medium text-neutral-700 mb-3">Kolom Mapping</h4>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {csvHeaders.map((header) => (
                  <div key={header} className="flex items-center gap-2">
                    <span className="text-sm text-neutral-600 w-40 truncate">{header}</span>
                    <span className="text-neutral-400">→</span>
                    <select
                      value={columnMapping[header] || ""}
                      onChange={(e) => setColumnMapping((prev) => ({ ...prev, [header]: e.target.value }))}
                      className="flex-1 px-2 py-1.5 border border-neutral-300 rounded-lg text-sm"
                    >
                      {DB_COLUMNS.map((col) => (
                        <option key={col.value} value={col.value}>{col.label}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              {/* Preview */}
              <div className="bg-neutral-50 p-3 rounded-lg mb-4">
                <p className="text-xs text-neutral-500 mb-2">Preview (eerste 3 rijen):</p>
                <div className="overflow-x-auto">
                  <table className="text-xs w-full">
                    <thead>
                      <tr>
                        {csvHeaders.map((h) => (
                          <th key={h} className="text-left p-1 text-neutral-600">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {csvData.slice(0, 3).map((row, i) => (
                        <tr key={i}>
                          {csvHeaders.map((h) => (
                            <td key={h} className="p-1 text-neutral-500 truncate max-w-[150px]">{row[h]}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleCsvImport}
                  disabled={isImporting}
                  className="px-6 py-2 bg-[#F27501] text-white rounded-lg text-sm font-medium hover:bg-[#d96800] disabled:opacity-50"
                >
                  {isImporting ? "Importeren..." : `Importeer ${csvData.length} leads`}
                </button>
                <button
                  onClick={() => { setCsvData([]); setCsvHeaders([]); }}
                  className="px-4 py-2 bg-neutral-200 text-neutral-600 rounded-lg text-sm hover:bg-neutral-300"
                >
                  Annuleren
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Handmatig toevoegen */}
      {activeMode === "handmatig" && (
        <div className="bg-white p-6 rounded-xl border border-neutral-200">
          <h3 className="font-semibold text-neutral-800 mb-4">Lead Handmatig Toevoegen</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-neutral-600 block mb-1">Bedrijfsnaam *</label>
              <input
                type="text"
                value={manualData.bedrijfsnaam}
                onChange={(e) => setManualData((p) => ({ ...p, bedrijfsnaam: e.target.value }))}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:border-[#F27501]"
              />
            </div>
            <div>
              <label className="text-sm text-neutral-600 block mb-1">Contactpersoon</label>
              <input
                type="text"
                value={manualData.contactpersoon}
                onChange={(e) => setManualData((p) => ({ ...p, contactpersoon: e.target.value }))}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:border-[#F27501]"
              />
            </div>
            <div>
              <label className="text-sm text-neutral-600 block mb-1">Email</label>
              <input
                type="email"
                value={manualData.email}
                onChange={(e) => setManualData((p) => ({ ...p, email: e.target.value }))}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:border-[#F27501]"
              />
            </div>
            <div>
              <label className="text-sm text-neutral-600 block mb-1">Telefoon</label>
              <input
                type="tel"
                value={manualData.telefoon}
                onChange={(e) => setManualData((p) => ({ ...p, telefoon: e.target.value }))}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:border-[#F27501]"
              />
            </div>
            <div>
              <label className="text-sm text-neutral-600 block mb-1">Website</label>
              <input
                type="url"
                value={manualData.website}
                onChange={(e) => setManualData((p) => ({ ...p, website: e.target.value }))}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:border-[#F27501]"
              />
            </div>
            <div>
              <label className="text-sm text-neutral-600 block mb-1">Stad</label>
              <input
                type="text"
                value={manualData.stad}
                onChange={(e) => setManualData((p) => ({ ...p, stad: e.target.value }))}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:border-[#F27501]"
              />
            </div>
            <div className="col-span-2">
              <label className="text-sm text-neutral-600 block mb-1">Adres</label>
              <input
                type="text"
                value={manualData.adres}
                onChange={(e) => setManualData((p) => ({ ...p, adres: e.target.value }))}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:border-[#F27501]"
              />
            </div>
            <div>
              <label className="text-sm text-neutral-600 block mb-1">Branche</label>
              <select
                value={manualData.branche}
                onChange={(e) => setManualData((p) => ({ ...p, branche: e.target.value }))}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none"
              >
                <option value="restaurant">Restaurant</option>
                <option value="cafe">Cafe</option>
                <option value="hotel">Hotel</option>
                <option value="catering">Catering</option>
                <option value="events">Events</option>
                <option value="bar">Bar</option>
                <option value="horeca">Horeca (overig)</option>
              </select>
            </div>
          </div>
          <button
            onClick={handleManualAdd}
            className="mt-4 px-6 py-2 bg-[#F27501] text-white rounded-lg text-sm font-medium hover:bg-[#d96800]"
          >
            Lead Toevoegen
          </button>
        </div>
      )}
    </div>
  );
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}
