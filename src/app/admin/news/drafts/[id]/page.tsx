import DraftDetailReview from "@/components/admin/DraftDetailReview";
import AdminShell from "@/components/navigation/AdminShell";

export default function AdminNewsDraftDetailPage() {
  return (
    <AdminShell>
      <div className="mx-auto max-w-7xl">
        <DraftDetailReview />
      </div>
    </AdminShell>
  );
}
