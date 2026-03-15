"use client";

import { useEffect, useRef, useState } from "react";

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}

export function AnimatedCounter({
  value,
  duration = 1200,
  prefix = "",
  suffix = "",
  decimals = 0,
  className = "",
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const prevValue = useRef(0);
  const startTime = useRef<number | null>(null);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const from = prevValue.current;
    const to = value;
    if (from === to) return;

    startTime.current = performance.now();

    function animate(now: number) {
      const elapsed = now - (startTime.current || now);
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = from + (to - from) * eased;
      setDisplayValue(current);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        prevValue.current = to;
      }
    }

    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [value, duration]);

  const formatted = decimals > 0
    ? displayValue.toFixed(decimals)
    : Math.round(displayValue).toLocaleString();

  return (
    <span className={className}>
      {prefix}{formatted}{suffix}
    </span>
  );
}

export function AnimatedCurrency({
  value,
  className = "",
}: {
  value: number;
  className?: string;
}) {
  const [displayValue, setDisplayValue] = useState(0);
  const prevValue = useRef(0);
  const startTime = useRef<number | null>(null);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const from = prevValue.current;
    const to = value;
    if (from === to) return;

    startTime.current = performance.now();

    function animate(now: number) {
      const elapsed = now - (startTime.current || now);
      const progress = Math.min(elapsed / 1200, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(from + (to - from) * eased);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        prevValue.current = to;
      }
    }

    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [value]);

  return (
    <span className={className}>
      ${displayValue.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
    </span>
  );
}
