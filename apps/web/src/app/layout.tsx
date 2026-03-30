import type { Metadata } from "next";
import "./globals.css";
import { AuthGuard } from "@/components/providers/auth-guard";
import { ClientAnalytics } from "@/components/providers/client-analytics";

export const metadata: Metadata = {
  title: "Yazko",
  description: "Entertaining social chat with reactions, media, and realtime conversations.",
  metadataBase: new URL("http://localhost:3000")
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ClientAnalytics />
        <AuthGuard>{children}</AuthGuard>
      </body>
    </html>
  );
}
