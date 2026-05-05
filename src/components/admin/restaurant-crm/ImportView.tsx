"use client";

import { useEffect, useState } from "react";
import { Upload, Download, FileText, AlertCircle, CheckCircle, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/Toast";
import type { CRMLeadList } from "./types";

type ImportType = "leads" | "instantly";

export default function ImportView() {
  const [importType, setImportType] = useState<ImportType>("leads");
  const [csvContent, setCsvContent] = useState("");
  const [preview, setPreview] = useState<Record<string, unknown> | null>(null);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [leadLists, setLeadLists] = useState<CRMLeadList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string>("");
  const [newListName, setNewListName] = useState("");
  const [newListSource, setNewListSource] = useState("restaurant_import");
  const [showNewList, setShowNewList] = useState(false);
  const [duplicateScope, setDuplicateScope] = useState<"global" | "list">("global");
  const toast = useToast();

  useEffect(() => { fetchLeadLists(); }, []);

  async function fetchLeadLists() {
    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;
    const res = await fetch("/api/admin/crm/lead-lists", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setLeadLists(await res.json());
  }

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

  async function handleCreateList(): Promise<string | null> {
    if (!newListName.trim()) return null;
    const token = await getToken();
    const res = await fetch("/api/admin/crm/lead-lists", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ name: newListName, source: newListSource }),
    });
    if (!res.ok) { toast.error("Lijst aanmaken mislukt"); return null; }
    const data = await res.json();
    await fetchLeadLists();
    setSelectedListId(data.id);
    setShowNewList(false);
    setNewListName("");
    return data.id;
  }

  async function handlePreview() {
    if (!csvContent) return;
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/admin/crm/import/", {
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

    // If creating a new list, do that first
    let listId = selectedListId;
    if (showNewList && newListName.trim()) {
      const created = await handleCreateList();
      if (!created) return;
      listId = created;
    }

    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/admin/crm/import/", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          csv_content: csvContent,
          preview_only: false,
          import_type: importType,
          lead_list_id: listId || undefined,
          duplicate_scope: duplicateScope,
        }),
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

        {/* Lead list selection (only for standard leads import) */}
        {importType === "leads" && (
          <div className="mb-4 space-y-3">
            <label className="text-sm font-medium text-neutral-700">Leadlijst</label>
            {!showNewList ? (
              <div className="flex gap-2">
                <select
                  value={selectedListId}
                  onChange={e => setSelectedListId(e.target.value)}
                  className="flex-1 text-sm border border-neutral-200 rounded-lg px-3 py-2"
                >
                  <option value="">Geen lijst (losse import)</option>
                  {leadLists.map(list => (
                    <option key={list.id} value={list.id}>{list.name} ({list.lead_count} leads)</option>
                  ))}
                </select>
                <button
                  onClick={() => setShowNewList(true)}
                  className="px-3 py-2 text-sm text-orange-600 border border-orange-200 rounded-lg hover:bg-orange-50"
                >
                  Nieuwe lijst
                </button>
              </div>
            ) : (
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg space-y-2">
                <input
                  type="text"
                  placeholder="Naam van nieuwe lijst..."
                  value={newListName}
                  onChange={e => setNewListName(e.target.value)}
                  className="w-full text-sm border border-neutral-200 rounded-lg px-3 py-2"
                />
                <div className="flex gap-2">
                  <select
                    value={newListSource}
                    onChange={e => setNewListSource(e.target.value)}
                    className="flex-1 text-sm border border-neutral-200 rounded-lg px-3 py-2"
                  >
                    <option value="restaurant_import">Restaurant import</option>
                    <option value="google_maps">Google Maps</option>
                    <option value="manual">Handmatig</option>
                    <option value="other">Overig</option>
                  </select>
                  <button
                    onClick={() => setShowNewList(false)}
                    className="px-3 py-2 text-sm text-neutral-500 hover:text-neutral-700"
                  >
                    Annuleer
                  </button>
                </div>
              </div>
            )}

            {/* Duplicate scope */}
            <div className="flex items-center gap-4">
              <span className="text-sm text-neutral-600">Duplicate check:</span>
              <label className="flex items-center gap-1.5 text-sm">
                <input
                  type="radio"
                  name="dup_scope"
                  checked={duplicateScope === "global"}
                  onChange={() => setDuplicateScope("global")}
                  className="rounded"
                />
                Globaal
              </label>
              <label className="flex items-center gap-1.5 text-sm">
                <input
                  type="radio"
                  name="dup_scope"
                  checked={duplicateScope === "list"}
                  onChange={() => setDuplicateScope("list")}
                  className="rounded"
                />
                Binnen lijst
              </label>
            </div>
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

      {/* Instantly Sync Section */}
      <InstantlySection />

      {/* Bronnen Synchroniseren */}
      <SyncSourcesSection />

      {/* Meta Instagram Section */}
      <MetaSection />

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

function InstantlySection() {
  const [campaigns, setCampaigns] = useState<Array<{ id: string; name: string; status: number }>>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<Record<string, unknown> | null>(null);
  const toast = useToast();

  async function getToken() {
    const session = await supabase.auth.getSession();
    return session.data.session?.access_token || "";
  }

  async function fetchCampaigns() {
    setLoadingCampaigns(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/admin/crm/instantly/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Fout");
      }
      const data = await res.json();
      setCampaigns(data.campaigns || []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Campagnes laden mislukt");
    } finally {
      setLoadingCampaigns(false);
    }
  }

  async function syncCampaign(campaignId: string) {
    setSyncing(true);
    setSyncResult(null);
    try {
      const token = await getToken();
      const res = await fetch("/api/admin/crm/instantly/", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ campaign_id: campaignId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Sync mislukt");
      }
      const data = await res.json();
      setSyncResult(data);
      toast.success(`Sync voltooid: ${data.synced} leads bijgewerkt`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sync mislukt");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-cyan-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-neutral-900">Instantly.ai Sync</h3>
          <p className="text-sm text-neutral-500">Sync campagne statuses automatisch naar CRM</p>
        </div>
        <button
          onClick={fetchCampaigns}
          disabled={loadingCampaigns}
          className="px-4 py-2 bg-cyan-600 text-white rounded-lg text-sm font-medium hover:bg-cyan-700 disabled:opacity-50"
        >
          {loadingCampaigns ? "Laden..." : campaigns.length > 0 ? "Vernieuwen" : "Campagnes laden"}
        </button>
      </div>

      {campaigns.length > 0 && (
        <div className="space-y-2">
          {campaigns.map(c => (
            <div key={c.id} className="flex items-center justify-between p-3 bg-cyan-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-neutral-900">{c.name}</p>
                <p className="text-xs text-neutral-500">ID: {c.id}</p>
              </div>
              <button
                onClick={() => syncCampaign(c.id)}
                disabled={syncing}
                className="px-3 py-1.5 bg-cyan-600 text-white rounded-lg text-xs font-medium hover:bg-cyan-700 disabled:opacity-50"
              >
                {syncing ? "Syncing..." : "Sync statuses"}
              </button>
            </div>
          ))}
        </div>
      )}

      {syncResult && (
        <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
          <p className="font-medium">Sync resultaat:</p>
          <ul className="mt-1 space-y-0.5">
            <li>Gesynct: {syncResult.synced as number}</li>
            <li>In campagne: {syncResult.total_in_campaign as number}</li>
            <li>Matched in CRM: {syncResult.matched_in_crm as number}</li>
            {(syncResult.new_replies as number) > 0 && <li className="text-green-700 font-medium">Nieuwe replies: {syncResult.new_replies as number}</li>}
            {(syncResult.new_opens as number) > 0 && <li>Nieuwe opens: {syncResult.new_opens as number}</li>}
            {(syncResult.new_bounces as number) > 0 && <li className="text-red-600">Bounces: {syncResult.new_bounces as number}</li>}
          </ul>
        </div>
      )}
    </div>
  );
}

function MetaSection() {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const toast = useToast();

  async function getToken() {
    const session = await supabase.auth.getSession();
    return session.data.session?.access_token || "";
  }

  async function testConnection() {
    setTesting(true);
    setResult(null);
    try {
      const token = await getToken();
      const res = await fetch("/api/admin/crm/meta/test/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setResult(data);
      if (data.ok) {
        toast.success("Meta verbinding werkt");
      } else {
        toast.error(data.error || "Test mislukt");
      }
    } catch {
      toast.error("Verbinding mislukt");
    } finally {
      setTesting(false);
    }
  }

  const config = result?.config as Record<string, boolean> | undefined;

  return (
    <div className="bg-white rounded-xl border border-purple-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-neutral-900">Meta Instagram Inbox Sync</h3>
          <p className="text-sm text-neutral-500">Configuratie voor toekomstige Instagram inbox koppeling</p>
        </div>
        <button
          onClick={testConnection}
          disabled={testing}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
        >
          {testing ? "Testen..." : "Test Meta verbinding"}
        </button>
      </div>

      {/* Config status */}
      {config ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
          <ConfigItem label="App ID" present={config.hasAppId} />
          <ConfigItem label="App Secret" present={config.hasAppSecret} />
          <ConfigItem label="Page ID" present={config.hasPageId} />
          <ConfigItem label="Page Access Token" present={config.hasPageAccessToken} />
          <ConfigItem label="IG Account ID" present={config.hasIgAccountId} />
          <ConfigItem label="Webhook Token" present={config.hasWebhookVerifyToken} />
        </div>
      ) : null}

      {/* Test result */}
      {result?.ok ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2 text-green-700 mb-1">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Verbinding succesvol</span>
          </div>
          <div className="text-sm text-green-800 space-y-0.5">
            {(result.page as Record<string, unknown>)?.name ? (
              <p>Page: {String((result.page as Record<string, unknown>).name)}</p>
            ) : null}
            {(result.page as Record<string, unknown>)?.instagram_business_account ? (
              <p>IG Account: {((result.page as Record<string, unknown>).instagram_business_account as Record<string, string>)?.id}</p>
            ) : null}
          </div>
        </div>
      ) : null}

      {result && !result.ok ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-red-700">{String(result.error)}</p>
        </div>
      ) : null}

      {/* Future features */}
      <div className="flex gap-2 mt-3">
        <button disabled className="px-3 py-1.5 text-xs bg-neutral-100 text-neutral-400 rounded-lg cursor-not-allowed">
          Sync Instagram Inbox (coming soon)
        </button>
        <button disabled className="px-3 py-1.5 text-xs bg-neutral-100 text-neutral-400 rounded-lg cursor-not-allowed">
          Configureer Webhook (coming soon)
        </button>
      </div>
    </div>
  );
}

function SyncSourcesSection() {
  const [syncing, setSyncing] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<Record<string, unknown> | null>(null);
  const toast = useToast();

  async function getToken() {
    const session = await supabase.auth.getSession();
    return session.data.session?.access_token || "";
  }

  async function handleSync(source: "personeel_aanvragen" | "calculator") {
    setSyncing(source);
    setSyncResult(null);
    try {
      const token = await getToken();
      const res = await fetch("/api/admin/crm/lead-lists/sync", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ source }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSyncResult(data);
      toast.success(`Sync voltooid: ${data.created} nieuw, ${data.updated} bijgewerkt`);
    } catch {
      toast.error("Sync mislukt");
    } finally {
      setSyncing(null);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-purple-200 p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-neutral-900">Bronnen synchroniseren</h3>
        <p className="text-sm text-neutral-500">Sync leads vanuit andere bronnen naar het CRM</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => handleSync("personeel_aanvragen")}
          disabled={syncing !== null}
          className="flex items-center gap-2 px-4 py-2.5 bg-purple-50 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-100 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${syncing === "personeel_aanvragen" ? "animate-spin" : ""}`} />
          Sync Personeel aanvragen naar CRM
        </button>
        <button
          onClick={() => handleSync("calculator")}
          disabled={syncing !== null}
          className="flex items-center gap-2 px-4 py-2.5 bg-green-50 text-green-700 rounded-lg text-sm font-medium hover:bg-green-100 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${syncing === "calculator" ? "animate-spin" : ""}`} />
          Sync Calculator leads naar CRM
        </button>
      </div>

      {syncResult && (
        <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
          <p className="font-medium">Sync resultaat:</p>
          <ul className="mt-1 space-y-0.5">
            <li>Nieuw aangemaakt: {syncResult.created as number}</li>
            <li>Bijgewerkt: {syncResult.updated as number}</li>
            <li>Overgeslagen: {syncResult.skipped as number}</li>
            <li>Totaal verwerkt: {syncResult.total as number}</li>
          </ul>
        </div>
      )}
    </div>
  );
}

function ConfigItem({ label, present }: { label: string; present: boolean }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${present ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
      <span className={`w-2 h-2 rounded-full ${present ? "bg-green-500" : "bg-red-400"}`} />
      {label}
    </div>
  );
}
