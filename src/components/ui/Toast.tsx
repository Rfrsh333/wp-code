"use client";

import { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";

type ToastType = "success" | "error" | "info" | "warning";

interface ToastMessage {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
  showToast: (type: ToastType, message: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

const MAX_TOASTS = 5;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const counterRef = useRef(0);

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = ++counterRef.current;
    setToasts((prev) => {
      const next = [...prev, { id, type, message }];
      if (next.length > MAX_TOASTS) return next.slice(next.length - MAX_TOASTS);
      return next;
    });
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast: ToastContextType = {
    success: (message: string) => addToast("success", message),
    error: (message: string) => addToast("error", message),
    info: (message: string) => addToast("info", message),
    warning: (message: string) => addToast("warning", message),
    showToast: addToast,
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Desktop: bottom-right, Mobiel: bottom-center */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none max-md:right-0 max-md:left-0 max-md:items-center max-md:px-4">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }: { toast: ToastMessage; onDismiss: (id: number) => void }) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const dismissTimer = setTimeout(() => {
      setIsExiting(true);
    }, 3700);
    const removeTimer = setTimeout(() => onDismiss(toast.id), 4000);
    return () => {
      clearTimeout(dismissTimer);
      clearTimeout(removeTimer);
    };
  }, [toast.id, onDismiss]);

  const config: Record<ToastType, { bg: string; icon: string }> = {
    success: { bg: "bg-green-600", icon: "\u2713" },
    error: { bg: "bg-red-600", icon: "\u2717" },
    info: { bg: "bg-[#F27501]", icon: "\u2139" },
    warning: { bg: "bg-amber-500", icon: "\u26A0" },
  };

  const { bg, icon } = config[toast.type];

  return (
    <div
      className={`pointer-events-auto ${bg} text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-3 min-w-[280px] max-w-[420px] transition-all duration-300 ${
        isExiting ? "opacity-0 translate-x-4" : "animate-slide-in-right"
      }`}
      role="alert"
    >
      <span className="text-lg font-bold flex-shrink-0">{icon}</span>
      <span className="text-sm font-medium flex-1">{toast.message}</span>
      <button
        onClick={() => onDismiss(toast.id)}
        className="text-white/70 hover:text-white text-lg leading-none flex-shrink-0"
      >
        &times;
      </button>
    </div>
  );
}
