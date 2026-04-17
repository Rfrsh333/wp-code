"use client";

import { useState } from "react";

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  readonly?: boolean;
  size?: "sm" | "md" | "lg";
  label?: string;
}

export default function StarRating({ value, onChange, readonly = false, size = "md", label }: StarRatingProps) {
  const [hover, setHover] = useState(0);

  const sizeMap = {
    sm: { star: 18, gap: 2 },
    md: { star: 26, gap: 4 },
    lg: { star: 28, gap: 4 },
  };
  const { star: starSize, gap } = sizeMap[size];

  const getStarColor = (starIndex: number) => {
    const active = hover > 0 ? hover : value;
    if (starIndex <= active) return "#F27501";
    return "transparent";
  };

  const getStrokeColor = (starIndex: number) => {
    const active = hover > 0 ? hover : value;
    if (starIndex <= active) return "#F27501";
    return "#E5E7EB";
  };

  const getScale = (starIndex: number) => {
    if (hover === starIndex) return 1.2;
    return 1;
  };

  return (
    <div className="flex flex-col gap-1">
      {label && <span className="text-xs font-medium text-neutral-500">{label}</span>}
      <div className="flex items-center" style={{ gap }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={readonly}
            onClick={() => onChange?.(star)}
            onMouseEnter={() => !readonly && setHover(star)}
            onMouseLeave={() => !readonly && setHover(0)}
            className="relative focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 rounded-full"
            style={{
              cursor: readonly ? "default" : "pointer",
              transform: `scale(${getScale(star)})`,
              transition: "transform 0.15s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          >
            <svg
              width={starSize}
              height={starSize}
              viewBox="0 0 24 24"
              style={{ filter: star <= (hover || value) ? "drop-shadow(0 1px 2px rgba(242, 117, 1, 0.3))" : "none", transition: "filter 0.2s ease" }}
            >
              <defs>
                <linearGradient id={`star-grad-${star}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FF8A1E" />
                  <stop offset="100%" stopColor="#F27501" />
                </linearGradient>
              </defs>
              <path
                d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                fill={star <= (hover || value) ? `url(#star-grad-${star})` : "#F9FAFB"}
                stroke={getStrokeColor(star)}
                strokeWidth={1.5}
                strokeLinejoin="round"
                style={{ transition: "fill 0.2s ease, stroke 0.2s ease" }}
              />
            </svg>
          </button>
        ))}
        {!readonly && (hover > 0 || value > 0) && (
          <span className="ml-1 text-xs font-semibold text-neutral-500 tabular-nums min-w-[2ch]">
            {hover || value}/5
          </span>
        )}
      </div>
    </div>
  );
}
