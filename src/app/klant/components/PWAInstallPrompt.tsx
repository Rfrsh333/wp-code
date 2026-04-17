"use client";

import { useState, useEffect, useCallback } from "react";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function KlantPWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    // Only show on mobile/tablet
    const isMobileOrTablet =
      /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      ) ||
      (navigator.maxTouchPoints > 0 && window.innerWidth < 1024);
    if (!isMobileOrTablet) return;

    // Already installed
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    if (
      (window.navigator as Navigator & { standalone?: boolean }).standalone ===
      true
    )
      return;

    // Already dismissed
    if (localStorage.getItem("pwa-install-klant-dismissed")) return;

    const iosDevice =
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      !(window as unknown as { MSStream?: unknown }).MSStream;
    setIsIOS(iosDevice);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // Show prompt after 5 seconds
    const timer = setTimeout(() => setShowPrompt(true), 5000);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      clearTimeout(timer);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    } else {
      setShowInstructions(true);
    }
  }, [deferredPrompt]);

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("pwa-install-klant-dismissed", "true");
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 animate-slide-up sm:left-auto sm:right-4 sm:w-96">
      <div className="bg-white rounded-2xl shadow-2xl border border-neutral-200 p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-[#1e3a5f]/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <Download className="w-5 h-5 text-[#1e3a5f]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-neutral-900">
              Installeer TopTalent Business
            </p>
            <p className="text-xs text-neutral-500 mt-0.5">
              Snelle toegang tot uw personeel en uren
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="text-neutral-400 hover:text-neutral-600 transition-colors flex-shrink-0"
            aria-label="Sluiten"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex gap-2 mt-3">
          <button
            onClick={handleInstall}
            className="flex-1 py-2.5 bg-[#1e3a5f] text-white text-sm font-semibold rounded-xl hover:bg-[#162d4a] active:scale-[0.98] transition-all"
          >
            Installeren
          </button>
          <button
            onClick={handleDismiss}
            className="flex-1 py-2.5 bg-neutral-100 text-neutral-600 text-sm font-semibold rounded-xl hover:bg-neutral-200 transition-colors"
          >
            Niet nu
          </button>
        </div>

        {showInstructions && (
          <div className="mt-3 p-3 bg-neutral-50 rounded-xl space-y-2">
            {isIOS ? (
              <>
                <p className="text-xs font-semibold text-neutral-900">
                  Installeren op iPhone/iPad:
                </p>
                <div className="space-y-1.5">
                  <p className="text-xs text-neutral-600 flex items-start gap-2">
                    <span className="bg-[#1e3a5f] text-white w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold mt-0.5">
                      1
                    </span>
                    Tik op het deel-icoon onderaan Safari
                  </p>
                  <p className="text-xs text-neutral-600 flex items-start gap-2">
                    <span className="bg-[#1e3a5f] text-white w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold mt-0.5">
                      2
                    </span>
                    Kies &ldquo;Zet op beginscherm&rdquo;
                  </p>
                  <p className="text-xs text-neutral-600 flex items-start gap-2">
                    <span className="bg-[#1e3a5f] text-white w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold mt-0.5">
                      3
                    </span>
                    Tik op &ldquo;Voeg toe&rdquo;
                  </p>
                </div>
              </>
            ) : (
              <>
                <p className="text-xs font-semibold text-neutral-900">
                  Installeren in uw browser:
                </p>
                <div className="space-y-1.5">
                  <p className="text-xs text-neutral-600 flex items-start gap-2">
                    <span className="bg-[#1e3a5f] text-white w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold mt-0.5">
                      1
                    </span>
                    Open deze pagina in Chrome of Edge
                  </p>
                  <p className="text-xs text-neutral-600 flex items-start gap-2">
                    <span className="bg-[#1e3a5f] text-white w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold mt-0.5">
                      2
                    </span>
                    Tik op het menu (&#8942;) rechtsboven
                  </p>
                  <p className="text-xs text-neutral-600 flex items-start gap-2">
                    <span className="bg-[#1e3a5f] text-white w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold mt-0.5">
                      3
                    </span>
                    Kies &ldquo;App installeren&rdquo;
                  </p>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
