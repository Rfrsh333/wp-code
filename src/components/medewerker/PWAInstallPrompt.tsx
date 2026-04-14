"use client";

import { useState, useEffect } from "react";
import { X, Download } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Only show on mobile/tablet — hide on desktop
    const isMobileOrTablet = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      || (navigator.maxTouchPoints > 0 && window.innerWidth < 1024);
    if (!isMobileOrTablet) return;

    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      return;
    }

    // Check if user already dismissed
    const dismissed = localStorage.getItem("pwa-install-dismissed");
    if (dismissed) {
      return;
    }

    // Listen for beforeinstallprompt event
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      // Show prompt after 5 seconds
      setTimeout(() => {
        setShowPrompt(true);
      }, 5000);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      console.log("✅ PWA installed");
    } else {
      console.log("❌ PWA installation dismissed");
    }

    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("pwa-install-dismissed", "true");
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 animate-slide-up">
      <div className="bg-white dark:bg-[var(--mp-card)] rounded-2xl shadow-2xl border border-[var(--mp-separator)] p-4 flex items-start gap-3">
        <div className="w-12 h-12 bg-[#F27501]/10 rounded-xl flex items-center justify-center flex-shrink-0">
          <Download className="w-6 h-6 text-[#F27501]" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-[var(--mp-text-primary)] text-sm mb-1">
            Installeer TopTalent Hub
          </h3>
          <p className="text-[var(--mp-text-secondary)] text-xs mb-3">
            Krijg snellere toegang en werk offline met de app
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleInstall}
              className="flex-1 bg-[#F27501] text-white text-sm font-semibold py-2 px-4 rounded-xl hover:bg-[#d96800] transition-colors"
            >
              Installeer
            </button>
            <button
              onClick={handleDismiss}
              className="flex-1 bg-[var(--mp-bg)] text-[var(--mp-text-secondary)] text-sm font-semibold py-2 px-4 rounded-xl hover:bg-[var(--mp-separator)] transition-colors"
            >
              Niet nu
            </button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="text-[var(--mp-text-tertiary)] hover:text-[var(--mp-text-secondary)] transition-colors flex-shrink-0"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
