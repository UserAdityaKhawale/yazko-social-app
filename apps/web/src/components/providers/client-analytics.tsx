"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function ClientAnalytics() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const payload = {
      event: "page_view",
      path: pathname,
      timestamp: new Date().toISOString(),
      appEnv: process.env.NEXT_PUBLIC_APP_ENV ?? "development"
    };

    if (process.env.NODE_ENV !== "production") {
      console.info("[yazko-analytics]", payload);
    }
  }, [pathname]);

  return null;
}
