import ClusterReviewPanel from "@/components/admin/ClusterReviewPanel";
import AdminShell from "@/components/navigation/AdminShell";

export default function AdminNewsClustersPage() {
  return (
    <AdminShell>
      <div className="mx-auto max-w-6xl">
        <ClusterReviewPanel />
      </div>
    </AdminShell>
  );
}
