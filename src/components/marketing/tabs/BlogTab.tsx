"use client";

import { useRouter } from "next/navigation";
import { Newspaper, ArrowRight } from "lucide-react";

export default function BlogTab() {
  const router = useRouter();

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
        <div className="inline-flex p-4 bg-blue-50 rounded-2xl mb-6">
          <Newspaper className="h-12 w-12 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-neutral-900 mb-3">
          Blog & Content Management
        </h2>
        <p className="text-neutral-600 mb-6">
          Beheer je blog artikelen en nieuwsberichten via het content management systeem.
        </p>
        <button
          onClick={() => router.push("/marketing?tab=content")}
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#F27501] text-white rounded-xl font-semibold hover:bg-[#E06600] transition-colors"
        >
          Ga naar Content Management
          <ArrowRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
