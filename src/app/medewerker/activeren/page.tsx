import { Suspense } from "react";
import MedewerkerActiverenClient from "./MedewerkerActiverenClient";

export default function MedewerkerActiverenPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-neutral-100 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-8 text-center text-neutral-500">
            Activatielink laden...
          </div>
        </div>
      }
    >
      <MedewerkerActiverenClient />
    </Suspense>
  );
}
