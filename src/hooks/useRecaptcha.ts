"use client";

import { useCallback, useEffect, useState } from "react";

declare global {
  interface Window {
    grecaptcha: {
      ready: (callback: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

export function useRecaptcha() {
  const [isLoaded, setIsLoaded] = useState(false);
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

  useEffect(() => {
    if (!siteKey) {
      console.warn("NEXT_PUBLIC_RECAPTCHA_SITE_KEY not set");
      return;
    }

    // Check if script is already loaded
    if (window.grecaptcha) {
      setIsLoaded(true);
      return;
    }

    // Load reCAPTCHA script
    const script = document.createElement("script");
    script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      window.grecaptcha.ready(() => {
        setIsLoaded(true);
      });
    };

    document.head.appendChild(script);

    return () => {
      // Cleanup is tricky with reCAPTCHA, so we leave it loaded
    };
  }, [siteKey]);

  const executeRecaptcha = useCallback(
    async (action: string): Promise<string | null> => {
      if (!siteKey) {
        console.warn("reCAPTCHA site key not configured");
        return null;
      }

      if (!isLoaded || !window.grecaptcha) {
        console.warn("reCAPTCHA not loaded yet");
        return null;
      }

      try {
        const token = await window.grecaptcha.execute(siteKey, { action });
        return token;
      } catch (error) {
        console.error("reCAPTCHA execution error:", error);
        return null;
      }
    },
    [isLoaded, siteKey]
  );

  return { executeRecaptcha, isLoaded };
}
