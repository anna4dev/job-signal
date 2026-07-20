"use client";

import { useEffect } from "react";
import {
  rememberCompanyVisit,
  trackCompanyEvents,
} from "@/lib/companyEvents";

/**
 * Fires page_view on mount, and revisit when the same company was viewed
 * more than 24h ago (Phase C 7-day revisit funnel support).
 */
export default function CompanyPageTracker({
  companyId,
}: {
  companyId: string;
}) {
  useEffect(() => {
    const { isRevisit } = rememberCompanyVisit(companyId);
    const events = [
      { company_id: companyId, event_type: "page_view" as const },
      ...(isRevisit
        ? [{ company_id: companyId, event_type: "revisit" as const }]
        : []),
    ];
    trackCompanyEvents(events);
  }, [companyId]);

  return null;
}
