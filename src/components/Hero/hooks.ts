import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * useInView Hook
 * Uses IntersectionObserver to detect when an element enters the viewport
 */
export function useInView(
  options: IntersectionObserverInit = { threshold: 0.1 }
): [React.RefObject<HTMLElement | null>, boolean] {
  const ref = useRef<HTMLElement | null>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    if (prefersReducedMotion) {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsInView(true);
        observer.disconnect(); // Only trigger once
      }
    }, options);

    observer.observe(element);

    return () => observer.disconnect();
  }, [options]);

  return [ref, isInView];
}

/**
 * useCountUp Hook
 * Animates a number from 0 to target value using requestAnimationFrame
 */
export function useCountUp(
  target: number,
  duration: number = 1000,
  shouldStart: boolean = false
): number {
  const [count, setCount] = useState(0);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!shouldStart || hasAnimated.current) return;

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    if (prefersReducedMotion) {
      setCount(target);
      hasAnimated.current = true;
      return;
    }

    hasAnimated.current = true;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function: easeOutQuart
      const eased = 1 - Math.pow(1 - progress, 4);
      const currentValue = Math.floor(eased * target);

      setCount(currentValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setCount(target);
      }
    };

    requestAnimationFrame(animate);
  }, [target, duration, shouldStart]);

  return count;
}

/**
 * useScrollPosition Hook
 * Returns the current scroll position with throttling via requestAnimationFrame
 */
export function useScrollPosition(): number {
  const [scrollY, setScrollY] = useState(0);
  const ticking = useRef(false);

  const handleScroll = useCallback(() => {
    if (!ticking.current) {
      requestAnimationFrame(() => {
        setScrollY(window.scrollY);
        ticking.current = false;
      });
      ticking.current = true;
    }
  }, []);

  useEffect(() => {
    // Set initial value
    setScrollY(window.scrollY);

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  return scrollY;
}
