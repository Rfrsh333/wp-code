import SourceManagementPanel from "@/components/admin/SourceManagementPanel";
import AdminShell from "@/components/navigation/AdminShell";

export default function AdminNewsSourcesPage() {
  return (
    <AdminShell>
      <div className="mx-auto max-w-7xl">
        <SourceManagementPanel />
      </div>
    </AdminShell>
  );
}
