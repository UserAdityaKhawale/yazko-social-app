import type { Metadata } from "next";
import "./globals.css";
import { AuthGuard } from "@/components/providers/auth-guard";

export const metadata: Metadata = {
  title: "Yazko",
  description: "Entertaining social chat with reactions, media, and realtime conversations."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AuthGuard>{children}</AuthGuard>
      </body>
    </html>
  );
}

