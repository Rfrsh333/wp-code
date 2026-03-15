"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { springSnappy } from "@/lib/design-system/animations";
import IDCardFullscreen from "./IDCardFullscreen";

interface DigitalIDCardProps {
  medewerker: {
    id: string;
    naam: string;
    functie: string[];
    profile_photo_url?: string | null;
    bsn_geverifieerd?: boolean;
  };
  profilePhoto: string | null;
}

export default function DigitalIDCard({ medewerker, profilePhoto }: DigitalIDCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    const generateQR = async () => {
      try {
        const QRCode = (await import("qrcode")).default;
        const url = await QRCode.toDataURL(
          JSON.stringify({ type: "toptalent_medewerker", id: medewerker.id, naam: medewerker.naam }),
          { width: 200, margin: 2, color: { dark: "#1D1D1F", light: "#FFFFFF" } }
        );
        setQrDataUrl(url);
      } catch {
        // QR generation failed silently
      }
    };
    generateQR();
  }, [medewerker.id, medewerker.naam]);

  return (
    <>
      <div
        className="perspective-1000 w-full max-w-sm mx-auto cursor-pointer"
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <motion.div
          className="relative w-full aspect-[1.6/1]"
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={springSnappy}
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* Front */}
          <div
            className="absolute inset-0 backface-hidden rounded-2xl overflow-hidden shadow-xl"
            style={{ backfaceVisibility: "hidden" }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#1D1D1F] via-[#2C2C2E] to-[#3A3A3C]" />
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#F27501]/20 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-[#F27501]/10 rounded-full blur-2xl" />

            <div className="relative h-full p-5 flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-[#F27501] rounded-lg flex items-center justify-center">
                    <span className="text-white text-xs font-black">TT</span>
                  </div>
                  <span className="text-white/60 text-xs font-medium tracking-wider uppercase">TopTalent Jobs</span>
                </div>
                {medewerker.bsn_geverifieerd && (
                  <div className="flex items-center gap-1 bg-green-500/20 px-2 py-0.5 rounded-full">
                    <svg className="w-3 h-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-green-400 text-[10px] font-medium">Geverifieerd</span>
                  </div>
                )}
              </div>

              <div className="flex items-end gap-4">
                {profilePhoto ? (
                  <Image
                    src={profilePhoto}
                    alt={medewerker.naam}
                    width={48}
                    height={48}
                    className="w-12 h-12 rounded-xl object-cover border-2 border-white/20"
                  />
                ) : (
                  <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center border-2 border-white/20">
                    <span className="text-xl font-bold text-white">{medewerker.naam.charAt(0)}</span>
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-white font-bold text-base">{medewerker.naam}</p>
                  <p className="text-white/60 text-xs capitalize">
                    {medewerker.functie.slice(0, 2).join(" · ")}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Back */}
          <div
            className="absolute inset-0 backface-hidden rounded-2xl overflow-hidden shadow-xl"
            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#F5F5F7] to-[#E5E5EA] dark:from-[#2C2C2E] dark:to-[#1C1C1E]" />

            <div className="relative h-full p-5 flex flex-col items-center justify-center gap-3">
              {qrDataUrl ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowFullscreen(true);
                  }}
                  className="p-2 bg-white dark:bg-[#3A3A3C] rounded-xl shadow-sm"
                >
                  <img src={qrDataUrl} alt="QR Code" className="w-24 h-24" />
                </button>
              ) : (
                <div className="w-28 h-28 bg-neutral-200 dark:bg-neutral-700 rounded-xl animate-pulse" />
              )}
              <p className="text-[var(--mp-text-secondary)] text-xs font-medium">
                ID: {medewerker.id.slice(0, 8).toUpperCase()}
              </p>
              <p className="text-[var(--mp-text-tertiary)] text-[10px]">Tik op QR voor fullscreen</p>
            </div>
          </div>
        </motion.div>

        <p className="text-center text-xs text-[var(--mp-text-tertiary)] mt-2">Tik om te draaien</p>
      </div>

      {showFullscreen && qrDataUrl && (
        <IDCardFullscreen
          qrDataUrl={qrDataUrl}
          naam={medewerker.naam}
          id={medewerker.id}
          onClose={() => setShowFullscreen(false)}
        />
      )}
    </>
  );
}
