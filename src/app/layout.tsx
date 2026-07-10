import type { Metadata } from "next";
import "./heroui.min.css";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "ClearLedger",
  description: "Australian small-business BAS readiness cockpit",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-AU">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
