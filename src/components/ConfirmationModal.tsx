"use client";

import { useEffect, useRef, useCallback } from "react";
import Link from "next/link";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  subMessage?: string;
  primaryAction?: {
    label: string;
    href: string;
  };
  secondaryAction?: {
    label: string;
    href: string;
  };
  tertiaryAction?: {
    label: string;
    href: string;
  };
}

/**
 * ConfirmationModal - Professional success confirmation modal
 * Used after successful form submissions
 */
export default function ConfirmationModal({
  isOpen,
  onClose,
  title = "Bedankt! We hebben je aanvraag ontvangen.",
  message = "Je formulier is succesvol verzonden. Ons team neemt binnen 24 uur contact met je op.",
  subMessage = "Heb je in de tussentijd vragen? We staan voor je klaar.",
  primaryAction = { label: "Terug naar home", href: "/" },
  secondaryAction = { label: "Bekijk onze diensten", href: "/diensten" },
  tertiaryAction,
}: ConfirmationModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Handle ESC key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose]
  );

  // Focus trap and ESC handler
  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
      // Focus the close button when modal opens
      closeButtonRef.current?.focus();
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, handleKeyDown]);

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirmation-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm animate-fadeIn"
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={modalRef}
        className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 animate-scaleIn"
        style={{
          boxShadow: "0 20px 40px rgba(0,0,0,0.12)",
        }}
      >
        {/* Close button */}
        <button
          ref={closeButtonRef}
          onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-all duration-200"
          aria-label="Sluiten"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Success icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-[#FFF7F1] rounded-full flex items-center justify-center">
            <div className="w-12 h-12 bg-[#FF7A00] rounded-full flex items-center justify-center animate-checkmark">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="text-center">
          <h2
            id="confirmation-title"
            className="text-2xl font-bold text-[#1F1F1F] mb-4"
          >
            {title}
          </h2>

          <p className="text-neutral-600 mb-3 leading-relaxed">
            {message}
          </p>

          {subMessage && (
            <p className="text-sm text-neutral-500 mb-8">
              {subMessage}
            </p>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-3">
            {/* Primary CTA */}
            <Link
              href={primaryAction.href}
              onClick={onClose}
              className="inline-flex items-center justify-center bg-[#FF7A00] text-white px-6 py-3.5 rounded-xl font-semibold
              shadow-lg shadow-orange-500/20 hover:shadow-xl hover:shadow-orange-500/30
              hover:bg-[#E66E00] hover:-translate-y-0.5 active:scale-[0.98]
              transition-all duration-300"
            >
              {primaryAction.label}
            </Link>

            {/* Secondary CTA */}
            <Link
              href={secondaryAction.href}
              onClick={onClose}
              className="inline-flex items-center justify-center border-2 border-neutral-200 text-neutral-700 px-6 py-3.5 rounded-xl font-semibold
              hover:border-[#FF7A00] hover:text-[#FF7A00] hover:-translate-y-0.5 active:scale-[0.98]
              transition-all duration-300"
            >
              {secondaryAction.label}
            </Link>

            {/* Tertiary CTA */}
            {tertiaryAction && (
              <Link
                href={tertiaryAction.href}
                onClick={onClose}
                className="inline-flex items-center justify-center gap-2 text-neutral-500 hover:text-[#FF7A00] transition-colors duration-300 font-medium py-2 group"
              >
                {tertiaryAction.label}
                <svg
                  className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Animation styles */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.96);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes checkmark {
          0% {
            transform: scale(0);
          }
          50% {
            transform: scale(1.1);
          }
          100% {
            transform: scale(1);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.25s ease-out forwards;
        }

        .animate-scaleIn {
          animation: scaleIn 0.3s ease-out forwards;
        }

        .animate-checkmark {
          animation: checkmark 0.4s ease-out 0.1s forwards;
          transform: scale(0);
        }
      `}</style>
    </div>
  );
}
