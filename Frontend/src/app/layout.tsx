import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ActivityHub",
  description: "Secure multi-tenant account activity feed",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

