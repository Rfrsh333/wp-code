"use client";

import { useState, useEffect } from "react";
import { Bell, X } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";

export default function KlantPushNotificationBanner() {
  const { permission, isSubscribed, loading, subscribe } = usePushNotifications();
  const [dismissed, setDismissed] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    const wasDismissed = localStorage.getItem("push_banner_klant_dismissed");
    if (wasDismissed) setDismissed(true);
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

  if (isSubscribed || permission === "unsupported" || permission === "denied" || dismissed) {
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
    <div className="mx-4 mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">
      <Bell className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">Blijf op de hoogte</p>
        <p className="text-xs text-gray-600 mt-0.5">
          Ontvang een melding wanneer iemand zich aanmeldt voor uw dienst.
        </p>
        <button
          onClick={handleSubscribe}
          disabled={loading}
          className="mt-2 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {loading ? "Bezig..." : "Notificaties inschakelen"}
        </button>
      </div>
      <button onClick={handleDismiss} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
