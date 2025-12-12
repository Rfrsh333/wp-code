"use client";

import { useRef, useEffect, useState, ReactNode } from "react";

interface ParallaxImageProps {
  children: ReactNode;
  maxMovement?: number; // Maximum movement in pixels
  smoothness?: number; // Transition duration in ms
}

export default function ParallaxImage({
  children,
  maxMovement = 15,
  smoothness = 150,
}: ParallaxImageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0 });
  const [isDesktop, setIsDesktop] = useState(true);
  const animationRef = useRef<number>(0);
  const targetRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    // Check if desktop (disable on mobile/tablet)
    const checkDevice = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };

    checkDevice();
    window.addEventListener("resize", checkDevice);

    return () => window.removeEventListener("resize", checkDevice);
  }, []);

  useEffect(() => {
    if (!isDesktop) return;

    const handleMouseMove = (e: MouseEvent) => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      // Calculate distance from center (normalized to -1 to 1)
      const deltaX = (e.clientX - centerX) / (window.innerWidth / 2);
      const deltaY = (e.clientY - centerY) / (window.innerHeight / 2);

      // Apply max movement constraint
      targetRef.current = {
        x: deltaX * maxMovement,
        y: deltaY * maxMovement,
      };
    };

    const handleMouseLeave = () => {
      // Smoothly return to center when mouse leaves
      targetRef.current = { x: 0, y: 0 };
    };

    // Smooth animation using requestAnimationFrame
    const animate = () => {
      setTransform((prev) => {
        const ease = 0.08; // Smoothing factor
        const newX = prev.x + (targetRef.current.x - prev.x) * ease;
        const newY = prev.y + (targetRef.current.y - prev.y) * ease;

        // Stop animating when close enough to target
        if (
          Math.abs(newX - targetRef.current.x) < 0.01 &&
          Math.abs(newY - targetRef.current.y) < 0.01
        ) {
          return targetRef.current;
        }

        return { x: newX, y: newY };
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    window.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isDesktop, maxMovement]);

  return (
    <div ref={containerRef} className="relative">
      <div
        style={{
          transform: isDesktop
            ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
            : "none",
          transition: `transform ${smoothness}ms ease-out`,
          willChange: "transform",
        }}
      >
        {children}
      </div>
    </div>
  );
}
