"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js", { scope: "/" })
          .then((registration) => {
            console.log("✅ Service Worker registered:", registration.scope);

            // Check for updates
            registration.update();

            // Listen for updates
            registration.addEventListener("updatefound", () => {
              const newWorker = registration.installing;
              if (newWorker) {
                newWorker.addEventListener("statechange", () => {
                  if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                    console.log("🔄 New service worker available");
                    // Auto-reload on update
                    window.location.reload();
                  }
                });
              }
            });
          })
          .catch((error) => {
            console.error("❌ Service Worker registration failed:", error);
          });
      });
    } else {
      console.warn("⚠️ Service Workers not supported in this browser");
    }
  }, []);

  return null;
}
