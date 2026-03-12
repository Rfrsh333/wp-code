"use client";

import { useState } from "react";
import Image from "next/image";
import EmptyState from "@/components/ui/EmptyState";

interface Dienst {
  id: string;
  klant_naam: string;
  locatie: string;
  datum: string;
  start_tijd: string;
  eind_tijd: string;
  functie: string;
  uurtarief: number | null;
  afbeelding: string | null;
  status: string;
  aangemeld?: boolean;
  aanmelding_id?: string;
  aanmelding_status?: string;
  uren_status?: string;
}

interface DienstenTabProps {
  diensten: Dienst[];
  onAanmelden: (dienstId: string) => void;
  onAfmelden: (dienstId: string) => void;
  onUrenInvullen: (dienst: Dienst) => void;
  onGoToShifts: () => void;
}

export default function DienstenTab({ diensten, onAanmelden, onAfmelden, onUrenInvullen, onGoToShifts }: DienstenTabProps) {
  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" });

  return (
    <div>
      <h2 className="text-2xl font-bold text-neutral-900 mb-6">Mijn Diensten</h2>
      {diensten.length === 0 ? (
        <EmptyState
          title="Nog geen diensten"
          description="Je hebt nog geen diensten. Bekijk beschikbare shifts om je aan te melden."
          actionLabel="Bekijk shifts"
          onAction={onGoToShifts}
          icon={<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {diensten.map((dienst) => (
            <div key={dienst.id} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300">
              <div className="relative aspect-[16/10] bg-neutral-100">
                {dienst.afbeelding ? (
                  <Image src={dienst.afbeelding} alt={dienst.klant_naam} fill className="object-cover" unoptimized />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-100 to-orange-50">
                    <svg className="w-16 h-16 text-orange-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                )}
                <span className="absolute top-3 left-3 bg-[#F27501] text-white text-xs font-semibold px-3 py-1 rounded-full capitalize">{dienst.functie}</span>
                {dienst.aanmelding_status && (
                  <span className={`absolute top-3 right-3 text-xs font-semibold px-3 py-1 rounded-full ${
                    dienst.aanmelding_status === "geaccepteerd" ? "bg-green-500 text-white" :
                    dienst.aanmelding_status === "afgewezen" ? "bg-red-500 text-white" : "bg-yellow-500 text-white"
                  }`}>{dienst.aanmelding_status}</span>
                )}
              </div>
              <div className="p-5">
                <h3 className="font-bold text-lg text-neutral-900 mb-1">{dienst.klant_naam}</h3>
                <p className="text-neutral-500 text-sm mb-3 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {dienst.locatie}
                </p>
                <div className="flex items-center gap-4 text-sm text-neutral-600 mb-4">
                  <span>{formatDate(dienst.datum)}</span>
                  <span>{dienst.start_tijd.slice(0, 5)} - {dienst.eind_tijd.slice(0, 5)}</span>
                </div>
                <div className="flex items-center justify-between">
                  {dienst.uurtarief && <span className="text-[#F27501] font-bold">€{dienst.uurtarief}/uur</span>}
                  <div className="ml-auto">
                    {!dienst.aangemeld ? (
                      <button onClick={() => onAanmelden(dienst.id)} className="px-5 py-2 bg-[#F27501] text-white rounded-xl text-sm font-semibold hover:bg-[#d96800] transition-colors">Aanmelden</button>
                    ) : dienst.aanmelding_status === "aangemeld" ? (
                      <button onClick={() => onAfmelden(dienst.id)} className="px-5 py-2 bg-neutral-200 text-neutral-700 rounded-xl text-sm font-medium hover:bg-neutral-300 transition-colors">Afmelden</button>
                    ) : dienst.aanmelding_status === "geaccepteerd" && !dienst.uren_status && new Date(dienst.datum) <= new Date() ? (
                      <button onClick={() => onUrenInvullen(dienst)} className="px-5 py-2 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors">Uren invullen</button>
                    ) : dienst.uren_status ? (
                      <span className={`px-3 py-1.5 rounded-xl text-xs font-medium ${dienst.uren_status === "goedgekeurd" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                        Uren {dienst.uren_status}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
