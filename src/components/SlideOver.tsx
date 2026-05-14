"use client";

import { useEffect, useRef, ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SlideOverProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  footer?: ReactNode;
}

/**
 * SlideOver - Contextual detail panel
 *
 * Usage:
 * <SlideOver isOpen={open} onClose={() => setOpen(false)} title="Details">
 *   <Content />
 * </SlideOver>
 *
 * Features:
 * - Right-side panel on desktop
 * - Full-screen sheet on mobile
 * - ESC closes
 * - Click outside closes
 * - Focus trap
 * - Body scroll lock
 */
export function SlideOver({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  footer,
}: SlideOverProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Sizes
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
  };

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      document.body.style.overflow = 'hidden';

      return () => {
        document.body.style.overflow = '';
        previousFocusRef.current?.focus();
      };
    }
  }, [isOpen]);

  // ESC key handler
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Focus trap
  useEffect(() => {
    if (!isOpen || !panelRef.current) return;

    const panel = panelRef.current;
    const focusableElements = panel.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstFocusable = focusableElements[0] as HTMLElement;
    const lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable?.focus();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable?.focus();
        }
      }
    };

    panel.addEventListener('keydown', handleTab as any);
    firstFocusable?.focus();

    return () => panel.removeEventListener('keydown', handleTab as any);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="slide-over-title"
        className={cn(
          'fixed inset-y-0 right-0 z-50 flex flex-col bg-white shadow-2xl',
          'w-full sm:w-auto',
          sizeClasses[size],
          'animate-in slide-in-from-right duration-300'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-slate-200">
          <h2
            id="slide-over-title"
            className="text-lg font-semibold text-slate-900"
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-100 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1"
            aria-label="Sluiten"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-4 py-4 border-t border-slate-200 bg-slate-50">
            {footer}
          </div>
        )}
      </div>
    </>
  );
}

/**
 * SlideOverSection - Reusable content section
 */
interface SlideOverSectionProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

export function SlideOverSection({ title, children, className }: SlideOverSectionProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {title && (
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      )}
      {children}
    </div>
  );
}

/**
 * SlideOverField - Key-value display
 */
interface SlideOverFieldProps {
  label: string;
  value: ReactNode;
  variant?: 'default' | 'status';
}

export function SlideOverField({ label, value, variant = 'default' }: SlideOverFieldProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-sm text-slate-600 flex-shrink-0">{label}</span>
      <span
        className={cn(
          'text-sm font-medium text-right',
          variant === 'default' && 'text-slate-900',
          variant === 'status' && 'text-slate-700'
        )}
      >
        {value}
      </span>
    </div>
  );
}
