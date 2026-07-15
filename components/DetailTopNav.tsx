"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Sticky detail header. Back uses browser history when the previous page is
 * same-origin; otherwise navigates to fallbackHref (e.g. direct / SEO landings).
 */
export default function DetailTopNav({
  fallbackHref,
  actions,
}: {
  /** Used when there is no usable in-app referrer (new tab, external entry). */
  fallbackHref: string;
  actions?: ReactNode;
}) {
  const router = useRouter();

  const goBack = () => {
    try {
      const ref = document.referrer;
      if (ref) {
        const url = new URL(ref);
        if (url.origin === window.location.origin) {
          router.back();
          return;
        }
      }
    } catch {
      /* ignore bad referrer */
    }
    router.push(fallbackHref);
  };

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <button
          type="button"
          onClick={goBack}
          className="text-sm font-medium text-slate-600 hover:text-blue-600 flex items-center gap-1 cursor-pointer"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back
        </button>

        {actions ? (
          <div className="flex gap-3 items-center">{actions}</div>
        ) : (
          <span />
        )}
      </div>
    </nav>
  );
}
