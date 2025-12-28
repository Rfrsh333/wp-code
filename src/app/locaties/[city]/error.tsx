"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Location page error:", error);
  }, [error]);

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-neutral-900 mb-4">
            Oeps, er ging iets mis
          </h1>
          <p className="text-xl text-neutral-600">
            We konden deze locatiepagina niet laden.
          </p>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-8 max-w-2xl mx-auto">
          <p className="text-red-800 font-medium mb-2">Foutmelding:</p>
          <p className="text-red-700 text-sm">{error.message}</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={reset}
            className="bg-[#F97316] text-white px-8 py-3 rounded-xl font-semibold hover:bg-[#EA580C] transition-colors"
          >
            Probeer opnieuw
          </button>
          <Link
            href="/locaties"
            className="border-2 border-neutral-300 text-neutral-700 px-8 py-3 rounded-xl font-semibold hover:bg-neutral-50 transition-colors"
          >
            Terug naar locaties
          </Link>
        </div>
      </div>
    </div>
  );
}
