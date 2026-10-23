import { Suspense } from "react";
import KlantWachtwoordResetClient from "./KlantWachtwoordResetClient";

export default function KlantWachtwoordResetPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md text-center text-neutral-500">
            Resetpagina laden...
          </div>
        </div>
      }
    >
      <KlantWachtwoordResetClient />
    </Suspense>
  );
}
