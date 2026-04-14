'use client';

import { useEffect, useState } from 'react';

interface RealtimeBadgeProps {
  count: number;
  previousCount: number;
}

export function RealtimeBadge({ count, previousCount }: RealtimeBadgeProps) {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (count > previousCount) {
      queueMicrotask(() => setAnimate(true));
      const timer = setTimeout(() => setAnimate(false), 600);
      return () => clearTimeout(timer);
    }
  }, [count, previousCount]);

  if (count === 0) return null;

  return (
    <span className={`
      inline-flex items-center justify-center min-w-[20px] h-5 px-1.5
      text-xs font-bold text-white bg-red-500 rounded-full
      ${animate ? 'animate-bounce' : ''}
    `}>
      {count > 99 ? '99+' : count}
    </span>
  );
}
