import { Suspense } from "react";
import AdminWachtwoordResetClient from "./AdminWachtwoordResetClient";

export default function AdminWachtwoordResetPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-neutral-100 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md text-center text-neutral-500">
            Resetpagina laden...
          </div>
        </div>
      }
    >
      <AdminWachtwoordResetClient />
    </Suspense>
  );
}
