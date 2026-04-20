"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

/** Semantic tones for transient feedback above an action */
export type FeedbackTone = "success" | "warning" | "info";

export type TransientFeedback = { text: string; tone: FeedbackTone };

const TONE_CLASS: Record<FeedbackTone, string> = {
  success:
    "border border-emerald-500/20 bg-emerald-50/90 text-emerald-800 backdrop-blur-sm shadow-sm shadow-emerald-500/10",
  warning:
    "border border-amber-500/30 bg-amber-50/90 text-amber-900 backdrop-blur-sm shadow-sm shadow-amber-500/10",
  info: 
    "border border-slate-400/20 bg-slate-100/90 text-slate-800 backdrop-blur-sm shadow-sm",
};

/**
 * Bubble above a primary action (anchored top-right of trigger). Does not
 * affect layout; pair with useTransientFeedback for timed dismiss.
 */
export function ActionWithFeedback({
  feedback,
  children,
  className,
}: {
  feedback: TransientFeedback | null;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`relative shrink-0 ${className ?? ""}`}>
      {feedback ? (
        <p
          role="status"
          aria-live="polite"
          className={`pointer-events-none absolute bottom-full right-0 z-20 mb-1.5 w-max max-w-[min(16rem,calc(100vw-2rem))] rounded-lg border px-2.5 py-2 text-left text-[11px] font-medium leading-snug shadow-lg ${TONE_CLASS[feedback.tone]}`}
        >
          {feedback.text}
        </p>
      ) : null}
      {children}
    </div>
  );
}

/** Shows feedback then clears after duration; clears pending timers on unmount */
export function useTransientFeedback(durationMs = 2800) {
  const [feedback, setFeedback] = useState<TransientFeedback | null>(null);
  const hideRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(
    (next: TransientFeedback) => {
      setFeedback(next);
      if (hideRef.current) clearTimeout(hideRef.current);
      hideRef.current = setTimeout(() => {
        setFeedback(null);
        hideRef.current = null;
      }, durationMs);
    },
    [durationMs]
  );

  const clear = useCallback(() => {
    if (hideRef.current) clearTimeout(hideRef.current);
    hideRef.current = null;
    setFeedback(null);
  }, []);

  useEffect(
    () => () => {
      if (hideRef.current) clearTimeout(hideRef.current);
    },
    []
  );

  return { feedback, show, clear };
}
