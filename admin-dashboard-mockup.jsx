import { useState, useEffect } from "react";

const mockData = {
  vandaag: {
    dienstenActief: 12,
    medewerkerIngepland: 18,
    noShows: 1,
    openDiensten: 4,
  },
  acties: [
    { id: 1, type: "aanvraag", text: "3 nieuwe personeel aanvragen", urgent: true, link: "/admin/aanvragen" },
    { id: 2, type: "document", text: "2 medewerkers missen documenten", urgent: false, link: "/admin/kandidaten" },
    { id: 3, type: "factuur", text: "1 factuur is overdue (>30 dagen)", urgent: true, link: "/admin/facturen" },
    { id: 4, type: "onboarding", text: "3 kandidaten wachten op goedkeuring docs", urgent: false, link: "/admin/kandidaten" },
  ],
  stats: [
    { label: "Personeel aanvragen", value: 3, nieuw: 3, icon: "briefcase", show: true },
    { label: "Inschrijvingen", value: 5, nieuw: 3, icon: "users", show: true },
    { label: "Contact berichten", value: 0, nieuw: 0, icon: "mail", show: false },
    { label: "Calculator leads", value: 0, nieuw: 0, icon: "calculator", show: false },
  ],
  beschikbaarheid: {
    beschikbaar: 24,
    ingepland: 18,
    ziek: 2,
    verlof: 3,
    totaal: 47,
  },
  omzet: {
    dezeMaand: 28450,
    vorigeMaand: 24200,
    openstaand: 8200,
    weekData: [
      { week: "W9", omzet: 5200 },
      { week: "W10", omzet: 7100 },
      { week: "W11", omzet: 8800 },
      { week: "W12", omzet: 7350 },
    ],
  },
  funnel: [
    { label: "Nieuw", count: 3, pct: 60 },
    { label: "Docs opvragen", count: 0, pct: 0 },
    { label: "Goedgekeurd", count: 0, pct: 0 },
    { label: "Inzetbaar", count: 2, pct: 40 },
  ],
  activiteit: [
    { naam: "Rachid Ouaalit", type: "Kandidaat", tijd: "2 dagen", color: "#f59e0b" },
    { naam: "sadaqs", type: "Aanvraag", tijd: "3 dagen", color: "#8b5cf6" },
    { naam: "rachid", type: "Aanvraag", tijd: "3 dagen", color: "#8b5cf6" },
    { naam: "ADDAD", type: "Aanvraag", tijd: "4 dagen", color: "#8b5cf6" },
  ],
  operations: [
    { label: "Verlopen uploadlinks", value: 0 },
    { label: "Kandidaten wachten te lang", value: 0 },
    { label: "In review documenten", value: 0 },
    { label: "Inzetbaar zonder profiel", value: 0 },
  ],
};

/* ─── icons (inline SVG) ─── */
const Icons = {
  sun: (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="5" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  ),
  zap: (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  users: (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  briefcase: (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  ),
  trendUp: (
    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
    </svg>
  ),
  chevron: (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  ),
  search: (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  arrowRight: (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
    </svg>
  ),
  clock: (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  euro: (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M17 5.5C15.5 4 13.5 3 11.5 3 7.36 3 4 6.36 4 10.5S7.36 18 11.5 18c2 0 4-.9 5.5-2.5" /><line x1="2" y1="9" x2="13" y2="9" /><line x1="2" y1="12" x2="13" y2="12" />
    </svg>
  ),
  alert: (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
};

/* ─── Cmd+K overlay ─── */
function CommandPalette({ open, onClose }) {
  const [query, setQuery] = useState("");
  const items = [
    { label: "Rachid Ouaalit", type: "Medewerker", shortcut: "→" },
    { label: "sadaqs", type: "Aanvraag", shortcut: "→" },
    { label: "Facturen overzicht", type: "Pagina", shortcut: "→" },
    { label: "Planning", type: "Pagina", shortcut: "→" },
    { label: "Nieuwe medewerker toevoegen", type: "Actie", shortcut: "↵" },
  ];
  const filtered = items.filter((i) => i.label.toLowerCase().includes(query.toLowerCase()));

  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 999,
        display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 120,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff", borderRadius: 16, width: 560, boxShadow: "0 25px 60px rgba(0,0,0,0.3)",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", padding: "16px 20px", gap: 12, borderBottom: "1px solid #f0f0f0" }}>
          <span style={{ color: "#9ca3af" }}>{Icons.search}</span>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Zoek medewerker, klant, aanvraag, factuur..."
            style={{
              flex: 1, border: "none", outline: "none", fontSize: 16, color: "#111",
              background: "transparent",
            }}
          />
          <kbd style={{
            background: "#f3f4f6", padding: "2px 8px", borderRadius: 6, fontSize: 12,
            color: "#6b7280", border: "1px solid #e5e7eb",
          }}>ESC</kbd>
        </div>
        <div style={{ maxHeight: 320, overflowY: "auto" }}>
          {filtered.map((item, i) => (
            <div
              key={i}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "12px 20px", cursor: "pointer",
                background: i === 0 ? "#f9fafb" : "transparent",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#f9fafb")}
              onMouseLeave={(e) => (e.currentTarget.style.background = i === 0 ? "#f9fafb" : "transparent")}
            >
              <div>
                <div style={{ fontWeight: 500, color: "#111", fontSize: 14 }}>{item.label}</div>
                <div style={{ fontSize: 12, color: "#9ca3af" }}>{item.type}</div>
              </div>
              <span style={{ color: "#d1d5db", fontSize: 14 }}>{item.shortcut}</span>
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ padding: 24, textAlign: "center", color: "#9ca3af", fontSize: 14 }}>
              Geen resultaten gevonden
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Mini bar chart ─── */
function MiniBarChart({ data, height = 60 }) {
  const max = Math.max(...data.map((d) => d.omzet));
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height }}>
      {data.map((d, i) => (
        <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
          <div
            style={{
              width: "100%", borderRadius: 4,
              background: i === data.length - 1 ? "#7c3aed" : "#e9d5ff",
              height: Math.max(8, (d.omzet / max) * height),
              transition: "height 0.3s ease",
            }}
          />
          <span style={{ fontSize: 10, color: "#9ca3af", marginTop: 4 }}>{d.week}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── Donut chart ─── */
function DonutChart({ segments, size = 100 }) {
  const total = segments.reduce((a, b) => a + b.value, 0);
  let cumulative = 0;
  const r = 36;
  const circumference = 2 * Math.PI * r;

  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      {segments.filter(s => s.value > 0).map((seg, i) => {
        const offset = (cumulative / total) * circumference;
        const length = (seg.value / total) * circumference;
        cumulative += seg.value;
        return (
          <circle
            key={i} cx="50" cy="50" r={r}
            fill="none" stroke={seg.color} strokeWidth="10"
            strokeDasharray={`${length} ${circumference - length}`}
            strokeDashoffset={-offset}
            transform="rotate(-90 50 50)"
            style={{ transition: "all 0.5s ease" }}
          />
        );
      })}
      <text x="50" y="48" textAnchor="middle" style={{ fontSize: 18, fontWeight: 700, fill: "#111" }}>
        {total}
      </text>
      <text x="50" y="62" textAnchor="middle" style={{ fontSize: 9, fill: "#9ca3af" }}>
        totaal
      </text>
    </svg>
  );
}

/* ─── Card wrapper ─── */
function Card({ children, style, onClick, hoverable }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "#fff", borderRadius: 16, padding: 24,
        border: "1px solid #f0f0f0",
        boxShadow: hovered && hoverable ? "0 8px 24px rgba(0,0,0,0.08)" : "0 1px 3px rgba(0,0,0,0.04)",
        transition: "all 0.2s ease",
        cursor: onClick ? "pointer" : "default",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* ─── Collapsible section ─── */
function Collapsible({ title, icon, defaultOpen = true, badge, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card style={{ padding: 0, overflow: "hidden" }}>
      <div
        onClick={() => setOpen(!open)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 24px", cursor: "pointer", userSelect: "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {icon}
          <span style={{ fontWeight: 600, fontSize: 15, color: "#111" }}>{title}</span>
          {badge && (
            <span style={{
              background: "#dcfce7", color: "#16a34a", fontSize: 11, fontWeight: 600,
              padding: "2px 8px", borderRadius: 99,
            }}>{badge}</span>
          )}
        </div>
        <span style={{
          transform: open ? "rotate(180deg)" : "rotate(0deg)",
          transition: "transform 0.2s ease", color: "#9ca3af",
        }}>
          {Icons.chevron}
        </span>
      </div>
      <div style={{
        maxHeight: open ? 500 : 0, overflow: "hidden",
        transition: "max-height 0.3s ease",
      }}>
        <div style={{ padding: "0 24px 20px" }}>
          {children}
        </div>
      </div>
    </Card>
  );
}

/* ─── Main Dashboard ─── */
export default function AdminDashboardMockup() {
  const [cmdOpen, setCmdOpen] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const d = mockData;

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCmdOpen(true);
      }
      if (e.key === "Escape") setCmdOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const omzetChange = ((d.omzet.dezeMaand - d.omzet.vorigeMaand) / d.omzet.vorigeMaand * 100).toFixed(0);
  const visibleStats = d.stats.filter((s) => s.show || showHidden);

  return (
    <div style={{
      minHeight: "100vh", background: "#fafafa",
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />

      {/* Header */}
      <div style={{
        background: "#fff", borderBottom: "1px solid #f0f0f0",
        padding: "20px 32px", display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#111", margin: 0 }}>
            Dashboard Overzicht
          </h1>
          <p style={{ color: "#9ca3af", fontSize: 13, margin: "4px 0 0" }}>
            Dinsdag 17 maart 2026
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            onClick={() => setCmdOpen(true)}
            style={{
              display: "flex", alignItems: "center", gap: 8, padding: "8px 16px",
              background: "#f9fafb", borderRadius: 10, cursor: "pointer",
              border: "1px solid #e5e7eb", color: "#9ca3af", fontSize: 14,
            }}
          >
            {Icons.search}
            <span>Zoek...</span>
            <kbd style={{
              background: "#fff", padding: "1px 6px", borderRadius: 4, fontSize: 11,
              border: "1px solid #e5e7eb", marginLeft: 24,
            }}>⌘K</kbd>
          </div>
        </div>
      </div>

      <div style={{ padding: "24px 32px", maxWidth: 1400, margin: "0 auto" }}>

        {/* ─── ROW 1: Vandaag + Actie Vereist ─── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>

          {/* Vandaag overview */}
          <Card style={{ background: "linear-gradient(135deg, #fefce8 0%, #fff7ed 100%)", border: "1px solid #fde68a" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <span style={{ color: "#f59e0b" }}>{Icons.sun}</span>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "#92400e", margin: 0 }}>Vandaag</h2>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16 }}>
              {[
                { label: "Actieve diensten", value: d.vandaag.dienstenActief, color: "#16a34a" },
                { label: "Ingepland", value: d.vandaag.medewerkerIngepland, color: "#2563eb" },
                { label: "Open diensten", value: d.vandaag.openDiensten, color: "#f59e0b" },
                { label: "No-shows", value: d.vandaag.noShows, color: d.vandaag.noShows > 0 ? "#dc2626" : "#9ca3af" },
              ].map((item, i) => (
                <div key={i} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: item.color }}>{item.value}</div>
                  <div style={{ fontSize: 12, color: "#78716c" }}>{item.label}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* Actie vereist */}
          <Card style={{ background: "#fff", padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "16px 24px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: "#f59e0b" }}>{Icons.zap}</span>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: "#111", margin: 0 }}>Actie Vereist</h2>
              </div>
              <span style={{
                background: "#fef2f2", color: "#dc2626", fontSize: 12, fontWeight: 600,
                padding: "2px 10px", borderRadius: 99,
              }}>
                {d.acties.filter((a) => a.urgent).length} urgent
              </span>
            </div>
            <div>
              {d.acties.map((actie) => (
                <div
                  key={actie.id}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "10px 24px", borderTop: "1px solid #f9fafb",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {actie.urgent && (
                      <span style={{
                        width: 6, height: 6, borderRadius: 99, background: "#dc2626", flexShrink: 0,
                      }} />
                    )}
                    {!actie.urgent && <span style={{ width: 6 }} />}
                    <span style={{ fontSize: 14, color: "#374151" }}>{actie.text}</span>
                  </div>
                  <span style={{ color: "#d1d5db" }}>{Icons.arrowRight}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* ─── ROW 2: Quick actions + stat cards ─── */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
          {["+ Nieuwe Medewerker", "Aanvraag verwerken", "Lead toevoegen", "Planning"].map((btn, i) => (
            <button
              key={i}
              style={{
                padding: "8px 16px", borderRadius: 10, border: "1px solid #e5e7eb",
                background: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 500,
                color: "#374151", display: "flex", alignItems: "center", gap: 6,
              }}
            >
              {btn}
            </button>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: `repeat(${visibleStats.length}, 1fr)${!showHidden && d.stats.some(s => !s.show) ? " auto" : ""}`, gap: 16, marginBottom: 20 }}>
          {visibleStats.map((stat, i) => (
            <Card key={i} hoverable>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ color: "#7c3aed" }}>
                  {stat.icon === "briefcase" ? Icons.briefcase : Icons.users}
                </span>
                {stat.nieuw > 0 && (
                  <span style={{
                    background: "#fef2f2", color: "#dc2626", fontSize: 11, fontWeight: 600,
                    padding: "1px 8px", borderRadius: 99,
                  }}>{stat.nieuw} nieuw</span>
                )}
              </div>
              <div style={{ fontSize: 32, fontWeight: 700, color: "#111" }}>{stat.value}</div>
              <div style={{ fontSize: 13, color: "#9ca3af" }}>{stat.label}</div>
            </Card>
          ))}
          {!showHidden && d.stats.some((s) => !s.show) && (
            <div
              onClick={() => setShowHidden(true)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                borderRadius: 16, border: "1px dashed #e5e7eb", cursor: "pointer",
                color: "#9ca3af", fontSize: 13, padding: "16px 12px",
                minWidth: 120,
              }}
            >
              +{d.stats.filter((s) => !s.show).length} meer
            </div>
          )}
        </div>

        {/* ─── ROW 3: Beschikbaarheid + Omzet ─── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>

          {/* Beschikbaarheid */}
          <Collapsible title="Beschikbaarheid" icon={<span style={{ color: "#2563eb" }}>{Icons.users}</span>}>
            <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
              <DonutChart
                size={110}
                segments={[
                  { value: d.beschikbaarheid.beschikbaar, color: "#22c55e" },
                  { value: d.beschikbaarheid.ingepland, color: "#3b82f6" },
                  { value: d.beschikbaarheid.ziek, color: "#ef4444" },
                  { value: d.beschikbaarheid.verlof, color: "#f59e0b" },
                ]}
              />
              <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[
                  { label: "Beschikbaar", value: d.beschikbaarheid.beschikbaar, color: "#22c55e" },
                  { label: "Ingepland", value: d.beschikbaarheid.ingepland, color: "#3b82f6" },
                  { label: "Ziek", value: d.beschikbaarheid.ziek, color: "#ef4444" },
                  { label: "Verlof", value: d.beschikbaarheid.verlof, color: "#f59e0b" },
                ].map((item, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 99, background: item.color }} />
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: "#111" }}>{item.value}</div>
                      <div style={{ fontSize: 12, color: "#9ca3af" }}>{item.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Collapsible>

          {/* Omzet */}
          <Collapsible
            title="Omzet"
            icon={<span style={{ color: "#7c3aed" }}>{Icons.euro}</span>}
            badge={`+${omzetChange}%`}
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24 }}>
              <div>
                <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 4 }}>Deze maand</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: "#111" }}>
                  €{d.omzet.dezeMaand.toLocaleString("nl-NL")}
                </div>
                <div style={{
                  display: "flex", alignItems: "center", gap: 4, marginTop: 4,
                  color: "#16a34a", fontSize: 13,
                }}>
                  {Icons.trendUp}
                  <span>+{omzetChange}% vs vorige maand</span>
                </div>
                <div style={{ marginTop: 12, fontSize: 13, color: "#f59e0b", fontWeight: 500 }}>
                  €{d.omzet.openstaand.toLocaleString("nl-NL")} openstaand
                </div>
              </div>
              <div style={{ width: 140 }}>
                <MiniBarChart data={d.omzet.weekData} height={70} />
              </div>
            </div>
          </Collapsible>
        </div>

        {/* ─── ROW 4: Funnel + Activiteit + Operations ─── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>

          {/* Onboarding Funnel */}
          <Card>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: "#111" }}>Onboarding Funnel</h3>
              <span style={{ fontSize: 13, color: "#7c3aed", cursor: "pointer", fontWeight: 500 }}>Exporteer</span>
            </div>
            <div style={{ display: "flex", gap: 2, marginBottom: 16 }}>
              {d.funnel.map((step, i) => (
                <div key={i} style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: "#111" }}>{step.count}</div>
                  <div style={{ fontSize: 12, color: "#9ca3af" }}>{step.label}</div>
                  <div style={{ fontSize: 11, color: "#d1d5db" }}>{step.pct}%</div>
                </div>
              ))}
            </div>
            {/* Progress bar */}
            <div style={{ display: "flex", gap: 2, height: 6, borderRadius: 99, overflow: "hidden", background: "#f3f4f6" }}>
              {d.funnel.map((step, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1, borderRadius: i === 0 ? "99px 0 0 99px" : i === d.funnel.length - 1 ? "0 99px 99px 0" : 0,
                    background: step.count > 0
                      ? ["#7c3aed", "#a78bfa", "#c4b5fd", "#22c55e"][i]
                      : "#f3f4f6",
                    transition: "background 0.3s",
                  }}
                />
              ))}
            </div>
            <div style={{
              marginTop: 12, padding: "8px 12px", background: "#f0fdf4",
              borderRadius: 8, fontSize: 13, color: "#16a34a",
            }}>
              Gemiddelde doorlooptijd: 0.1 dagen
            </div>
          </Card>

          {/* Activiteit + Operations stacked */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <Card style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: "#111" }}>Recente activiteit</h3>
                <div style={{ display: "flex", gap: 8 }}>
                  {["Vandaag", "Week", "Maand"].map((f, i) => (
                    <span
                      key={f}
                      style={{
                        fontSize: 12, padding: "2px 10px", borderRadius: 99, cursor: "pointer",
                        background: i === 1 ? "#7c3aed" : "transparent",
                        color: i === 1 ? "#fff" : "#9ca3af", fontWeight: 500,
                      }}
                    >{f}</span>
                  ))}
                </div>
              </div>
              {d.activiteit.map((item, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "8px 0", borderTop: i > 0 ? "1px solid #f9fafb" : "none",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 99, background: `${item.color}20`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <span style={{ fontSize: 14 }}>{item.type === "Kandidaat" ? "👤" : "📋"}</span>
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: "#111" }}>{item.naam}</div>
                      <div style={{ fontSize: 12, color: "#9ca3af" }}>{item.tijd} geleden</div>
                    </div>
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 6,
                    background: `${item.color}15`, color: item.color,
                  }}>{item.type}</span>
                </div>
              ))}
            </Card>

            <Card style={{ padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#111" }}>Operations</span>
                <span style={{ fontSize: 11, color: "#22c55e", fontWeight: 500 }}>Alles OK</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {d.operations.map((op, i) => (
                  <div key={i} style={{ fontSize: 12, color: "#9ca3af", display: "flex", justifyContent: "space-between" }}>
                    <span>{op.label}</span>
                    <span style={{ fontWeight: 600, color: op.value > 0 ? "#dc2626" : "#22c55e" }}>{op.value}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>

      </div>
    </div>
  );
}