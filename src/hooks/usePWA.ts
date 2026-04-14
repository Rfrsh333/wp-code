"use client";

import { useEffect, useState } from "react";

export function usePWA() {
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
    const android = /Android/.test(navigator.userAgent);

    queueMicrotask(() => {
      setIsStandalone(standalone);
      setIsIOS(ios);
      setIsAndroid(android);
    });

    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    const handler = (e: MediaQueryListEvent) => setIsStandalone(e.matches);

    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  return {
    isStandalone,
    isIOS,
    isAndroid,
    isPWA: isStandalone,
    isMobile: isIOS || isAndroid,
  };
}
