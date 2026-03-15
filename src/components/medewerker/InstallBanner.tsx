"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("pwa-install-dismissed")) return;

    const standalone = window.matchMedia("(display-mode: standalone)").matches
      || (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);
    if (standalone) return;

    const ua = navigator.userAgent;
    const isIOSDevice = /iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream;
    setIsIOS(isIOSDevice);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    const timer = setTimeout(() => setShowBanner(true), 2000);

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
        setShowBanner(false);
      }
      setDeferredPrompt(null);
    } else {
      // No native prompt available — show manual instructions
      setShowInstructions(true);
    }
  }, [deferredPrompt]);

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem("pwa-install-dismissed", "true");
  };

  if (isStandalone || !showBanner) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="bg-[var(--mp-card)] dark:bg-[var(--mp-card-elevated)] rounded-2xl p-4 shadow-lg border border-[var(--mp-separator)]"
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-[#F27501] rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-white text-sm font-black">TT</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-[var(--mp-text-primary)]">Installeer TopTalent App</p>
            <p className="text-xs text-[var(--mp-text-secondary)] mt-0.5">
              Snelle toegang tot je shifts en uren
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="text-[var(--mp-text-tertiary)] hover:text-[var(--mp-text-secondary)] p-1"
            aria-label="Sluiten"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Altijd een klikbare knop tonen */}
        <button
          onClick={handleInstall}
          className="w-full mt-3 py-2.5 bg-[#F27501] text-white text-sm font-semibold rounded-xl hover:bg-[#d96800] active:scale-[0.98] transition-all"
        >
          Installeren
        </button>

        {/* Instructies als native prompt niet beschikbaar is */}
        <AnimatePresence>
          {showInstructions && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-3 p-3 bg-[var(--mp-bg)] dark:bg-[var(--mp-card)] rounded-xl space-y-2">
                {isIOS ? (
                  <>
                    <p className="text-xs font-semibold text-[var(--mp-text-primary)]">Installeren op iPhone/iPad:</p>
                    <div className="space-y-1.5">
                      <p className="text-xs text-[var(--mp-text-secondary)] flex items-start gap-2">
                        <span className="bg-[#F27501] text-white w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold mt-0.5">1</span>
                        Tik op het deel-icoon
                        <svg className="w-4 h-4 inline-block flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        onderaan Safari
                      </p>
                      <p className="text-xs text-[var(--mp-text-secondary)] flex items-start gap-2">
                        <span className="bg-[#F27501] text-white w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold mt-0.5">2</span>
                        Scroll naar beneden en tik op &ldquo;Zet op beginscherm&rdquo;
                      </p>
                      <p className="text-xs text-[var(--mp-text-secondary)] flex items-start gap-2">
                        <span className="bg-[#F27501] text-white w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold mt-0.5">3</span>
                        Tik op &ldquo;Voeg toe&rdquo;
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-xs font-semibold text-[var(--mp-text-primary)]">Installeren in je browser:</p>
                    <div className="space-y-1.5">
                      <p className="text-xs text-[var(--mp-text-secondary)] flex items-start gap-2">
                        <span className="bg-[#F27501] text-white w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold mt-0.5">1</span>
                        Open deze pagina in Chrome of Edge
                      </p>
                      <p className="text-xs text-[var(--mp-text-secondary)] flex items-start gap-2">
                        <span className="bg-[#F27501] text-white w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold mt-0.5">2</span>
                        Tik op het menu (⋮) rechtsboven
                      </p>
                      <p className="text-xs text-[var(--mp-text-secondary)] flex items-start gap-2">
                        <span className="bg-[#F27501] text-white w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold mt-0.5">3</span>
                        Kies &ldquo;App installeren&rdquo; of &ldquo;Toevoegen aan startscherm&rdquo;
                      </p>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}
