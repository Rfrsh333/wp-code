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

  useEffect(() => {
    // Check if already dismissed
    if (localStorage.getItem("pwa-install-dismissed")) return;

    // Check if running as PWA already
    const standalone = window.matchMedia("(display-mode: standalone)").matches
      || (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);
    if (standalone) return;

    // iOS detection
    const ua = navigator.userAgent;
    const isIOSDevice = /iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream;
    setIsIOS(isIOSDevice);

    // Listen for beforeinstallprompt (Chrome/Edge/Samsung)
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // Show banner after 2 seconds regardless
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
            {isIOS ? (
              <p className="text-xs text-[var(--mp-text-secondary)] mt-0.5">
                Tik op{" "}
                <svg className="w-4 h-4 inline-block -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>{" "}
                en kies &ldquo;Zet op beginscherm&rdquo;
              </p>
            ) : (
              <p className="text-xs text-[var(--mp-text-secondary)] mt-0.5">
                Snelle toegang tot je shifts en uren
              </p>
            )}
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

        {deferredPrompt ? (
          <button
            onClick={handleInstall}
            className="w-full mt-3 py-2.5 bg-[#F27501] text-white text-sm font-semibold rounded-xl hover:bg-[#d96800] active:scale-[0.98] transition-all"
          >
            Installeren
          </button>
        ) : !isIOS ? (
          <p className="text-[11px] text-[var(--mp-text-tertiary)] mt-2">
            Gebruik Chrome of Edge → menu (⋮) → &ldquo;Installeer app&rdquo;
          </p>
        ) : null}
      </motion.div>
    </AnimatePresence>
  );
}
