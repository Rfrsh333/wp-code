import DraftReviewPanel from "@/components/admin/DraftReviewPanel";
import AdminShell from "@/components/navigation/AdminShell";

export default function AdminNewsDraftsPage() {
  return (
    <AdminShell>
      <div className="mx-auto max-w-6xl">
        <DraftReviewPanel />
      </div>
    </AdminShell>
  );
}
