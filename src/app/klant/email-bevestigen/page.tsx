import { Suspense } from "react";
import EmailBevestigenClient from "./EmailBevestigenClient";

export default function KlantEmailBevestigenPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md text-center text-neutral-500">Laden...</div>
        </div>
      }
    >
      <EmailBevestigenClient />
    </Suspense>
  );
}
