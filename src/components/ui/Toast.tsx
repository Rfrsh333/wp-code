"use client";

import { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";

type ToastType = "success" | "error" | "info" | "warning";

interface ToastAction {
  action: () => void;
  actionLabel: string;
}

interface ToastMessage {
  id: number;
  type: ToastType;
  message: string;
  action?: () => void;
  actionLabel?: string;
}

interface ToastContextType {
  success: (message: string, options?: ToastAction) => void;
  error: (message: string, options?: ToastAction) => void;
  info: (message: string, options?: ToastAction) => void;
  warning: (message: string, options?: ToastAction) => void;
  showToast: (type: ToastType, message: string, options?: ToastAction) => void;
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

  const addToast = useCallback((type: ToastType, message: string, options?: ToastAction) => {
    const id = ++counterRef.current;
    setToasts((prev) => {
      const next = [...prev, { id, type, message, action: options?.action, actionLabel: options?.actionLabel }];
      if (next.length > MAX_TOASTS) return next.slice(next.length - MAX_TOASTS);
      return next;
    });
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast: ToastContextType = {
    success: (message: string, options?: ToastAction) => addToast("success", message, options),
    error: (message: string, options?: ToastAction) => addToast("error", message, options),
    info: (message: string, options?: ToastAction) => addToast("info", message, options),
    warning: (message: string, options?: ToastAction) => addToast("warning", message, options),
    showToast: (type: ToastType, message: string, options?: ToastAction) => addToast(type, message, options),
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
  const hasAction = !!toast.action;
  const timeoutMs = hasAction ? 8000 : 4000;
  const exitMs = hasAction ? 7700 : 3700;

  useEffect(() => {
    const dismissTimer = setTimeout(() => {
      setIsExiting(true);
    }, exitMs);
    const removeTimer = setTimeout(() => onDismiss(toast.id), timeoutMs);
    return () => {
      clearTimeout(dismissTimer);
      clearTimeout(removeTimer);
    };
  }, [toast.id, onDismiss, exitMs, timeoutMs]);

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
      {hasAction && (
        <button
          onClick={() => {
            toast.action!();
            onDismiss(toast.id);
          }}
          className="px-2.5 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-semibold transition-colors flex-shrink-0"
        >
          {toast.actionLabel}
        </button>
      )}
      <button
        onClick={() => onDismiss(toast.id)}
        className="text-white/70 hover:text-white text-lg leading-none flex-shrink-0"
      >
        &times;
      </button>
    </div>
  );
}
