"use client";

import { useEffect, useRef } from "react";

/**
 * Count-up on mount — animates the DOM node imperatively (no React state,
 * no re-renders, no set-state-in-effect). SSR renders the final value, so
 * hydration matches; the effect then replays 0→value in ~500ms. Skipped
 * entirely under prefers-reduced-motion.
 */
export function CountUp({
  value,
  duration = 500,
  className,
}: {
  value: number;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (
      !el ||
      value === 0 ||
      (typeof matchMedia === "function" &&
        matchMedia("(prefers-reduced-motion: reduce)").matches)
    )
      return;
    const t0 = performance.now();
    let raf: number;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      el.textContent = String(Math.round(value * (1 - (1 - p) ** 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return (
    <span ref={ref} className={className}>
      {value}
    </span>
  );
}
