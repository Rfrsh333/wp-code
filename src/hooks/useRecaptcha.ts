"use client";

import { useCallback } from "react";

declare global {
  interface Window {
    grecaptcha: {
      ready: (callback: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

// Module-level singleton: shared across all hook instances
let loadPromise: Promise<void> | null = null;

function loadRecaptchaScript(siteKey: string): Promise<void> {
  // Return existing promise if already loading/loaded
  if (loadPromise) return loadPromise;

  // Already loaded by a previous page navigation (SPA)
  if (typeof window !== "undefined" && window.grecaptcha) {
    loadPromise = Promise.resolve();
    return loadPromise;
  }

  loadPromise = new Promise<void>((resolve, reject) => {
    // Check for existing script tag (prevents duplicate injection)
    const existing = document.querySelector(
      `script[src*="recaptcha/api.js"]`
    );
    if (existing) {
      // Script tag exists but grecaptcha not ready yet — wait for it
      const check = () => {
        if (window.grecaptcha) {
          window.grecaptcha.ready(resolve);
        } else {
          setTimeout(check, 50);
        }
      };
      check();
      return;
    }

    const script = document.createElement("script");
    script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      window.grecaptcha.ready(resolve);
    };

    script.onerror = () => {
      // Reset so a retry is possible
      loadPromise = null;
      reject(new Error("Failed to load reCAPTCHA script"));
    };

    document.head.appendChild(script);
  });

  return loadPromise;
}

export function useRecaptcha() {
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  const executeRecaptcha = useCallback(
    async (action: string): Promise<string | null> => {
      if (!siteKey) {
        console.warn("reCAPTCHA site key not configured");
        return null;
      }

      try {
        // Load script on demand (singleton prevents duplicates)
        await loadRecaptchaScript(siteKey);

        const token = await window.grecaptcha.execute(siteKey, { action });
        return token;
      } catch (error) {
        console.error("reCAPTCHA error:", error);
        return null;
      }
    },
    [siteKey]
  );

  return { executeRecaptcha, isLoaded: true };
}
