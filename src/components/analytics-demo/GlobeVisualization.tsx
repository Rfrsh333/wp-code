"use client";

import { useEffect, useRef, useCallback } from "react";
import createGlobe from "cobe";

export default function GlobeVisualization() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerInteracting = useRef<number | null>(null);
  const pointerInteractionMovement = useRef(0);
  const phiRef = useRef(0);
  const widthRef = useRef(0);
  const globeRef = useRef<ReturnType<typeof createGlobe> | null>(null);
  const frameRef = useRef<number>(0);

  const onResize = useCallback(() => {
    if (canvasRef.current) {
      widthRef.current = canvasRef.current.offsetWidth;
    }
  }, []);

  useEffect(() => {
    window.addEventListener("resize", onResize);
    onResize();

    // Focus on Europe/Netherlands
    const focusPhi = (Math.PI / 180) * 5;
    const focusTheta = (Math.PI / 180) * (90 - 52) - 0.3;

    const globe = createGlobe(canvasRef.current!, {
      devicePixelRatio: 2,
      width: widthRef.current * 2,
      height: widthRef.current * 2,
      phi: focusPhi,
      theta: focusTheta,
      dark: 0,
      diffuse: 1.2,
      mapSamples: 24000,
      mapBrightness: 1.8,
      baseColor: [0.92, 0.92, 0.92],
      markerColor: [1, 0.4, 0],
      glowColor: [0.85, 0.85, 0.95],
      markers: [
        { location: [52.0907, 5.1214], size: 0.08 },
      ],
      scale: 1.05,
      offset: [0, 0],
    });

    globeRef.current = globe;

    // Animation loop for auto-rotation
    const animate = () => {
      if (!pointerInteracting.current) {
        phiRef.current += 0.003;
      }
      globe.update({
        phi: focusPhi + phiRef.current,
        width: widthRef.current * 2,
        height: widthRef.current * 2,
      });
      frameRef.current = requestAnimationFrame(animate);
    };
    frameRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frameRef.current);
      globe.destroy();
      window.removeEventListener("resize", onResize);
    };
  }, [onResize]);

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[520px]">
      <canvas
        ref={canvasRef}
        className="h-full w-full cursor-grab active:cursor-grabbing"
        onPointerDown={(e) => {
          pointerInteracting.current = e.clientX - pointerInteractionMovement.current;
          canvasRef.current!.style.cursor = "grabbing";
        }}
        onPointerUp={() => {
          pointerInteracting.current = null;
          canvasRef.current!.style.cursor = "grab";
        }}
        onPointerOut={() => {
          pointerInteracting.current = null;
          if (canvasRef.current) canvasRef.current.style.cursor = "grab";
        }}
        onPointerMove={(e) => {
          if (pointerInteracting.current !== null) {
            const delta = e.clientX - pointerInteracting.current;
            pointerInteractionMovement.current = delta;
            phiRef.current = delta / 200;
          }
        }}
        onTouchMove={(e) => {
          if (pointerInteracting.current !== null && e.touches[0]) {
            const delta = e.touches[0].clientX - pointerInteracting.current;
            pointerInteractionMovement.current = delta;
            phiRef.current = delta / 200;
          }
        }}
        style={{
          width: "100%",
          height: "100%",
          contain: "layout paint size",
        }}
      />
    </div>
  );
}
