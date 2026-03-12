"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ConfirmDialog";

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  subcategory: string | null;
  source: "generated" | "visitor";
  status: "published" | "draft" | "pending";
  slug: string;
  priority: number;
  view_count: number;
  visitor_email: string | null;
  visitor_name: string | null;
  created_at: string;
  updated_at: string;
}

const CATEGORIES = [
  "Kosten & Tarieven",
  "Hoe het werkt",
  "Functies & Personeel",
  "Contracten & Juridisch",
  "Locaties & Beschikbaarheid",
  "Voor horecamedewerkers",
  "Evenementen & Catering",
  "Kwaliteit & Screening",
];

export default function FAQTab() {
  const [items, setItems] = useState<FAQItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterSource, setFilterSource] = useState<string>("all");
  const [editingItem, setEditingItem] = useState<FAQItem | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const toast = useToast();
  const confirm = useConfirm();

  const fetchItems = async () => {
    setIsLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const params = new URLSearchParams();
    if (filterStatus !== "all") params.set("status", filterStatus);
    if (filterCategory !== "all") params.set("category", filterCategory);
    if (filterSource !== "all") params.set("source", filterSource);

    const res = await fetch(`/api/admin/faq?${params}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const { data } = await res.json();
    if (data) setItems(data);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchItems();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus, filterCategory, filterSource]);

  const apiCall = async (body: Record<string, unknown>) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return false;
    const res = await fetch("/api/admin/faq", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(body),
    });
    return res.ok;
  };

  const handleSave = async (item: Partial<FAQItem> & { question: string; answer: string; category: string }, id?: string) => {
    const success = await apiCall({
      action: id ? "update" : "create",
      id,
      data: item,
    });

    if (success) {
      toast.success(id ? "FAQ bijgewerkt" : "FAQ aangemaakt");
      setEditingItem(null);
      setIsCreating(false);
      fetchItems();
    } else {
      toast.error("Opslaan mislukt");
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: "FAQ verwijderen?",
      message: "Deze actie kan niet ongedaan worden gemaakt.",
      confirmText: "Verwijderen",
      variant: "danger",
    });
    if (!ok) return;

    const success = await apiCall({ action: "delete", id });
    if (success) {
      toast.success("FAQ verwijderd");
      fetchItems();
    }
  };

  const handlePublish = async (id: string) => {
    const success = await apiCall({
      action: "update",
      id,
      data: { status: "published" },
    });
    if (success) {
      toast.success("FAQ gepubliceerd");
      fetchItems();
    }
  };

  const pendingCount = items.filter((i) => i.status === "pending").length;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900">FAQ Beheer</h2>
          <p className="text-sm text-neutral-500 mt-1">
            {items.length} items totaal
            {pendingCount > 0 && (
              <span className="ml-2 bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-xs font-medium">
                {pendingCount} pending
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => {
            setIsCreating(true);
            setEditingItem(null);
          }}
          className="bg-[#F27501] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#d96800] transition-colors"
        >
          + Nieuwe FAQ
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-neutral-200 rounded-lg text-sm bg-white"
        >
          <option value="all">Alle statussen</option>
          <option value="published">Gepubliceerd</option>
          <option value="draft">Concept</option>
          <option value="pending">Pending (bezoeker)</option>
        </select>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-3 py-2 border border-neutral-200 rounded-lg text-sm bg-white"
        >
          <option value="all">Alle categorieën</option>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <select
          value={filterSource}
          onChange={(e) => setFilterSource(e.target.value)}
          className="px-3 py-2 border border-neutral-200 rounded-lg text-sm bg-white"
        >
          <option value="all">Alle bronnen</option>
          <option value="generated">Voorgegenereerd</option>
          <option value="visitor">Ingediend door bezoeker</option>
        </select>
      </div>

      {/* Create / Edit form */}
      {(isCreating || editingItem) && (
        <FAQForm
          item={editingItem}
          onSave={(data) => handleSave(data, editingItem?.id)}
          onCancel={() => {
            setIsCreating(false);
            setEditingItem(null);
          }}
        />
      )}

      {/* Table */}
      {isLoading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-neutral-100 rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-neutral-500">
          Geen FAQ items gevonden met deze filters.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50">
                <th className="text-left px-4 py-3 font-medium text-neutral-500">Vraag</th>
                <th className="text-left px-4 py-3 font-medium text-neutral-500 hidden md:table-cell">Categorie</th>
                <th className="text-left px-4 py-3 font-medium text-neutral-500 hidden lg:table-cell">Status</th>
                <th className="text-left px-4 py-3 font-medium text-neutral-500 hidden lg:table-cell">Views</th>
                <th className="text-right px-4 py-3 font-medium text-neutral-500">Acties</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-neutral-50 hover:bg-neutral-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-neutral-900 line-clamp-1">
                      {item.question}
                    </div>
                    {item.source === "visitor" && item.visitor_name && (
                      <span className="text-xs text-neutral-400">
                        Door: {item.visitor_name}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-xs bg-neutral-100 text-neutral-600 px-2 py-1 rounded-full">
                      {item.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium ${
                        item.status === "published"
                          ? "bg-green-100 text-green-700"
                          : item.status === "pending"
                          ? "bg-orange-100 text-orange-700"
                          : "bg-neutral-100 text-neutral-600"
                      }`}
                    >
                      {item.status === "published" ? "Gepubliceerd" : item.status === "pending" ? "Pending" : "Concept"}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-neutral-500">
                    {item.view_count}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-1 justify-end">
                      {item.status !== "published" && (
                        <button
                          onClick={() => handlePublish(item.id)}
                          className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                        >
                          Publiceer
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setEditingItem(item);
                          setIsCreating(false);
                        }}
                        className="px-2 py-1 text-xs bg-neutral-100 text-neutral-700 rounded hover:bg-neutral-200"
                      >
                        Bewerk
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="px-2 py-1 text-xs bg-red-50 text-red-600 rounded hover:bg-red-100"
                      >
                        Verwijder
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ==========================================================================
   FAQ Form (create / edit)
   ========================================================================== */

function FAQForm({
  item,
  onSave,
  onCancel,
}: {
  item: FAQItem | null;
  onSave: (data: { question: string; answer: string; category: string; status: string; priority: number }) => void;
  onCancel: () => void;
}) {
  const [question, setQuestion] = useState(item?.question || "");
  const [answer, setAnswer] = useState(item?.answer || "");
  const [category, setCategory] = useState(item?.category || CATEGORIES[0]);
  const [status, setStatus] = useState(item?.status || "draft");
  const [priority, setPriority] = useState(item?.priority || 0);

  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-6 mb-6">
      <h3 className="text-lg font-bold text-neutral-900 mb-4">
        {item ? "FAQ bewerken" : "Nieuwe FAQ"}
      </h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Vraag</label>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="w-full px-4 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316]/30 focus:border-[#F97316]"
            placeholder="De vraag..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Antwoord</label>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            rows={6}
            className="w-full px-4 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316]/30 focus:border-[#F97316]"
            placeholder="Het antwoord... (gebruik dubbele enters voor alinea's)"
          />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Categorie</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm bg-white"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
              <option value="Ingediend">Ingediend</option>
              <option value="Overig">Overig</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm bg-white"
            >
              <option value="published">Gepubliceerd</option>
              <option value="draft">Concept</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Prioriteit</label>
            <input
              type="number"
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value))}
              className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm"
              min={0}
            />
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button
            onClick={() => onSave({ question, answer, category, status, priority })}
            disabled={!question.trim() || !answer.trim()}
            className="bg-[#F27501] text-white px-6 py-2 rounded-xl text-sm font-semibold hover:bg-[#d96800] transition-colors disabled:opacity-50"
          >
            {item ? "Opslaan" : "Aanmaken"}
          </button>
          <button
            onClick={onCancel}
            className="px-6 py-2 rounded-xl text-sm font-medium border border-neutral-200 text-neutral-700 hover:bg-neutral-50"
          >
            Annuleren
          </button>
        </div>
      </div>
    </div>
  );
}
