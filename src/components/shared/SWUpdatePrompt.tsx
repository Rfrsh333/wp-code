"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, X } from "lucide-react";

interface SWUpdatePromptProps {
  /** Path to the service worker file */
  swPath: string;
  /** Scope for SW registration */
  swScope: string;
  /** Accent color for the update button */
  accentColor?: string;
}

export default function SWUpdatePrompt({
  swPath,
  swScope,
  accentColor = "#F27501",
}: SWUpdatePromptProps) {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [showUpdate, setShowUpdate] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register(swPath, {
          scope: swScope,
        });

        // Check if there's already a waiting worker (e.g. from a previous visit)
        if (registration.waiting) {
          setWaitingWorker(registration.waiting);
          setShowUpdate(true);
        }

        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener("statechange", () => {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              // New SW installed but waiting to activate
              setWaitingWorker(newWorker);
              setShowUpdate(true);
            }
          });
        });

        // Periodically check for updates (every 60 minutes)
        const interval = setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000);

        return () => clearInterval(interval);
      } catch (error) {
        console.error("[SW] Registration failed:", error);
      }
    };

    // Register after page load to avoid competing with critical resources
    if (document.readyState === "complete") {
      void registerSW();
    } else {
      window.addEventListener("load", () => void registerSW(), { once: true });
    }

    // Listen for controller change to reload page
    let refreshing = false;
    const onControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      onControllerChange
    );

    return () => {
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onControllerChange
      );
    };
  }, [swPath, swScope]);

  const handleUpdate = useCallback(() => {
    if (!waitingWorker) return;
    waitingWorker.postMessage({ type: "SKIP_WAITING" });
    setShowUpdate(false);
  }, [waitingWorker]);

  const handleDismiss = () => {
    setShowUpdate(false);
  };

  if (!showUpdate) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[9999] animate-slide-up sm:left-auto sm:right-4 sm:w-80">
      <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-700 p-4 flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${accentColor}15` }}
        >
          <RefreshCw className="w-5 h-5" style={{ color: accentColor }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            Nieuwe versie beschikbaar
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Vernieuw om de laatste versie te laden.
          </p>
          <button
            onClick={handleUpdate}
            className="mt-2 w-full py-2 text-white text-sm font-semibold rounded-xl transition-colors"
            style={{ backgroundColor: accentColor }}
          >
            Vernieuwen
          </button>
        </div>
        <button
          onClick={handleDismiss}
          className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
