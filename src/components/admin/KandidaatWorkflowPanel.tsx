"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { adminCandidateEmailTemplates, type AdminCandidateTemplateKey } from "@/content/adminCandidateEmailTemplates";

type ContactType = "telefoon" | "whatsapp" | "email" | "gesprek" | "notitie";

interface Candidate {
  id: string;
  voornaam: string;
  achternaam: string;
  email: string;
  is_test_candidate?: boolean;
}

interface ContactMoment {
  id: string;
  contact_type: ContactType;
  summary: string;
  created_by: string | null;
  created_at: string;
}

interface CandidateTask {
  id: string;
  title: string;
  note: string | null;
  due_at: string | null;
  completed_at: string | null;
  created_by: string | null;
  created_at: string;
}

interface EmailHistory {
  id: string;
  email_type: string;
  recipient: string;
  subject: string;
  sent_at: string;
  delivered_at: string | null;
  bounced_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  status: string;
}

interface Props {
  candidate: Candidate;
  getAuthHeaders: () => Promise<HeadersInit>;
  onRefresh: () => Promise<void>;
  onUpdateCandidateFields: (data: Record<string, unknown>) => Promise<void>;
  onGeneratePortalLink: () => Promise<void>;
}

function formatDate(date: string | null) {
  if (!date) return "-";
  return new Date(date).toLocaleString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function KandidaatWorkflowPanel({
  candidate,
  getAuthHeaders,
  onRefresh,
  onUpdateCandidateFields,
  onGeneratePortalLink,
}: Props) {
  const [contacts, setContacts] = useState<ContactMoment[]>([]);
  const [tasks, setTasks] = useState<CandidateTask[]>([]);
  const [emails, setEmails] = useState<EmailHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [contactType, setContactType] = useState<ContactType>("telefoon");
  const [contactSummary, setContactSummary] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskNote, setTaskNote] = useState("");
  const [taskDueAt, setTaskDueAt] = useState("");
  const [sendingAction, setSendingAction] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<AdminCandidateTemplateKey>("missing_id");

  const loadWorkflow = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/kandidaat-workflow?inschrijvingId=${candidate.id}`, {
        headers: await getAuthHeaders(),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Workflow laden mislukt");
      }
      setContacts(result.contacts || []);
      setTasks(result.tasks || []);
      setEmails(result.emails || []);
    } catch (error) {
      console.error("Workflow load error:", error);
      alert(error instanceof Error ? error.message : "Workflow laden mislukt");
    } finally {
      setLoading(false);
    }
  }, [candidate.id, getAuthHeaders]);

  useEffect(() => {
    void loadWorkflow();
  }, [loadWorkflow]);

  const outstandingTasks = useMemo(
    () => tasks.filter((task) => !task.completed_at),
    [tasks]
  );

  const addContactMoment = async () => {
    if (!contactSummary.trim()) return;
    const response = await fetch("/api/admin/kandidaat-workflow", {
      method: "POST",
      headers: await getAuthHeaders(),
      body: JSON.stringify({
        type: "contact",
        inschrijvingId: candidate.id,
        contactType,
        summary: contactSummary.trim(),
      }),
    });
    const result = await response.json();
    if (!response.ok) {
      alert(result.error || "Contactmoment opslaan mislukt");
      return;
    }
    setContactSummary("");
    await loadWorkflow();
    await onRefresh();
  };

  const addTask = async () => {
    if (!taskTitle.trim()) return;
    const response = await fetch("/api/admin/kandidaat-workflow", {
      method: "POST",
      headers: await getAuthHeaders(),
      body: JSON.stringify({
        type: "task",
        inschrijvingId: candidate.id,
        title: taskTitle.trim(),
        note: taskNote.trim(),
        dueAt: taskDueAt ? new Date(taskDueAt).toISOString() : null,
      }),
    });
    const result = await response.json();
    if (!response.ok) {
      alert(result.error || "Taak opslaan mislukt");
      return;
    }
    setTaskTitle("");
    setTaskNote("");
    setTaskDueAt("");
    await loadWorkflow();
  };

  const toggleTask = async (task: CandidateTask) => {
    const response = await fetch("/api/admin/kandidaat-workflow", {
      method: "PATCH",
      headers: await getAuthHeaders(),
      body: JSON.stringify({
        taskId: task.id,
        completed: !task.completed_at,
      }),
    });
    const result = await response.json();
    if (!response.ok) {
      alert(result.error || "Taak bijwerken mislukt");
      return;
    }
    await loadWorkflow();
  };

  const runQuickAction = async (action: "bevestiging" | "documenten_opvragen" | "inzetbaar") => {
    setSendingAction(action);
    try {
      const response = await fetch("/api/admin/inschrijvingen/onboarding", {
        method: "POST",
        headers: await getAuthHeaders(),
        body: JSON.stringify({
          kandidaat_id: candidate.id,
          action,
          force_resend: true,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Actie mislukt");
      }
      await onRefresh();
      await loadWorkflow();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Actie mislukt");
    } finally {
      setSendingAction(null);
    }
  };

  const sendTemplate = async () => {
    setSendingAction(selectedTemplate);
    try {
      const response = await fetch("/api/admin/kandidaat-template-email", {
        method: "POST",
        headers: await getAuthHeaders(),
        body: JSON.stringify({
          kandidaatId: candidate.id,
          templateKey: selectedTemplate,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Template mail mislukt");
      }
      await loadWorkflow();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Template mail mislukt");
    } finally {
      setSendingAction(null);
    }
  };

  const markAsTest = async () => {
    await onUpdateCandidateFields({
      is_test_candidate: !candidate.is_test_candidate,
    });
    await onRefresh();
  };

  return (
    <div className="space-y-4">
      <div className="p-4 bg-white border border-neutral-200 rounded-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <p className="text-sm text-neutral-500">Snelle acties</p>
            <p className="text-sm font-medium text-neutral-900">Dagelijkse shortcuts voor onboarding</p>
          </div>
          {candidate.is_test_candidate ? (
            <span className="px-3 py-1 rounded-full bg-fuchsia-100 text-fuchsia-700 text-xs font-semibold">
              Test kandidaat
            </span>
          ) : null}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <button onClick={onGeneratePortalLink} className="px-4 py-3 rounded-xl bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800">
            Kopieer portal link
          </button>
          <button
            onClick={() => void markAsTest()}
            className="px-4 py-3 rounded-xl bg-white border border-neutral-200 text-sm font-medium hover:bg-neutral-50"
          >
            {candidate.is_test_candidate ? "Verwijder testlabel" : "Markeer als test"}
          </button>
          <button
            onClick={() => void runQuickAction("documenten_opvragen")}
            disabled={sendingAction !== null}
            className="px-4 py-3 rounded-xl bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 disabled:opacity-60"
          >
            Documentenverzoek opnieuw
          </button>
          <button
            onClick={() => void runQuickAction("inzetbaar")}
            disabled={sendingAction !== null}
            className="px-4 py-3 rounded-xl bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-60"
          >
            Welkomstmail opnieuw
          </button>
          <button
            onClick={() => void runQuickAction("bevestiging")}
            disabled={sendingAction !== null}
            className="px-4 py-3 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
          >
            Intake mail opnieuw
          </button>
          <button
            onClick={() => void onUpdateCandidateFields({ laatste_contact_op: new Date().toISOString() })}
            className="px-4 py-3 rounded-xl bg-white border border-neutral-200 text-sm font-medium hover:bg-neutral-50"
          >
            Laatste contact = nu
          </button>
        </div>
      </div>

      <div className="p-4 bg-white border border-neutral-200 rounded-xl">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <p className="text-sm text-neutral-500">Herbruikbare mailtemplates</p>
            <p className="text-sm font-medium text-neutral-900">Snelle kandidaatupdates zonder copy-paste</p>
          </div>
        </div>
        <div className="flex flex-col md:flex-row gap-3">
          <select
            value={selectedTemplate}
            onChange={(event) => setSelectedTemplate(event.target.value as AdminCandidateTemplateKey)}
            className="flex-1 px-4 py-3 rounded-xl border border-neutral-200"
          >
            {Object.entries(adminCandidateEmailTemplates).map(([key, template]) => (
              <option key={key} value={key}>
                {template.subject}
              </option>
            ))}
          </select>
          <button
            onClick={() => void sendTemplate()}
            disabled={sendingAction !== null}
            className="px-4 py-3 rounded-xl bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 disabled:opacity-60"
          >
            Template versturen
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="p-4 bg-white border border-neutral-200 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm text-neutral-500">Contactlog</p>
              <p className="text-sm font-medium text-neutral-900">{contacts.length} contactmomenten</p>
            </div>
          </div>
          <div className="space-y-3 mb-4">
            <select value={contactType} onChange={(e) => setContactType(e.target.value as ContactType)} className="w-full px-4 py-3 rounded-xl border border-neutral-200">
              <option value="telefoon">Telefoon</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="email">E-mail</option>
              <option value="gesprek">Gesprek</option>
              <option value="notitie">Notitie</option>
            </select>
            <textarea
              value={contactSummary}
              onChange={(e) => setContactSummary(e.target.value)}
              rows={3}
              placeholder="Kort samenvatten wat er is besproken of wat de status is..."
              className="w-full px-4 py-3 rounded-xl border border-neutral-200 resize-y"
            />
            <button onClick={() => void addContactMoment()} className="px-4 py-3 rounded-xl bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800">
              Contactmoment toevoegen
            </button>
          </div>
          <div className="space-y-3 max-h-72 overflow-auto">
            {loading ? <p className="text-sm text-neutral-500">Laden...</p> : null}
            {!loading && contacts.length === 0 ? <p className="text-sm text-neutral-500">Nog geen contactmomenten.</p> : null}
            {contacts.map((item) => (
              <div key={item.id} className="rounded-xl bg-neutral-50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{item.contact_type}</span>
                  <span className="text-xs text-neutral-500">{formatDate(item.created_at)}</span>
                </div>
                <p className="mt-2 text-sm text-neutral-900 whitespace-pre-wrap">{item.summary}</p>
                <p className="mt-2 text-xs text-neutral-500">{item.created_by || "onbekend"}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 bg-white border border-neutral-200 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm text-neutral-500">Taken & reminders</p>
              <p className="text-sm font-medium text-neutral-900">{outstandingTasks.length} open taken</p>
            </div>
          </div>
          <div className="space-y-3 mb-4">
            <input
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder="Bijv. Bel kandidaat morgen over ID"
              className="w-full px-4 py-3 rounded-xl border border-neutral-200"
            />
            <textarea
              value={taskNote}
              onChange={(e) => setTaskNote(e.target.value)}
              rows={2}
              placeholder="Optionele toelichting..."
              className="w-full px-4 py-3 rounded-xl border border-neutral-200 resize-y"
            />
            <input
              type="datetime-local"
              value={taskDueAt}
              onChange={(e) => setTaskDueAt(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-neutral-200"
            />
            <button onClick={() => void addTask()} className="px-4 py-3 rounded-xl bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800">
              Taak toevoegen
            </button>
          </div>
          <div className="space-y-3 max-h-72 overflow-auto">
            {loading ? <p className="text-sm text-neutral-500">Laden...</p> : null}
            {!loading && tasks.length === 0 ? <p className="text-sm text-neutral-500">Nog geen taken.</p> : null}
            {tasks.map((task) => (
              <button
                key={task.id}
                onClick={() => void toggleTask(task)}
                className={`w-full text-left rounded-xl p-3 border transition-colors ${
                  task.completed_at
                    ? "bg-green-50 border-green-200 text-green-800"
                    : "bg-neutral-50 border-neutral-200 hover:bg-neutral-100"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">{task.title}</p>
                  <span className="text-xs">
                    {task.completed_at ? "Afgerond" : task.due_at ? formatDate(task.due_at) : "Geen deadline"}
                  </span>
                </div>
                {task.note ? <p className="mt-2 text-sm whitespace-pre-wrap">{task.note}</p> : null}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 bg-white border border-neutral-200 rounded-xl">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm text-neutral-500">Mailhistorie</p>
            <p className="text-sm font-medium text-neutral-900">{emails.length} recente mails</p>
          </div>
        </div>
        <div className="space-y-3 max-h-80 overflow-auto">
          {loading ? <p className="text-sm text-neutral-500">Laden...</p> : null}
          {!loading && emails.length === 0 ? <p className="text-sm text-neutral-500">Nog geen mails gelogd.</p> : null}
          {emails.map((email) => (
            <div key={email.id} className="rounded-xl bg-neutral-50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-neutral-900">{email.subject}</p>
                  <p className="text-xs text-neutral-500">{email.email_type} · {email.recipient}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  email.status === "delivered" ? "bg-green-100 text-green-700" :
                  email.status === "bounced" ? "bg-red-100 text-red-700" :
                  "bg-neutral-200 text-neutral-700"
                }`}>
                  {email.status}
                </span>
              </div>
              <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-neutral-500">
                <div>Verstuurd: {formatDate(email.sent_at)}</div>
                <div>Delivered: {formatDate(email.delivered_at)}</div>
                <div>Open: {formatDate(email.opened_at)}</div>
                <div>Klik: {formatDate(email.clicked_at)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
