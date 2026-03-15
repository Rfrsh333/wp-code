"use client";

import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";

interface ShiftData {
  id: string;
  dienst_id: string;
  functie: string;
  klant_naam: string;
  locatie: string;
  datum: string;
  start_tijd: string;
  eind_tijd: string;
  uurtarief: number | null;
  notitie: string | null;
}

interface SwipeShiftCardProps {
  shift: ShiftData;
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
  style?: React.CSSProperties;
  isTop?: boolean;
}

export default function SwipeShiftCard({ shift, onAccept, onDecline, style, isTop = false }: SwipeShiftCardProps) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-15, 0, 15]);
  const acceptOpacity = useTransform(x, [0, 80], [0, 1]);
  const declineOpacity = useTransform(x, [-80, 0], [1, 0]);

  const formatDate = (d: string) =>
    new Date(d + "T00:00:00").toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" });

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 100;
    if (info.offset.x > threshold) {
      onAccept(shift.id);
    } else if (info.offset.x < -threshold) {
      onDecline(shift.id);
    }
  };

  return (
    <motion.div
      className="absolute inset-0 touch-none"
      style={{ ...style, x, rotate }}
      drag={isTop ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.8}
      onDragEnd={handleDragEnd}
    >
      <div className="relative w-full h-full bg-white dark:bg-[var(--mp-card)] rounded-3xl shadow-lg dark:shadow-none dark:border dark:border-[var(--mp-separator)] overflow-hidden">
        {/* Accept overlay */}
        <motion.div
          className="absolute inset-0 bg-green-500/20 dark:bg-green-500/30 flex items-center justify-start pl-8 z-10 pointer-events-none rounded-3xl"
          style={{ opacity: acceptOpacity }}
        >
          <div className="bg-green-500 text-white px-4 py-2 rounded-xl font-bold text-sm uppercase tracking-wider rotate-[-12deg]">
            Accepteren
          </div>
        </motion.div>

        {/* Decline overlay */}
        <motion.div
          className="absolute inset-0 bg-red-500/20 dark:bg-red-500/30 flex items-center justify-end pr-8 z-10 pointer-events-none rounded-3xl"
          style={{ opacity: declineOpacity }}
        >
          <div className="bg-red-500 text-white px-4 py-2 rounded-xl font-bold text-sm uppercase tracking-wider rotate-[12deg]">
            Afwijzen
          </div>
        </motion.div>

        {/* Card content */}
        <div className="p-6 h-full flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <span className="px-3 py-1 text-xs font-bold rounded-full bg-[#F27501]/10 text-[#F27501] dark:bg-[#F27501]/20">
              Nieuw
            </span>
            {shift.uurtarief && (
              <span className="text-lg font-bold text-[var(--mp-text-primary)]">
                €{(shift.uurtarief - 4).toFixed(2)}<span className="text-sm font-normal text-[var(--mp-text-secondary)]">/uur</span>
              </span>
            )}
          </div>

          <h3 className="text-xl font-bold text-[var(--mp-text-primary)] capitalize mb-1">{shift.functie}</h3>
          <p className="text-[var(--mp-text-secondary)] text-sm mb-4">{shift.klant_naam}</p>

          <div className="space-y-3 flex-1">
            <div className="flex items-center gap-3 text-sm text-[var(--mp-text-secondary)]">
              <div className="w-8 h-8 bg-[var(--mp-bg)] dark:bg-[var(--mp-card-elevated)] rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <span>{shift.locatie}</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-[var(--mp-text-secondary)]">
              <div className="w-8 h-8 bg-[var(--mp-bg)] dark:bg-[var(--mp-card-elevated)] rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <span>{formatDate(shift.datum)}</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-[var(--mp-text-secondary)]">
              <div className="w-8 h-8 bg-[var(--mp-bg)] dark:bg-[var(--mp-card-elevated)] rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span>{shift.start_tijd?.slice(0, 5)} - {shift.eind_tijd?.slice(0, 5)}</span>
            </div>
          </div>

          {shift.notitie && (
            <p className="text-xs text-[var(--mp-text-tertiary)] italic mt-3 bg-[var(--mp-bg)] dark:bg-[var(--mp-card-elevated)] rounded-xl p-3">
              &ldquo;{shift.notitie}&rdquo;
            </p>
          )}

          {isTop && (
            <p className="text-center text-xs text-[var(--mp-text-tertiary)] mt-4">
              Swipe rechts om te accepteren, links om af te wijzen
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
