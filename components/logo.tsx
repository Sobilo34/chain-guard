"use client";

import { cn } from "@/lib/utils";

type LogoProps = {
  /** Icon size in pixels (square). */
  size?: 20 | 24 | 32 | 40 | 48;
  /** Show "ChainGuard" wordmark next to icon. */
  showWordmark?: boolean;
  /** Show trailing dot (e.g. "ChainGuard."). */
  showDot?: boolean;
  className?: string;
};

const sizeMap = { 20: 20, 24: 24, 32: 32, 40: 40, 48: 48 } as const;

export function Logo({
  size = 32,
  showWordmark = false,
  showDot = false,
  className,
}: LogoProps) {
  const px = sizeMap[size];
  return (
    <span
      className={cn("inline-flex items-center gap-2 font-bold tracking-tight text-foreground", className)}
      aria-label="ChainGuard"
    >
      <svg
        width={px}
        height={px}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 text-primary"
      >
        <path
          d="M16 2L4 6v10c0 7 5.5 12 12 14 6.5-2 12-7 12-14V6L16 2z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
          fill="none"
        />
        <path
          d="M11 14l4 4 8-8"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
      {showWordmark && (
        <span>
          ChainGuard{showDot && <span className="text-primary">.</span>}
        </span>
      )}
    </span>
  );
}
