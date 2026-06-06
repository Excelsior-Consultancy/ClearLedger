import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ClearLedger",
  description: "Australian small-business BAS readiness cockpit"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-AU">
      <body>{children}</body>
    </html>
  );
}
