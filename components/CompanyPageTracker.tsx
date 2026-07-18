"use client";

import { useEffect } from "react";
import { trackCompanyEvents } from "@/lib/companyEvents";

/**
 * Fires a single company page_view on mount for Phase B measurability.
 */
export default function CompanyPageTracker({
  companyId,
}: {
  companyId: string;
}) {
  useEffect(() => {
    trackCompanyEvents([
      { company_id: companyId, event_type: "page_view" },
    ]);
  }, [companyId]);

  return null;
}
