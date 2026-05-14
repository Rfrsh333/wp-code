/**
 * Mobile Utilities
 *
 * Utilities for mobile-optimized operational UX.
 * Detects mobile, provides mobile-specific interactions.
 */

import { trackEvent } from './telemetry';

/**
 * Detect if user is on mobile device
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;

  return (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    window.innerWidth < 768
  );
}

/**
 * Detect if device supports touch
 */
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;

  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

/**
 * Get mobile-optimized padding/spacing
 */
export function getMobilePadding(desktop: string, mobile: string): string {
  return isMobileDevice() ? mobile : desktop;
}

/**
 * Track mobile action usage
 */
export function trackMobileAction(action: string, metadata?: Record<string, any>): void {
  if (isMobileDevice()) {
    trackEvent('mobile_action_used', {
      action,
      is_touch: isTouchDevice(),
      screen_width: window.innerWidth,
      ...metadata,
    });
  }
}

/**
 * Mobile-optimized button size
 */
export const MOBILE_TAP_TARGET = {
  minHeight: 44, // iOS HIG minimum
  minWidth: 44,
  padding: 'px-4 py-3', // Larger tap targets on mobile
};

/**
 * Check if element is in viewport (for mobile scroll optimization)
 */
export function isInViewport(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

/**
 * Scroll element into view (mobile-safe)
 */
export function scrollIntoViewSafe(element: HTMLElement, behavior: ScrollBehavior = 'smooth'): void {
  // On mobile, add extra offset for fixed headers/bottom bars
  const offset = isMobileDevice() ? 80 : 0;

  const elementTop = element.getBoundingClientRect().top + window.pageYOffset - offset;

  window.scrollTo({
    top: elementTop,
    behavior,
  });
}

/**
 * Prevent body scroll (for modals on mobile)
 */
export function lockBodyScroll(): void {
  if (typeof document === 'undefined') return;

  document.body.style.overflow = 'hidden';
  // iOS-specific fix
  document.body.style.position = 'fixed';
  document.body.style.width = '100%';
}

/**
 * Re-enable body scroll
 */
export function unlockBodyScroll(): void {
  if (typeof document === 'undefined') return;

  document.body.style.overflow = '';
  document.body.style.position = '';
  document.body.style.width = '';
}
