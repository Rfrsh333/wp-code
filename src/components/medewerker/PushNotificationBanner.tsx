"use client";

import { useState } from "react";
import { Bell, BellOff, X } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";

function getInitialDismissed(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("push_banner_dismissed") === "true";
}

export default function PushNotificationBanner() {
  const { permission, isSubscribed, loading, subscribe, unsubscribe } = usePushNotifications();
  const [dismissed, setDismissed] = useState(getInitialDismissed);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("push_banner_dismissed", "true");
  };

  const handleSubscribe = async () => {
    const success = await subscribe();
    if (success) {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }
  };

  // Toon niets als: al geabonneerd, niet ondersteund, geweigerd, of weggeklikt
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
    <div className="mx-4 mb-4 p-3 bg-orange-50 border border-orange-200 rounded-xl flex items-start gap-3">
      <Bell className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">Mis geen nieuwe diensten</p>
        <p className="text-xs text-gray-600 mt-0.5">
          Ontvang een melding zodra er nieuwe diensten beschikbaar zijn.
        </p>
        <button
          onClick={handleSubscribe}
          disabled={loading}
          className="mt-2 px-3 py-1.5 bg-orange-500 text-white text-xs font-medium rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
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

/**
 * Toggle component voor gebruik in instellingen pagina
 */
export function PushNotificationToggle() {
  const { permission, isSubscribed, loading, subscribe, unsubscribe } = usePushNotifications();

  if (permission === "unsupported") {
    return (
      <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
        <BellOff className="w-5 h-5 text-gray-400" />
        <div>
          <p className="text-sm font-medium text-gray-700">Push notificaties</p>
          <p className="text-xs text-gray-500">Niet ondersteund in deze browser</p>
        </div>
      </div>
    );
  }

  if (permission === "denied") {
    return (
      <div className="flex items-center gap-3 p-4 bg-red-50 rounded-xl">
        <BellOff className="w-5 h-5 text-red-400" />
        <div>
          <p className="text-sm font-medium text-gray-700">Push notificaties</p>
          <p className="text-xs text-red-600">
            Geblokkeerd in browser. Ga naar je browserinstellingen om dit te wijzigen.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
      <div className="flex items-center gap-3">
        <Bell className={`w-5 h-5 ${isSubscribed ? "text-orange-500" : "text-gray-400"}`} />
        <div>
          <p className="text-sm font-medium text-gray-700">Push notificaties</p>
          <p className="text-xs text-gray-500">
            {isSubscribed
              ? "Je ontvangt meldingen voor nieuwe diensten"
              : "Ontvang meldingen voor nieuwe diensten"}
          </p>
        </div>
      </div>
      <button
        onClick={isSubscribed ? unsubscribe : subscribe}
        disabled={loading}
        className={`relative w-12 h-6 rounded-full transition-colors ${
          isSubscribed ? "bg-orange-500" : "bg-gray-300"
        } ${loading ? "opacity-50" : ""}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
            isSubscribed ? "translate-x-6" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
