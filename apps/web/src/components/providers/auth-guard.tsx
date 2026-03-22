"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/use-auth-store";

const publicPaths = new Set(["/login", "/signup"]);

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    if (!token && !publicPaths.has(pathname)) {
      router.replace("/login");
    }

    if (token && publicPaths.has(pathname)) {
      router.replace("/chat");
    }
  }, [pathname, router, token]);

  return <>{children}</>;
}

