"use client";

import { ReactNode, useRef, useEffect, useState } from "react";

interface ScrollRevealProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  direction?: "up" | "down" | "left" | "right" | "none";
  className?: string;
  as?: "div" | "section" | "article";
}

export function ScrollReveal({
  children,
  delay = 0,
  duration = 0.6,
  direction = "up",
  className = "",
  as: Tag = "div",
}: ScrollRevealProps) {
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
      { threshold: 0.1, rootMargin: "-40px" },
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  const getTransform = () => {
    if (isVisible) return "translate3d(0, 0, 0)";
    switch (direction) {
      case "up":
        return "translate3d(0, 30px, 0)";
      case "down":
        return "translate3d(0, -30px, 0)";
      case "left":
        return "translate3d(30px, 0, 0)";
      case "right":
        return "translate3d(-30px, 0, 0)";
      default:
        return "translate3d(0, 0, 0)";
    }
  };

  return (
    <Tag
      ref={ref as React.RefObject<HTMLDivElement>}
      className={className}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: getTransform(),
        transition: `opacity ${duration}s cubic-bezier(0.25, 0.1, 0.25, 1) ${delay}s, transform ${duration}s cubic-bezier(0.25, 0.1, 0.25, 1) ${delay}s`,
        willChange: "opacity, transform",
      }}
    >
      {children}
    </Tag>
  );
}

interface StaggerChildrenProps {
  children: ReactNode[];
  baseDelay?: number;
  staggerDelay?: number;
  direction?: "up" | "left";
  className?: string;
}

export function StaggerChildren({
  children,
  baseDelay = 0,
  staggerDelay = 0.08,
  direction = "up",
  className = "",
}: StaggerChildrenProps) {
  return (
    <>
      {children.map((child, i) => (
        <ScrollReveal
          key={i}
          delay={baseDelay + i * staggerDelay}
          direction={direction}
          className={className}
        >
          {child}
        </ScrollReveal>
      ))}
    </>
  );
}

interface FAQAccordionProps {
  items: { question: string; answer: string }[];
}

export function FAQAccordion({ items }: FAQAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="space-y-3">
      {items.map((faq, idx) => {
        const isOpen = openIndex === idx;
        return (
          <ScrollReveal key={idx} delay={0.05 * idx} direction="up">
            <div
              className={`bg-white rounded-2xl border overflow-hidden transition-all duration-300 ${
                isOpen
                  ? "border-[#F97316]/30 shadow-lg shadow-orange-500/5"
                  : "border-neutral-200 hover:border-[#F97316]/20"
              }`}
            >
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? null : idx)}
                className="flex items-center justify-between w-full px-6 py-5 text-left cursor-pointer"
              >
                <span className="font-semibold text-neutral-900 pr-4">
                  {faq.question}
                </span>
                <span
                  className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isOpen
                      ? "bg-[#F97316] rotate-180"
                      : "bg-neutral-100 group-hover:bg-orange-50"
                  }`}
                >
                  <svg
                    className={`w-4 h-4 transition-colors ${isOpen ? "text-white" : "text-neutral-500"}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </span>
              </button>
              <div
                className="overflow-hidden transition-all duration-300"
                style={{
                  maxHeight: isOpen ? "500px" : "0",
                  opacity: isOpen ? 1 : 0,
                }}
              >
                <div className="px-6 pb-5 text-neutral-600 leading-relaxed">
                  {faq.answer}
                </div>
              </div>
            </div>
          </ScrollReveal>
        );
      })}
    </div>
  );
}

/* Hidden details fallback for SEO — keeps FAQ content in DOM for crawlers */
export function FAQSchemaFallback({
  items,
}: {
  items: { question: string; answer: string }[];
}) {
  return (
    <div className="sr-only" aria-hidden="true">
      {items.map((faq, idx) => (
        <details key={idx}>
          <summary>{faq.question}</summary>
          <div>{faq.answer}</div>
        </details>
      ))}
    </div>
  );
}
