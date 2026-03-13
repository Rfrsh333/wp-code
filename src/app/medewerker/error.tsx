"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-bold text-neutral-900 mb-2">Er ging iets mis</h1>
        <p className="text-neutral-600 mb-6">Probeer het opnieuw of ga terug.</p>
        <div className="flex gap-3 justify-center">
          <button onClick={reset} className="px-6 py-2 bg-[#F27501] text-white rounded-lg font-medium hover:bg-[#D96801] transition-colors">
            Probeer opnieuw
          </button>
          <a href="/medewerker" className="px-6 py-2 border border-neutral-300 text-neutral-700 rounded-lg font-medium hover:bg-neutral-50 transition-colors">
            Terug
          </a>
        </div>
      </div>
    </div>
  );
}
