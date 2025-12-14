"use client";

export default function GradientBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Gradient blob 1 - Orange */}
      <div
        className="absolute w-[600px] h-[600px] rounded-full opacity-[0.25] animate-blob1"
        style={{
          background: "radial-gradient(circle, #F27501 0%, transparent 70%)",
          top: "-10%",
          right: "-5%",
          willChange: "transform",
        }}
      />

      {/* Gradient blob 2 - Light Orange */}
      <div
        className="absolute w-[500px] h-[500px] rounded-full opacity-[0.20] animate-blob2"
        style={{
          background: "radial-gradient(circle, #FFB347 0%, transparent 70%)",
          bottom: "10%",
          left: "-10%",
          willChange: "transform",
        }}
      />

      {/* Gradient blob 3 - Subtle warm */}
      <div
        className="absolute w-[400px] h-[400px] rounded-full opacity-[0.15] animate-blob3"
        style={{
          background: "radial-gradient(circle, #F27501 0%, transparent 70%)",
          top: "50%",
          left: "50%",
          willChange: "transform",
        }}
      />

      <style jsx>{`
        @keyframes blob1 {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(50px, 30px, 0) scale(1.1); }
        }
        @keyframes blob2 {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(-40px, -50px, 0) scale(1.15); }
        }
        @keyframes blob3 {
          0%, 100% { transform: translate3d(-50%, -50%, 0) scale(1); }
          33% { transform: translate3d(calc(-50% + 30px), calc(-50% - 20px), 0) scale(1.2); }
          66% { transform: translate3d(calc(-50% - 30px), calc(-50% + 20px), 0) scale(0.9); }
        }
        /* Only animate on desktop (1024px+) */
        @media (min-width: 1024px) {
          .animate-blob1 { animation: blob1 20s ease-in-out infinite; }
          .animate-blob2 { animation: blob2 25s ease-in-out infinite; }
          .animate-blob3 { animation: blob3 30s ease-in-out infinite; }
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-blob1, .animate-blob2, .animate-blob3 {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
