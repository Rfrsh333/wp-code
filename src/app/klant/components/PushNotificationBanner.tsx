"use client";

import { useState, useEffect } from "react";
import { Bell, X } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";

export default function KlantPushNotificationBanner() {
  const { permission, isSubscribed, loading, subscribe } = usePushNotifications();
  const [dismissed, setDismissed] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const wasDismissed = localStorage.getItem("push_banner_klant_dismissed");
    if (wasDismissed) setDismissed(true);

    // Toon alleen op mobiel/PWA — op desktop is de banner niet relevant
    setIsMobile(window.innerWidth < 768);
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("push_banner_klant_dismissed", "true");
  };

  const handleSubscribe = async () => {
    const success = await subscribe();
    if (success) {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }
  };

  // Verberg op desktop en als al ingeschakeld/geweigerd/dismissed
  if (!isMobile || isSubscribed || permission === "unsupported" || permission === "denied" || dismissed) {
    return null;
  }

  if (showSuccess) {
    return (
      <div className="mx-4 mb-4 p-3 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
        <Bell className="w-5 h-5 text-green-600 flex-shrink-0" />
        <p className="text-sm text-green-800 font-medium">Notificaties ingeschakeld!</p>
      </div>
    );
  }

  return (
    <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-2.5">
      <Bell className="w-4 h-4 text-blue-600 flex-shrink-0" />
      <p className="flex-1 text-xs text-gray-700 min-w-0">
        Ontvang meldingen bij aanmeldingen.
      </p>
      <button
        onClick={handleSubscribe}
        disabled={loading}
        className="px-2.5 py-1 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex-shrink-0"
      >
        {loading ? "..." : "Aan"}
      </button>
      <button onClick={handleDismiss} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
