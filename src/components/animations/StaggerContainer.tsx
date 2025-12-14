"use client";

import { ReactNode, useRef, useEffect, useState, Children, cloneElement, isValidElement } from "react";

interface StaggerContainerProps {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
}

export default function StaggerContainer({
  children,
  className = "",
  staggerDelay = 0.1,
}: StaggerContainerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: "-50px" }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  // Clone children and pass isVisible and index for stagger delay
  const staggeredChildren = Children.map(children, (child, index) => {
    if (isValidElement(child)) {
      return cloneElement(child as React.ReactElement<{ isVisible?: boolean; staggerIndex?: number; staggerDelay?: number }>, {
        isVisible,
        staggerIndex: index,
        staggerDelay,
      });
    }
    return child;
  });

  return (
    <div ref={ref} className={className}>
      {staggeredChildren}
    </div>
  );
}

export function StaggerItem({
  children,
  className = "",
  isVisible = false,
  staggerIndex = 0,
  staggerDelay = 0.1,
}: {
  children: ReactNode;
  className?: string;
  isVisible?: boolean;
  staggerIndex?: number;
  staggerDelay?: number;
}) {
  const delay = staggerIndex * staggerDelay;

  return (
    <div
      className={className}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translate3d(0, 0, 0)" : "translate3d(0, 20px, 0)",
        transition: `opacity 0.5s cubic-bezier(0.25, 0.1, 0.25, 1) ${delay}s, transform 0.5s cubic-bezier(0.25, 0.1, 0.25, 1) ${delay}s`,
        willChange: "opacity, transform",
      }}
    >
      {children}
    </div>
  );
}
